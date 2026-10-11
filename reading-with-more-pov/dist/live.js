// Reading live: the readers talk to you as you read, about the words around the
// line in focus, the one the reading dot marks (see focus.js). A remark shows
// the moment the dot reaches the line before its words, stays while the dot is
// on them or the line after, and comes down as soon as the dot moves on.
// Scroll back and it shows again. Words get one remark at most, the first
// reader's, and at most two readers talk at once. Reactions come the same way,
// briefly, as the words reach the dot.
//
// How it looks is up to a presenter (the reading couch, or the cursors):
//   setCast(readers)                     who's reading
//   show(), hide()                       when the style is turned on or off
//   say(anchor, comment)                 show a remark, returning a handle (or
//                                        nothing, if it can't)
//   unsay(handle)                        take a remark down
//   react(anchor, readerId, emoji, ms)   show a reaction for ms
//   quiet()                              clear everything shown
//   mostTalking()                        (optional) how many can talk at once,
//                                        if not two

// At most this many readers talk at once; another waits for one to finish.
const MOST_TALKING = 2;
// How often a reader waiting for their turn checks again.
const RETRY = 400;
const REACTION_DURATION = 2400;

const remarkSpans = anchor => anchor.asideSpans ?? anchor.reactionSpans;

// onSay(comment, spans), if given, hears each remark as it's said, with the
// words it's about.
export function createLive({ presenter, readerById, focus, onSay }) {
  let active = false;
  let anchors = [];
  let showReactions = true;
  // The anchors near the dot now, by key, each with a count of how many times
  // it's come near, so turns planned for an earlier visit are let go.
  const near = new Map();
  let visits = 0;
  // The remarks up now: { reader, key, handle }.
  const talking = [];
  // When each reader's reaction is done, so they don't talk over it.
  const reactingUntil = new Map();
  const timers = new Set();

  const later = (delay, run) => {
    const timer = setTimeout(() => {
      timers.delete(timer);
      if (active) run();
    }, delay);
    timers.add(timer);
  };
  const isTalking = reader => talking.some(entry => entry.reader === reader);
  const stillNear = (anchor, visit) => near.get(anchor.key) === visit;

  // A reader tries to say a remark: now if the floor is free, a little later
  // if not, or never once the dot has moved on.
  function attempt(anchor, visit, comment) {
    if (!stillNear(anchor, visit) || !readerById(comment.reader)) return;
    if (
      isTalking(comment.reader) ||
      talking.length >= (presenter.mostTalking?.() ?? MOST_TALKING) ||
      (reactingUntil.get(comment.reader) ?? 0) > Date.now()
    ) {
      later(RETRY, () => attempt(anchor, visit, comment));
      return;
    }
    const handle = presenter.say(anchor, comment);
    if (!handle) return;
    talking.push({ reader: comment.reader, key: anchor.key, handle });
    onSay?.(comment, remarkSpans(anchor));
  }

  function silence(key) {
    for (const entry of talking.filter(entry => entry.key === key)) {
      talking.splice(talking.indexOf(entry), 1);
      presenter.unsay(entry.handle);
    }
  }

  // Words that just came near the dot are talked about; words the dot just
  // left are let go.
  function check() {
    if (!active) return;
    const line = focus.line();
    for (const anchor of anchors) {
      const spans = remarkSpans(anchor);
      if (!spans) continue;
      if (!focus.near(spans, line)) {
        if (near.delete(anchor.key)) silence(anchor.key);
        continue;
      }
      if (near.has(anchor.key)) continue;
      const visit = ++visits;
      near.set(anchor.key, visit);
      const remark = anchor.asides?.[0]?.comments[0];
      if (remark) attempt(anchor, visit, remark);
      if (!showReactions) continue;
      for (const [emoji, { readers }] of anchor.reactions) {
        for (const id of readers) {
          later(300 + Math.random() * 1400, () => {
            if (!stillNear(anchor, visit) || !readerById(id) || isTalking(id)) return;
            reactingUntil.set(id, Date.now() + REACTION_DURATION);
            presenter.react(anchor, id, emoji, REACTION_DURATION);
          });
        }
      }
    }
  }
  // Checked a few times a second while scrolling, on a timer rather than an
  // animation frame, which browsers hold back while the page is hidden.
  let checking = false;
  addEventListener(
    'scroll',
    () => {
      if (!active || checking) return;
      checking = true;
      setTimeout(() => {
        checking = false;
        check();
      }, 60);
    },
    { passive: true },
  );

  function reset() {
    timers.forEach(clearTimeout);
    timers.clear();
    near.clear();
    talking.length = 0;
    reactingUntil.clear();
    presenter.quiet();
  }

  return {
    setCast: readers => presenter.setCast(readers),
    // The article's anchors, after every render, which marks the article
    // afresh: what was up comes down, and what's near the dot starts again.
    setAnchors(next) {
      anchors = next;
      if (!active) return;
      reset();
      check();
    },
    setReactions(on) {
      showReactions = on;
    },
    start() {
      if (active) return;
      active = true;
      presenter.show();
      check();
    },
    stop() {
      if (!active) return;
      active = false;
      reset();
      presenter.hide();
    },
  };
}
