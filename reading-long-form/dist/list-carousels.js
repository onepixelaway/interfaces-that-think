// Slide through lists as cards: the essay's chunkiest lists, like the six
// properties of powerful AI, show as a row of cards you slide through, one item
// per card, with the next card peeking in. Each card has a small icon in its
// corner, in the secondary text color, above the item's text, set like the body
// text. Cards slide when you swipe, scroll sideways, or use the arrow keys, and
// nothing moves on its own. Which lists become cards, and each item's icon, were
// chosen once for an essay and are stored in its notes.
//
// Like a regrouped list, the cards are copies of Dario's items with the marks the
// other ideas put on them, copied again whenever those marks change, and his
// list stays in the page, hidden, so the other ideas keep working on it. The
// cards follow Group lists by other principles: when a list is regrouped, each
// group becomes its own row of cards under its heading.
import { removeClasses } from './text-emphasis.js?v=8e863dc0fe81';
import { copyItem, lendIds, notedLists, returnIds } from './list-copies.js?v=e3d70997da26';
import { shownLists } from './regroup-lists.js?v=191527662b07';
import { ICONS } from './lucide-icons.js?v=d471d097d2c5';

const svg = name =>
  `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONS[name] ?? ''}</svg>`;

// A card: a copy of a list item with its icon first.
function cardOf(item, icon, tag) {
  const card = copyItem(item, tag);
  card.classList.add('carousel-card');
  const corner = document.createElement('span');
  corner.className = 'carousel-icon';
  corner.innerHTML = svg(icon);
  card.prepend(corner);
  return card;
}

// A row of cards for a list: the cards in a list you can scroll sideways. The
// arrow keys move one card at a time; the cards snap into place however they're
// scrolled.
function rowOf(found, { list, label }, tag) {
  const items = [...list.querySelectorAll(':scope > li')];
  lendIds(list);
  const row = document.createElement('div');
  row.className = 'carousel';
  row.setAttribute('role', 'region');
  row.setAttribute('aria-roledescription', 'carousel');
  row.setAttribute('aria-label', label ?? found.notes.label);
  const track = document.createElement(list.localName);
  track.className = 'carousel-track';
  track.tabIndex = 0;
  for (const [index, item] of items.entries()) {
    const number = Number(item.dataset.item) || index + 1;
    track.append(cardOf(item, found.notes.icons[number - 1], tag));
  }
  row.append(track);

  const cards = [...track.children];
  // The card a slide is heading to, until it lands or you take over by scrolling,
  // so pressing an arrow key again mid-slide moves on from there.
  let heading = null;
  const land = () => (heading = null);
  // The card the track shows: the one a slide is heading to, or else the one
  // whose left edge is nearest the track's.
  const current = () => {
    if (heading !== null) return heading;
    const left = track.getBoundingClientRect().left;
    const offsets = cards.map(card => Math.abs(card.getBoundingClientRect().left - left));
    return offsets.indexOf(Math.min(...offsets));
  };
  const go = index => {
    heading = Math.max(0, Math.min(cards.length - 1, index));
    const card = cards[heading];
    // The stylesheet slides it, unless you've asked for less motion.
    track.scrollTo({ left: card.offsetLeft - cards[0].offsetLeft });
  };
  track.addEventListener('keydown', event => {
    if (event.target !== track) return;
    const to = {
      ArrowLeft: current() - 1,
      ArrowRight: current() + 1,
      Home: 0,
      End: cards.length - 1,
    }[event.key];
    if (to === undefined) return;
    event.preventDefault();
    go(to);
  });
  track.addEventListener('scrollend', land);
  for (const type of ['pointerdown', 'wheel', 'touchstart', 'focusin']) {
    track.addEventListener(type, land, { passive: true });
  }

  list.classList.add('carousel-away');
  list.after(row);
  return { list, row };
}

// Shows a list's rows of cards, built again from what the list shows now.
function show(found) {
  hide(found);
  found.rows = shownLists(found.list).map((shown, index) =>
    rowOf(found, shown, `${found.tag}-${index + 1}`),
  );
}

// Takes a list's cards away and shows what they stood in for, exactly as it was.
function hide(found) {
  for (const { list, row } of found.rows) {
    row.remove();
    returnIds(list);
    removeClasses(list, 'carousel-away');
  }
  found.rows = [];
}

export const listCarousels = {
  id: 'list-carousels',
  label: 'Slide through lists as cards',
  start({ essay, notes }) {
    const lists = notedLists(essay, notes.carousels).map((found, index) => ({
      ...found,
      tag: `c${index + 1}`,
      rows: [],
    }));
    lists.forEach(show);
    const of = event => lists.find(found => found.list === event.target);
    // A regrouped list takes its cards away before it changes and gets them back
    // after, so they follow the new groups.
    const before = event => of(event) && hide(of(event));
    const after = event => of(event) && show(of(event));
    // When the key sentences are marked again, copy the newly marked items. A
    // regrouped list is copied again by its grouping, which says so (above).
    const recopy = () => {
      for (const found of lists) {
        if (!found.list.classList.contains('regroup-away')) show(found);
      }
    };
    essay.addEventListener('list:regrouping', before);
    essay.addEventListener('list:regrouped', after);
    essay.addEventListener('keysentences:marked', recopy);
    return () => {
      essay.removeEventListener('list:regrouping', before);
      essay.removeEventListener('list:regrouped', after);
      essay.removeEventListener('keysentences:marked', recopy);
      lists.forEach(hide);
    };
  },
};
