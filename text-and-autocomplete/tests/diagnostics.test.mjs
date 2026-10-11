import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDiagnostics } from '../dist/diagnostics.js';
import { inspectCompletion, completionAnchor } from '../dist/compose-core.js';

test('diagnostics retain a bounded history across reloads and redact credentials', () => {
  const data = new Map();
  const storage = { getItem: key => data.get(key), setItem: (key, value) => data.set(key, value) };
  const log = createDiagnostics({ storage, now: () => '2026-09-18T01:00:00Z' });
  for (let index = 0; index < 1300; index++) log.record('input', { index });
  log.record('validation', {
    raw: 'sk-secret_value, ek-token-value, and ek_session_value',
    long: 'a'.repeat(1000),
    headers: { Authorization: 'secret' },
  });
  log.flush();
  const reload = createDiagnostics({ storage });
  const events = reload.snapshot().events;
  assert.equal(events.length, 1200);
  assert.equal(events[0].index, 101);
  assert.equal(events.at(-1).raw, '[redacted-key], [redacted-key], and [redacted-key]');
  assert.equal(events.at(-1).long.length, 800);
  assert.equal(events.at(-1).headers, undefined);
  events[0].index = -1;
  assert.equal(reload.snapshot().events[0].index, 101, 'exports must not mutate retained history');
});

test('storage failures do not interrupt logging or writing', () => {
  const log = createDiagnostics({
    storage: {
      getItem() {
        throw new Error('blocked');
      },
      setItem() {
        throw new Error('quota');
      },
    },
  });
  assert.doesNotThrow(() => {
    log.record('suggestion-hidden', { reason: 'caret-has-no-geometry' });
    log.flush();
  });
  assert.equal(log.snapshot().persistent, false);
  assert.equal(log.snapshot().events[0].reason, 'caret-has-no-geometry');
});

test('validation identifies why a visible streamed suggestion becomes invalid', () => {
  const before = 'The next step is ';
  const anchor = completionAnchor(before);
  assert.deepEqual(inspectCompletion(anchor + 'to simplify ', before, '', false), {
    text: 'to simplify ',
    reason: null,
  });
  assert.equal(
    inspectCompletion(anchor + 'word '.repeat(17), before, '', false).reason,
    'suggestion-word-limit',
  );
  assert.equal(
    inspectCompletion(anchor + 'x'.repeat(221), before, '').reason,
    'suggestion-character-limit',
  );
  assert.equal(inspectCompletion(anchor + 'two\nlines', before, '').reason, 'line-break');
  assert.equal(inspectCompletion('Different prefix', before, '').reason, 'anchor-mismatch');
  assert.equal(inspectCompletion('', before, '').reason, 'empty-response');
  assert.equal(
    inspectCompletion(anchor.slice(0, 3), before, '', false).reason,
    'waiting-for-anchor',
  );
  assert.equal(
    inspectCompletion(anchor + 'unfinished', before, '', false).reason,
    'waiting-for-word',
  );
});
