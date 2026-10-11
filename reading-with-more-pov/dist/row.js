// Reading couch: the readers sit on a couch at the bottom of the screen, facing
// the article, so you see the backs and tops of their heads, and at the ends a
// glimpse of a face. They jump onto the couch from off screen when the couch
// appears. Hover over one and they turn round to look at you. When one has
// something to say, they hop up and turn toward you as the bubble shows
// over their head, while the reading dot is near the words. Each reader has a
// lane of their own, so their bubbles never overlap. Reactions float up from
// their heads. When they speak is up to live.js; the characters are in
// critters.js.
import { BODY, critter, designOf } from './critters.js?v=b65e4435c03d';
import { firstName } from './readers.js?v=196534db43aa';
import { paint } from './anchors.js?v=bdd6fa0a4449';

// How each default reader's bubble looks: a color, and a label with an icon
// instead of their name. Anyone else gets a plain blue bubble with their name.
const ICONS = {
  book: '<path d="M3 5.5C5.8 4.3 8.8 4.4 12 6.5c3.2-2.1 6.2-2.2 9-1v13c-2.8-1.2-5.8-1.1-9 1-3.2-2.1-6.2-2.2-9-1z" /><path d="M12 6.5v13" />',
  laugh:
    '<circle cx="12" cy="12" r="9" /><path d="M7.8 9.6q1.4-1.6 2.8 0M13.4 9.6q1.4-1.6 2.8 0" /><path d="M7.5 13.5h9a4.5 4.5 0 0 1-9 0z" fill="currentColor" />',
  bulb: '<path d="M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1 2V16h5.2v-.2c0-.8.4-1.5 1-2A6 6 0 0 0 12 3Z" /><path d="M9.5 19h5M10.5 21.5h3" />',
};
const BUBBLES = {
  iris: { theme: 'fact', icon: 'book', label: 'Fact check' },
  milo: { theme: 'lols', icon: 'laugh', label: 'LOLZ' },
  june: { theme: 'founder', icon: 'bulb', label: 'Advice' },
};

export function createRow({ root, seats, names, readerById }) {
  const shown = [];
  let cast = '';
  const seatOf = id => seats.querySelector(`[data-reader="${CSS.escape(id)}"]`);

  // Plays a one-off animation (hop, arriving) on a reader, from the start.
  function play(seat, name) {
    const body = seat.querySelector('.critter');
    body.classList.remove('hop', 'arriving');
    void body.offsetWidth;
    body.classList.add(name);
  }

  // They jump onto the couch from off screen: the ones at the ends in an arc
  // from their side of the screen, the one in the middle up from below it.
  function arrive(seat) {
    const box = seat.querySelector('.critter').getBoundingClientRect();
    const center = box.left + box.width / 2;
    const fromX = seat.classList.contains('left')
      ? -(center + box.width)
      : seat.classList.contains('right')
        ? innerWidth - center + box.width
        : 0;
    seat.style.setProperty('--from-x', `${Math.round(fromX)}px`);
    seat.style.setProperty('--from-y', fromX ? '30%' : '170%');
    play(seat, 'arriving');
  }

  function dismiss(entry) {
    const index = shown.indexOf(entry);
    if (index === -1) return;
    shown.splice(index, 1);
    // It goes once its leaving transition ends, or at once without one.
    entry.bubble.classList.add('leaving');
    Promise.allSettled(entry.bubble.getAnimations().map(a => a.finished)).then(() =>
      entry.bubble.remove(),
    );
    if (!shown.some(other => other.seat === entry.seat)) entry.seat.classList.remove('speaking');
    if (!shown.some(other => other.anchor === entry.anchor)) light(entry.anchor, null);
  }

  function moreButton(entry, more) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'bubble-more-button';
    button.textContent = 'More';
    button.setAttribute('aria-expanded', 'false');
    button.onclick = () => {
      entry.open = !entry.open;
      button.textContent = entry.open ? 'Less' : 'More';
      button.setAttribute('aria-expanded', String(entry.open));
      entry.bubble.classList.toggle('open', entry.open);
      if (entry.open) {
        const details = document.createElement('p');
        details.className = 'bubble-more';
        details.textContent = more;
        button.before(details);
      } else {
        entry.bubble.querySelector('.bubble-more')?.remove();
        // Closed after you'd scrolled past: it goes now.
        if (entry.done) return dismiss(entry);
      }
      place(entry.bubble, entry.seat);
    };
    return button;
  }

  // On a phone, lanes are too narrow to read in: a bubble spans nearly the whole
  // screen over its reader, and only one reader talks at a time. The same width
  // as the phone rules in style.css.
  const phone = matchMedia('(max-width: 600px)');
  const narrow = () => phone.matches;

  // Over the reader's head, inside their lane; at the ends of the couch, a long
  // bubble can reach outward past it, never toward a neighbor.
  function place(bubble, seat) {
    const lane = seat.offsetWidth;
    if (narrow()) {
      const box = seat.getBoundingClientRect();
      bubble.style.maxWidth = `${Math.min(340, innerWidth - 24)}px`;
      const width = bubble.offsetWidth;
      const center = box.left + lane / 2;
      const left = Math.max(12, Math.min(center - width / 2, innerWidth - 12 - width));
      bubble.style.left = `${left - box.left}px`;
      bubble.style.setProperty('--tail', `${center - left}px`);
      return;
    }
    const scene = seats.getBoundingClientRect();
    const spill = Math.max(0, Math.min(90, Math.min(scene.left, innerWidth - scene.right) - 12));
    const left = seat.classList.contains('left');
    const right = seat.classList.contains('right');
    bubble.style.maxWidth = `${lane + (left || right ? spill : 0)}px`;
    const width = bubble.offsetWidth;
    const min = left ? -spill : 0;
    const max = right ? lane + spill - width : lane - width;
    const x = Math.max(min, Math.min((lane - width) / 2, max));
    bubble.style.left = `${x}px`;
    bubble.style.setProperty('--tail', `${lane / 2 - x}px`);
  }

  // The words being talked about glow in the speaker's color.
  function light(anchor, color) {
    paint(anchor.asideSpans ?? [], 'spoken', color);
  }

  return {
    // Rebuilt only when who's on the couch changes, so nobody jumps in again
    // for nothing.
    setCast(readers) {
      const next = readers.map(r => `${r.id}:${r.color}:${r.name}`).join('|');
      if (next === cast) return;
      cast = next;
      const before = new Set([...seats.children].map(seat => seat.dataset.reader));
      const middle = (readers.length - 1) / 2;
      seats.replaceChildren(
        ...readers.map((reader, index) => {
          const seat = document.createElement('div');
          // Where they sit decides which way their bubble can spill: the ends of
          // the couch outward, the middle neither way.
          const side = index === middle ? 'middle' : index < middle ? 'left' : 'right';
          seat.className = `seat ${side}`;
          seat.dataset.reader = reader.id;
          seat.setAttribute('role', 'listitem');
          seat.setAttribute('aria-label', `${reader.name}, ${reader.role}`);
          seat.style.setProperty('--color', reader.color);
          if (BODY[reader.id]) seat.style.setProperty('--seat-body', BODY[reader.id]);
          // The one in the middle faces the article straight on. Those at the
          // ends sit slightly angled toward the middle, so the edge of their
          // face shows past the side of their head (--away). Turning to speak,
          // or when you hover over them, the face comes round toward you
          // (--look). The ends lean in a little (--tilt).
          const toward = index === middle ? 0 : Math.sign(middle - index);
          seat.style.setProperty('--away', `${toward ? toward * 66 : 96}px`);
          seat.style.setProperty('--look', `${toward * 7}px`);
          seat.style.setProperty('--tilt', `${toward * 2.5}deg`);
          seat.style.setProperty('--phase', `${-index * 1.3}s`);
          seat.style.setProperty('--delay', `${index * 0.14}s`);
          const body = document.createElement('div');
          body.className = 'critter';
          const sway = document.createElement('div');
          sway.className = 'critter-sway';
          sway.innerHTML = critter(designOf(reader));
          body.append(sway);
          body.addEventListener('animationend', event => {
            if (event.target === body) body.classList.remove('hop', 'arriving');
          });
          seat.append(body);
          // Hovering over them, they hop as they turn round to look at you.
          body.addEventListener('pointerenter', () => play(seat, 'hop'));
          return seat;
        }),
      );
      if (!root.hidden) {
        for (const seat of seats.children) if (!before.has(seat.dataset.reader)) arrive(seat);
      }
      names.replaceChildren(
        ...readers.map(reader => {
          const name = document.createElement('span');
          name.className = 'couch-name';
          name.textContent = firstName(reader);
          return name;
        }),
      );
    },
    show() {
      root.hidden = false;
      for (const seat of seats.children) arrive(seat);
    },
    hide() {
      root.hidden = true;
    },

    say(anchor, comment) {
      const seat = seatOf(comment.reader);
      const reader = readerById(comment.reader);
      if (!seat || !reader) return null;
      // A reader whose bubble you've opened waits until you close it.
      if (shown.some(other => other.seat === seat && other.open)) return null;
      // One bubble per reader, in their lane.
      shown.filter(other => other.seat === seat).forEach(dismiss);
      const look = BUBBLES[reader.id];
      const bubble = document.createElement('div');
      bubble.className = `bubble ${look?.theme ?? 'plain'}`;
      const who = document.createElement('span');
      who.className = 'bubble-name';
      if (look) {
        who.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[look.icon]}</svg>`;
        const label = document.createElement('span');
        label.textContent = look.label;
        const name = document.createElement('span');
        name.className = 'sr-only';
        name.textContent = `${reader.name}: `;
        who.prepend(name);
        who.append(label);
      } else who.textContent = firstName(reader);
      const text = document.createElement('span');
      text.className = 'bubble-text';
      text.textContent = comment.text;
      bubble.append(who, text);
      const entry = { bubble, seat, anchor };
      // A remark with more behind it (Professor's research) has a More button that
      // opens it in the bubble. An open bubble stays until you close it, even
      // once you've scrolled past.
      if (comment.more) bubble.append(moreButton(entry, comment.more));
      shown.push(entry);
      // They hop up and turn toward you as the bubble shows.
      play(seat, 'hop');
      seat.prepend(bubble);
      place(bubble, seat);
      seat.classList.add('speaking');
      light(anchor, reader.color);
      return entry;
    },

    mostTalking: () => (narrow() ? 1 : 2),

    unsay(entry) {
      if (entry.open) entry.done = true;
      else dismiss(entry);
    },

    // A reaction pops up in a thought bubble by their head, a couple of small
    // bubbles leading up to it, and fades.
    react(anchor, id, emoji, duration) {
      const seat = seatOf(id);
      if (!seat) return;
      seat.querySelector('.thought')?.remove();
      const thought = document.createElement('div');
      thought.className = 'thought';
      thought.setAttribute('aria-hidden', 'true');
      thought.style.setProperty('--duration', `${duration}ms`);
      thought.innerHTML =
        '<span class="thought-dot small"></span><span class="thought-dot"></span>';
      const cloud = document.createElement('span');
      cloud.className = 'thought-cloud';
      cloud.textContent = emoji;
      thought.append(cloud);
      seat.append(thought);
      setTimeout(() => thought.remove(), duration);
    },

    quiet() {
      [...shown].forEach(dismiss);
    },
  };
}
