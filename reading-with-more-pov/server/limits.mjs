// How many times each visitor can have a reader read the article again, counted
// in memory. A visitor is the id in their cookie; an address cap stops someone
// from clearing the cookie to read more, and a daily cap for everyone together
// bounds what the key can spend. Counts reset when the server restarts.
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
    // Uses one reading, if there's one left, and says how many remain. full says
    // the day's readings are used up for everyone.
    take(visitor, address) {
      rollOver();
      if (today >= perDay) return { ok: false, left: 0, full: true };
      if (!left(visitor, address)) return { ok: false, left: 0 };
      visitors.set(visitor, (visitors.get(visitor) ?? 0) + 1);
      addresses.set(address, (addresses.get(address) ?? 0) + 1);
      today++;
      return { ok: true, left: left(visitor, address) };
    },
    // Gives back a reading that failed.
    giveBack(visitor, address) {
      visitors.set(visitor, Math.max(0, (visitors.get(visitor) ?? 0) - 1));
      addresses.set(address, Math.max(0, (addresses.get(address) ?? 0) - 1));
      today = Math.max(0, today - 1);
    },
  };
}
