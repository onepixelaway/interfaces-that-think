import { READERS, REACTION_CHOICES, firstName } from './readers.js?v=196534db43aa';
import { THREADS, REACTIONS } from './panel-notes.js?v=dc9eb17f3a6a';
import { BLOCKS, blocksOf, locate, unwrapAll, wrap } from './anchors.js?v=bdd6fa0a4449';
import { checkReading, list, mergeNotes, record, visibleNotes } from './notes.js?v=927cf6c4a6b3';
import { ASIDES } from './live-notes.js?v=fa808184607b';
import { createLive } from './live.js?v=9037b6ae36c5';
import { createRow } from './row.js?v=4671122db52e';
import { createFocus } from './focus.js?v=78638b71b878';
import { portrait } from './critters.js?v=b65e4435c03d';
import { createReadingDot } from './reading-dot.js?v=4562cc0d4220';
import { createCursors } from './cursors.js?v=ba22bfc140bf';

const $ = id => document.getElementById(id);
const article = document.querySelector('.article-body');
const page = document.querySelector('.page');
const rail = $('reaction-rail');
const panel = $('thread-panel');
const hoverCard = $('hover-card');
const picker = $('react-picker');
const choices = $('react-choices');
// The widths style.css switches layouts at: below 900px the panel covers the
// page rather than sitting beside it.
const NARROW = matchMedia('(max-width: 899px)');
const PENCIL =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';

let noticeTimer;
function showNotice(message) {
  clearTimeout(noticeTimer);
  $('notice').textContent = message;
  if (message) noticeTimer = setTimeout(() => ($('notice').textContent = ''), 5000);
}

// What this browser remembers: the readers and what edited ones said, who's
// hidden, your own reactions, and what's shown.
// Versioned: what an older version kept is left behind.
const STORAGE_KEY = 'reading-with-more-pov.v3';
let storage = null;
try {
  storage = window.localStorage;
} catch {}
let saved = {};
try {
  saved = JSON.parse(storage?.getItem(STORAGE_KEY) ?? '{}') ?? {};
} catch {}
// What an edited reader said, and your own reactions, as this version saves them.
const isSaid = said =>
  record(said) === said &&
  ['threads', 'replies', 'reactions', 'asides'].every(key => list(said[key]) === said[key]);
const isMine = mine =>
  typeof mine?.quote === 'string' && typeof mine.emoji === 'string' && Number.isInteger(mine.block);
const isReader = reader =>
  reader && ['id', 'name', 'role', 'color', 'about'].every(key => typeof reader[key] === 'string');
const state = {
  readers:
    Array.isArray(saved.readers) && saved.readers.every(isReader)
      ? saved.readers
      : structuredClone(READERS),
  hidden: new Set(Array.isArray(saved.hidden) ? saved.hidden : []),
  generated: Object.fromEntries(
    Object.entries(record(saved.generated)).filter(([, s]) => isSaid(s)),
  ),
  mine: list(saved.mine).filter(isMine),
  // document: underlines, a discussion panel, and reactions in the margin;
  // row: the readers in a row at the bottom, talking as you scroll;
  // cursors: the readers' cursors in the margins, chatting as you scroll.
  // The reading couch first, unless you've chosen another.
  style: ['document', 'cursors'].includes(saved.style) ? saved.style : 'row',
  showComments: saved.showComments ?? true,
  showReactions: saved.showReactions ?? true,
  rowReactions: saved.rowReactions ?? true,
  cursorReactions: saved.cursorReactions ?? true,
};
function save() {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify({ ...state, hidden: [...state.hidden] }));
  } catch {}
}
const readerById = id => state.readers.find(reader => reader.id === id);
const shownReaders = () => state.readers.filter(reader => !state.hidden.has(reader.id));
// After a change to the readers: remember it, and show it.
function commit() {
  save();
  render();
  renderMenu();
}
const commentsOn = () => state.style === 'document' && state.showComments;
const marginReactionsOn = () => state.style === 'document' && state.showReactions;
// The line in focus, which the reading dot marks and the live styles talk about.
const focus = createFocus(article);
const readingDot = createReadingDot({ dot: $('reading-dot'), article, focus });
// The live styles, by name, each with the reactions option that goes with it.
const live = {
  row: createLive({
    readerById,
    focus,
    // In the row, the reading dot becomes the face of whoever starts talking.
    onSay: (comment, spans) => readingDot.face(readerById(comment.reader), spans),
    presenter: createRow({
      root: $('reading-row'),
      seats: $('seats'),
      names: $('couch-names'),
      readerById,
    }),
  }),
  cursors: createLive({
    readerById,
    focus,
    presenter: createCursors({ root: $('cursors'), article }),
  }),
};
const LIVE_REACTIONS = { row: 'rowReactions', cursors: 'cursorReactions' };
const count = (n, one, many) => `${n} ${n === 1 ? one : many}`;

// Readers reading the article again, by id: the reader as they'll be.
const reading = new Map();

// Every place in the article the readers commented on or reacted to, in order.
let anchors = [];
let blockTexts = [];

function currentNotes() {
  const generated = Object.fromEntries(
    Object.entries(state.generated).filter(([id]) => readerById(id)),
  );
  return mergeNotes({ threads: THREADS, reactions: REACTIONS, asides: ASIDES }, generated);
}

function render() {
  hideHover();
  article.querySelectorAll('.inline-reactions').forEach(element => element.remove());
  unwrapAll(article, '.comment-anchor, .reaction-anchor, .aside-anchor');
  rail.replaceChildren();

  const blocks = blocksOf(article);
  blockTexts = blocks.map(block => block.textContent);
  const cast = shownReaders();
  const notes = visibleNotes(currentNotes(), new Set(cast.map(reader => reader.id)));

  const byPlace = new Map();
  const place = (quote, block) => {
    const at = locate(blockTexts, quote, block);
    // Words no longer found once (say, one of your old reactions) are skipped.
    if (!at) return null;
    const key = `${at.block}:${at.start}:${at.end}`;
    if (!byPlace.has(key)) {
      byPlace.set(key, { key, ...at, threads: [], asides: [], reactions: new Map() });
    }
    return byPlace.get(key);
  };
  const reactionOf = (anchor, emoji) => {
    if (!anchor.reactions.has(emoji)) anchor.reactions.set(emoji, { readers: [], mine: false });
    return anchor.reactions.get(emoji);
  };
  for (const thread of notes.threads) place(thread.quote)?.threads.push(thread);
  for (const aside of notes.asides) place(aside.quote)?.asides.push(aside);
  for (const { quote, reader, emoji } of notes.reactions) {
    const anchor = place(quote);
    if (anchor) reactionOf(anchor, emoji).readers.push(reader);
  }
  for (const { quote, block, emoji } of state.mine) {
    const anchor = place(quote, block);
    if (anchor) reactionOf(anchor, emoji).mine = true;
  }

  anchors = [...byPlace.values()].sort((a, b) => a.block - b.block || a.start - b.start);
  for (const anchor of anchors) {
    // The anchor's words, wrapped in spans of a class (and its key).
    const mark = (className, key) =>
      wrap(blocks[anchor.block], anchor.start, anchor.end, () => {
        const span = document.createElement('span');
        span.className = className;
        if (key) span.dataset.key = anchor.key;
        return span;
      });
    anchor.text = blockTexts[anchor.block].slice(anchor.start, anchor.end);
    if (anchor.threads.length) {
      anchor.commentSpans = mark('comment-anchor', true);
      anchor.commentCount = anchor.threads.reduce((sum, thread) => sum + thread.comments.length, 0);
      const [first] = anchor.commentSpans;
      first.tabIndex = 0;
      first.setAttribute('role', 'button');
      first.setAttribute(
        'aria-label',
        `${count(anchor.commentCount, 'comment', 'comments')} on: ${anchor.text}`,
      );
    }
    if (anchor.asides.length) anchor.asideSpans = mark('aside-anchor');
    if (anchor.reactions.size) {
      anchor.reactionSpans = mark('reaction-anchor', true);
      anchor.railGroup = reactionGroup(anchor, 'div', 'reaction-group');
      rail.append(anchor.railGroup);
      anchor.reactionSpans.at(-1).after(reactionGroup(anchor, 'span', 'inline-reactions'));
    }
  }
  layout();
  renderPanel();
  for (const style of Object.values(live)) {
    style.setCast(cast);
    style.setAnchors(anchors);
  }
}

// A row of reaction chips, most popular first; yours counts too.
function reactionGroup(anchor, tag, className) {
  const group = document.createElement(tag);
  group.className = className;
  group.dataset.key = anchor.key;
  const entries = [...anchor.reactions].sort(
    ([, a], [, b]) => b.readers.length + b.mine - (a.readers.length + a.mine),
  );
  for (const [emoji, { readers, mine }] of entries) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = `reaction-chip${mine ? ' mine' : ''}`;
    chip.dataset.key = anchor.key;
    chip.dataset.emoji = emoji;
    chip.setAttribute('aria-pressed', String(mine));
    const count = readers.length + mine;
    chip.setAttribute('aria-label', `${emoji} ${count}: ${reactedBy(readers, mine)}`);
    const face = document.createElement('span');
    face.className = 'emoji';
    face.textContent = emoji;
    const number = document.createElement('span');
    number.className = 'count';
    number.textContent = count;
    chip.append(face, number);
    group.append(chip);
  }
  return group;
}

function reactedBy(readers, mine) {
  const names = readers.map(id => readerById(id)?.name).filter(Boolean);
  if (mine) names.push('you');
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
}

// The margin holds the reactions when there's room beside the text; otherwise
// they sit inline after the words.
function panelOpen() {
  return !panel.hidden;
}
// The page is centered in what the panel leaves, at most 626px wide with 24px
// of padding (.page), and the margin needs room for the 156px rail
// (.reaction-rail) and a little space either side.
function layout() {
  const width = document.documentElement.clientWidth;
  const panelWidth = parseFloat(getComputedStyle(panel).width) || 0;
  const available = width - (panelOpen() && !NARROW.matches ? panelWidth : 0);
  const textRight = (available + Math.min(626, available)) / 2 - 24;
  document.body.classList.toggle('inline-mode', textRight + 12 + 156 + 8 > available);
  if (document.body.classList.contains('inline-mode') || !marginReactionsOn()) return;
  // Each group sits level with its words, pushed down if the one above is in
  // the way. Everything is measured first, then placed, so the page lays out
  // once.
  const top = page.getBoundingClientRect().top;
  const groups = anchors
    .filter(anchor => anchor.railGroup)
    .map(anchor => ({
      group: anchor.railGroup,
      line: anchor.reactionSpans[0].getBoundingClientRect(),
      height: anchor.railGroup.offsetHeight,
    }));
  let below = -Infinity;
  for (const { group, line, height } of groups) {
    const at = Math.max(line.top - top + (line.height - 26) / 2, below + 6);
    group.style.top = `${at}px`;
    below = at + height;
  }
}
new ResizeObserver(() => layout()).observe(article);
addEventListener('resize', () => layout());
document.fonts?.ready.then(() => layout());

// Hovering: words light up with the chip or underline that points to them, and
// a card says who.
let hot = [];
function setHot(elements) {
  hot.forEach(element => element.classList.remove('hot'));
  hot = elements;
  hot.forEach(element => element.classList.add('hot'));
}
function showHover(rect, build) {
  hoverCard.replaceChildren(...build());
  hoverCard.hidden = false;
  const card = hoverCard.getBoundingClientRect();
  const left = Math.min(Math.max(8, rect.left), innerWidth - card.width - 8);
  const top =
    rect.bottom + 8 + card.height < innerHeight ? rect.bottom + 8 : rect.top - card.height - 8;
  hoverCard.style.left = `${left}px`;
  hoverCard.style.top = `${top}px`;
}
function hideHover() {
  hoverCard.hidden = true;
  setHot([]);
}
// A reader's avatar: their face, as on the reading dot.
function avatar(reader) {
  const element = document.createElement('span');
  element.className = 'avatar';
  element.style.setProperty('--color', reader.color);
  element.innerHTML = portrait(reader);
  element.setAttribute('aria-hidden', 'true');
  return element;
}
const textElement = (tag, text, className) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = text;
  return element;
};
const anchorOf = element => anchors.find(anchor => anchor.key === element.dataset.key);
// A row of readers' faces, for the hover card.
function faces(readers) {
  const row = document.createElement('div');
  row.className = 'hover-avatars';
  row.append(...readers.map(avatar));
  return row;
}

document.addEventListener('pointerover', event => {
  if (event.pointerType === 'touch') return;
  const underline = event.target.closest?.('.comment-anchor');
  const chip = event.target.closest?.('.reaction-chip');
  if (chip) {
    const anchor = anchorOf(chip);
    const { readers, mine } = anchor.reactions.get(chip.dataset.emoji);
    setHot(anchor.reactionSpans);
    showHover(chip.getBoundingClientRect(), () => {
      const people = readers.map(readerById).filter(Boolean);
      return [
        ...(people.length ? [faces(people)] : []),
        textElement('div', `${reactedBy(readers, mine)} reacted with ${chip.dataset.emoji}`),
        textElement('div', mine ? 'Click to remove yours' : 'Click to add yours', 'muted'),
      ];
    });
  } else if (underline && commentsOn()) {
    const anchor = anchorOf(underline);
    setHot(anchor.commentSpans);
    const people = [...new Set(anchor.threads.flatMap(t => t.comments.map(c => c.reader)))]
      .map(readerById)
      .filter(Boolean);
    showHover(underline.getBoundingClientRect(), () => [
      faces(people),
      textElement('div', count(anchor.commentCount, 'comment', 'comments')),
      textElement('div', people.map(firstName).join(', '), 'muted'),
    ]);
  } else if (!hoverCard.hidden) hideHover();
});

document.addEventListener('click', event => {
  const chip = event.target.closest('.reaction-chip');
  if (chip) {
    const anchor = anchorOf(chip);
    toggleMine(anchor.text, anchor.block, chip.dataset.emoji);
    return;
  }
  const underline = event.target.closest('.comment-anchor');
  if (underline && commentsOn() && !hasSelection()) openThread(underline.dataset.key);
});
document.addEventListener('keydown', event => {
  const underline = event.target.closest?.('.comment-anchor');
  if (underline && (event.key === 'Enter' || event.key === ' ') && commentsOn()) {
    event.preventDefault();
    openThread(underline.dataset.key);
  }
  if (event.key === 'Escape' && panelOpen() && !document.querySelector('dialog[open]')) {
    closeThread();
  }
});

const mineAt = (quote, block, emoji) =>
  state.mine.findIndex(
    mine => mine.quote === quote && mine.block === block && mine.emoji === emoji,
  );
function toggleMine(quote, block, emoji) {
  const index = mineAt(quote, block, emoji);
  if (index === -1) state.mine.push({ quote, block, emoji });
  else state.mine.splice(index, 1);
  save();
  render();
}

// The discussion panel.
let openKey = null;
const discussed = () => anchors.filter(anchor => anchor.threads.length);

// Opening or closing the panel reflows the text; keep the words in view where
// they were on screen.
function keepInPlace(element, change) {
  const before = element?.getBoundingClientRect().top;
  change();
  if (element) scrollBy({ top: element.getBoundingClientRect().top - before, behavior: 'instant' });
}

function openThread(key) {
  const anchor = anchors.find(a => a.key === key);
  keepInPlace(anchor?.commentSpans[0], () => {
    openKey = key;
    panel.hidden = false;
    document.body.classList.add('panel-open');
    layout();
  });
  renderPanel();
  const line = anchor?.commentSpans[0].getBoundingClientRect();
  const bottom = NARROW.matches ? innerHeight * 0.28 : innerHeight - 40;
  if (line && (line.top < 72 || line.bottom > bottom)) {
    scrollBy({
      top: line.top - (NARROW.matches ? 80 : innerHeight / 3),
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });
  }
}
function closeThread() {
  keepInPlace(article.querySelector('.comment-anchor.active'), () => {
    openKey = null;
    panel.hidden = true;
    document.body.classList.remove('panel-open');
    article.querySelectorAll('.comment-anchor.active').forEach(s => s.classList.remove('active'));
    layout();
  });
}

function renderPanel() {
  if (!openKey) return;
  const list = discussed();
  const index = list.findIndex(anchor => anchor.key === openKey);
  if (index === -1 || !commentsOn()) return closeThread();
  const anchor = list[index];
  article.querySelectorAll('.comment-anchor').forEach(span => {
    span.classList.toggle('active', span.dataset.key === openKey);
  });
  $('thread-count').textContent = `${index + 1} of ${list.length}`;
  $('thread-prev').disabled = index === 0;
  $('thread-next').disabled = index === list.length - 1;

  const quote = document.createElement('blockquote');
  quote.className = 'thread-quote';
  quote.append(textElement('span', anchor.text));
  const threads = anchor.threads.map(thread => {
    const element = document.createElement('div');
    element.className = 'thread';
    thread.comments.forEach((comment, position) => {
      const reader = readerById(comment.reader);
      const previous = readerById(thread.comments[position - 1]?.reader);
      const post = document.createElement('article');
      post.className = 'post';
      const side = document.createElement('div');
      side.className = 'post-rail';
      side.append(avatar(reader));
      const main = document.createElement('div');
      main.className = 'post-main';
      const head = document.createElement('div');
      head.className = 'post-head';
      head.append(textElement('b', reader.name), textElement('span', `· ${reader.role}`));
      main.append(head);
      if (previous && previous !== reader) {
        const replying = textElement('p', 'Replying to ', 'post-replying');
        replying.append(textElement('b', firstName(previous)));
        main.append(replying);
      }
      main.append(textElement('p', comment.text, 'post-text'));
      post.append(side, main);
      element.append(post);
    });
    return element;
  });
  $('thread-body').replaceChildren(quote, ...threads);
  $('thread-body').scrollTop = 0;
}
$('thread-close').onclick = closeThread;
$('thread-prev').onclick = () => step(-1);
$('thread-next').onclick = () => step(1);
function step(by) {
  const list = discussed();
  const next = list[list.findIndex(anchor => anchor.key === openKey) + by];
  if (next) openThread(next.key);
}

// React to any words: select them and a smiley appears beside them.
let pending = null;
const hasSelection = () => !document.getSelection().isCollapsed;
function selectedWords() {
  const selection = document.getSelection();
  if (selection.isCollapsed || !selection.rangeCount) return null;
  const range = selection.getRangeAt(0);
  // The selection's container is a text node, or, when it crosses into bold
  // words or a link, the block (or something inside it) itself.
  const container = range.commonAncestorContainer;
  const element = container.nodeType === Node.ELEMENT_NODE ? container : container.parentElement;
  const block = element?.closest(BLOCKS);
  if (!block || !article.contains(block)) return null;
  const quote = range.toString().trim();
  if (quote.length < 2) return null;
  return { range, quote, block: blocksOf(article).indexOf(block) };
}
function placePicker() {
  if (!pending) return;
  const rect = pending.range.getBoundingClientRect();
  const inline = document.body.classList.contains('inline-mode');
  const left = inline ? rect.left : article.getBoundingClientRect().right + 12;
  const top = !inline ? rect.top - 4 : rect.top > 110 ? rect.top - 44 : rect.bottom + 8;
  picker.style.left = `${Math.max(8, Math.min(left, innerWidth - picker.offsetWidth - 8))}px`;
  picker.style.top = `${Math.max(64, Math.min(top, innerHeight - picker.offsetHeight - 8))}px`;
}
document.addEventListener('selectionchange', () => {
  if (picker.contains(document.activeElement)) return;
  pending = marginReactionsOn() ? selectedWords() : null;
  picker.hidden = !pending;
  choices.hidden = true;
  placePicker();
});
addEventListener('scroll', placePicker, { passive: true });
// Keep the selection while using the picker.
picker.addEventListener('mousedown', event => event.preventDefault());
$('react-open').onclick = () => {
  choices.hidden = !choices.hidden;
  placePicker();
  if (!choices.hidden) choices.querySelector('button').focus();
};
for (const emoji of REACTION_CHOICES) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = emoji;
  button.setAttribute('aria-label', `React with ${emoji}`);
  button.onclick = () => {
    if (!pending) return;
    const { quote, block } = pending;
    pending = null;
    picker.hidden = true;
    document.getSelection().removeAllRanges();
    if (mineAt(quote, block, emoji) === -1) toggleMine(quote, block, emoji);
  };
  choices.append(button);
}
picker.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    picker.hidden = true;
    pending = null;
  }
});

// The Reading mode menu: what's shown, and who's reading.
const intelligence = $('intelligence');
function applyShown() {
  const documentStyle = state.style === 'document';
  document.body.classList.toggle('live', state.style in live);
  document.body.classList.toggle('style-row', state.style === 'row');
  document.body.classList.toggle('hide-comments', !commentsOn());
  document.body.classList.toggle('hide-reactions', !marginReactionsOn());
  for (const radio of intelligence.querySelectorAll('[name="comment-style"]')) {
    radio.checked = radio.value === state.style;
  }
  // Each style's options can be changed only while it's chosen.
  $('show-comments').checked = state.showComments;
  $('show-reactions').checked = state.showReactions;
  $('show-comments').disabled = $('show-reactions').disabled = !documentStyle;
  for (const [style, key] of Object.entries(LIVE_REACTIONS)) {
    $(`${style}-reactions`).checked = state[key];
    $(`${style}-reactions`).disabled = state.style !== style;
  }
  if (!commentsOn() && panelOpen()) closeThread();
  if (!marginReactionsOn()) picker.hidden = true;
  for (const [style, controller] of Object.entries(live)) {
    controller.setReactions(state[LIVE_REACTIONS[style]]);
    if (state.style === style) controller.start();
    else controller.stop();
  }
  readingDot.set(!documentStyle);
  layout();
}
for (const radio of intelligence.querySelectorAll('[name="comment-style"]')) {
  radio.onchange = () => {
    state.style = radio.value;
    applyShown();
    save();
  };
}
const OPTIONS = {
  'show-comments': 'showComments',
  'show-reactions': 'showReactions',
  ...Object.fromEntries(Object.entries(LIVE_REACTIONS).map(([s, key]) => [`${s}-reactions`, key])),
};
for (const [id, key] of Object.entries(OPTIONS)) {
  $(id).onchange = event => {
    state[key] = event.target.checked;
    applyShown();
    save();
  };
}

function renderMenu() {
  const rows = state.readers.map(saved => {
    const reader = reading.get(saved.id) ?? saved;
    const row = document.createElement('li');
    row.className = `reader-row${reading.has(saved.id) ? ' reading' : ''}`;
    const label = document.createElement('label');
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = !state.hidden.has(reader.id);
    box.onchange = () => {
      if (box.checked) state.hidden.delete(reader.id);
      else state.hidden.add(reader.id);
      commit();
    };
    const text = document.createElement('span');
    text.className = 'reader-text';
    text.append(
      textElement('b', reader.name),
      textElement('span', reading.has(reader.id) ? 'Reading the article…' : reader.role),
    );
    label.append(box, avatar(reader), text);
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'edit-reader';
    edit.innerHTML = PENCIL;
    edit.setAttribute('aria-label', `Edit ${reader.name}`);
    edit.onclick = () => openEditor(saved);
    row.append(label, edit);
    return row;
  });
  $('reader-list').replaceChildren(...rows);
}
document.addEventListener('pointerdown', event => {
  if (!intelligence.contains(event.target)) intelligence.open = false;
});
intelligence.addEventListener('keydown', event => {
  if (event.key === 'Escape' && intelligence.open) {
    intelligence.open = false;
    intelligence.querySelector('summary').focus();
  }
});
let resetTimer;
$('reset-readers').onclick = event => {
  const button = event.currentTarget;
  if (!button.dataset.armed) {
    button.dataset.armed = 'true';
    button.textContent = 'Reset all readers?';
    resetTimer = setTimeout(() => {
      delete button.dataset.armed;
      button.textContent = 'Reset';
    }, 3000);
    return;
  }
  clearTimeout(resetTimer);
  delete button.dataset.armed;
  button.textContent = 'Reset';
  state.readers = structuredClone(READERS);
  state.hidden = new Set();
  state.generated = {};
  // Readings still underway no longer count.
  reading.clear();
  commit();
  showNotice('The readers are back to how they started.');
};

// Editing a reader: a new name shows at once; a new role or description means
// they read the article again, which needs the server.
const dialog = $('reader-dialog');
const form = $('reader-form');
const fields = {
  name: $('reader-name'),
  role: $('reader-role'),
  about: $('reader-about'),
};
let editing = null;

function openEditor(reader) {
  editing = reader;
  intelligence.open = false;
  // While they read again, the dialog shows what they'll be.
  const draft = reading.get(reader.id) ?? reader;
  for (const [key, field] of Object.entries(fields)) field.value = draft[key];
  $('reader-delete').textContent = 'Remove reader';
  delete $('reader-delete').dataset.armed;
  $('reader-error').textContent = '';
  setBusy(reading.has(reader.id));
  dialog.showModal();
}
function setBusy(busy) {
  for (const field of Object.values(fields)) field.disabled = busy;
  $('reader-save').disabled = busy;
  $('reader-status').textContent = busy
    ? 'Reading the article again. This takes a minute or two; you can close this and keep reading.'
    : '';
}
// A dialog closes from its close button or a click outside it.
for (const element of [dialog, $('about-dialog')]) {
  element.addEventListener('click', event => {
    if (event.target.closest('[data-close]') || event.target === element) element.close();
  });
}
$('about').onclick = () => $('about-dialog').showModal();

$('reader-delete').onclick = event => {
  const button = event.currentTarget;
  if (!button.dataset.armed) {
    button.dataset.armed = 'true';
    button.textContent = `Remove ${firstName(editing)}? Click again`;
    return;
  }
  state.readers = state.readers.filter(reader => reader.id !== editing.id);
  delete state.generated[editing.id];
  state.hidden.delete(editing.id);
  reading.delete(editing.id);
  commit();
  dialog.close();
  showNotice(`${editing.name} left the panel.`);
};

form.addEventListener('submit', async event => {
  event.preventDefault();
  $('reader-error').textContent = '';
  const values = Object.fromEntries(
    Object.entries(fields).map(([key, field]) => [key, field.value.trim()]),
  );
  if (Object.values(values).some(value => !value)) {
    $('reader-error').textContent = 'Fill in every field.';
    return;
  }
  const reader = editing;
  if (values.role === reader.role && values.about === reader.about) {
    reader.name = values.name;
    commit();
    dialog.close();
    return;
  }
  const status = await serverStatus();
  if (status.error) {
    $('reader-error').textContent = status.error;
    return;
  }
  readAgain({ ...reader, ...values });
});

async function serverStatus() {
  try {
    const response = await fetch('api/readers', { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error();
    const { available, left } = await response.json();
    if (!available) {
      return {
        error:
          'Reading again needs an OpenAI API key on the prototype’s server, and this copy has none. A new name still works.',
      };
    }
    if (!left) return { error: 'This prototype has read as much as it can for you today.' };
    return {};
  } catch {
    return {
      error:
        'Reading again needs the prototype’s server (node server/server.mjs), which isn’t running here. A new name still works.',
    };
  }
}

async function readAgain(draft) {
  reading.set(draft.id, draft);
  renderMenu();
  setBusy(true);
  const others = visibleNotes(
    currentNotes(),
    new Set(
      shownReaders()
        .map(r => r.id)
        .filter(id => id !== draft.id),
    ),
  ).threads.slice(0, 40);
  const stillEditing = () => dialog.open && editing?.id === draft.id;
  // Reset, or removing the reader, while they read lets this reading go.
  const current = () => reading.get(draft.id) === draft;
  try {
    const response = await fetch('api/readers/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reader: { name: draft.name, role: draft.role, about: draft.about },
        threads: others.map(thread => ({
          id: thread.id,
          quote: thread.quote,
          comments: thread.comments.map(comment => ({
            name: readerById(comment.reader)?.name ?? '',
            text: comment.text,
          })),
        })),
      }),
    });
    const reply = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(reply.error || 'The model couldn’t read the article.');
    const said = checkReading(reply, {
      readerId: draft.id,
      stamp: Date.now().toString(36),
      locate: quote => locate(blockTexts, quote),
      threadIds: new Set(others.map(thread => thread.id)),
      choices: REACTION_CHOICES,
    });
    if (!said.threads.length)
      throw new Error('Their comments didn’t match the article. Try again.');
    if (!current()) return;
    reading.delete(draft.id);
    state.readers[state.readers.findIndex(r => r.id === draft.id)] = draft;
    state.generated[draft.id] = said;
    commit();
    if (stillEditing()) dialog.close();
    showNotice(
      `${draft.name} left ${count(said.threads.length, 'comment', 'comments')}, ${count(said.replies.length, 'reply', 'replies')}, and ${count(said.reactions.length, 'reaction', 'reactions')}.`,
    );
  } catch (error) {
    if (!current()) return;
    reading.delete(draft.id);
    renderMenu();
    if (stillEditing()) {
      setBusy(false);
      $('reader-error').textContent = error.message;
    } else showNotice(`${draft.name} couldn’t read the article: ${error.message}`);
  }
}

render();
applyShown();
renderMenu();
