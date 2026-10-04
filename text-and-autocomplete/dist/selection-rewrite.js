import {
  expansionForDrag,
  LiveRewrite,
  MIN_RATIO,
  MAX_RATIO,
} from './rewrite-core.js?v=91f7e8868eb3';
import {
  RewritePreview,
  selectionRects,
  selectionWidth,
  offsetAtPoint,
  surfacePlacement,
} from './rewrite-preview.js?v=0ef16eccfb75';

// Masks and streamed text float over the untouched original selection. Only
// the final replacement enters the editor, as one native undo operation.
export class SelectionRewrite {
  constructor({
    editor,
    client,
    getContext,
    canResize,
    canRephrase,
    pauseCompose,
    commit,
    notify,
    connect,
  }) {
    Object.assign(this, {
      editor,
      client,
      getContext,
      canResize,
      canRephrase,
      pauseCompose,
      commit,
      notify,
      connect,
    });
    this.controls = document.getElementById('rewrite-controls');
    this.handle = this.controls.querySelector('.rewrite-handle');
    this.selectionPointer = null;
    this.handle.addEventListener('pointerdown', event => this.pointerDown(event));
    this.handle.addEventListener('pointermove', event => this.pointerMove(event));
    this.handle.addEventListener('pointerup', event => this.pointerUp(event));
    this.handle.addEventListener('pointercancel', () => this.cancel());
    this.handle.addEventListener('lostpointercapture', () => {
      if (this.drag) this.cancel();
    });
    this.handle.addEventListener('keydown', event => this.keyDown(event));
    // The handle overlaps the end of the highlight, so a double-click there counts too.
    this.handle.addEventListener('dblclick', () => {
      if (this.canRephrase() && !this.busy && this.selection) this.begin(true);
    });
    document.addEventListener(
      'keydown',
      event => {
        this.handle.classList.remove('pointer-focused');
        if (event.key === 'Escape' && this.busy) {
          event.preventDefault();
          event.stopImmediatePropagation();
          this.cancel(true);
        }
      },
      true,
    );
    document.addEventListener(
      'pointerdown',
      event => {
        if (this.controls.contains(event.target)) return;
        if (this.busy) this.cancel();
        this.rememberClick(event);
        this.hideControls();
        if (event.button === 0 && this.editor.contains(event.target)) {
          this.selectionPointer = event.pointerId;
        }
      },
      true,
    );
    document.addEventListener(
      'pointerup',
      event => {
        if (this.selectionPointer === null || event.pointerId !== this.selectionPointer) return;
        this.selectionPointer = null;
        this.revealTimer = setTimeout(() => {
          this.revealTimer = null;
          this.update();
        }, 150);
      },
      true,
    );
    // The first click of a double-click collapses the selection, so the second
    // one rephrases the selection remembered from the first.
    editor.addEventListener(
      'mousedown',
      event => {
        const clicked = this.clicked;
        if (
          event.detail !== 2 ||
          event.button !== 0 ||
          !clicked ||
          !this.canRephrase() ||
          this.busy
        ) {
          return;
        }
        this.clicked = null;
        if (event.timeStamp - clicked.time > 700 || !this.inside(clicked.selection.range, event)) {
          return;
        }
        event.preventDefault();
        this.selection = clicked.selection;
        this.begin(true);
      },
      true,
    );
    document.addEventListener(
      'pointercancel',
      event => {
        if (event.pointerId === this.selectionPointer) this.hideControls();
      },
      true,
    );
    document.addEventListener('focusin', event => {
      if (!this.editor.contains(event.target) && !this.controls.contains(event.target)) {
        this.hideControls();
      }
    });
    window.addEventListener('blur', () => {
      this.cancel();
      this.hideControls();
    });
    window.addEventListener('resize', () => this.paint());
    document.addEventListener('scroll', () => this.paint(), true);
  }
  inside(range, event) {
    return selectionRects(this.editor, range).some(
      rect =>
        event.clientX >= rect.left - 1 &&
        event.clientX <= rect.right + 1 &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom,
    );
  }
  rememberClick(event) {
    if (event.button !== 0 || !this.editor.contains(event.target) || !this.canRephrase()) {
      this.clicked = null;
      return;
    }
    const context = this.getContext();
    // The second press arrives with the selection already collapsed; keep the first.
    if (
      !context ||
      context.collapsed ||
      !context.selected.trim() ||
      !this.inside(context.range, event)
    ) {
      if (this.clicked && !this.inside(this.clicked.selection.range, event)) this.clicked = null;
      return;
    }
    this.clicked = {
      selection: { ...context, range: context.range.cloneRange() },
      time: event.timeStamp,
    };
  }
  get busy() {
    return Boolean(this.session) || this.applying;
  }
  hideControls() {
    clearTimeout(this.revealTimer);
    this.revealTimer = null;
    this.selectionPointer = null;
    this.controls.hidden = true;
  }
  update() {
    // Native selection changes throughout a highlight drag and once more on
    // release. Keep all of those events behind the same release-based delay.
    if (this.busy || this.selectionPointer !== null || this.revealTimer) return;
    const context = this.getContext();
    this.selection =
      context && !context.collapsed && context.selected.trim()
        ? { ...context, range: context.range.cloneRange() }
        : null;
    this.controls.hidden = !this.selection || !this.canResize();
    if (this.controls.hidden) return;
    this.handle.setAttribute('aria-valuenow', '100');
    this.handle.setAttribute(
      'aria-valuetext',
      'Original length. Drag right or down for more detail, left or up for less.',
    );
    this.paint();
  }
  paint() {
    const range = this.session?.original.range || this.selection?.range;
    const session = this.session;
    if (!range || (this.controls.hidden && !session?.rephrase)) return;
    const area = session?.preview.render(
      session.fraction,
      session.text,
      session.expansionPixels,
      this.controls.dataset.state === 'writing',
    );
    const rects = session ? session.preview.rects : selectionRects(this.editor, range);
    if (!rects.length || session?.rephrase) {
      this.controls.hidden = true;
      return;
    }
    const last = rects.at(-1);
    const point = area?.boundary || { x: last.right, y: last.top + last.height / 2 };
    this.handle.style.left = `${Math.max(14, Math.min(innerWidth - 14, point.x))}px`;
    this.handle.style.top = `${point.y}px`;
  }
  begin(rephrase = false) {
    if (this.session) return true;
    if (!this.selection) return false;
    if (!this.client.ready) {
      this.connect();
      return false;
    }
    this.pauseCompose();
    const original = this.selection;
    const preview = new RewritePreview(this.editor, original.range);
    if (!preview.rects.length) {
      preview.remove();
      return false;
    }
    // Repeated double-clicks on the same spot walk through new phrasings.
    const seen = this.history;
    const continued =
      rephrase &&
      seen &&
      seen.before === original.before &&
      seen.after === original.after &&
      seen.texts.includes(original.selected);
    const texts = continued ? seen.texts : [original.selected];
    const rephrasing = rephrase
      ? { avoid: texts.filter(text => text !== original.selected).map(text => text.trim()) }
      : null;
    const session = {
      original,
      originalHTML: this.editor.innerHTML,
      preview,
      text: null,
      ratio: 1,
      fraction: 1,
      expansionPixels: 0,
      rephrase,
      texts,
    };
    this.session = session;
    this.editor.classList.add('rewriting');
    this.editor.setAttribute('aria-busy', 'true');
    session.live = new LiveRewrite({
      context: original,
      rephrase: rephrasing,
      request: (context, ratio, progress, revision) =>
        this.client.rewrite(context, ratio, progress, revision, rephrasing),
      cancel: () => this.client.cancel(),
      diagnose: (event, data) => this.client.diagnose?.(event, data),
      onPreview: (text, finished) => {
        if (this.session !== session) return;
        // Streaming only keeps the wait on screen, so repeat deltas change nothing.
        if (!finished && session.text === null && this.controls.dataset.state === 'writing') {
          return;
        }
        // A free-length synonym may not fit the old footprint, so it is not previewed.
        // Drafts that stream in or miss the length get replaced, so only the settled wording is shown.
        session.text =
          !finished || text === original.selected || (rephrase && !session.live.measured)
            ? null
            : text;
        this.controls.dataset.state = finished ? 'ready' : 'writing';
        this.describe();
        this.paint();
      },
      onReady: text => this.finish(text),
      onError: error => {
        this.cancel(true);
        this.notify(
          error.name === 'AbortError'
            ? (rephrase ? 'Rephrase' : 'Rewrite') + ' cancelled. Original text kept.'
            : error.message + ' Original text kept.',
        );
      },
    });
    this.controls.dataset.state = 'ready';
    if (rephrase) {
      this.controls.hidden = true;
      // Nothing is dragged, so the wait starts at once and the selection shimmers until the wording lands.
      this.controls.dataset.state = 'writing';
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(original.range);
      this.notify('Rephrasing…');
      this.paint();
      session.live.release();
    }
    return true;
  }
  describe() {
    if (!this.session) return;
    const percent = Math.round(this.session.ratio * 100);
    const direction = percent < 100 ? 'More concise' : percent > 100 ? 'More detail' : 'Original';
    const status = this.controls.dataset.state === 'writing' ? ' · rewriting…' : '';
    this.handle.setAttribute('aria-valuenow', String(percent));
    this.handle.setAttribute(
      'aria-valuetext',
      `${direction}, ${percent}% of original length${status}`,
    );
  }
  changeRatio(ratio, fraction = Math.min(1, ratio), expansionPixels = null) {
    if (!this.session) return;
    this.session.fraction = fraction;
    this.session.expansionPixels =
      expansionPixels ??
      Math.max(0, ratio - 1) *
        selectionWidth(this.session.preview.baseRects || this.session.preview.rects);
    if (this.session.ratio !== ratio) {
      this.session.ratio = ratio;
      this.session.text = null;
      this.controls.dataset.state = ratio === 1 ? 'ready' : 'writing';
      this.session.live.setRatio(ratio);
    }
    this.describe();
    this.paint();
  }
  pointerDown(event) {
    if (event.button !== 0 || this.drag || this.session?.live.released) return;
    event.preventDefault();
    const handle = this.handle;
    const rect = handle.getBoundingClientRect();
    if (!this.begin()) return;
    this.drag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      point: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
    };
    handle.setPointerCapture(event.pointerId);
    handle.classList.add('pointer-focused');
    handle.focus({ preventScroll: true });
    this.controls.classList.add('dragging');
    this.paint();
  }
  pointerMove(event) {
    if (!this.drag || event.pointerId !== this.drag.pointerId) return;
    const { point: origin, startX, startY } = this.drag;
    const point = { x: origin.x + event.clientX - startX, y: origin.y + event.clientY - startY };
    const preview = this.session.preview;
    const rects = preview.baseRects || preview.rects;
    const width = selectionWidth(rects);
    const offset = offsetAtPoint(rects, point, preview.lineFlow);
    if (offset > width) {
      const expansion = expansionForDrag(offset - width, width);
      // Quantize only the model target. Layout tracks every pixel of the drag.
      const ratio = Math.min(MAX_RATIO, Math.max(1.05, Math.round(expansion.ratio * 20) / 20));
      this.session.exactRatio = expansion.ratio;
      this.changeRatio(ratio, 1, expansion.pixels);
    } else {
      const fraction = Math.max(MIN_RATIO, Math.min(1, offset / width));
      this.session.exactRatio = fraction;
      this.changeRatio(Math.round(fraction * 20) / 20, fraction);
    }
  }
  pointerUp(event) {
    if (!this.drag || event.pointerId !== this.drag.pointerId) return;
    this.pointerMove(event);
    const { pointerId } = this.drag;
    this.drag = null;
    this.handle.releasePointerCapture(pointerId);
    this.controls.classList.remove('dragging');
    // A wording already on screen is the one committed; re-aiming at the exact length would swap it.
    const shown = this.session?.text !== null && this.controls.dataset.state === 'ready';
    this.session?.live.release(shown ? null : this.session.exactRatio);
    this.paint();
  }
  keyDown(event) {
    if (event.key === 'Enter' && this.session) {
      event.preventDefault();
      this.session.live.release();
      return;
    }
    if (event.key === 'Tab' && this.session) {
      this.cancel();
      return;
    }
    if (
      !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home'].includes(event.key) ||
      this.session?.live.released
    ) {
      return;
    }
    event.preventDefault();
    if (!this.begin()) return;
    const sign = ['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : -1;
    const ratio =
      event.key === 'Home'
        ? 1
        : Math.round(
            Math.max(MIN_RATIO, Math.min(MAX_RATIO, this.session.ratio + sign * 0.1)) * 100,
          ) / 100;
    this.changeRatio(ratio);
  }
  removePreview() {
    const session = this.session;
    this.session = null;
    session?.live.close();
    this.drag = null;
    this.controls.classList.remove('dragging');
    this.controls.removeAttribute('data-state');
    session?.preview.remove();
    this.editor.classList.remove('rewriting');
    this.editor.removeAttribute('aria-busy');
    return session;
  }
  cancel(restoreFocus = false) {
    if (!this.session) return;
    const session = this.removePreview();
    if (restoreFocus && this.editor.innerHTML === session.originalHTML) {
      this.editor.focus({ preventScroll: true });
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(session.original.range);
    }
    this.update();
  }
  // Keep the selection highlight on the new text briefly, then fade it out.
  flash(range) {
    if (!range || range.collapsed) return;
    const surface = this.editor.parentElement;
    const { place } = surfacePlacement(surface);
    const layer = document.createElement('div');
    layer.className = 'rewrite-flash';
    for (const rect of selectionRects(this.editor, range)) {
      const mark = document.createElement('span');
      place(mark, rect);
      layer.append(mark);
    }
    surface.append(layer);
    const fade = layer.animate([{ opacity: 1 }, { opacity: 0 }], {
      delay: 200,
      duration: 700,
      easing: 'ease-out',
      fill: 'forwards',
    });
    const editing = new AbortController();
    const remove = () => {
      layer.remove();
      editing.abort();
    };
    fade.finished.then(remove, remove);
    // Editing moves the text under the overlay, so drop it at once.
    this.editor.addEventListener('input', () => fade.cancel(), {
      once: true,
      signal: editing.signal,
    });
  }
  finish(text) {
    const session = this.session;
    if (!session) return;
    this.applying = true;
    this.removePreview();
    if (this.editor.innerHTML !== session.originalHTML) {
      this.notify('Document changed. Rewrite cancelled.');
    } else if (session.rephrase) {
      // Leave the new wording selected, ready for another double-click.
      const inserted = this.commit(
        session.original.range,
        text,
        'Rephrased. Double-click again for another wording, or undo to restore.',
      );
      if (inserted) {
        this.history = {
          before: session.original.before,
          after: session.original.after,
          texts: [...session.texts, text].slice(-12),
        };
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(inserted);
      }
    } else if (text !== session.original.selected) {
      this.flash(this.commit(session.original.range, text));
    } else {
      this.editor.focus({ preventScroll: true });
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(session.original.range);
    }
    this.applying = false;
    this.update();
  }
}
