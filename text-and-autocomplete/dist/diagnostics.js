// Keeps the prototype's original name, Smart Writer, like the saved-key storage key.
const STORAGE_KEY = 'smart-writer.compose-debug.v1';
const MAX_EVENTS = 1200;
const MAX_TEXT = 800;

// A bounded, tab-local flight recorder. Only explicit diagnostic fields reach
// this module; never pass socket messages, headers, settings, or credentials.
export function createDiagnostics({ storage, now = () => new Date().toISOString() } = {}) {
  const redact = value =>
    String(value)
      .replace(/\b(?:sk|ek)[-_][A-Za-z0-9_-]+/gu, '[redacted-key]')
      .slice(0, MAX_TEXT);
  const fields = data =>
    Object.fromEntries(
      Object.entries(data)
        .filter(
          ([, value]) => value === null || ['string', 'number', 'boolean'].includes(typeof value),
        )
        .map(([key, value]) => [key, typeof value === 'string' ? redact(value) : value]),
    );
  let events = [];
  let timer = null;
  let persistent = Boolean(storage);
  try {
    const saved = JSON.parse(storage?.getItem(STORAGE_KEY) || 'null');
    if (saved?.version === 1 && Array.isArray(saved.events)) {
      events = saved.events
        .slice(-MAX_EVENTS)
        .filter(event => event && typeof event === 'object')
        .map(fields);
    }
  } catch {
    /* A corrupt or inaccessible log must never interrupt writing. */
  }
  const snapshot = () => ({
    version: 1,
    exportedAt: now(),
    persistent,
    maxEvents: MAX_EVENTS,
    events: events.map(event => ({ ...event })),
  });
  const flush = () => {
    clearTimeout(timer);
    timer = null;
    try {
      storage?.setItem(STORAGE_KEY, JSON.stringify(snapshot()));
    } catch {
      persistent = false;
    }
  };
  const record = (event, data = {}) => {
    events.push({ ...fields(data), event: redact(event), time: now() });
    if (events.length > MAX_EVENTS) events.splice(0, events.length - MAX_EVENTS);
    if (!timer) timer = setTimeout(flush, 250);
  };
  return { record, snapshot, flush };
}
