import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  wordCount,
  withinLimit,
  fitInsertion,
  cleanCompletion,
  responseEvent,
  MODEL,
  previewCompletion,
  reuseCompletion,
  SUGGESTION_DELAY_MS,
  isSentenceBoundary,
  completionAnchor,
} from '../dist/compose-core.js';
import { RealtimeCompose } from '../dist/realtime.js';
import { readSavedKey, saveKey, forgetKey } from '../dist/key-storage.js';
test('request uses the unchanged context, and sentence intent', () => {
  const before = 'The launch went well. ';
  const after = '\nBest,\nSam';
  const event = responseEvent('request', { before, after });
  assert.deepEqual(JSON.parse(event.response.input[0].content[0].text), {
    before,
    after,
    anchor: completionAnchor(before),
    mode: 'new_sentence',
  });
  assert.equal(event.response.conversation, 'none');
  assert.deepEqual(event.response.output_modalities, ['text']);
  assert.equal(event.response.max_output_tokens, 256);
  assert.equal(SUGGESTION_DELAY_MS, 130);
  assert.throws(() => responseEvent('bad', { before: 'x '.repeat(501), after: '' }));
});
test('literal suffix extraction preserves the original text at every caret position', () => {
  const passages = [
    'The narrow bridge crosses the river.',
    'Please share the updated schedule when it is ready.',
    'L’été commence bientôt. Quelle belle journée !',
    '彼女は明日ここに来る予定です。',
    'A café 🌿 can be quiet, too.',
    "Don't change apostrophes—or hyphens.",
    'An exact  space and a\u00a0nonbreaking space.',
    'Repeated repeated words are data, not a parser rule.',
  ];
  let cases = 0;
  for (const passage of passages) {
    const chars = Array.from(passage);
    for (let i = 0; i < chars.length; i++) {
      const before = chars.slice(0, i).join('');
      const suffix = chars.slice(i).join('');
      const raw = completionAnchor(before) + suffix;
      assert.equal(cleanCompletion(raw, before, ''), suffix);
      assert.equal(before + fitInsertion(before, cleanCompletion(raw, before, ''), ''), passage);
      cases++;
    }
  }
  assert.ok(cases > 250);
});
test('anchor mismatches and over-budget outputs are discarded, never repaired', () => {
  const before = 'promising';
  for (const raw of [
    'wrong prefix',
    'Promising next',
    '```promising next```',
    'promisingnew\nline',
    'promising' + 'x'.repeat(221),
    'promising' + 'word '.repeat(17),
  ]) {
    assert.equal(cleanCompletion(raw, before, ''), '', raw);
  }
  assert.equal(
    cleanCompletion(completionAnchor('word '.repeat(500)) + 'extra', 'word '.repeat(500), ''),
    '',
  );
});
test('anchor and decoder preserve whitespace, Unicode, and repetitions without grammar rules', () => {
  for (const before of ['word', 'word ', 'word\u00a0', '名前', 'café', 'emoji🌿', 'done.”']) {
    assert.ok(before.endsWith(completionAnchor(before)));
    for (const insert of [
      ' next',
      '  next',
      '\u00a0next',
      'had had',
      'that that',
      'iPhone',
      'écrit',
      '本です。',
      'say "hello"',
    ]) {
      assert.equal(cleanCompletion(completionAnchor(before) + insert, before, ''), insert);
    }
  }
});
test('context anchor is a bounded exact Unicode suffix within the current paragraph', () => {
  for (const before of [
    'Earlier paragraph.\n  Current paragraph  ',
    'Long context '.repeat(30) + '🌲'.repeat(130),
  ]) {
    const anchor = completionAnchor(before);
    assert.ok(before.endsWith(anchor));
    assert.ok(Array.from(anchor).length <= 120);
    assert.ok(!anchor.includes('\n'));
    assert.equal(cleanCompletion(anchor + ' next', before, ''), ' next');
  }
});
test('streamed output is always an exact prefix of the final insertion', () => {
  for (const [before, suffix] of [
    ['The parcel arr', 'ives tomorrow.'],
    ['A good plan', ' needs a clear goal.'],
    ['Final.', ' Next sentence.'],
    ['彼女は', '明日来ます。'],
  ]) {
    const raw = completionAnchor(before) + suffix;
    for (let end = 0; end <= raw.length; end++) {
      const preview = previewCompletion(raw.slice(0, end), before, '');
      assert.ok(suffix.startsWith(preview), raw.slice(0, end));
    }
    assert.equal(cleanCompletion(raw, before, ''), suffix);
  }
});
test('sentence intent and reuse remain context-bound without grammar heuristics', () => {
  for (const before of ['Done.', 'Done? ', 'Done!”', '完了。']) {
    assert.ok(isSentenceBoundary(before));
  }
  for (const before of ['Done,', 'Done. N', 'Done.\n']) assert.ok(!isSentenceBoundary(before));
  assert.equal(
    reuseCompletion({ before: 'A', after: '' }, ' clear goal', { before: 'A cl', after: '' }),
    'ear goal',
  );
  assert.equal(
    reuseCompletion({ before: 'A', after: '' }, ' clear goal', {
      before: 'A cl',
      after: 'changed',
    }),
    '',
  );
  assert.equal(
    reuseCompletion({ before: 'A', after: '' }, ' clear goal', { before: 'A dif', after: '' }),
    '',
  );
  assert.equal(
    reuseCompletion({ before: 'Done', after: '' }, '. Next sentence.', {
      before: 'Done.',
      after: '',
    }),
    '',
  );
});
test('word and character bounds cover huge single words and 500-word documents', () => {
  assert.equal(wordCount(' hello\nworld  '), 2);
  assert.ok(withinLimit('word '.repeat(500)));
  assert.ok(!withinLimit('word '.repeat(501)));
  assert.ok(!withinLimit('a'.repeat(12001)));
});
test('paste and acceptance fit the remaining space, including selection replacement', () => {
  const before = 'word '.repeat(499);
  const fitted = fitInsertion(before, 'one two three', '');
  assert.equal(fitted.trim(), 'one');
  assert.ok(withinLimit(before + fitted));
  assert.equal(fitInsertion('hello ', 'there', ' world'), 'there');
  assert.equal(fitInsertion('a'.repeat(12000), 'b', ''), '');
});
class FakeSocket {
  static instances = [];
  constructor(url, protocols) {
    this.url = url;
    this.protocols = protocols;
    this.sent = [];
    FakeSocket.instances.push(this);
    queueMicrotask(() => this.emit({ type: 'session.created' }));
  }
  send(data) {
    this.sent.push(JSON.parse(data));
  }
  close() {
    this.onclose?.();
  }
  emit(data) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }
}
async function setup(diagnose) {
  let authRequest;
  const statuses = [];
  const client = new RealtimeCompose((...args) => statuses.push(args), {
    diagnose,
    Socket: FakeSocket,
    fetchImpl: async (url, options) => {
      authRequest = { url, options };
      return { ok: true, json: async () => ({ value: 'ek_test' }) };
    },
  });
  await client.connect('sk-test-not-a-real-key');
  return { client, socket: FakeSocket.instances.at(-1), authRequest, statuses };
}
test('connect exchanges key once and authenticates socket with an ephemeral token', async () => {
  const { client, socket, authRequest } = await setup();
  assert.equal(JSON.parse(authRequest.options.body).session.model, MODEL);
  assert.deepEqual(socket.protocols, ['realtime', 'openai-insecure-api-key.ek_test']);
  assert.equal(client.ready, true);
  client.disconnect();
  assert.equal(client.ready, false);
});
test('an error on one request fails that request but keeps the connection ready', async () => {
  const { client, socket, statuses } = await setup();
  const result = client.request({ before: 'D', after: '' });
  socket.emit({ type: 'error', error: { code: 'rate_limit_exceeded' } });
  await assert.rejects(result, /rate limit/);
  assert.equal(client.ready, true);
  assert.equal(statuses.at(-1)[0], 'ready');
  assert.match(statuses.at(-1)[1], /rate limit/);
  client.disconnect();
});
test('completion correlates response metadata and ignores unrelated responses', async () => {
  const { client, socket } = await setup();
  const result = client.request({ before: 'D', after: '' });
  const id = socket.sent.at(-1).response.metadata.request_id;
  socket.emit({
    type: 'response.done',
    response: { metadata: { request_id: 'other' }, status: 'completed', output: [] },
  });
  socket.emit({
    type: 'response.done',
    response: {
      metadata: { request_id: id },
      status: 'completed',
      output: [{ content: [{ type: 'output_text', text: 'o you want to go?' }] }],
    },
  });
  assert.equal(await result, 'o you want to go?');
  client.disconnect();
});
test('cancel before response.created cancels late generation and never accepts stale output', async () => {
  const { client, socket } = await setup();
  const result = client.request({ before: 'D', after: '' });
  const rejected = assert.rejects(result, { name: 'AbortError' });
  const id = socket.sent.at(-1).response.metadata.request_id;
  client.cancel();
  await rejected;
  socket.emit({
    type: 'response.created',
    response: { id: 'stale', metadata: { request_id: id } },
  });
  assert.deepEqual(socket.sent.at(-1), { type: 'response.cancel', response_id: 'stale' });
  client.disconnect();
});
test('cancel during active response and failed responses settle pending requests', async () => {
  const { client, socket } = await setup();
  let p = client.request({ before: 'D', after: '' });
  let id = socket.sent.at(-1).response.metadata.request_id;
  socket.emit({
    type: 'response.created',
    response: { id: 'active', metadata: { request_id: id } },
  });
  const cancelled = assert.rejects(p, { name: 'AbortError' });
  client.cancel();
  await cancelled;
  assert.equal(socket.sent.at(-1).response_id, 'active');
  p = client.request({ before: 'Do', after: '' });
  id = socket.sent.at(-1).response.metadata.request_id;
  socket.emit({
    type: 'response.done',
    response: { status: 'failed', metadata: { request_id: id } },
  });
  await assert.rejects(p);
  client.disconnect();
});
test('bad credentials return safe feedback without echoing the key', async () => {
  const client = new RealtimeCompose(() => {}, {
    Socket: FakeSocket,
    fetchImpl: async () => ({ ok: false, status: 401 }),
  });
  await assert.rejects(client.connect('sk-secret-value'), /key was rejected/);
  assert.equal(client.ready, false);
});
test('default fetch preserves the browser global receiver', async () => {
  const originalFetch = globalThis.fetch;
  let called = false;
  globalThis.fetch = async function (url) {
    assert.equal(this, globalThis, 'native browser fetch requires its global receiver');
    assert.equal(url, 'https://api.openai.com/v1/realtime/client_secrets');
    called = true;
    return { ok: true, json: async () => ({ value: 'ek_test' }) };
  };
  const client = new RealtimeCompose(() => {}, { Socket: FakeSocket });
  try {
    await client.connect('sk-test-not-a-real-key');
    assert.ok(called);
    assert.ok(client.ready);
  } finally {
    client.disconnect();
    globalThis.fetch = originalFetch;
  }
});

test('key storage survives module reload and forgetting preserves unrelated site data', async () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const data = new Map([['unrelated', 'keep']]);
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: key => data.get(key) ?? null,
      setItem: (key, value) => data.set(key, value),
      removeItem: key => data.delete(key),
    },
  });
  try {
    assert.equal(readSavedKey(), '');
    saveKey('sk-test-not-a-real-key');
    const reloaded = await import('../dist/key-storage.js?reload-test');
    assert.equal(reloaded.readSavedKey(), 'sk-test-not-a-real-key');
    saveKey('sk-replacement-not-a-real-key');
    assert.equal(reloaded.readSavedKey(), 'sk-replacement-not-a-real-key');
    forgetKey();
    assert.equal(reloaded.readSavedKey(), '');
    assert.deepEqual([...data], [['unrelated', 'keep']]);
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else delete globalThis.localStorage;
  }
});
test('blocked browser storage permits startup and reports failed saves and removals', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get() {
      throw new Error('Blocked');
    },
  });
  try {
    assert.equal(readSavedKey(), '');
    assert.throws(() => saveKey('sk-test'), /Blocked/);
    assert.throws(forgetKey, /Blocked/);
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else delete globalThis.localStorage;
  }
});
test('matching stream deltas are delivered before response.done and cancelled deltas are ignored', async () => {
  const { client, socket } = await setup();
  const previews = [];
  const promise = client.request({ before: 'D', after: '' }, (text, done) =>
    previews.push({ text, done }),
  );
  const id = socket.sent.at(-1).response.metadata.request_id;
  socket.emit({
    type: 'response.created',
    response: { id: 'stream', metadata: { request_id: id } },
  });
  socket.emit({ type: 'response.output_text.delta', response_id: 'other', delta: 'WRONG' });
  socket.emit({ type: 'response.output_text.delta', response_id: 'stream', delta: 'Do you ' });
  assert.deepEqual(previews, [{ text: 'Do you ', done: false }]);
  socket.emit({ type: 'response.output_text.delta', response_id: 'stream', delta: 'want to go?' });
  socket.emit({
    type: 'response.output_text.done',
    response_id: 'stream',
    text: 'Do you want to go?',
  });
  assert.deepEqual(previews.at(-1), { text: 'Do you want to go?', done: true });
  const rejected = assert.rejects(promise, { name: 'AbortError' });
  client.cancel();
  await rejected;
  const count = previews.length;
  socket.emit({ type: 'response.output_text.delta', response_id: 'stream', delta: 'stale' });
  assert.equal(previews.length, count);
  client.disconnect();
});

test('browser nonbreaking spaces in copied context do not suppress valid completions', () => {
  for (const before of [
    'A useful next step is\u00a0',
    'One idea.\u00a0Another is',
    'Un détail\u202f:',
    'word\u00a0\u00a0',
  ]) {
    const echoed = completionAnchor(before).replace(/[\u00a0\u202f]/gu, ' ');
    const suffix = before.endsWith('is') ? ' to simplify things.' : 'make this easier.';
    assert.equal(cleanCompletion(echoed + suffix, before, ''), suffix);
    assert.equal(before + cleanCompletion(echoed + suffix, before, ''), before + suffix);
    for (let end = 0; end <= (echoed + suffix).length; end++) {
      assert.ok(suffix.startsWith(previewCompletion((echoed + suffix).slice(0, end), before, '')));
    }
  }
  // The exception is space-for-space only: changed words, punctuation, counts,
  // tabs and newlines still cannot masquerade as the user's existing text.
  for (const raw of [
    'A useful step is next',
    'A useful next step is next',
    'A useful\tnext step is  next',
    'A useful\nnext step is  next',
  ]) {
    assert.equal(cleanCompletion(raw, 'A useful next step is\u00a0\u00a0', ''), '');
  }
  assert.equal(cleanCompletion('Keep going\u00a0now.', 'Keep', ''), ' going\u00a0now.');
});

test('transport diagnostics correlate requests and expose final/stream discrepancies without credentials', async () => {
  const events = [];
  const { client, socket } = await setup((event, data) => events.push({ event, ...data }));
  const result = client.request({ before: 'A', after: '' }, () => {}, 'attempt-1');
  const id = socket.sent.at(-1).response.metadata.request_id;
  socket.emit({
    type: 'response.created',
    response: { id: 'response-1', metadata: { request_id: id } },
  });
  socket.emit({
    type: 'response.output_text.done',
    response_id: 'response-1',
    text: 'A useful idea.',
  });
  socket.emit({
    type: 'response.done',
    response: { metadata: { request_id: id }, status: 'completed', output: [] },
  });
  assert.equal(await result, '');
  const final = events.find(row => row.event === 'transport-final-text');
  assert.equal(final.requestId, id);
  assert.equal(final.attempt, 'attempt-1');
  assert.equal(final.chars, 0);
  assert.equal(final.matchesStream, false);
  assert.ok(!JSON.stringify(events).includes('ek_test'));
  assert.ok(!JSON.stringify(events).includes('sk-test'));
  client.disconnect();
  const brokenLogger = await setup(() => {
    throw new Error('logger failed');
  });
  const request = brokenLogger.client.request({ before: 'A', after: '' });
  const cancelled = assert.rejects(request, { name: 'AbortError' });
  assert.doesNotThrow(() => brokenLogger.client.cancel());
  await cancelled;
  brokenLogger.client.disconnect();
});
test('multiple tab autocomplete requests and validates one alternative per line', async () => {
  const { inspectAlternatives, ALTERNATIVES_INSTRUCTIONS, ALTERNATIVE_COUNT } =
    await import('../dist/compose-core.js');
  const before = 'The cat sat';
  const event = responseEvent('request', { before, after: '' }, { alternatives: true });
  assert.equal(event.response.instructions, ALTERNATIVES_INSTRUCTIONS);
  assert.equal(event.response.max_output_tokens, 640);
  assert.equal(ALTERNATIVE_COUNT, 3);
  // The last streamed line is unfinished, so its partial word is withheld.
  assert.deepEqual(
    inspectAlternatives(
      'The cat sat on the mat.\nThe cat sat quietly by the door.\nThe cat sat dow',
      before,
      '',
      false,
    ).texts,
    [' on the mat.', ' quietly by the door.'],
  );
  // Blank lines, duplicates, mismatched anchors, and extras are dropped.
  assert.deepEqual(
    inspectAlternatives(
      'The cat sat on the mat.\n\nThe cat sat on the mat.\nA dog ran.\nThe cat sat down.\nThe cat sat up.\nThe cat sat still.',
      before,
      '',
    ).texts,
    [' on the mat.', ' down.', ' up.'],
  );
  assert.deepEqual(inspectAlternatives('The ca', before, '', false), {
    texts: [],
    text: '',
    reason: 'waiting-for-anchor',
  });
  assert.equal(inspectAlternatives('', before, '').reason, 'empty-response');
});
test('suggested paragraph requests styled alternatives and parses one per line', async () => {
  const { inspectParagraphs, PARAGRAPH_INSTRUCTIONS } = await import('../dist/compose-core.js');
  const before = 'Intro paragraph.\n';
  const after = '\nClosing paragraph.';
  const event = responseEvent('request', { before, after }, { paragraphs: true });
  assert.equal(event.response.instructions, PARAGRAPH_INSTRUCTIONS);
  assert.equal(event.response.max_output_tokens, 1024);
  const done = inspectParagraphs(
    'Formal: This is one. It has two sentences.\ncasual: Here is another take.\n\nSentimental: A third one, warmly.\nextra: ignored fourth.',
    before,
    after,
  );
  assert.deepEqual(done.labels, ['formal', 'casual', 'sentimental']);
  assert.equal(done.texts[1], 'Here is another take.');
  // The streaming line shows whole words only; an unfinished label shows nothing.
  assert.deepEqual(
    inspectParagraphs('formal: This is one.\ncasual: Here is ano', before, after, false).texts,
    ['This is one.', 'Here is'],
  );
  assert.deepEqual(inspectParagraphs('for', before, after, false), {
    texts: [],
    labels: [],
    text: '',
    reason: 'waiting-for-paragraph',
  });
  // Duplicate styles, unlabelled lines, and over-limit paragraphs are dropped.
  assert.deepEqual(
    inspectParagraphs(
      'formal: One.\nformal: Two.\nNo label here\nlong: ' + 'word '.repeat(80),
      before,
      after,
    ).labels,
    ['formal'],
  );
  assert.equal(
    inspectParagraphs('just prose without a label', before, after).reason,
    'paragraph-format',
  );
});
