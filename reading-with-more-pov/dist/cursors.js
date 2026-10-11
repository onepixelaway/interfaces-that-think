// Reading cursors: each reader has a cursor, like a collaborator's in Figma,
// with their name on a tag. While they read they drift in the margins near the
// reading line. When they have something to say, they move to the edge of the
// sentence, which lights up in their color as if hovered, and say it in cursor
// chat beside the pointer, out in the margin so it doesn't cover the text. When
// they speak is up to live.js.
import { firstName } from './readers.js?v=196534db43aa';
import { paint } from './anchors.js?v=bdd6fa0a4449';

// Which margin each reader keeps to, and where around the reading line.
const SIDES = ['right', 'left', 'right'];
const SLOTS = [-80, 10, 90];
const TOP_BAR = 56;
// A margin narrower than this has no room for chat beside the text.
const ROOMY = 150;

export function createCursors({ root, article }) {
  let cursors = [];
  let running = false;
  let scheduled = false;
  let last = 0;
  let cast = '';
  // While every cursor is still, the loop sleeps until one wanders again.
  let sleeping = false;
  let wake;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

  function make(reader, index) {
    const element = document.createElement('div');
    element.className = `cursor ${SIDES[index]}`;
    element.style.setProperty('--color', reader.color);
    element.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 2.5v17.2l4.7-4.4 3.1 6.9 3-1.3-3.1-6.8h6.6z"/></svg>';
    const tag = document.createElement('div');
    tag.className = 'cursor-tag';
    tag.textContent = firstName(reader);
    element.append(tag);
    return {
      id: reader.id,
      reader,
      side: SIDES[index],
      slot: SLOTS[index],
      element,
      tag,
      pos: null,
      velocity: { x: 0, y: 0 },
      idle: null,
      wanderAt: 0,
      focus: null,
    };
  }

  const column = () => article.getBoundingClientRect();
  const roomOn = (side, col) => (side === 'right' ? innerWidth - col.right : col.left);

  // Somewhere in the margin near the reading line, picked again every few
  // seconds so the cursor drifts like someone reading.
  function idleTarget(cursor, now) {
    if (cursor.idle && now < cursor.wanderAt) return cursor.idle;
    const col = column();
    const room = roomOn(cursor.side, col);
    const spread = Math.random() * Math.max(0, Math.min(150, room - 210));
    // The arrow's body reaches about 20px right of its tip, so on the left the
    // tip stays further out.
    let x;
    // Without a margin, they tuck in at the very edges of the screen.
    if (room < ROOMY) x = cursor.side === 'right' ? innerWidth - 16 : 2;
    else x = cursor.side === 'right' ? col.right + 36 + spread : col.left - 62 - spread;
    const y = innerHeight * 0.45 + cursor.slot + (Math.random() - 0.5) * 70;
    cursor.idle = { x, y: Math.max(TOP_BAR + 24, Math.min(innerHeight - 90, y)) };
    cursor.wanderAt = now + 2500 + Math.random() * 3500;
    return cursor.idle;
  }

  // Where a talking cursor goes, never over the words it's talking about. With
  // a margin: at the edge of the sentence's first line, on the cursor's side,
  // with the arrow and the chat out in the margin. Without one (a phone, a
  // narrow window): just under the sentence's last line, pointing up at it, with
  // the chat hanging below; or, near the bottom of the screen, just above its
  // first line. Once the sentence scrolls off screen, the cursor lets it go.
  function focusTarget(cursor) {
    const lines = cursor.focus.spans.flatMap(span => [...span.getClientRects()]);
    const first = lines[0];
    const last = lines.at(-1);
    if (!first || last.bottom < TOP_BAR || first.top > innerHeight - 40) {
      release(cursor, cursor.focus);
      return null;
    }
    const col = column();
    cursor.under = roomOn(cursor.side, col) < ROOMY;
    if (!cursor.under) {
      const y = first.top + first.height / 2 - 4;
      return { x: cursor.side === 'right' ? col.right + 10 : col.left - 28, y };
    }
    const chat = cursor.tag.offsetHeight + 26;
    const below = last.bottom + chat + 12 < innerHeight;
    const line = below ? last : first;
    const x = Math.max(6, Math.min(line.left + 4, innerWidth - 200));
    cursor.tag.style.setProperty('--chat-width', `${Math.min(300, innerWidth - x - 30)}px`);
    return { x, y: below ? last.bottom + 2 : first.top - chat - 4 };
  }

  // Cursors on the same side don't stack their chats on top of each other: a
  // later one moves down below an earlier one's.
  function spaced(targets) {
    const taken = { left: [], right: [], under: [] };
    const sideOf = cursor => (cursor.under ? 'under' : cursor.side);
    for (const cursor of cursors) {
      const target = targets.get(cursor);
      if (!cursor.focus?.shown || !target) continue;
      const height = cursor.tag.offsetHeight + 24;
      for (const [top, bottom] of taken[sideOf(cursor)]) {
        if (target.y < bottom && target.y + height > top) target.y = bottom + 10;
      }
      taken[sideOf(cursor)].push([target.y, target.y + height]);
    }
    // Idle cursors keep clear of anyone chatting on their side, and of the
    // words anyone is talking about.
    const talkedAbout = cursors
      .filter(cursor => cursor.focus?.shown)
      .map(cursor => cursor.focus.spans.flatMap(span => [...span.getClientRects()]))
      .filter(lines => lines.length);
    for (const cursor of cursors) {
      let target = targets.get(cursor);
      if (cursor.focus?.shown || !target) continue;
      for (const [top, bottom] of taken[sideOf(cursor)]) {
        if (target.y > top - 44 && target.y < bottom + 12) {
          target = { ...target, y: top - 44 > TOP_BAR + 24 ? top - 44 : bottom + 12 };
        }
      }
      // The cursor and its name tag, about 70 by 44 pixels from its tip.
      const box = {
        left: target.x - 70,
        right: target.x + 70,
        top: target.y,
        bottom: target.y + 44,
      };
      for (const lines of talkedAbout) {
        const covers = lines.some(
          line =>
            line.left < box.right &&
            box.left < line.right &&
            line.top < box.bottom &&
            box.top < line.bottom,
        );
        if (!covers) continue;
        const above = lines[0].top - 52;
        target = { ...target, y: above > TOP_BAR + 24 ? above : lines.at(-1).bottom + 12 };
      }
      targets.set(cursor, target);
    }
  }

  function frame(now) {
    scheduled = false;
    if (!running) return;
    // Frames since the last one, as a multiplier, so motion keeps its pace.
    const step = Math.max(0.1, Math.min(3, (now - last) / 16.7)) || 1;
    last = now;
    const targets = new Map();
    for (const cursor of cursors) {
      targets.set(cursor, (cursor.focus && focusTarget(cursor)) || idleTarget(cursor, now));
    }
    spaced(targets);
    // Without a margin, tags and chat open inward, over the text.
    const col = column();
    for (const cursor of cursors) {
      cursor.element.classList.toggle('narrow', roomOn(cursor.side, col) < ROOMY);
      cursor.element.classList.toggle('under', Boolean(cursor.focus && cursor.under));
    }
    for (const cursor of cursors) {
      const target = targets.get(cursor);
      if (!cursor.pos || reduceMotion.matches) cursor.pos = { ...target };
      // A soft spring: quick to start, easing in, with a little overshoot.
      for (const axis of ['x', 'y']) {
        const pull = (target[axis] - cursor.pos[axis]) * 0.07 * step;
        cursor.velocity[axis] = (cursor.velocity[axis] + pull) * Math.pow(0.8, step);
        cursor.pos[axis] += cursor.velocity[axis] * step;
      }
      if (!Number.isFinite(cursor.pos.x + cursor.pos.y)) {
        cursor.pos = { ...target };
        cursor.velocity = { x: 0, y: 0 };
      }
      cursor.element.style.transform = `translate(${cursor.pos.x}px, ${cursor.pos.y}px)`;
    }
    const still = cursors.every(cursor => {
      const target = targets.get(cursor);
      const off = Math.abs(target.x - cursor.pos.x) + Math.abs(target.y - cursor.pos.y);
      return off < 0.5 && Math.abs(cursor.velocity.x) + Math.abs(cursor.velocity.y) < 0.05;
    });
    if (!still) return loop();
    // Asleep until an idle cursor picks somewhere new, or something moves.
    sleeping = true;
    const next = Math.min(...cursors.filter(cursor => !cursor.focus).map(c => c.wanderAt));
    clearTimeout(wake);
    if (Number.isFinite(next)) wake = setTimeout(loop, Math.max(0, next - performance.now()));
  }
  function loop() {
    if (!running || scheduled) return;
    clearTimeout(wake);
    if (sleeping) {
      sleeping = false;
      last = performance.now();
    }
    scheduled = true;
    requestAnimationFrame(frame);
  }
  addEventListener('scroll', loop, { passive: true });
  addEventListener('resize', loop);

  function chat(cursor) {
    const { focus, tag } = cursor;
    focus.shown = true;
    const col = column();
    const room = roomOn(cursor.side, col);
    tag.replaceChildren();
    tag.classList.add('chat');
    tag.classList.toggle('emoji-chat', Boolean(focus.emoji));
    tag.style.setProperty(
      '--chat-width',
      `${room < ROOMY ? Math.min(260, innerWidth - 40) : Math.min(260, room - 40)}px`,
    );
    if (focus.emoji) tag.textContent = focus.emoji;
    else {
      const name = document.createElement('span');
      name.className = 'chat-name';
      name.textContent = firstName(cursor.reader);
      tag.append(name, focus.text);
    }
    highlight(focus.spans, cursor.reader.color);
    // A reaction is brief; a remark stays until you scroll past its words.
    if (focus.duration) focus.timer = setTimeout(() => release(cursor, focus), focus.duration);
  }

  function release(cursor, focus) {
    if (cursor.focus !== focus) return;
    clearTimeout(focus.timer);
    loop();
    cursor.focus = null;
    cursor.under = false;
    cursor.idle = null;
    cursor.tag.className = 'cursor-tag';
    cursor.tag.textContent = firstName(cursor.reader);
    if (!cursors.some(other => other.focus?.spans === focus.spans && other.focus.shown)) {
      highlight(focus.spans, null);
    }
  }

  // The sentence a cursor is on lights up, as if hovered.
  const highlight = (spans, color) => paint(spans, 'cursor-hover', color);

  function focusOn(id, anchor, details) {
    const cursor = cursors.find(c => c.id === id);
    const spans = details.emoji ? anchor.reactionSpans : anchor.asideSpans;
    if (!cursor || !spans) return null;
    if (cursor.focus) release(cursor, cursor.focus);
    // Chat shows at once and travels with the cursor to the sentence.
    cursor.focus = { cursor, anchor, spans, shown: false, ...details };
    chat(cursor);
    loop();
    return cursor.focus;
  }

  return {
    // Rebuilt only when who's reading changes.
    setCast(readers) {
      const next = readers.map(r => `${r.id}:${r.color}:${r.name}`).join('|');
      if (next === cast) return;
      cast = next;
      const kept = new Map(cursors.map(cursor => [cursor.id, cursor]));
      cursors = readers.map((reader, index) => {
        const old = kept.get(reader.id);
        const cursor = make(reader, index);
        if (old) cursor.pos = old.pos;
        return cursor;
      });
      root.replaceChildren(...cursors.map(cursor => cursor.element));
      loop();
    },
    show() {
      root.hidden = false;
      // They glide in from the edges.
      for (const cursor of cursors) {
        cursor.pos = { x: cursor.side === 'right' ? innerWidth + 40 : -60, y: innerHeight * 0.45 };
      }
      running = true;
      last = performance.now();
      loop();
    },
    hide() {
      root.hidden = true;
      running = false;
      clearTimeout(wake);
    },
    say(anchor, comment) {
      return focusOn(comment.reader, anchor, { text: comment.text });
    },
    unsay(focus) {
      release(focus.cursor, focus);
    },
    react(anchor, id, emoji, duration) {
      focusOn(id, anchor, { emoji, duration });
    },
    quiet() {
      for (const cursor of cursors) if (cursor.focus) release(cursor, cursor.focus);
    },
  };
}
