// Key information: the sentences of the essay that, read in order and on their
// own, tell the whole piece (a supercut), chosen once for an essay and stored in
// its notes, which the ideas receive in their context. The ideas below mark
// them, then emphasize them, fade the rest of the text while you scroll, or
// collapse it. The colors and timings are set in the stylesheet.

// How long scrolling must pause before it counts as resting.
const REST_MS = 150;

const segmenter = new Intl.Segmenter('en', { granularity: 'sentence' });
const unclosedQuote = text => (text.match(/“/g)?.length ?? 0) > (text.match(/”/g)?.length ?? 0);

// Sentence ranges in a block's text. Whitespace is trimmed from each range. A
// fragment with no letters or digits joins the sentence before it, and so does
// the rest of a sentence that the splitter broke too early: after an initial or
// a title, as in "Iain M. Banks" or "Dr. Smith", before a lowercase word, as
// after "(including AI companies!)" mid-sentence, or inside a quotation.
export function splitSentences(text) {
  const sentences = [];
  for (const { segment, index } of segmenter.segment(text)) {
    const body = segment.trim();
    if (!body) continue;
    const start = index + segment.length - segment.trimStart().length;
    const end = start + body.length;
    const previous = sentences.at(-1);
    if (
      previous &&
      (!/[\p{L}\p{N}]/u.test(body) ||
        /^\p{Ll}/u.test(body) ||
        unclosedQuote(previous.text) ||
        /\b(?:[A-Z]|Mr|Mrs|Ms|Dr|Prof|St|Jr|Sr)\.$/.test(previous.text))
    ) {
      previous.end = end;
      previous.text = text.slice(previous.start, end).replace(/\s+/g, ' ');
    } else sentences.push({ start, end, text: body.replace(/\s+/g, ' ') });
  }
  return sentences;
}

// Text as one line, with runs of whitespace as single spaces.
export const clean = text =>
  String(text ?? '')
    .replace(/\s+/g, ' ')
    .trim();

// FNV-1a, enough to tell whether stored notes belong to this text.
export function fingerprint(text) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16);
}

// The fingerprint of the essay's sentences by section, which the notes must match.
export const essayFingerprint = sections =>
  fingerprint(JSON.stringify(sections.map(section => section.sentences.map(s => s.text))));

// The text of a block, skipping footnote markers (or whatever skip names), with
// each text node's offset.
export function textOf(block, skip = '.fn-ref') {
  const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT, {
    acceptNode: node =>
      node.parentElement.closest(skip) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
  });
  let text = '';
  const nodes = [];
  while (walker.nextNode()) {
    nodes.push({ node: walker.currentNode, start: text.length });
    text += walker.currentNode.data;
  }
  return { text, nodes };
}

// The essay body's headings, paragraphs, and lists in reading order, looking
// inside sections that Collapse sections into summaries has folded.
export function bodyElements(essay) {
  return [...essay.querySelector('.essay-body').children].flatMap(element =>
    element.matches('.section-fold')
      ? [...element.querySelector('.section-fold-content').children]
      : [element],
  );
}

// The essay body as sections (split at each heading), each with its blocks'
// text, its sentences numbered from s1 across the essay, and the bold lead-ins
// that open its list items.
function readEssay(essay) {
  const sections = [{ heading: 'Opening', blocks: [] }];
  for (const element of bodyElements(essay)) {
    if (element.matches('h2')) sections.push({ heading: element.textContent.trim(), blocks: [] });
    else if (element.matches('p')) sections.at(-1).blocks.push(element);
    else if (element.matches('ul, ol')) {
      sections.at(-1).blocks.push(...element.querySelectorAll(':scope > li'));
    }
  }
  let count = 0;
  for (const section of sections) {
    section.sentences = [];
    section.leads = [];
    section.parts = [];
    for (const block of section.blocks) {
      const { text, nodes } = textOf(block);
      section.parts.push({ block, text, nodes });
      const leading = block.matches('li') ? leadingStrong(block) : null;
      const lead = leading && leadOf(leading, text, nodes);
      if (lead) section.leads.push({ ...lead, block });
      for (const sentence of splitSentences(text)) {
        section.sentences.push({ id: `s${++count}`, ...sentence, block });
      }
    }
  }
  return sections.filter(section => section.sentences.length);
}

// The <strong> that opens a list item, if it opens with one.
function leadingStrong(block) {
  const first = [...block.childNodes].find(node => node.nodeType !== 3 || node.data.trim());
  return first?.nodeName === 'STRONG' ? first : null;
}

// The bold lead-in that opens a list item, like "Maximize leverage.", as a range
// of the item's text, including a period or colon right after it.
function leadOf(first, text, nodes) {
  const inside = nodes.filter(({ node }) => first.contains(node));
  if (!inside.length) return null;
  let end = inside.at(-1).start + inside.at(-1).node.data.length;
  if (/[.:]/.test(text[end] ?? '')) end++;
  return { start: inside[0].start, end };
}

// Merges overlapping ranges ({ start, end, ...rest }) that share a block, in order.
export function mergeRanges(ranges) {
  const merged = [];
  for (const range of [...ranges].sort((a, b) => a.start - b.start)) {
    const last = merged.at(-1);
    if (last && range.start <= last.end) last.end = Math.max(last.end, range.end);
    else merged.push({ ...range });
  }
  return merged;
}

// The runs of a block's text outside its key ranges (merged, in order) that have
// letters or digits, without the whitespace around them.
export function restRanges(text, keys) {
  const runs = [];
  let at = 0;
  for (const { start, end } of [...keys, { start: text.length, end: text.length }]) {
    const piece = text.slice(at, start);
    const body = piece.trim();
    const from = at + piece.length - piece.trimStart().length;
    if (/[\p{L}\p{N}]/u.test(body)) runs.push({ start: from, end: from + body.length });
    at = Math.max(at, end);
  }
  return runs;
}

// Marks a section's key ranges (key sentences and lead-ins): key text in
// .emph-key spans, and each block as .emph-dim. When collapsing, it also marks
// what collapses:
// - every other run of text in .emph-rest spans numbered with data-run, after a
//   … button (.emph-more) that expands it, with footnote markers inside a run
//   counted as part of it; a list item with no key text keeps its first sentence
// - a paragraph with no key text is one run, and a paragraph like that right
//   after another joins its run as .emph-follow, so they collapse to one …
// - only blocks of text become runs: a stretch under MIN_COLLAPSE_WORDS between
//   kept text stays as it is, since a … would save little
// Spans are wrapped from the end of each block backward, so the offsets of
// earlier ones stay valid, and key ranges are merged first, so spans never nest.
const MIN_COLLAPSE_WORDS = 30;
const wordCount = text => text.split(/\s+/).filter(Boolean).length;
function mark(section, keyRanges, nextRun, collapsing) {
  const fragments = [];
  const marked = [];
  // The last paragraph with no key text, and its run.
  let hidden = null;
  for (const { block, text, nodes } of section.parts) {
    block.classList.add('emph-dim');
    const keys = mergeRanges(keyRanges.filter(range => range.block === block));
    if (
      collapsing &&
      !keys.length &&
      hidden?.block.nextElementSibling === block &&
      block.matches('p')
    ) {
      block.classList.add('emph-follow');
      block.dataset.run = hidden.run;
      hidden = { block, run: hidden.run };
      continue;
    }
    // A list item collapses only partly: one with no key text keeps its first
    // sentence, so a bullet or number is never left on its own.
    const kept =
      block.matches('li') && !keys.length
        ? section.sentences.find(sentence => sentence.block === block)
        : null;
    const rests = collapsing
      ? restRanges(text, kept ? [kept] : keys)
          .filter(
            range =>
              (!keys.length && !kept) ||
              wordCount(text.slice(range.start, range.end)) >= MIN_COLLAPSE_WORDS,
          )
          .map(range => ({ ...range, run: String(nextRun()) }))
      : [];
    hidden =
      !keys.length && rests.length && block.matches('p') ? { block, run: rests[0].run } : null;
    for (const range of [...keys, ...rests]) {
      for (const { node, start } of nodes) {
        const from = Math.max(range.start - start, 0);
        const to = Math.min(range.end - start, node.data.length);
        if (from < to) fragments.push({ node, from, to, at: start + from, run: range.run });
      }
    }
    marked.push({ block, rests });
  }
  fragments.sort((a, b) => b.at - a.at);
  for (const { node, from, to, run } of fragments) {
    if (!run && !node.data.slice(from, to).trim()) continue;
    const range = document.createRange();
    range.setStart(node, from);
    range.setEnd(node, to);
    const span = document.createElement('span');
    span.className = run ? 'emph-rest' : 'emph-key';
    if (run) span.dataset.run = run;
    range.surroundContents(span);
  }
  for (const { block, rests } of marked) {
    for (const { run } of rests) {
      const first = block.querySelector(`.emph-rest[data-run="${run}"]`);
      if (first) addMarker(block, first, run);
    }
    const spans = [...block.querySelectorAll('.emph-key, .emph-rest')];
    for (const ref of block.querySelectorAll('.fn-ref')) {
      const before = spans
        .filter(span => span.compareDocumentPosition(ref) & Node.DOCUMENT_POSITION_FOLLOWING)
        .at(-1);
      if (before?.classList.contains('emph-rest')) {
        ref.classList.add('emph-rest');
        ref.dataset.run = before.dataset.run;
      }
    }
  }
}

// Puts a run's … button just before its text, outside any link or emphasis the
// text starts in, so the button never sits inside a link. It's an inline span
// with a button role, rather than a <button>, so a summary inside it can wrap
// across lines.
function addMarker(block, first, run) {
  const marker = document.createElement('span');
  marker.setAttribute('role', 'button');
  marker.tabIndex = 0;
  marker.className = 'emph-more';
  marker.dataset.run = run;
  const dots = document.createElement('span');
  dots.className = 'emph-dots';
  dots.textContent = '…';
  marker.append(dots);
  marker.setAttribute('aria-label', 'Show hidden text');
  marker.setAttribute('aria-expanded', 'false');
  let top = first;
  while (top.parentNode !== block) top = top.parentNode;
  const keyBefore = top !== first && top.querySelector('.emph-key');
  if (keyBefore && keyBefore.compareDocumentPosition(first) & Node.DOCUMENT_POSITION_FOLLOWING) {
    top.after(marker);
  } else top.before(marker);
}

// Runs start once while any idea uses it, and the cleanup it returns when the
// last one stops.
export function sharedBy(start) {
  let users = 0;
  let stop = null;
  return context => {
    // Counted only once started, so a start that fails doesn't leave it stuck.
    if (users === 0) stop = start(context);
    users++;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      if (--users === 0) {
        stop?.();
        stop = null;
      }
    };
  };
}

// Each run's parts: everything marked with its run number except its … and
// footnote markers, in order.
export function runParts(essay) {
  const runs = new Map();
  for (const part of essay.querySelectorAll('[data-run]')) {
    if (part.matches('.emph-more, .fn-ref')) continue;
    if (!runs.has(part.dataset.run)) runs.set(part.dataset.run, []);
    runs.get(part.dataset.run).push(part);
  }
  return runs;
}

// The text a run hides, as one line, without footnote markers.
export function runText(parts) {
  return clean(
    parts
      .map(part => {
        const copy = part.cloneNode(true);
        for (const ref of copy.querySelectorAll('.fn-ref')) ref.remove();
        return copy.textContent;
      })
      .join(' '),
  );
}

// Marks the stored key sentences and lead-ins in the essay (see mark), and marks
// the essay as .emphasis-reading while scrolling rests. The ideas below share it
// and style those marks. When collapsing, a few key sentences that only support
// their neighbors join the text around them (see the essay notes), so whole
// blocks collapse, and each … carries the fingerprint of the text it hides
// (data-key), which its bridge is stored under; copies of it carry it too. If
// the essay no longer matches its notes, it marks nothing and says so in the
// console.
export function markKeySentences({ essay, notes, collapsing = false }) {
  const sections = readEssay(essay);
  if (essayFingerprint(sections) !== notes.essay) {
    console.warn(
      'The essay has changed since its notes were written, so the reading ideas are off.',
    );
    return () => {};
  }
  const folded = new Set(collapsing ? notes.collapseFolds : []);
  const cut = new Set(notes.keySentences.filter(id => !folded.has(id)));
  let runs = 0;
  const nextRun = () => ++runs;
  for (const section of sections) {
    const keys = section.sentences.filter(sentence => cut.has(sentence.id));
    mark(section, [...keys, ...section.leads], nextRun, collapsing);
  }
  if (collapsing) {
    const parts = runParts(essay);
    for (const marker of essay.querySelectorAll('.emph-more')) {
      marker.dataset.key = fingerprint(runText(parts.get(marker.dataset.run) ?? []));
    }
  }
  for (const block of essay.querySelectorAll('.essay-afterword p, .footnotes li')) {
    block.classList.add('emph-dim');
  }
  // The page starts at rest, so everything is at full strength until a scroll.
  essay.classList.add('emphasis-reading');
  // Lets ideas that build on the marks, like bridges, pick them up.
  essay.dispatchEvent(new CustomEvent('keysentences:marked'));

  let restTimer;
  const onScroll = () => {
    essay.classList.remove('emphasis-reading');
    clearTimeout(restTimer);
    restTimer = setTimeout(() => essay.classList.add('emphasis-reading'), REST_MS);
  };
  window.addEventListener('scroll', onScroll, { passive: true });

  return () => {
    window.removeEventListener('scroll', onScroll);
    clearTimeout(restTimer);
    essay.classList.remove('emphasis-reading');
    unmark(essay);
  };
}

// Removes the marks that mark adds inside root, and on root itself, so its text
// is exactly as it was. It also cleans copies of marked blocks.
export function unmark(root) {
  const blocks = new Set();
  for (const marker of root.querySelectorAll('.emph-more')) {
    blocks.add(marker.parentNode);
    marker.remove();
  }
  for (const span of root.querySelectorAll('span.emph-key, span.emph-rest')) {
    blocks.add(span.parentNode);
    span.replaceWith(...span.childNodes);
  }
  const marked = '.emph-dim, .emph-follow, .fn-ref.emph-rest';
  for (const element of [root, ...root.querySelectorAll(marked)]) {
    if (!element.matches(marked)) continue;
    removeClasses(element, 'emph-dim', 'emph-follow', 'emph-rest', 'emph-open');
    delete element.dataset.run;
  }
  for (const block of blocks) block.normalize();
}

// Removes classes, and the class attribute once none are left, so an element is
// exactly as it was.
export function removeClasses(element, ...names) {
  element.classList.remove(...names);
  if (!element.classList.length) element.removeAttribute('class');
}

const useKeySentences = sharedBy(markKeySentences);

// An essay's sections as plain text, each with its numbered sentences, and the
// fingerprint notes must carry to match it.
export function essaySentences(essay) {
  const sections = readEssay(essay);
  return {
    fingerprint: essayFingerprint(sections),
    sections: sections.map(({ heading, sentences }) => ({
      heading,
      sentences: sentences.map(({ id, text }) => ({ id, text })),
    })),
  };
}

// An idea that styles the shared key-sentence marks through a class on the essay.
const keySentenceIdea = (id, label, className) => ({
  id,
  label,
  on: true,
  start(context) {
    const release = useKeySentences(context);
    context.essay.classList.add(className);
    return () => {
      context.essay.classList.remove(className);
      release();
    };
  },
});

// Key sentences turn teal blue while scrolling and ease back at rest.
export const emphasizeKeyInformation = keySentenceIdea(
  'emphasize-key-information',
  'Emphasize key information',
  'emphasis-key',
);
// Everything else fades while scrolling and comes back at rest.
export const fadeSecondaryInformation = keySentenceIdea(
  'fade-secondary-information',
  'Fade secondary information on scroll',
  'emphasis-fade',
);

// How long the pointer rests on a … before it expands, and how long after the
// pointer leaves an expanded run's paragraph it collapses again.
const HOVER_MS = 120;
const LEAVE_MS = 400;

// Expands a run when the pointer rests on its …, and collapses it once the
// pointer has left the run's paragraphs. A click or tap pins a run open until the
// next click elsewhere, a click on its …, or Escape.
function expandOnHover(essay) {
  // The open run: its number, its parts, the blocks they sit in, and its ….
  let open = null;
  let pinned = false;
  let enter;
  let leave;
  const hide = () => {
    if (!open) return;
    for (const element of open.parts) element.classList.remove('emph-open');
    open.marker.setAttribute('aria-expanded', 'false');
    open = null;
    pinned = false;
  };
  const show = (marker, pin) => {
    const run = marker.dataset.run;
    // A run's copies can be made again with the same number, so a cached run
    // whose … has left the page is stale.
    if (open?.run !== run || !open.marker.isConnected) {
      hide();
      const parts = [...essay.querySelectorAll(`[data-run="${run}"]`)];
      const blocks = new Set(parts.map(part => part.closest('p, li')).filter(Boolean));
      open = { run, parts, blocks, marker };
      for (const element of parts) element.classList.add('emph-open');
      marker.setAttribute('aria-expanded', 'true');
    }
    pinned = pin;
  };
  const toggle = marker =>
    open?.run === marker.dataset.run && pinned ? hide() : show(marker, true);
  const within = target => Boolean(open) && [...open.blocks].some(block => block.contains(target));
  const markerAt = target => {
    const marker = target.closest?.('.emph-more');
    return marker && essay.contains(marker) ? marker : null;
  };
  const onOver = event => {
    clearTimeout(enter);
    const marker = markerAt(event.target);
    if (marker) {
      clearTimeout(leave);
      enter = setTimeout(() => show(marker, pinned), HOVER_MS);
    } else if (open && !pinned) {
      clearTimeout(leave);
      if (!within(event.target)) leave = setTimeout(hide, LEAVE_MS);
    }
  };
  const onClick = event => {
    const marker = markerAt(event.target);
    if (marker) {
      clearTimeout(enter);
      toggle(marker);
    } else if (pinned && !within(event.target)) hide();
  };
  const onKey = event => {
    if (event.key === 'Escape') hide();
    const marker = markerAt(event.target);
    if (marker && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      toggle(marker);
    }
  };
  document.addEventListener('pointerover', onOver);
  document.addEventListener('click', onClick);
  document.addEventListener('keydown', onKey);
  return () => {
    document.removeEventListener('pointerover', onOver);
    document.removeEventListener('click', onClick);
    document.removeEventListener('keydown', onKey);
    clearTimeout(enter);
    clearTimeout(leave);
    hide();
  };
}

// Everything but the key sentences collapses to …, which expands on hover; list
// items collapse only partly. It replaces both other ideas, so turning it on turns them off.
export const collapseSecondaryInformation = {
  id: 'collapse-secondary-information',
  label: 'Collapse secondary information',
  excludes: ['fade-secondary-information', 'emphasize-key-information'],
  start(context) {
    // The other two ideas are off while this one is on, so the shared marks are
    // made for collapsing.
    const release = useKeySentences({ ...context, collapsing: true });
    context.essay.classList.add('emphasis-collapse');
    const stopHover = expandOnHover(context.essay);
    return () => {
      stopHover();
      context.essay.classList.remove('emphasis-collapse');
      release();
    };
  },
};
