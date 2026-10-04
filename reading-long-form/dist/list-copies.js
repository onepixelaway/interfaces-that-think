// Copies of an essay's lists, for the ideas that show a list another way (Group
// lists by other principles, and Slide through lists as cards). They show copies
// of the list's items with the marks the other ideas put on them, and keep the
// list itself in the page, hidden, so the other ideas keep working on it.
import { bodyElements, clean, unmark } from './text-emphasis.js?v=8e863dc0fe81';

// The text of a list item without the other ideas' marks.
function plainText(item) {
  const copy = item.cloneNode(true);
  unmark(copy);
  return clean(copy.textContent);
}

// The essay's lists that have notes in table, found by the opening words of their
// first item: the longest key that matches, each key for one list only. Only the
// essay's own lists count, not copies another idea shows.
export function notedLists(essay, table) {
  const keys = Object.keys(table)
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
  const used = new Set();
  return bodyElements(essay)
    .filter(element => element.matches('ul, ol'))
    .flatMap(list => {
      const items = [...list.querySelectorAll(':scope > li')];
      const opening = items.length ? plainText(items[0]) : '';
      const key = keys.find(key => !used.has(key) && opening.startsWith(key));
      if (!key) return [];
      used.add(key);
      return [{ list, items, notes: table[key] }];
    });
}

// A copy of a list item. Its collapsed runs get their own numbers (the run's
// number and the tag), so they expand on their own and keep their bridges, and
// they start closed. Its footnote markers take the ids its list lends them.
export function copyItem(item, tag) {
  const copy = item.cloneNode(true);
  for (const part of copy.querySelectorAll('[data-run]')) {
    part.dataset.run += tag;
    part.classList.remove('emph-open');
  }
  for (const marker of copy.querySelectorAll('.emph-more')) {
    marker.setAttribute('aria-expanded', 'false');
  }
  returnIds(copy);
  return copy;
}

// While copies stand in for a list, its footnote markers' ids move to the copies,
// so a footnote's ↩ link returns to the marker you can see.
export function lendIds(list) {
  for (const ref of list.querySelectorAll('.fn-ref[id]')) {
    ref.dataset.lentId = ref.id;
    ref.removeAttribute('id');
  }
}
export function returnIds(list) {
  for (const ref of list.querySelectorAll('.fn-ref[data-lent-id]')) {
    ref.id = ref.dataset.lentId;
    delete ref.dataset.lentId;
  }
}
