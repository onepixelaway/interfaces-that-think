// Collapse sections into summaries: each section with a summary in the notes
// (in Dario's essay, the numbered ones, like "2. Neuroscience and mind") folds
// under its heading. Its opening shows faded behind a callout that
// summarizes the section in 1 to 3 sentences in the author's voice, and a click
// expands it. It works alongside every other idea: they find the section's
// paragraphs inside the fold (see bodyElements). The summaries were written once
// for an essay and are stored in its notes, keyed by section heading.
import { clean, splitSentences, textOf } from './text-emphasis.js?v=8e863dc0fe81';

// The sections with a summary: each heading and the nodes after it, up to the
// next heading. Whitespace between elements comes along, so unfolding restores the
// page exactly.
function findSections(essay, summaries) {
  const sections = [];
  for (const heading of essay.querySelectorAll('.essay-body > h2')) {
    const title = clean(heading.textContent);
    if (!Object.hasOwn(summaries, title)) continue;
    const nodes = [];
    for (let node = heading.nextSibling; node && node.nodeName !== 'H2'; node = node.nextSibling) {
      nodes.push(node);
    }
    sections.push({ heading, title, nodes });
  }
  return sections;
}

// Wraps a section's nodes in a fold with a callout on top.
function fold(section, text) {
  const wrapper = document.createElement('div');
  wrapper.className = 'section-fold';
  const content = document.createElement('div');
  content.className = 'section-fold-content';
  content.inert = true;
  const callout = document.createElement('div');
  callout.className = 'section-fold-callout';
  callout.setAttribute('role', 'button');
  callout.tabIndex = 0;
  callout.setAttribute('aria-expanded', 'false');
  const summary = document.createElement('p');
  summary.className = 'section-fold-summary';
  summary.textContent = text;
  const more = document.createElement('p');
  more.className = 'section-fold-more';
  // A … pill like the collapsed-text ones, with words for screen readers.
  const pill = document.createElement('span');
  pill.className = 'section-fold-pill';
  pill.setAttribute('aria-hidden', 'true');
  const dots = document.createElement('span');
  dots.className = 'emph-dots';
  dots.textContent = '…';
  pill.append(dots);
  const words = document.createElement('span');
  words.className = 'sr-only';
  words.textContent = 'Read the full section';
  more.append(pill, words);
  callout.append(summary, more);
  section.heading.after(wrapper);
  content.append(...section.nodes);
  wrapper.append(content, callout);
  // The callout hides once the section opens, so focus moves into the section if
  // the callout had it.
  content.tabIndex = -1;
  const open = () => {
    const focused = callout.contains(document.activeElement);
    wrapper.classList.add('open');
    content.inert = false;
    callout.setAttribute('aria-expanded', 'true');
    if (focused) content.focus({ preventScroll: true });
  };
  wrapper.addEventListener('click', () => {
    if (!wrapper.classList.contains('open')) open();
  });
  callout.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      open();
    }
  });
  return { wrapper, content, callout };
}

// The callout's top goes just below the line where the section's second visible
// sentence starts, so the opening sentence shows above it, and never more than
// three lines down (each line is 32px), so only a sentence or two shows.
const CALLOUT_SENTENCE = 2;
const CALLOUT_MIN = 64;
const CALLOUT_MAX = 96;

// Where a callout goes: its top margin, or null for the stylesheet's offset when
// there's nothing to measure. Pills and footnote markers aren't sentences, and
// hidden text has no position, so neither counts. It only reads the layout.
function calloutOffset(folded) {
  const top = folded.content.getBoundingClientRect().top;
  let seen = 0;
  for (const block of folded.content.querySelectorAll(
    ':scope > p, :scope > ul > li, :scope > ol > li',
  )) {
    const { text, nodes } = textOf(block, '.emph-more, .fn-ref');
    for (const sentence of splitSentences(text)) {
      const entry = nodes.findLast(({ start }) => start <= sentence.start);
      if (!entry) continue;
      const caret = document.createRange();
      caret.setStart(entry.node, Math.min(sentence.start - entry.start, entry.node.data.length));
      const rect = caret.getClientRects()[0];
      if (!rect || ++seen < CALLOUT_SENTENCE) continue;
      return Math.min(CALLOUT_MAX, Math.max(CALLOUT_MIN, Math.round(rect.bottom - top + 6)));
    }
  }
  return null;
}

export const collapseSections = {
  id: 'collapse-sections',
  label: 'Collapse sections into summaries',
  start({ essay, notes }) {
    const folds = findSections(essay, notes.sections).map(section =>
      fold(section, notes.sections[section.title]),
    );
    // Re-measure where the callouts go when the layout changes, or the text in a
    // fold does. Only closed folds show a callout. All are measured before any
    // moves, so the page lays out once.
    let frame = 0;
    const waiting = new Set();
    const place = (which = folds) => {
      for (const folded of which) waiting.add(folded);
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const closed = [...waiting].filter(({ wrapper }) => !wrapper.classList.contains('open'));
        waiting.clear();
        const offsets = closed.map(calloutOffset);
        closed.forEach(({ callout }, index) => {
          if (offsets[index] === null) callout.style.removeProperty('margin-top');
          else callout.style.marginTop = `${offsets[index]}px`;
        });
      });
    };
    const placeAll = () => place();
    placeAll();
    void document.fonts?.ready.then(placeAll);
    window.addEventListener('resize', placeAll);
    const changes = new MutationObserver(records =>
      place(
        records
          .map(record => folds.find(({ content }) => content.contains(record.target)))
          .filter(Boolean),
      ),
    );
    for (const folded of folds) {
      changes.observe(folded.content, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['class'],
      });
    }

    return () => {
      changes.disconnect();
      window.removeEventListener('resize', placeAll);
      cancelAnimationFrame(frame);
      for (const folded of folds) folded.wrapper.replaceWith(...folded.content.childNodes);
    };
  },
};
