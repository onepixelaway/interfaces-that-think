import { combineText, sentenceAt, removalSpan, mergeSpans } from './combine-core.js?v=3a75d9186a2f';
import { selectionRects, surfacePlacement } from './rewrite-preview.js?v=0ef16eccfb75';

const BLOCKS = 'p,div,h1,h2,h3,h4,h5,h6,li';

// Selected text can be dragged by its highlight. The sentence under
// the pointer is highlighted as the receiver; dropping asks the model for one
// sentence that says both, which replaces the receiver as the dragged text goes.
export class SelectionCombine {
  constructor({
    editor,
    client,
    getContext,
    contextOf,
    canCombine,
    pauseCompose,
    commit,
    flash,
    notify,
    connect,
    hideHandle,
    idle,
  }) {
    Object.assign(this, {
      editor,
      client,
      getContext,
      contextOf,
      canCombine,
      pauseCompose,
      commit,
      flash,
      notify,
      connect,
      hideHandle,
      idle,
    });
    this.surface = editor.parentElement;
    // The browser's own text drag fixes the cursor to its drop effect, so the
    // drag is tracked from mouse events instead and the cursor can show a grab.
    editor.addEventListener('dragstart', event => {
      if (this.canCombine()) event.preventDefault();
    });
    editor.addEventListener('mousedown', event => this.press(event));
    editor.addEventListener('mousemove', event => {
      if (!this.pressed) editor.style.cursor = this.grabbable(event) ? 'grab' : '';
    });
    document.addEventListener('mousemove', event => this.move(event));
    document.addEventListener('mouseup', event => this.release(event));
    document.addEventListener('pointerdown', () => this.cancel(), true);
    document.addEventListener(
      'keydown',
      event => {
        if (event.key !== 'Escape' || (!this.session && !this.source)) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        this.endDrag();
        this.cancel(true);
      },
      true,
    );
    window.addEventListener('blur', () => {
      this.endDrag();
      this.cancel();
    });
    window.addEventListener('resize', () => this.paint());
  }
  get busy() {
    return Boolean(this.session) || this.applying;
  }
  blockOf(node) {
    const element = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
    const block = element?.closest(BLOCKS);
    return block && block !== this.editor && this.editor.contains(block) ? block : null;
  }
  // Offsets count the block's text, with a soft line break (Shift+Enter) as a
  // newline so sentences on either side of it stay separate.
  blockText(block) {
    let text = '';
    const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      text += node.nodeType === Node.TEXT_NODE ? node.data : node.tagName === 'BR' ? '\n' : '';
    }
    return text;
  }
  offsetIn(block, node, offset) {
    const range = document.createRange();
    range.selectNodeContents(block);
    range.setEnd(node, offset);
    return range.toString().length + range.cloneContents().querySelectorAll('br').length;
  }
  rangeIn(block, start, end) {
    const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    const range = document.createRange();
    let seen = 0;
    let open = false;
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const isBreak = node.nodeType === Node.ELEMENT_NODE;
      if (isBreak && node.tagName !== 'BR') continue;
      const length = isBreak ? 1 : node.length;
      const place = (set, at) =>
        isBreak ? range[set + (at === 0 ? 'Before' : 'After')](node) : range[set](node, at);
      if (!open && start <= seen + length && (start < seen + length || end === start)) {
        place('setStart', start - seen);
        open = true;
      }
      if (open && end <= seen + length) {
        place('setEnd', end - seen);
        return range;
      }
      seen += length;
    }
    return null;
  }
  grabbable(event) {
    if (!this.canCombine() || this.busy || getSelection().isCollapsed) return null;
    const context = this.getContext();
    if (!context || context.collapsed || !context.selected.trim()) return null;
    const inside = selectionRects(this.editor, context.range).some(
      rect =>
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom,
    );
    return inside ? context : null;
  }
  // Pressing on the highlight holds the selection; it becomes a drag once the pointer travels.
  press(event) {
    const context = event.button === 0 && event.detail === 1 && this.grabbable(event);
    if (!context) return;
    event.preventDefault();
    this.pressed = {
      x: event.clientX,
      y: event.clientY,
      context: { ...context, range: context.range.cloneRange(), html: this.editor.innerHTML },
    };
  }
  move(event) {
    const pressed = this.pressed;
    if (!pressed) return;
    if (!this.source) {
      if (Math.hypot(event.clientX - pressed.x, event.clientY - pressed.y) < 4) return;
      this.source = pressed.context;
      document.documentElement.classList.add('combine-dragging');
      // A label of the dragged text follows the pointer.
      const text = pressed.context.selected.trim();
      this.ghost = document.createElement('div');
      this.ghost.className = 'combine-ghost';
      this.ghost.setAttribute('aria-hidden', 'true');
      this.ghost.textContent = text.length > 64 ? text.slice(0, 63).trimEnd() + '…' : text;
      document.body.append(this.ghost);
    }
    Object.assign(this.ghost.style, {
      left: `${event.clientX}px`,
      top: `${event.clientY + 14}px`,
    });
    this.setTarget(this.targetAt(event));
  }
  release(event) {
    const pressed = this.pressed;
    if (!pressed) return;
    const dragged = Boolean(this.source);
    this.endDrag(true);
    if (dragged) return;
    // A plain click on the highlight places the caret, as it would have natively.
    const caret = this.caretAt(event.clientX, event.clientY);
    if (caret && this.editor.contains(caret.node)) {
      window.getSelection().collapse(caret.node, caret.offset);
    }
  }
  endDrag(drop = false) {
    if (!this.pressed) return;
    this.pressed = null;
    document.documentElement.classList.remove('combine-dragging');
    this.ghost?.remove();
    this.ghost = null;
    this.editor.style.cursor = '';
    if (drop && this.source) this.drop();
    this.source = null;
    this.setTarget(null);
  }
  caretAt(x, y) {
    if (document.caretPositionFromPoint) {
      const position = document.caretPositionFromPoint(x, y);
      return position && { node: position.offsetNode, offset: position.offset };
    }
    const range = document.caretRangeFromPoint?.(x, y);
    return range && { node: range.startContainer, offset: range.startOffset };
  }
  // The receiving sentence must be under the pointer and apart from the dragged text.
  targetAt(event) {
    const caret = this.caretAt(event.clientX, event.clientY);
    const block = caret && this.editor.contains(caret.node) && this.blockOf(caret.node);
    if (!block) return null;
    const text = this.blockText(block);
    const span = sentenceAt(
      text,
      this.offsetIn(block, caret.node, caret.offset),
      document.documentElement.lang,
    );
    const range = span && this.rangeIn(block, span.start, span.end);
    if (!range) return null;
    const source = this.source.range;
    if (
      range.compareBoundaryPoints(Range.END_TO_START, source) < 0 &&
      range.compareBoundaryPoints(Range.START_TO_END, source) > 0
    ) {
      return null;
    }
    const rects = selectionRects(this.editor, range);
    const slack = rects.length ? rects[0].height * 0.4 : 0;
    if (
      !rects.some(
        rect =>
          event.clientX >= rect.left - 4 &&
          event.clientX <= rect.right + 4 &&
          event.clientY >= rect.top - slack &&
          event.clientY <= rect.bottom + slack,
      )
    ) {
      return null;
    }
    return { block, span, range, text: text.slice(span.start, span.end) };
  }
  setTarget(target) {
    if (this.session) return;
    const same = (a, b) =>
      a?.block === b?.block && a?.span.start === b?.span.start && a?.span.end === b?.span.end;
    if (same(target, this.target)) return;
    this.target = target;
    this.paint();
  }
  layer(name, range, mark = '') {
    const { place } = surfacePlacement(this.surface);
    const layer = document.createElement('div');
    layer.className = `combine-layer ${name}`;
    layer.setAttribute('aria-hidden', 'true');
    for (const rect of selectionRects(this.editor, range)) {
      const span = document.createElement('span');
      span.className = mark;
      place(span, rect);
      layer.append(span);
    }
    return layer;
  }
  paint() {
    this.layers?.forEach(layer => layer.remove());
    const session = this.session;
    const target = session?.target || this.target;
    this.layers = target ? [this.layer('combine-target', target.range)] : [];
    // The sentence receiving the other one shimmers while the combined wording is written.
    if (session) {
      this.layers.push(
        this.layer('combine-source', session.source.range, 'rewrite-discarded'),
        this.layer('combine-pending', session.target.range, 'rewrite-shimmer'),
      );
    }
    this.surface.append(...this.layers);
  }
  drop() {
    const source = this.source;
    const target = this.target;
    this.source = null;
    if (!target) {
      this.notify('Drop the selection onto another sentence to combine them.');
      return;
    }
    if (!this.client.ready) {
      this.setTarget(null);
      this.connect();
      return;
    }
    if (this.editor.innerHTML !== source.html) {
      this.setTarget(null);
      return;
    }
    this.pauseCompose();
    this.hideHandle();
    const around = this.contextOf(target.range);
    const session = {
      source,
      target,
      request: {
        before: around.before,
        target: target.text,
        after: around.after,
        dragged: source.selected,
      },
    };
    this.session = session;
    this.target = null;
    this.editor.classList.add('rewriting');
    this.editor.setAttribute('aria-busy', 'true');
    this.notify('Combining…');
    this.paint();
    this.run(session);
  }
  async run(session) {
    try {
      const text = combineText(await this.client.combine(session.request), session.request);
      if (this.session !== session) return;
      if (!text) throw new Error('No combined sentence came back. Try again.');
      this.finish(session, text);
    } catch (error) {
      if (this.session !== session) return;
      this.cancel(true);
      this.notify(
        error.name === 'AbortError'
          ? 'Combine cancelled. Original text kept.'
          : error.message + ' Original text kept.',
      );
    }
  }
  clear() {
    const session = this.session;
    this.session = null;
    this.target = null;
    this.paint();
    this.editor.classList.remove('rewriting');
    this.editor.removeAttribute('aria-busy');
    return session;
  }
  cancel(restoreFocus = false) {
    if (!this.session) return;
    const session = this.clear();
    this.client.cancel();
    if (restoreFocus && this.editor.innerHTML === session.source.html) {
      this.editor.focus({ preventScroll: true });
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(session.source.range);
    }
    this.notify('Combine cancelled. Original text kept.');
    this.idle();
  }
  // The dragged passage leaves with the whitespace that set it apart, and
  // takes its paragraph along when nothing else is in it.
  removalRange(source) {
    const block = this.blockOf(source.startContainer);
    const range = source.cloneRange();
    if (!block || block !== this.blockOf(source.endContainer)) return range;
    const text = this.blockText(block);
    const span = removalSpan(
      text,
      this.offsetIn(block, source.startContainer, source.startOffset),
      this.offsetIn(block, source.endContainer, source.endOffset),
    );
    const widened = this.rangeIn(block, span.start, span.end) || range;
    if (!text.slice(0, span.start).trim() && !text.slice(span.end).trim()) {
      const previous = block.previousElementSibling;
      const next = block.nextElementSibling;
      if (previous) {
        widened.setStart(previous, previous.childNodes.length);
        widened.setEnd(block, block.childNodes.length);
      } else if (next?.nodeName === block.nodeName) {
        widened.setStart(block, 0);
        widened.setEnd(next, 0);
      }
    }
    return widened;
  }
  // One edit when both passages share a block and its formatting, so a single
  // undo restores them; otherwise the later passage changes first.
  finish(session, text) {
    const { source, target } = session;
    this.applying = true;
    try {
      this.clear();
      if (this.editor.innerHTML !== source.html)
        this.notify('Document changed. Combine cancelled.');
      else {
        const block = target.block;
        const together =
          this.blockOf(source.range.startContainer) === block &&
          this.blockOf(source.range.endContainer) === block;
        let merged = null;
        if (together) {
          const span = {
            start: this.offsetIn(block, source.range.startContainer, source.range.startOffset),
            end: this.offsetIn(block, source.range.endContainer, source.range.endOffset),
          };
          const edit = mergeSpans(this.blockText(block), span, target.span, text);
          const range = this.rangeIn(block, edit.start, edit.end);
          const parents = new Set();
          const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
          while (range && walker.nextNode()) {
            if (range.intersectsNode(walker.currentNode))
              parents.add(walker.currentNode.parentNode);
          }
          if (range && parents.size === 1) {
            merged = {
              range,
              text: edit.text,
              lead: edit.start === target.span.start ? 0 : edit.text.length - text.length,
            };
          }
        }
        let inserted;
        if (merged) {
          inserted = this.commit(
            merged.range,
            merged.text,
            'Combined into one sentence. Undo to restore.',
          );
          // Flash only the new sentence, not the text carried between the two.
          if (inserted) {
            const start =
              this.offsetIn(block, inserted.startContainer, inserted.startOffset) + merged.lead;
            inserted = this.rangeIn(block, start, start + text.length) || inserted;
          }
        } else {
          const done = 'Combined into one sentence. Undo twice to restore.';
          const removal = this.removalRange(source.range);
          const sourceFirst =
            source.range.compareBoundaryPoints(Range.START_TO_START, target.range) < 0;
          if (sourceFirst) {
            inserted = this.commit(target.range, text, done);
            if (inserted) this.commit(removal, '', done);
          } else if (this.commit(removal, '', done))
            inserted = this.commit(target.range, text, done);
        }
        if (inserted) {
          const selection = window.getSelection();
          const caret = inserted.cloneRange();
          caret.collapse(false);
          selection.removeAllRanges();
          selection.addRange(caret);
          this.flash(inserted);
        }
      }
    } finally {
      this.applying = false;
      this.idle();
    }
  }
}
