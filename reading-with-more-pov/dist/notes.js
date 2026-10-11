// Putting together what every reader said: the stored notes, minus what a
// reader said before they were edited, plus what they said after.

// The notes with each reader in generated replaced by what they said when they
// read the article again: { threads, replies: [{ thread, text }], reactions,
// asides }. Asides are the short remarks for reading together; a reader edited
// before there were asides keeps their old ones.
export function mergeNotes(notes, generated = {}) {
  const entries = Object.entries(generated);
  const redone = new Set(Object.keys(generated));
  const redoneAsides = new Set(entries.filter(([, said]) => said.asides).map(([id]) => id));
  const threads = byReaders(notes.threads, reader => !redone.has(reader));
  const asides = byReaders(notes.asides ?? [], reader => !redoneAsides.has(reader));
  const reactions = notes.reactions.filter(reaction => !redone.has(reaction.reader));
  for (const [reader, said] of entries) {
    for (const thread of said.threads ?? []) {
      threads.push({ ...thread, comments: thread.comments.map(text => ({ reader, text })) });
    }
    for (const aside of said.asides ?? []) {
      // A remark is its text, or { text, more } when it has research behind it.
      const comments = aside.comments.map(c => (typeof c === 'string' ? { text: c } : c));
      asides.push({ ...aside, comments: comments.map(c => ({ reader, ...c })) });
    }
    for (const reaction of said.reactions ?? []) reactions.push({ ...reaction, reader });
  }
  // Replies go last, so a reader can answer a thread another edited reader began.
  for (const [reader, said] of entries) {
    for (const { thread: id, text } of said.replies ?? []) {
      threads.find(thread => thread.id === id)?.comments.push({ reader, text });
    }
  }
  return { threads, reactions, asides };
}

// Only what the shown readers said: a thread whose first comment is hidden is
// hidden whole, since its replies answer it.
export function visibleNotes({ threads, reactions, asides = [] }, shown) {
  const keep = reader => shown.has(reader);
  return {
    threads: byReaders(threads, keep),
    reactions: reactions.filter(reaction => keep(reaction.reader)),
    asides: byReaders(asides, keep),
  };
}

// The threads (or asides) with only the comments by readers keep() accepts,
// dropping a thread whole when its first comment goes.
function byReaders(threads, keep) {
  return threads
    .filter(thread => keep(thread.comments[0]?.reader))
    .map(thread => ({ ...thread, comments: thread.comments.filter(c => keep(c.reader)) }));
}

// Cleaning what a request or a reply sends: a list, an object, or text cut to
// length. The server uses these too.
export const list = value => (Array.isArray(value) ? value : []);
export const record = value => (value && typeof value === 'object' ? value : {});
export const clip = (value, length) =>
  String(value ?? '')
    .trim()
    .slice(0, length);

// A reader's reply from the model, checked against the article: quotes must be
// found (by locate), comments and asides short, and replies must answer a
// thread offered. stamp, if given, sets this reading's ids apart from the
// reader's earlier ones, so replies to an old thread don't land on a new one.
export function checkReading(reply, { readerId, stamp, locate, threadIds, choices }) {
  const prefix = stamp ? `${readerId}-${stamp}` : readerId;
  const text = value => clip(value, 600);
  const said = { threads: [], replies: [], reactions: [], asides: [] };
  list(reply.comments)
    .map(record)
    .forEach(({ quote, text: comment }, index) => {
      if (!text(comment) || !locate(String(quote ?? ''))) return;
      said.threads.push({
        id: `${prefix}-${index + 1}`,
        quote: String(quote),
        comments: [text(comment)],
      });
    });
  list(reply.asides)
    .map(record)
    .forEach(({ quote, text: aside, more }, index) => {
      const short = text(aside).slice(0, 200);
      if (!short || !locate(String(quote ?? ''))) return;
      const details = text(more);
      said.asides.push({
        id: `${prefix}-a${index + 1}`,
        quote: String(quote),
        comments: [details ? { text: short, more: details } : short],
      });
    });
  for (const { thread, text: comment } of list(reply.replies).map(record)) {
    if (text(comment) && threadIds.has(thread)) said.replies.push({ thread, text: text(comment) });
  }
  for (const { quote, emoji } of list(reply.reactions).map(record)) {
    if (choices.includes(emoji) && locate(String(quote ?? ''))) {
      said.reactions.push({ quote: String(quote), emoji });
    }
  }
  return said;
}
