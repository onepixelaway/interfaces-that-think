import { randomUUID } from 'node:crypto';

// How many articles each visitor can read, counted in memory. A visitor is the
// id in their cookie; an address cap stops someone from clearing the cookie to
// read more, and a daily cap for everyone together bounds what the key can
// spend. Counts reset when the server restarts.
export function createLimits({
  perVisitor,
  perAddress,
  perDay = Infinity,
  now = () => Date.now(),
}) {
  const visitors = new Map();
  const addresses = new Map();
  let day = null;
  let today = 0;
  const rollOver = () => {
    const current = new Date(now()).toISOString().slice(0, 10);
    if (current !== day) {
      day = current;
      today = 0;
    }
  };
  const left = (visitor, address) => {
    rollOver();
    return Math.max(
      0,
      Math.min(
        perVisitor - (visitors.get(visitor) ?? 0),
        perAddress - (addresses.get(address) ?? 0),
        perDay - today,
      ),
    );
  };
  return {
    left,
    // Uses one article, if there's one left, and says how many remain. full says
    // the day's articles are used up for everyone.
    take(visitor, address) {
      rollOver();
      if (today >= perDay) return { ok: false, left: 0, full: true };
      if (!left(visitor, address)) return { ok: false, left: 0 };
      visitors.set(visitor, (visitors.get(visitor) ?? 0) + 1);
      addresses.set(address, (addresses.get(address) ?? 0) + 1);
      today++;
      return { ok: true, left: left(visitor, address) };
    },
    // Gives back an article whose reading failed.
    giveBack(visitor, address) {
      visitors.set(visitor, Math.max(0, (visitors.get(visitor) ?? 0) - 1));
      addresses.set(address, Math.max(0, (addresses.get(address) ?? 0) - 1));
      today = Math.max(0, today - 1);
    },
  };
}

// An article's later steps (notes, then bridges) each succeed once, for an hour,
// on the token its first step returned, and a step that fails can be tried once
// more, so one article costs at most five calls. The token remembers how long
// the article was, so a later step can't send far more text than it read.
export function createTokens({ ttlMs = 60 * 60 * 1000, tries = 2, now = () => Date.now() } = {}) {
  const tokens = new Map();
  return {
    // A new token for an article of this many characters (or the token given, for
    // tests).
    issue(characters = 0, token = randomUUID()) {
      tokens.set(token, { created: now(), characters, done: new Set(), tried: new Map() });
      for (const [key, { created }] of tokens) if (now() - created > ttlMs) tokens.delete(key);
      return token;
    },
    // The article's length, if this step may run on this token now; it counts
    // as one of the step's tries.
    use(token, step) {
      const entry = tokens.get(token);
      if (!entry || now() - entry.created > ttlMs || entry.done.has(step)) return null;
      const tried = entry.tried.get(step) ?? 0;
      if (tried >= tries) return null;
      entry.tried.set(step, tried + 1);
      return { characters: entry.characters };
    },
    // The step succeeded, so it can't run again.
    finish(token, step) {
      tokens.get(token)?.done.add(step);
    },
  };
}
