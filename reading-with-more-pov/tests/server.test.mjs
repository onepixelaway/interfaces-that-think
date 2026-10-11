import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { createLimits } from '../server/limits.mjs';
import { checkReading, mergeNotes, visibleNotes } from '../dist/notes.js';
import { READ_SCHEMA } from '../server/prompts.mjs';

// A stand-in for OpenAI's Responses API that answers every request with one
// reader's reading, and remembers what it was asked.
async function fakeOpenAI(reply) {
  const requests = [];
  const server = createServer(async (request, response) => {
    let body = '';
    for await (const chunk of request) body += chunk;
    requests.push({ headers: request.headers, body: JSON.parse(body) });
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(
      JSON.stringify({
        status: 'completed',
        output: [{ content: [{ type: 'output_text', text: JSON.stringify(reply) }] }],
      }),
    );
  }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  return { server, requests, url: `http://127.0.0.1:${server.address().port}` };
}

// The prototype's server on a free port, with a key and the fake API.
async function startServer(baseUrl) {
  const port = 20000 + Math.floor(Math.random() * 20000);
  const child = spawn(
    process.execPath,
    [fileURLToPath(new URL('../server/server.mjs', import.meta.url)), port],
    {
      env: {
        ...process.env,
        OPENAI_API_KEY: 'test-key',
        OPENAI_BASE_URL: baseUrl,
        READINGS_PER_VISITOR: '1',
      },
      stdio: ['ignore', 'pipe', 'inherit'],
    },
  );
  await new Promise(resolve => child.stdout.once('data', resolve));
  return { child, url: `http://127.0.0.1:${port}` };
}

const READING = {
  comments: [{ quote: 'Let’s begin.', text: 'Finally.' }],
  replies: [{ thread: 't1', text: 'Agreed.' }],
  reactions: [{ quote: 'Stick with me.', emoji: '👀' }],
  asides: [{ quote: 'That was a lot.', text: 'Truly.' }],
};
const reader = { name: 'Ada', role: 'Economist', about: 'Thinks in incentives.' };

test('the server has a reader read the article and passes the reply back', async t => {
  const api = await fakeOpenAI(READING);
  const server = await startServer(api.url);
  t.after(() => {
    server.child.kill();
    api.server.close();
  });

  const status = await fetch(`${server.url}/api/readers`).then(r => r.json());
  assert.deepEqual(status, { available: true, left: 1 });

  const response = await fetch(`${server.url}/api/readers/read`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: 'x=1' },
    body: JSON.stringify({
      reader,
      threads: [{ id: 't1', quote: 'Let’s begin.', comments: [{ name: 'Sam', text: 'Hi.' }] }],
    }),
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(body.comments, READING.comments);
  assert.equal(body.left, 0);

  // The model got the article from the page, the reader, and the threads, with
  // the key and nothing stored.
  const [{ headers, body: sent }] = api.requests;
  assert.equal(headers.authorization, 'Bearer test-key');
  assert.equal(sent.store, false);
  assert.deepEqual(sent.text.format, { type: 'json_schema', ...READ_SCHEMA });
  assert.match(sent.input, /Name: Ada\nRole: Economist/);
  assert.match(sent.input, /\[1\] If you're anything like me/);
  assert.match(sent.input, /## VII – Turn Your Life Into A Video Game/);
  assert.match(sent.input, /\[t1\] on “Let’s begin\.”\n {2}Sam: Hi\./);
});

test('the server refuses other sites, incomplete readers, and readings past the limit', async t => {
  const api = await fakeOpenAI(READING);
  const server = await startServer(api.url);
  t.after(() => {
    server.child.kill();
    api.server.close();
  });
  const post = (body, headers = {}) =>
    fetch(`${server.url}/api/readers/read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    });

  assert.equal((await post({ reader }, { 'Sec-Fetch-Site': 'cross-site' })).status, 403);
  assert.equal((await post({ reader: { name: 'Ada' } })).status, 400);
  const first = await post({ reader });
  const cookie = first.headers.get('set-cookie').split(';')[0];
  assert.equal(first.status, 200);
  assert.equal((await post({ reader }, { Cookie: cookie })).status, 429);
  assert.equal(api.requests.length, 1);
});

test('a reading is checked against the article before it is kept', () => {
  const said = checkReading(
    {
      comments: [
        { quote: 'found', text: 'Kept.' },
        { quote: 'missing', text: 'Dropped: not in the article.' },
        { quote: 'found', text: '' },
      ],
      replies: [
        { thread: 't1', text: 'Kept.' },
        { thread: 'nope', text: 'Dropped: no such thread.' },
      ],
      reactions: [
        { quote: 'found', emoji: '🔥' },
        { quote: 'found', emoji: '🦄' },
      ],
      asides: [
        { quote: 'missing', text: 'Dropped.' },
        { quote: 'found', text: 'Kept.' },
      ],
    },
    {
      readerId: 'ada',
      locate: quote => quote === 'found',
      threadIds: new Set(['t1']),
      choices: ['🔥'],
    },
  );
  assert.deepEqual(said, {
    threads: [{ id: 'ada-1', quote: 'found', comments: ['Kept.'] }],
    replies: [{ thread: 't1', text: 'Kept.' }],
    reactions: [{ quote: 'found', emoji: '🔥' }],
    asides: [{ id: 'ada-a2', quote: 'found', comments: ['Kept.'] }],
  });
});

test('each reading’s threads get ids of their own, so old replies don’t move to new threads', () => {
  const read = stamp =>
    checkReading(
      { comments: [{ quote: 'found', text: 'A comment.' }] },
      { readerId: 'ada', stamp, locate: () => true, threadIds: new Set(), choices: [] },
    ).threads[0].id;
  assert.equal(read('k1'), 'ada-k1-1');
  assert.notEqual(read('k1'), read('k2'));
});

test('an edited reader’s new reading replaces what they said before', () => {
  const notes = {
    threads: [
      {
        id: 't1',
        quote: 'a',
        comments: [
          { reader: 'theo', text: 'old root' },
          { reader: 'sam', text: 'reply' },
        ],
      },
      {
        id: 't2',
        quote: 'b',
        comments: [
          { reader: 'sam', text: 'root' },
          { reader: 'theo', text: 'old reply' },
        ],
      },
    ],
    reactions: [
      { quote: 'a', reader: 'theo', emoji: '🔥' },
      { quote: 'a', reader: 'sam', emoji: '👀' },
    ],
    asides: [
      { id: 'a1', quote: 'a', comments: [{ reader: 'theo', text: 'old aside' }] },
      {
        id: 'a2',
        quote: 'b',
        comments: [
          { reader: 'sam', text: 'aside' },
          { reader: 'maya', text: 'chiming in' },
        ],
      },
    ],
  };
  const merged = mergeNotes(notes, {
    theo: {
      threads: [{ id: 'theo-1', quote: 'c', comments: ['new root'] }],
      replies: [{ thread: 't2', text: 'new reply' }],
      reactions: [{ quote: 'c', emoji: '🤔' }],
      asides: [{ id: 'theo-a1', quote: 'c', comments: ['new aside'] }],
    },
    // Edited before there were asides: keeps the old ones.
    maya: { threads: [], replies: [], reactions: [] },
  });
  assert.deepEqual(
    merged.asides.map(aside => [aside.id, aside.comments.map(c => `${c.reader}: ${c.text}`)]),
    [
      ['a2', ['sam: aside', 'maya: chiming in']],
      ['theo-a1', ['theo: new aside']],
    ],
  );
  assert.deepEqual(
    merged.threads.map(thread => [thread.id, thread.comments.map(c => `${c.reader}: ${c.text}`)]),
    [
      ['t2', ['sam: root', 'theo: new reply']],
      ['theo-1', ['theo: new root']],
    ],
  );
  assert.deepEqual(
    merged.reactions.map(r => `${r.reader} ${r.emoji}`),
    ['sam 👀', 'theo 🤔'],
  );
  // Hiding Sam hides the thread Sam started, replies and all.
  const shown = visibleNotes(merged, new Set(['theo']));
  assert.deepEqual(
    shown.threads.map(thread => thread.id),
    ['theo-1'],
  );
  assert.deepEqual(
    shown.reactions.map(r => r.reader),
    ['theo'],
  );
});

test('readings are limited per visitor, per address, and per day', () => {
  let now = Date.parse('2026-01-12T10:00:00Z');
  const limits = createLimits({ perVisitor: 2, perAddress: 3, perDay: 4, now: () => now });
  assert.equal(limits.take('a', '1').ok, true);
  assert.equal(limits.take('a', '1').ok, true);
  assert.equal(limits.take('a', '1').ok, false);
  assert.equal(limits.take('b', '1').ok, true);
  assert.equal(limits.take('c', '1').ok, false);
  assert.equal(limits.take('c', '2').ok, true);
  assert.deepEqual(limits.take('d', '3'), { ok: false, left: 0, full: true });
  limits.giveBack('c', '2');
  assert.equal(limits.take('d', '3').ok, true);
  now += 24 * 60 * 60 * 1000;
  assert.equal(limits.left('e', '4'), 2);
});
