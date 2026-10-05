import { createDiagnostics } from './diagnostics.js?v=0ef30d68e0b0';
import {
  MAX_WORDS,
  MAX_CHARS,
  wordCount,
  withinLimit,
  fitInsertion,
  inspectCompletion,
  inspectAlternatives,
  inspectParagraphs,
  reuseCompletion,
  SUGGESTION_DELAY_MS,
  ALTERNATIVE_COUNT,
  plainSpaces,
} from './compose-core.js?v=2b7382bcbabf';
import { RealtimeCompose } from './realtime.js?v=b4675acd09d9';
import { removeLegacyKey } from './key-storage.js?v=8fc4059c72f9';
import { SelectionRewrite } from './selection-rewrite.js?v=48af245f0686';
import { SelectionCombine } from './selection-combine.js?v=833383fe8ed4';

const $ = id => document.getElementById(id);
const editor = $('editor');
const ghost = $('suggestion');
const title = $('title');
const smart = $('smart');
const multi = $('multi');
const paragraph = $('paragraph');
const styleTabs = $('style-tabs');
const resize = $('resize');
const rephrase = $('rephrase');
const combine = $('combine');
const intelligence = $('intelligence');
const dialog = $('key-dialog');
const keyInput = $('api-key');
let completion = '';
let suggestionContext = '';
let composing = false;
let savedRange = null;
let spacedBlock = null;
let recentSuggestion = null;
// alternatives[0] is always the visible completion. cycle is the short window
// after accepting in multiple mode when Tab swaps in the next alternative.
let alternatives = [];
let alternativesPending = false;
let cycle = null;
const CYCLE_MS = 1500;
const PARAGRAPH_CYCLE_MS = 8000;
// 'inline' continues a paragraph; 'paragraph' drafts an empty one, with a
// one-word style label per alternative shown as tabs above it.
let suggestionKind = 'inline';
let labels = [];
let tabsBlock = null;
// Multiple tab autocomplete is the default. The menu keeps the chosen mode while
// disconnected (suggestions simply wait for a connection), and reconnecting restores it.
let preferMulti = true;
let timer;
let revision = 0;
let lastRequest = '';
let lastSelection = '';
let inputArmed = false;
let connectionAttempt = 0;
let validHTML = editor.innerHTML;
let beforeEdit = null;
let rewriter = null;
let combiner = null;
// A rewrite or a combine owns the document until it lands or is abandoned.
const working = () => Boolean(rewriter?.busy || combiner?.busy);
const cancelWork = () => {
  rewriter?.cancel();
  combiner?.cancel();
};
let debugStorage;
try {
  debugStorage = window.sessionStorage;
} catch {}
const debug = createDiagnostics({ storage: debugStorage });
let requestSequence = 0;
let visibleText = '';
const pageId = crypto.randomUUID();
const trace = (event, data = {}) => debug.record(event, { pageId, revision, ...data });
trace('page-load', { build: import.meta.url, visibility: document.visibilityState });
function saveDebugLog() {
  trace('log-export');
  debug.flush();
  const blob = new Blob([JSON.stringify(debug.snapshot(), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `text-and-autocomplete-debug-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
window.textAndAutocompleteDebug = Object.freeze({
  snapshot: debug.snapshot,
  download: saveDebugLog,
});
$('save-debug-log').addEventListener('click', saveDebugLog);
let wasReady = false;
let leaving = false;
const client = new RealtimeCompose(
  (state, message) => {
    trace('connection-state', { state });
    $('connect').textContent =
      state === 'ready' ? 'Connected' : state === 'connecting' ? 'Connecting…' : 'Connect OpenAI';
    $('connect').dataset.state = state;
    $('disconnect').hidden = !client.ready;
    if (state === 'error' || state === 'disconnected') {
      cancelWork();
      endCycle('connection-' + state);
      inputArmed = false;
      lastRequest = '';
      recentSuggestion = null;
      clearSuggestion('connection-' + state);
    }
    rewriter?.update();
    if (message) showNotice(message);
    const dropped = wasReady && state !== 'ready' && !leaving;
    wasReady = state === 'ready';
    gate();
    // The dialog covers the notice, so say there why it came back.
    if (dropped) {
      $('key-error').textContent = message || 'The connection closed. Connect again to keep going.';
    }
  },
  { diagnose: (event, data) => trace(event, data) },
);
function showNotice(message) {
  $('notice').textContent = message;
}
function selectionRange() {
  const selection = window.getSelection();
  return selection?.rangeCount &&
    editor.contains(selection.anchorNode) &&
    editor.contains(selection.focusNode)
    ? selection.getRangeAt(0)
    : null;
}
function plainText(node) {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent;
  if (node.nodeName === 'BR') return '\n';
  let text = '';
  for (const child of node.childNodes) {
    if (/^(P|DIV|H[1-6]|LI)$/.test(child.nodeName) && text && !text.endsWith('\n')) text += '\n';
    text += plainText(child);
  }
  return text;
}
function context() {
  const range = selectionRange();
  return range && contextOf(range);
}
function contextOf(range) {
  const before = range.cloneRange();
  before.selectNodeContents(editor);
  before.setEnd(range.startContainer, range.startOffset);
  const after = range.cloneRange();
  after.selectNodeContents(editor);
  after.setStart(range.endContainer, range.endOffset);
  return {
    before: plainText(before.cloneContents()),
    selected: plainText(range.cloneContents()),
    after: plainText(after.cloneContents()),
    range,
    collapsed: range.collapsed,
  };
}
function contextKey(ctx) {
  return ctx ? JSON.stringify([ctx.before, ctx.after]) : '';
}
function ineligibleReason(ctx) {
  // Suggest only after actual typing and at a paragraph end. Never cover existing text.
  if (!ctx) return 'no-editor-selection';
  if (!ctx.collapsed) return 'selected-text';
  if (!inputArmed) return 'not-armed-by-typing';
  if (composing) return 'composition-active';
  if (working()) return 'rewrite-active';
  if (!client.ready) return 'disconnected';
  if (dialog.open) return 'settings-open';
  if (document.activeElement !== editor) return 'editor-unfocused';
  if (!withinLimit(editor.innerText) || wordCount(editor.innerText) >= MAX_WORDS) {
    return 'document-limit';
  }
  const block = blockOf(ctx);
  const tail = ctx.range.cloneRange();
  tail.selectNodeContents(block);
  tail.setStart(ctx.range.startContainer, ctx.range.startOffset);
  if (tail.toString().trim()) return 'text-after-caret-in-paragraph';
  if (kindOf(ctx) === 'paragraph') return paragraph.checked ? null : 'suggested-paragraph-off';
  if (!smart.checked && !multi.checked) return 'smart-compose-off';
  return /\S/.test(ctx.before.split('\n').at(-1) || '') ? null : 'empty-paragraph';
}
function blockOf(ctx) {
  let block =
    ctx.range.startContainer.nodeType === Node.TEXT_NODE
      ? ctx.range.startContainer.parentElement
      : ctx.range.startContainer;
  while (block !== editor && block.parentElement !== editor) block = block.parentElement;
  return block;
}
// An empty body paragraph, anywhere in the document, asks for a whole paragraph.
function kindOf(ctx) {
  const block = ctx && blockOf(ctx);
  return block && block !== editor && /^(P|DIV)$/.test(block.nodeName) && !block.textContent.trim()
    ? 'paragraph'
    : 'inline';
}
function eligible(ctx) {
  return ineligibleReason(ctx) === null;
}
// Style tabs need room below the paragraph; reserve it only while they show.
function reserveTabs(block) {
  if (tabsBlock === block) return;
  tabsBlock?.style.removeProperty('--tabs-space');
  tabsBlock = block;
  block?.style.setProperty('--tabs-space', '24px');
}
function hideSuggestion(reason) {
  if (cycle) return;
  if (!ghost.hidden) trace('suggestion-hidden', { reason, suggestion: completion || visibleText });
  ghost.hidden = true;
  styleTabs.hidden = true;
  visibleText = '';
  reserveTabs(null);
}
function clearSuggestion(reason = 'cleared') {
  hideSuggestion(reason);
  completion = '';
  alternatives = [];
  labels = [];
  suggestionContext = '';
  if (spacedBlock) {
    spacedBlock.style.removeProperty('--completion-space');
    spacedBlock = null;
  }
}
function invalidate(reason = 'invalidated') {
  trace('invalidated', { reason });
  revision++;
  lastRequest = '';
  clearTimeout(timer);
  client.cancel();
  clearSuggestion(reason);
}
// Cancel pending suggestions and wait for the person to type again.
function disarm(reason) {
  inputArmed = false;
  invalidate(reason);
}
function endCycle(reason) {
  if (!cycle) return;
  trace('alternative-cycle-ended', { reason, index: cycle.index });
  clearTimeout(cycle.timer);
  cycle = null;
  hideSuggestion(reason);
}
function paintSuggestion() {
  // Checked before context(), which copies the document on every selection change.
  if (!cycle && !completion) {
    hideSuggestion('empty-completion');
    return;
  }
  const ctx = context();
  if (cycle && (!ctx?.collapsed || contextKey(ctx) !== cycle.key)) endCycle('context-changed');
  const hiddenReason = cycle
    ? null
    : !completion
      ? 'empty-completion'
      : ineligibleReason(ctx) || (contextKey(ctx) !== suggestionContext ? 'context-changed' : null);
  if (hiddenReason) {
    hideSuggestion(hiddenReason);
    return;
  }
  const block = blockOf(ctx);
  const tabLabels = cycle ? cycle.labels : suggestionKind === 'paragraph' ? labels : [];
  reserveTabs(tabLabels.length ? block : null);
  let rect = ctx.range.getBoundingClientRect();
  const page = document.querySelector('.page').getBoundingClientRect();
  const zoom = Number($('zoom').value);
  // A caret in an empty paragraph has no box of its own; use the paragraph's first line.
  if (!rect.height && kindOf(ctx) === 'paragraph') {
    const box = block.getBoundingClientRect();
    const pad = parseFloat(getComputedStyle(block).paddingBottom) * zoom;
    rect = { left: box.left, top: box.top, height: box.height - pad };
  }
  if (!rect.height) {
    hideSuggestion('caret-has-no-geometry');
    return;
  }
  const element =
    ctx.range.startContainer.nodeType === Node.TEXT_NODE
      ? ctx.range.startContainer.parentElement
      : ctx.range.startContainer;
  const style = getComputedStyle(element);
  for (const property of ['fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'lineHeight']) {
    ghost.style[property] = style[property];
  }
  const editorRect = editor.getBoundingClientRect();
  ghost.style.left = `${(editorRect.left - page.left) / zoom - 1}px`;
  ghost.style.top = `${(rect.top - page.top) / zoom - 1 - (parseFloat(style.lineHeight) - rect.height / zoom) / 2}px`;
  ghost.style.width = `${editorRect.width / zoom}px`;
  const spacer = document.createElement('span');
  spacer.style.display = 'inline-block';
  spacer.style.width = `${Math.max(0, (rect.left - editorRect.left) / zoom)}px`;
  spacer.style.height = '1px';
  ghost.replaceChildren(spacer, document.createTextNode(cycle ? '' : completion));
  // With style tabs, the badge sits beside the active tab instead of after the text.
  const badge = document.createElement('kbd');
  badge.textContent = 'tab';
  if (!tabLabels.length) ghost.append(badge);
  if (cycle ? cycle.kind === 'inline' : suggestionKind === 'inline' && multi.checked) {
    const pager = document.createElement('span');
    pager.className = 'pager';
    const count = cycle
      ? cycle.texts.length
      : alternativesPending
        ? ALTERNATIVE_COUNT
        : alternatives.length;
    for (let index = 0; index < count; index++) {
      const dot = document.createElement('i');
      if (index === (cycle ? cycle.index : 0)) dot.className = 'current';
      pager.append(dot);
    }
    badge.append(pager);
  }
  badge.classList.toggle('cycling', Boolean(cycle));
  if (!cycle && (ghost.hidden || completion !== visibleText)) {
    trace(ghost.hidden ? 'suggestion-shown' : 'suggestion-updated', { suggestion: completion });
  }
  ghost.hidden = false;
  visibleText = cycle ? '' : completion;
  styleTabs.hidden = !tabLabels.length;
  if (tabLabels.length) {
    styleTabs.replaceChildren(
      ...tabLabels.map((label, index) => {
        const tab = document.createElement('span');
        tab.textContent = label;
        if (index === (cycle ? cycle.index : 0)) tab.className = 'current';
        return tab;
      }),
    );
    styleTabs.querySelector('.current').after(badge);
    styleTabs.classList.toggle('cycling', Boolean(cycle));
    styleTabs.style.left = ghost.style.left;
    styleTabs.style.width = ghost.style.width;
    styleTabs.style.top = `${parseFloat(ghost.style.top) + ghost.offsetHeight}px`;
  }
  if (block !== editor) {
    spacedBlock = block;
    block.style.setProperty(
      '--completion-space',
      `${Math.max(0, ghost.offsetHeight - parseFloat(style.lineHeight))}px`,
    );
  }
}
function updateCount() {
  const words = wordCount(editor.innerText);
  $('word-limit').textContent = `${words} / ${MAX_WORDS}`;
  $('word-limit').dataset.full = String(words >= MAX_WORDS);
}
function schedule() {
  const ctx = context();
  const blocked = ineligibleReason(ctx);
  if (blocked || contextKey(ctx) === lastRequest) {
    trace('request-skipped', { reason: blocked || 'same-context-already-requested' });
    return;
  }
  const generation = revision;
  const key = contextKey(ctx);
  const attempt = `${pageId}:${++requestSequence}`;
  trace('request-scheduled', {
    attempt,
    beforeChars: ctx.before.length,
    afterChars: ctx.after.length,
  });
  clearTimeout(timer);
  timer = setTimeout(async () => {
    const staleReason = () =>
      generation !== revision
        ? 'revision-changed'
        : contextKey(context()) !== key
          ? 'context-changed'
          : ineligibleReason(context());
    const blocked = staleReason();
    if (blocked) {
      trace('request-skipped', { attempt, reason: blocked });
      return;
    }
    lastRequest = key;
    trace('compose-request', {
      attempt,
      beforeTail: ctx.before.slice(-160),
      afterHead: ctx.after.slice(0, 80),
    });
    let previousReason;
    const kind = kindOf(ctx);
    const wantAlternatives = kind === 'inline' && multi.checked;
    const inspect = (text, finished) =>
      kind === 'paragraph'
        ? inspectParagraphs(text, ctx.before, ctx.after, finished)
        : wantAlternatives
          ? inspectAlternatives(text, ctx.before, ctx.after, finished)
          : inspectCompletion(text, ctx.before, ctx.after, finished);
    const show = decoded => {
      alternatives = decoded.texts || [decoded.text];
      labels = decoded.labels || [];
      suggestionKind = kind;
      completion = decoded.text;
      suggestionContext = key;
    };
    alternativesPending = wantAlternatives;
    try {
      const result = await client.request(
        ctx,
        (text, finished) => {
          const stale = staleReason();
          if (stale) {
            if (finished) trace('response-ignored', { attempt, reason: stale, stage: 'text-done' });
            return;
          }
          const decoded = inspect(text, finished);
          if (finished || decoded.reason !== previousReason) {
            trace('completion-validation', {
              attempt,
              stage: finished ? 'text-done' : 'stream',
              reason: decoded.reason || 'accepted',
              rawChars: text.length,
              raw: text,
              suggestion: decoded.text,
            });
          }
          previousReason = decoded.reason;
          if (!decoded.text) {
            clearSuggestion(decoded.reason);
            return;
          }
          if (
            JSON.stringify([decoded.texts || [decoded.text], decoded.labels || []]) ===
            JSON.stringify([alternatives, labels])
          ) {
            return;
          }
          show(decoded);
          paintSuggestion();
        },
        attempt,
        { alternatives: wantAlternatives, paragraphs: kind === 'paragraph' },
      );
      const stale = staleReason();
      if (stale) {
        trace('response-ignored', { attempt, reason: stale, stage: 'response-done' });
        return;
      }
      alternativesPending = false;
      const decoded = inspect(result, true);
      trace('completion-validation', {
        attempt,
        stage: 'response-done',
        reason: decoded.reason || 'accepted',
        rawChars: result.length,
        raw: result,
        suggestion: decoded.text,
      });
      if (!decoded.text) clearSuggestion(decoded.reason);
      else show(decoded);
      recentSuggestion =
        completion && kind === 'inline'
          ? {
              context: { before: ctx.before, after: ctx.after },
              texts: alternatives,
              time: Date.now(),
            }
          : null;
      paintSuggestion();
    } catch (error) {
      trace('request-error', {
        attempt,
        reason: error.name === 'AbortError' ? 'cancelled' : 'failed',
        message: error.message,
      });
      if (error.name !== 'AbortError' && generation === revision) {
        clearSuggestion('request-error');
        showNotice(error.message);
      }
    }
  }, SUGGESTION_DELAY_MS);
}
function pathOf(node) {
  const path = [];
  while (node !== editor) {
    path.unshift([...node.parentNode.childNodes].indexOf(node));
    node = node.parentNode;
  }
  return path;
}
function snapshot() {
  const r = selectionRange();
  const copy = editor.cloneNode(true);
  for (const element of copy.querySelectorAll('[style]')) {
    element.style.removeProperty('--completion-space');
    element.style.removeProperty('--tabs-space');
  }
  return {
    html: copy.innerHTML,
    selection: r
      ? [pathOf(r.startContainer), r.startOffset, pathOf(r.endContainer), r.endOffset]
      : null,
  };
}
function restoreSnapshot(state) {
  editor.innerHTML = state.html;
  if (state.selection) {
    try {
      const [start, offset, end, endOffset] = state.selection;
      const r = document.createRange();
      r.setStart(
        start.reduce((node, i) => node.childNodes[i], editor),
        offset,
      );
      r.setEnd(
        end.reduce((node, i) => node.childNodes[i], editor),
        endOffset,
      );
      const s = window.getSelection();
      s.removeAllRanges();
      s.addRange(r);
    } catch {
      placeAtEnd();
    }
  }
}
function placeAtEnd() {
  const r = document.createRange();
  r.selectNodeContents(editor);
  r.collapse(false);
  const s = window.getSelection();
  s.removeAllRanges();
  s.addRange(r);
}
function changed(event) {
  trace('editor-input', { inputType: event?.inputType || 'programmatic', composing });
  if (working()) return;
  const current = context();
  if (cycle && !cycle.applying) endCycle('editor-input');
  let reusable = [];
  const reuseAll = (previous, texts) =>
    texts.map(text => reuseCompletion(previous, text, current)).filter(text => text.trim());
  if (!composing && current?.collapsed) {
    if (completion && suggestionContext && suggestionKind === 'inline') {
      const [before, after] = JSON.parse(suggestionContext);
      reusable = reuseAll({ before, after }, alternatives);
    }
    if (!reusable.length && recentSuggestion && Date.now() - recentSuggestion.time < 30000) {
      reusable = reuseAll(recentSuggestion.context, recentSuggestion.texts);
    }
  }
  invalidate('editor-input');
  if (composing) return;
  if (!withinLimit(editor.innerText)) {
    restoreSnapshot(beforeEdit || { html: validHTML });
    showNotice(
      `Keep the document within ${MAX_WORDS} words and ${MAX_CHARS.toLocaleString()} characters.`,
    );
    inputArmed = false;
  } else {
    validHTML = editor.innerHTML;
    inputArmed = true;
    showNotice('');
  }
  beforeEdit = null;
  lastSelection = contextKey(context());
  updateCount();
  if (reusable.length && eligible(context())) {
    trace('suggestion-reused', { suggestion: reusable[0] });
    alternatives = reusable;
    completion = reusable[0];
    alternativesPending = false;
    suggestionContext = lastSelection;
    paintSuggestion();
  } else schedule();
}
editor.addEventListener('beforeinput', event => {
  if (working() && !rewriter.applying && !combiner.applying) {
    event.preventDefault();
    return;
  }
  if (!composing) beforeEdit = snapshot();
});
editor.addEventListener('input', changed);
editor.addEventListener('compositionstart', () => {
  beforeEdit = snapshot();
  composing = true;
  invalidate('composition-start');
});
editor.addEventListener('compositionend', () => {
  composing = false;
  changed();
});
// Select the text just inserted by walking back from the caret, so the next
// alternative replaces it through the native undo stack.
function insertedRange(length) {
  const caret = selectionRange();
  if (!caret?.collapsed) return null;
  const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
  let node = caret.startContainer;
  let offset = caret.startOffset;
  if (node.nodeType !== Node.TEXT_NODE) return null;
  walker.currentNode = node;
  while (length > offset) {
    length -= offset;
    node = walker.previousNode();
    if (!node) return null;
    offset = node.length;
  }
  const range = document.createRange();
  range.setStart(node, offset - length);
  range.setEnd(caret.startContainer, caret.startOffset);
  return range;
}
function applyAlternative(index) {
  const range = insertedRange(cycle.inserted.length);
  if (!range || plainSpaces(range.toString()) !== plainSpaces(cycle.inserted)) {
    endCycle('inserted-text-not-found');
    return;
  }
  const text = fitInsertion(cycle.before, cycle.texts[index], cycle.after);
  if (!text) {
    endCycle('document-limit');
    return;
  }
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
  cycle.applying = true;
  beforeEdit = snapshot();
  const applied = document.execCommand('insertText', false, text);
  cycle.applying = false;
  disarm('alternative-applied');
  if (!applied) {
    endCycle('insert-failed');
    return;
  }
  cycle.index = index;
  cycle.inserted = text;
  cycle.key = lastSelection = contextKey(context());
  trace('alternative-applied', { index, suggestion: text });
  updateCount();
}
function startCycleTimer() {
  clearTimeout(cycle.timer);
  cycle.timer = setTimeout(
    () => endCycle('timeout'),
    cycle.kind === 'paragraph' ? PARAGRAPH_CYCLE_MS : CYCLE_MS,
  );
}
editor.addEventListener('keydown', event => {
  if (cycle && event.key === 'Tab' && !event.shiftKey && !composing) {
    event.preventDefault();
    if (cycle.texts.length > 1) applyAlternative((cycle.index + 1) % cycle.texts.length);
    if (cycle) {
      startCycleTimer();
      paintSuggestion();
    }
    return;
  }
  if (cycle && !['Shift', 'Control', 'Alt', 'Meta'].includes(event.key)) {
    endCycle('key-' + (event.key === 'Escape' ? 'escape' : 'other'));
  }
  if (event.key === 'Tab' && !event.shiftKey && !composing && completion && !ghost.hidden) {
    const ctx = context();
    if (contextKey(ctx) !== suggestionContext) return;
    event.preventDefault();
    const text = completion;
    const texts = alternatives;
    const kind = suggestionKind;
    const styles = labels;
    const keep = kind === 'paragraph' || multi.checked;
    beforeEdit = snapshot();
    invalidate('suggestion-accepted');
    const inserted = fitInsertion(ctx.before, text, ctx.after);
    document.execCommand('insertText', false, inserted);
    disarm('after-accept');
    updateCount();
    if (keep && inserted) {
      cycle = {
        texts,
        labels: kind === 'paragraph' ? styles : [],
        kind,
        index: 0,
        inserted,
        before: ctx.before,
        after: ctx.after,
        key: contextKey(context()),
        applying: false,
        timer: null,
      };
      lastSelection = cycle.key;
      startCycleTimer();
      paintSuggestion();
    }
  } else if (event.key === 'Escape') {
    recentSuggestion = null;
    disarm('escape');
  }
});
editor.addEventListener('paste', event => {
  event.preventDefault();
  const ctx = context();
  if (!ctx) return;
  const pasted = event.clipboardData.getData('text/plain');
  const fitted = fitInsertion(ctx.before, pasted, ctx.after);
  beforeEdit = snapshot();
  document.execCommand('insertText', false, fitted);
  if (fitted !== pasted) showNotice('Pasted text was shortened to fit the document limit.');
});
editor.addEventListener('drop', event => {
  event.preventDefault();
  showNotice('Paste text to add it to this document.');
});
editor.addEventListener('blur', () => {
  endCycle('editor-blur');
  if (working()) return;
  disarm('editor-blur');
});
document.addEventListener('selectionchange', () => {
  if (working()) return;
  const r = selectionRange();
  if (r) savedRange = r.cloneRange();
  const key = contextKey(context());
  if (completion && key !== suggestionContext) clearSuggestion('selection-changed');
  // Cursor movement invalidates pending network results without issuing new requests.
  if (lastSelection && key !== lastSelection) {
    disarm('selection-changed');
  }
  lastSelection = key;
  paintSuggestion();
  for (const button of document.querySelectorAll('[data-command]')) {
    button.setAttribute('aria-pressed', String(document.queryCommandState(button.dataset.command)));
  }
  rewriter?.update();
});
function restore() {
  editor.focus();
  if (savedRange && editor.contains(savedRange.startContainer)) {
    const s = window.getSelection();
    s.removeAllRanges();
    s.addRange(savedRange);
  }
}
function command(name, value) {
  cancelWork();
  restore();
  beforeEdit = snapshot();
  document.execCommand(name, false, value);
  changed();
  disarm('format-command');
}
for (const button of document.querySelectorAll('[data-command]')) {
  button.addEventListener('mousedown', e => e.preventDefault());
  button.onclick = () => command(button.dataset.command);
}
for (const action of ['undo', 'redo']) $(action).onclick = () => command(action);
$('style').onchange = e => command('formatBlock', e.target.value);
$('font').onchange = e => command('fontName', e.target.value);
$('size').onchange = e => {
  command('fontSize', '7');
  for (const font of editor.querySelectorAll('font[size="7"]')) {
    font.removeAttribute('size');
    font.style.fontSize = e.target.value + 'px';
  }
  validHTML = editor.innerHTML;
};
$('zoom').onchange = e => {
  document.querySelector('.page-stack').style.zoom = e.target.value;
  paintSuggestion();
  rewriter?.paint();
};
window.addEventListener('resize', paintSuggestion);
title.maxLength = 120;
title.oninput = () => {
  document.title = (title.value || 'Untitled document') + ' — Text and Autocomplete';
};
// The prototype is usable only with a working connection: until then the
// connect dialog stays open and cannot be dismissed.
function gate() {
  $('close-settings').hidden = !client.ready;
  if (!client.ready && !dialog.open && rewriter) openSettings();
}
// Keys live only in the input and the in-flight connection request.
function updateRemoveKey() {
  $('forget-key').hidden = !keyInput.value;
}
function cleanLegacyKey() {
  $('key-storage-warning').hidden = removeLegacyKey();
}
keyInput.addEventListener('input', updateRemoveKey);
function openSettings() {
  cancelWork();
  disarm('settings-open');
  $('key-error').textContent = '';
  $('disconnect').hidden = !client.ready;
  updateRemoveKey();
  dialog.showModal();
  rewriter?.update();
}
function setConnecting(busy) {
  $('key-submit').disabled = busy;
  keyInput.disabled = busy;
  $('key-submit').textContent = busy ? 'Connecting…' : 'I understand, let’s try';
}
function disconnect() {
  leaving = true;
  cancelWork();
  connectionAttempt++;
  disarm('disconnect');
  client.disconnect();
  cleanLegacyKey();
  endCycle('disconnect');
  keyInput.value = '';
  updateRemoveKey();
  setConnecting(false);
  leaving = false;
}
$('connect').onclick = openSettings;
$('close-settings').onclick = () => dialog.close();
dialog.addEventListener('cancel', event => {
  if (!client.ready) event.preventDefault();
});
dialog.addEventListener('close', () => {
  keyInput.value = '';
  updateRemoveKey();
  if ($('key-submit').disabled) disconnect();
  gate();
});
async function connectKey(key) {
  const attempt = ++connectionAttempt;
  setConnecting(true);
  $('key-error').textContent = '';
  keyInput.value = '';
  updateRemoveKey();
  try {
    await client.connect(key);
    if (attempt !== connectionAttempt) return;
    const message =
      'Connected. Type for suggestions, select text and drag its handle, double-click it to rephrase, or drag it onto another sentence to combine them.';
    setConnecting(false);
    (preferMulti ? multi : smart).checked = true;
    showNotice(message);
    if (dialog.open) dialog.close();
    restore();
  } catch (error) {
    if (attempt !== connectionAttempt) return;
    const message =
      error.name === 'AbortError' ? 'Connection cancelled or timed out.' : error.message;
    $('key-error').textContent = message;
    showNotice(message);
  } finally {
    key = '';
    if (attempt === connectionAttempt) {
      keyInput.value = '';
      setConnecting(false);
      updateRemoveKey();
    }
  }
}
$('key-form').onsubmit = event => {
  event.preventDefault();
  if ($('key-submit').disabled) return;
  const key = keyInput.value.trim();
  if (!key.startsWith('sk-') || key.length < 20) {
    $('key-error').textContent = 'Enter a valid OpenAI API key.';
    return;
  }
  void connectKey(key);
};
$('disconnect').onclick = () => {
  disconnect();
  showNotice('Disconnected. Enter your key again to reconnect.');
};
$('forget-key').onclick = () => {
  disconnect();
  $('key-error').textContent = '';
  showNotice('Key cleared. Enter a key to connect.');
};
resize.onchange = () => {
  trace('resize-toggled', { enabled: resize.checked });
  cancelWork();
  rewriter?.hideControls();
  rewriter?.update();
};
document.addEventListener('pointerdown', event => {
  if (!intelligence.contains(event.target)) intelligence.open = false;
});
intelligence.addEventListener('keydown', event => {
  if (event.key === 'Escape' && intelligence.open) {
    intelligence.open = false;
    intelligence.querySelector('summary').focus();
  }
});
combine.onchange = () => {
  trace('combine-toggled', { enabled: combine.checked });
  cancelWork();
};
rephrase.onchange = () => {
  trace('rephrase-toggled', { enabled: rephrase.checked });
  cancelWork();
};
paragraph.onchange = () => {
  trace('suggested-paragraph-toggled', { enabled: paragraph.checked });
  endCycle('suggested-paragraph-toggled');
  disarm('suggested-paragraph-toggled');
  if (paragraph.checked && !client.ready) openSettings();
};
// Tab autocomplete and Multiple tab autocomplete are alternatives to each other.
for (const [box, other] of [
  [smart, multi],
  [multi, smart],
]) {
  box.onchange = () => {
    if (box.checked) {
      other.checked = false;
      preferMulti = box === multi;
    }
    cancelWork();
    endCycle('smart-compose-toggled');
    disarm('smart-compose-toggled');
    if (box.checked && !client.ready) openSettings();
  };
}
window.addEventListener('pagehide', () => {
  trace('page-hidden');
  disconnect();
  debug.flush();
});
document.addEventListener('visibilitychange', () => {
  trace('visibility-changed', { state: document.visibilityState });
  if (document.hidden) {
    cancelWork();
    disarm('tab-hidden');
    debug.flush();
  }
});
const rewriteOptions = {
  editor,
  client,
  getContext: () => (dialog.open || composing ? null : context()),
  canResize: () => resize.checked,
  canRephrase: () => rephrase.checked,
  pauseCompose: () => {
    recentSuggestion = null;
    disarm('rewrite-started');
    showNotice('');
  },
  notify: showNotice,
  connect: openSettings,
  commit: (range, text, done = 'Text resized. Undo to restore the original.') => {
    editor.focus({ preventScroll: true });
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    beforeEdit = snapshot();
    const start = { node: range.startContainer, offset: range.startOffset };
    // execCommand retains the native undo stack. The preview never touched it.
    if (
      !(text ? document.execCommand('insertText', false, text) : document.execCommand('delete'))
    ) {
      showNotice('Could not apply the rewrite. Original text kept.');
      return null;
    }
    let inserted = null;
    if (!withinLimit(editor.innerText)) {
      document.execCommand('undo');
      showNotice('The rewrite exceeded the document limit. Original text kept.');
    } else {
      showNotice(done);
      // The new text runs from the old selection start to the caret.
      const caret = selectionRange();
      try {
        if (caret && start.node.isConnected) {
          inserted = document.createRange();
          inserted.setStart(
            start.node,
            Math.min(start.offset, start.node.length ?? start.node.childNodes.length),
          );
          inserted.setEnd(caret.endContainer, caret.endOffset);
        }
      } catch {
        inserted = null;
      }
    }
    validHTML = editor.innerHTML;
    beforeEdit = null;
    savedRange = selectionRange()?.cloneRange();
    lastSelection = contextKey(context());
    disarm('rewrite-committed');
    updateCount();
    return inserted;
  },
};
rewriter = new SelectionRewrite(rewriteOptions);
combiner = new SelectionCombine({
  ...rewriteOptions,
  contextOf,
  canCombine: () => combine.checked,
  flash: range => rewriter.flash(range),
  hideHandle: () => rewriter.hideControls(),
  idle: () => rewriter.update(),
});
updateCount();
const initialRange = document.createRange();
initialRange.selectNodeContents(editor.lastElementChild || editor);
initialRange.collapse(false);
editor.focus();
window.getSelection().removeAllRanges();
window.getSelection().addRange(initialRange);
savedRange = initialRange;
gate();
cleanLegacyKey();
if (document.modelContext?.registerTool) {
  const lifecycle = new AbortController();
  try {
    Promise.resolve(
      document.modelContext.registerTool(
        {
          name: 'update_document',
          description: `Replace the document title and text within the ${MAX_WORDS}-word limit. Does not send text to OpenAI.`,
          inputSchema: {
            type: 'object',
            properties: { title: { type: 'string' }, text: { type: 'string' } },
            required: ['title', 'text'],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false },
          execute(input) {
            if (
              !input ||
              typeof input.title !== 'string' ||
              typeof input.text !== 'string' ||
              input.title.length > title.maxLength ||
              !withinLimit(input.text)
            ) {
              throw new Error(
                `Use a title up to ${title.maxLength} characters and text within ${MAX_WORDS} words / ${MAX_CHARS.toLocaleString('en-US')} characters.`,
              );
            }
            cancelWork();
            disarm('document-replaced');
            title.value = input.title;
            title.dispatchEvent(new Event('input'));
            editor.replaceChildren();
            for (const line of input.text.split(/\r?\n/)) {
              const p = document.createElement('p');
              if (line) p.textContent = line;
              else p.append(document.createElement('br'));
              editor.append(p);
            }
            validHTML = editor.innerHTML;
            savedRange = null;
            updateCount();
            return { updated: true, words: wordCount(input.text) };
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => {});
  } catch {}
  window.addEventListener('pagehide', () => lifecycle.abort(), { once: true });
}
