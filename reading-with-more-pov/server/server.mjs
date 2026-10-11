// The prototype's server: it serves the page in dist, and the route a reader
// calls to read the article again after you edit them, with OpenAI's
// GPT-6 Luna. It needs Node 22.7 or later and no packages.
//
//   OPENAI_API_KEY=sk-… node server/server.mjs [port]
//   node --env-file=.env server/server.mjs [port]     (see .env.example)
//
// The key stays on the server and never reaches the browser. Without it, the
// page works as before and editing a reader's role or description explains
// that reading again needs a key. Nothing is stored: the server passes each
// request to OpenAI (with store: false) and back, and the page keeps what the
// reader said in its own browser.
//
// Settings, from the environment:
//   OPENAI_API_KEY          required for readers to read again
//   OPENAI_MODEL            default gpt-6-luna
//   OPENAI_BASE_URL         default https://api.openai.com/v1
//   READINGS_PER_VISITOR    default 10
//   READINGS_PER_ADDRESS    default 30
//   READINGS_PER_DAY        default 300: for everyone together
//   HOST                    default 127.0.0.1; 0.0.0.0 to listen on every address
//   TRUST_PROXY             set to 1 behind a proxy that sets X-Forwarded-For
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createLimits } from './limits.mjs';
import { articleForModel } from './article.mjs';
import { READ, READ_SCHEMA, readInput } from './prompts.mjs';
import { clip, list, record } from '../dist/notes.js';

const env = process.env;
// A number setting, or its default when it's unset, blank, or not a number.
const setting = (value, fallback) =>
  String(value ?? '').trim() && Number.isFinite(Number(value)) ? Number(value) : fallback;
const PORT = setting(process.argv[2] ?? env.PORT, 4177);
const HOST = env.HOST?.trim() || '127.0.0.1';
const KEY = env.OPENAI_API_KEY?.trim();
const MODEL = env.OPENAI_MODEL?.trim() || 'gpt-6-luna';
const BASE = env.OPENAI_BASE_URL?.trim() || 'https://api.openai.com/v1';
const TRUST_PROXY = ['1', 'true', 'yes'].includes(String(env.TRUST_PROXY).toLowerCase());
const DIST = fileURLToPath(new URL('../dist/', import.meta.url));
// The article the readers read is the one on the page, so the page never sends it.
const ARTICLE = articleForModel(readFileSync(join(DIST, 'index.html'), 'utf8'));
const limits = createLimits({
  perVisitor: setting(env.READINGS_PER_VISITOR, 10),
  perAddress: setting(env.READINGS_PER_ADDRESS, 30),
  perDay: setting(env.READINGS_PER_DAY, 300),
});
const COOKIE = 'reading_with_more_pov_visitor';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

// One request to GPT-6 Luna at medium effort, for JSON in a schema. It stops if
// the reader leaves before the reply comes.
async function ask(instructions, input, schema, signal) {
  const response = await fetch(`${BASE}/responses`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      reasoning: { effort: 'medium' },
      store: false,
      instructions,
      input,
      text: { format: { type: 'json_schema', ...schema } },
    }),
    signal: AbortSignal.any([AbortSignal.timeout(240_000), signal].filter(Boolean)),
  }).catch(error => {
    if (signal?.aborted) throw failure('The page closed before the reader finished.');
    console.error('OpenAI', error);
    throw failure('The model couldn’t be reached. Try again in a moment.');
  });
  if (!response.ok) {
    console.error('OpenAI', response.status, await response.text().catch(() => ''));
    throw failure('The model couldn’t read the article. Try again in a moment.');
  }
  const reply = await response.json().catch(() => ({}));
  const parts = (reply.output ?? []).flatMap(item => item.content ?? []);
  const text = parts
    .filter(part => part.type === 'output_text')
    .map(part => part.text)
    .join('');
  // A reply cut short, refused, or empty would leave the reader with nothing to say.
  if (reply.status !== 'completed' || parts.some(part => part.type === 'refusal') || !text.trim()) {
    console.error('OpenAI', reply.status, reply.incomplete_details ?? '', reply.error ?? '');
    throw failure('The model couldn’t read the article as this reader. Try another description.');
  }
  try {
    return JSON.parse(text);
  } catch {
    throw failure('The reader’s comments came back incomplete. Try again in a moment.');
  }
}

// A signal that aborts when the reply's connection closes, so a model call stops
// if the reader leaves.
function untilClosed(response) {
  const closed = new AbortController();
  response.on('close', () => closed.abort());
  return closed.signal;
}

// An error whose message is safe to show the reader.
const failure = message => Object.assign(new Error(message), { status: 502 });

function send(response, status, body, headers = {}) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...headers,
  });
  response.end(JSON.stringify(body));
}

// The request's JSON body, which must be an object.
async function readJson(request, maxBytes) {
  let size = 0;
  const chunks = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBytes) {
      // Stop reading, and close the connection once the reply is sent.
      throw Object.assign(new Error('That’s too long to read here.'), {
        status: 413,
        close: true,
      });
    }
    chunks.push(chunk);
  }
  let body;
  try {
    body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {}
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw Object.assign(new Error('The request couldn’t be read.'), { status: 400 });
  }
  return body;
}

// The visitor's id from their cookie, or a new one to set.
function visitorOf(request) {
  const found = (request.headers.cookie ?? '')
    .split(';')
    .map(part => part.trim().split('='))
    .find(([name]) => name === COOKIE)?.[1];
  if (found && /^[0-9a-f-]{36}$/.test(found)) return { id: found, cookie: null };
  const id = randomUUID();
  const secure = TRUST_PROXY && request.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '';
  return {
    id,
    cookie: `${COOKIE}=${id}; Path=/; HttpOnly; SameSite=Strict; Max-Age=31536000${secure}`,
  };
}

// The visitor's address. Behind a proxy, it's the one the proxy added last to
// X-Forwarded-For: anything to its left came from the client, which could make
// up a new address for every request.
const addressOf = request =>
  (TRUST_PROXY && request.headers['x-forwarded-for']?.split(',').at(-1).trim()) ||
  request.socket.remoteAddress;

async function api(request, response, path) {
  const visitor = visitorOf(request);
  const address = addressOf(request);
  const headers = visitor.cookie ? { 'Set-Cookie': visitor.cookie } : {};
  if (request.method === 'GET' && path === '') {
    return send(
      response,
      200,
      { available: Boolean(KEY), left: limits.left(visitor.id, address) },
      headers,
    );
  }
  if (path !== '/read') return send(response, 404, { error: 'Not found.' });
  if (request.method !== 'POST') {
    return send(response, 405, { error: 'Not allowed.' }, { Allow: 'POST' });
  }
  // Browsers say where a request comes from; refuse ones from other sites. Other
  // clients can still call this route, which is what the limits are for.
  if (request.headers['sec-fetch-site'] && request.headers['sec-fetch-site'] !== 'same-origin') {
    return send(response, 403, { error: 'Not allowed.' });
  }
  if (!KEY) {
    return send(response, 503, { error: 'This copy of the prototype has no OpenAI API key set.' });
  }

  const body = await readJson(request, 200_000);
  const reader = record(body.reader);
  const fields = {
    name: clip(reader.name, 40),
    role: clip(reader.role, 60),
    about: clip(reader.about, 1200),
  };
  if (!fields.name || !fields.role || !fields.about) {
    return send(response, 400, { error: 'Give the reader a name, a role, and a description.' });
  }
  // The other readers' threads, so this one can reply to them, within bounds.
  const threads = list(body.threads)
    .slice(0, 40)
    .map(record)
    .map(thread => ({
      id: clip(thread.id, 40),
      quote: clip(thread.quote, 400),
      comments: list(thread.comments)
        .slice(0, 8)
        .map(record)
        .map(comment => ({ name: clip(comment.name, 40), text: clip(comment.text, 600) })),
    }))
    .filter(thread => thread.id && thread.quote);

  const taken = limits.take(visitor.id, address);
  if (!taken.ok) {
    return send(
      response,
      429,
      {
        error: taken.full
          ? 'The readers have read as much as they can today. Try again tomorrow.'
          : 'You’ve had readers read again as many times as this prototype allows.',
      },
      headers,
    );
  }
  const closed = untilClosed(response);
  try {
    const reply = await ask(
      READ,
      readInput({ reader: fields, article: ARTICLE, threads }),
      READ_SCHEMA,
      closed,
    );
    return send(response, 200, { ...reply, left: taken.left }, headers);
  } catch (error) {
    // Leaving mid-reading still cost the key, so that reading isn't given back.
    if (!closed.aborted) limits.giveBack(visitor.id, address);
    throw error;
  }
}

async function serveFile(request, response, pathname) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return send(response, 405, { error: 'Not allowed.' }, { Allow: 'GET, HEAD' });
  }
  let decoded;
  try {
    decoded = decodeURIComponent(pathname === '/' ? '/index.html' : pathname);
  } catch {
    return send(response, 404, { error: 'Not found.' });
  }
  const path = normalize(join(DIST, decoded));
  if (!path.startsWith(DIST)) return send(response, 404, { error: 'Not found.' });
  try {
    const file = await readFile(path);
    response.writeHead(200, {
      'Content-Type': TYPES[extname(path)] ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    response.end(request.method === 'HEAD' ? undefined : file);
  } catch {
    send(response, 404, { error: 'Not found.' });
  }
}

createServer(async (request, response) => {
  try {
    let pathname;
    try {
      ({ pathname } = new URL(request.url, 'http://localhost'));
    } catch {
      return send(response, 400, { error: 'The request couldn’t be read.' });
    }
    if (pathname === '/api/readers' || pathname.startsWith('/api/readers/')) {
      return await api(request, response, pathname.slice('/api/readers'.length));
    }
    return await serveFile(request, response, pathname);
  } catch (error) {
    // Only errors made to be shown say what went wrong; anything else is logged.
    if (!error.status) console.error(error);
    if (!response.headersSent) {
      send(
        response,
        error.status ?? 500,
        { error: error.status ? error.message : 'Something went wrong. Try again in a moment.' },
        error.close ? { Connection: 'close' } : {},
      );
    }
    if (error.close) response.on('finish', () => request.destroy());
  }
}).listen(PORT, HOST, () => {
  console.log(
    `Reading With More POV on http://localhost:${PORT}/${KEY ? '' : ' (no OPENAI_API_KEY: readers can’t read again)'}`,
  );
});
