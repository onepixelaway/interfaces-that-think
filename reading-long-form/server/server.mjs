// The prototype's server: it serves the page in dist and the routes Try your
// own article calls, which read a pasted article with OpenAI's GPT-6 Luna. It
// needs Node 22.7 or later and no packages.
//
//   OPENAI_API_KEY=sk-… node server/server.mjs [port]
//   node --env-file=.env server/server.mjs [port]     (see .env.example)
//
// The key stays on the server and never reaches the browser. Without it, the
// page works as before and the dialog explains that reading your own article
// needs a key. Articles aren't stored: the server passes each one to OpenAI
// (with store: false) and back, and the page keeps it only in its tab.
//
// Settings, from the environment:
//   OPENAI_API_KEY          required for Try your own article
//   OPENAI_MODEL            default gpt-6-luna
//   OPENAI_BASE_URL         default https://api.openai.com/v1
//   ARTICLES_PER_VISITOR    default 5: articles each visitor can read
//   ARTICLES_PER_ADDRESS    default 15: articles each IP address can read
//   ARTICLES_PER_DAY        default 200: articles everyone together can read each day
//   MAX_ARTICLE_CHARACTERS  default 60000
//   HOST                    default 127.0.0.1; 0.0.0.0 to listen on every address
//   TRUST_PROXY             set to 1 behind a proxy that sets X-Forwarded-For
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createLimits, createTokens } from './limits.mjs';
import {
  BRIDGES,
  BRIDGES_SCHEMA,
  NOTES,
  NOTES_SCHEMA,
  PARSE,
  bridgesInput,
  notesInput,
} from './prompts.mjs';
import { ICONS } from '../dist/lucide-icons.js';

const env = process.env;
// A number setting, or its default when it's unset, blank, or not a number.
const setting = (value, fallback) =>
  String(value ?? '').trim() && Number.isFinite(Number(value)) ? Number(value) : fallback;
const PORT = setting(process.argv[2] ?? env.PORT, 4175);
const HOST = env.HOST?.trim() || '127.0.0.1';
const KEY = env.OPENAI_API_KEY?.trim();
const MODEL = env.OPENAI_MODEL?.trim() || 'gpt-6-luna';
const BASE = env.OPENAI_BASE_URL?.trim() || 'https://api.openai.com/v1';
const MAX_CHARACTERS = setting(env.MAX_ARTICLE_CHARACTERS, 60000);
const TRUST_PROXY = ['1', 'true', 'yes'].includes(String(env.TRUST_PROXY).toLowerCase());
const DIST = fileURLToPath(new URL('../dist/', import.meta.url));
const limits = createLimits({
  perVisitor: setting(env.ARTICLES_PER_VISITOR, 5),
  perAddress: setting(env.ARTICLES_PER_ADDRESS, 15),
  perDay: setting(env.ARTICLES_PER_DAY, 200),
});
const tokens = createTokens();
const COOKIE = 'reading_long_form_visitor';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
};

// One request to GPT-6 Luna at medium effort: Markdown text, or JSON in a schema.
// It stops if the reader leaves before the reply comes.
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
      ...(schema && { text: { format: { type: 'json_schema', ...schema } } }),
    }),
    signal: AbortSignal.any([AbortSignal.timeout(240_000), signal].filter(Boolean)),
  }).catch(error => {
    if (signal?.aborted) throw failure('The reader left before the article was read.');
    console.error('OpenAI', error);
    throw failure('The model couldn’t be reached. Try again in a moment.');
  });
  if (!response.ok) {
    console.error('OpenAI', response.status, await response.text().catch(() => ''));
    throw failure('The model couldn’t read this article. Try again in a moment.');
  }
  const reply = await response.json().catch(() => ({}));
  const parts = (reply.output ?? []).flatMap(item => item.content ?? []);
  const text = parts
    .filter(part => part.type === 'output_text')
    .map(part => part.text)
    .join('');
  // A reply cut short, refused, or empty would show a broken article.
  if (reply.status !== 'completed' || parts.some(part => part.type === 'refusal') || !text.trim()) {
    console.error('OpenAI', reply.status, reply.incomplete_details ?? '', reply.error ?? '');
    throw failure(
      reply.incomplete_details?.reason === 'max_output_tokens'
        ? 'This article is too long for the model to read in one go. Try a shorter one.'
        : 'The model couldn’t read this article. Try again in a moment.',
    );
  }
  if (!schema) return text;
  try {
    return JSON.parse(text);
  } catch {
    throw failure('The model’s notes came back incomplete. Try again in a moment.');
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

const array = value => (Array.isArray(value) ? value : []);
const record = value => (value && typeof value === 'object' ? value : {});

// The visitor's id from their cookie, or a new one to set.
function visitorOf(request) {
  const found = (request.headers.cookie ?? '')
    .split(';')
    .map(part => part.trim().split('='))
    .find(([name]) => name === COOKIE)?.[1];
  if (found && /^[0-9a-f-]{36}$/.test(found)) return { id: found, cookie: null };
  const id = randomUUID();
  const secure = request.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '';
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
      {
        available: Boolean(KEY),
        left: limits.left(visitor.id, address),
        maxCharacters: MAX_CHARACTERS,
      },
      headers,
    );
  }
  if (request.method !== 'POST') {
    return send(response, 405, { error: 'Not allowed.' }, { Allow: path === '' ? 'GET' : 'POST' });
  }
  // Browsers say where a request comes from; refuse ones from other sites. Other
  // clients can still call these routes, which is what the limits are for.
  if (request.headers['sec-fetch-site'] && request.headers['sec-fetch-site'] !== 'same-origin') {
    return send(response, 403, { error: 'Not allowed.' });
  }
  if (!KEY) {
    return send(response, 503, { error: 'This copy of the prototype has no OpenAI API key set.' });
  }

  // Bodies are limited in bytes: up to 4 for each character of an article, and
  // more for the later steps, which send the text back with the page's context.
  if (path === '/parse') {
    const { text } = await readJson(request, MAX_CHARACTERS * 4 + 1000);
    const article = String(text ?? '').trim();
    if (!article) return send(response, 400, { error: 'Paste an article first.' });
    if (article.length > MAX_CHARACTERS) {
      return send(response, 413, {
        error: `That’s ${article.length.toLocaleString()} characters; this prototype reads up to ${MAX_CHARACTERS.toLocaleString()}.`,
      });
    }
    const taken = limits.take(visitor.id, address);
    if (!taken.ok) {
      return send(
        response,
        429,
        {
          error: taken.full
            ? 'This prototype has read as many articles as it can today. Try again tomorrow.'
            : 'You’ve read as many articles here as this prototype allows.',
        },
        headers,
      );
    }
    let markdown;
    try {
      markdown = await ask(PARSE, article, null, untilClosed(response));
    } catch (error) {
      limits.giveBack(visitor.id, address);
      throw error;
    }
    return send(
      response,
      200,
      { token: tokens.issue(article.length), markdown, left: taken.left },
      headers,
    );
  }

  // A later step runs on its article's token, with no more text than the article
  // had, plus the page's context around it (every string it forwards counts);
  // if the model fails, it can be tried once more.
  const step = async (name, input, instructions, schema) => {
    const body = await readJson(request, MAX_CHARACTERS * 12 + 50000);
    const token = tokens.use(body.token, name);
    if (!token) return send(response, 403, { error: 'Start again with your article.' });
    const text = input(body);
    if (text.length > token.characters * 5 + 10000) {
      return send(response, 413, { error: 'That’s more than the article you pasted.' });
    }
    const reply = await ask(instructions, text, schema, untilClosed(response));
    tokens.finish(body.token, name);
    return send(response, 200, reply);
  };

  if (path === '/notes') {
    return step(
      'notes',
      body => {
        const sections = array(body.sections)
          .slice(0, 200)
          .map(record)
          .map(({ heading, sentences }) => ({
            heading: String(heading ?? ''),
            sentences: array(sentences)
              .slice(0, 3000)
              .map(record)
              .map(({ id, text }) => ({ id: String(id), text: String(text ?? '') })),
          }));
        const lists = array(body.lists)
          .slice(0, 100)
          .map(record)
          .map(({ items }) => ({ items: array(items).slice(0, 50).map(String) }));
        const headings = array(body.headings).slice(0, 200).map(String);
        return notesInput({ sections, lists, headings, icons: Object.keys(ICONS) });
      },
      NOTES,
      NOTES_SCHEMA,
    );
  }

  if (path === '/bridges') {
    return step(
      'bridges',
      body =>
        bridgesInput(
          array(body.runs)
            .slice(0, 400)
            .map(record)
            .map(({ before, hidden, after }) => ({
              before: String(before ?? '').slice(-400),
              hidden: String(hidden ?? '').slice(0, 4000),
              after: String(after ?? '').slice(0, 400),
            })),
        ),
      BRIDGES,
      BRIDGES_SCHEMA,
    );
  }
  return send(response, 404, { error: 'Not found.' });
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
    if (pathname === '/api/article' || pathname.startsWith('/api/article/')) {
      return await api(request, response, pathname.slice('/api/article'.length));
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
    `Reading Long Form on http://localhost:${PORT}/${KEY ? '' : ' (no OPENAI_API_KEY: Try your own article is off)'}`,
  );
});
