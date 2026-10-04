// Notes for a pasted article, shaped like the essay notes so every reading idea
// can use them. GPT-6 Luna writes them while the article loads; this checks
// them against the article and keeps only what fits, so a slip in the model's
// reply loses a summary or a grouping instead of breaking the page.
import { clean } from './text-emphasis.js?v=8e863dc0fe81';

const words = text => String(text).split(/\s+/).filter(Boolean).length;

// A list's key in the notes: the opening words of its first item, as the reading
// ideas find lists by.
export const listKey = firstItem => clean(firstItem).slice(0, 40).trim();

// raw is the model's reply (see the server's prompts); article describes the
// page: its sections and their numbered sentences, its lists, the headings that
// can fold, the icons there are, and the fingerprint of its sentences.
export function articleNotes(raw, article) {
  const ids = new Set(article.sections.flatMap(section => section.sentences.map(s => s.id)));
  const order = id => Number(id.slice(1));
  const keySentences = [...new Set((raw.keySentences ?? []).filter(id => ids.has(id)))].sort(
    (a, b) => order(a) - order(b),
  );
  const key = new Set(keySentences);
  const collapseFolds = [...new Set((raw.collapseFolds ?? []).filter(id => key.has(id)))];

  const sections = {};
  const headings = new Set(article.headings.map(clean));
  for (const { heading, summary } of raw.sections ?? []) {
    const text = clean(summary);
    const title = clean(heading);
    if (headings.has(title) && title !== '__proto__' && text && words(text) <= 90) {
      sections[title] = text;
    }
  }
  // Lists are found by their opening words, so a list whose opening is empty or
  // shared with another list gets no notes.
  const openings = article.lists.map(list => list.key);
  const listOf = index => {
    const list = article.lists[index];
    const key = list?.key;
    return key && openings.indexOf(key) === openings.lastIndexOf(key) ? list : null;
  };

  const groupings = {};
  for (const grouping of raw.groupings ?? []) {
    const list = listOf(grouping.list);
    if (!list || list.items.length < 3) continue;
    const by = [];
    for (const principle of grouping.by ?? []) {
      const groups = (principle.groups ?? [])
        .map(group => [
          clean(group.name).replace(/:$/, ''),
          [...new Set(group.items ?? [])].sort((a, b) => a - b),
        ])
        .filter(([name, items]) => name && items.length);
      const placed = groups.flatMap(([, items]) => items).sort((a, b) => a - b);
      const every = list.items.map((_, index) => index + 1);
      // Every item in exactly one group, or the principle is dropped.
      if (groups.length < 2 || placed.join() !== every.join()) continue;
      const edits = (principle.edits ?? [])
        .map(({ item, from, to }) => [item, String(from ?? ''), clean(to)])
        .filter(([item, from, to]) => from && to && list.items[item - 1]?.includes(from));
      const name = clean(principle.name);
      if (!/^by /i.test(name)) continue;
      by.push({ name, about: clean(principle.about), groups, ...(edits.length && { edits }) });
    }
    const sentence = clean(grouping.sentence);
    const asWritten = clean(grouping.asWritten);
    if (by.length && sentence && asWritten) {
      groupings[list.key] = { sentence, asWritten, by };
    }
  }

  const carousels = {};
  for (const carousel of raw.carousels ?? []) {
    const list = listOf(carousel.list);
    if (!list || list.items.length < 3) continue;
    const icons = list.items.map((_, index) => {
      const icon = carousel.icons?.[index];
      return article.icons.has(icon) ? icon : 'bookmark';
    });
    carousels[list.key] = { label: clean(carousel.label) || 'The list as cards', icons };
  }

  return {
    essay: article.fingerprint,
    keySentences,
    collapseFolds,
    bridges: {},
    sections,
    groupings,
    carousels,
  };
}

// The bridges the model wrote, keyed the way Add summary in collapsed area finds
// them: by the key of the run each one stands in for.
export function articleBridges(raw, runs) {
  const bridges = {};
  for (const { run, text } of raw.bridges ?? []) {
    const bridge = clean(text);
    if (runs[run]?.key && bridge && words(bridge) <= 20) bridges[runs[run].key] = bridge;
  }
  return bridges;
}
