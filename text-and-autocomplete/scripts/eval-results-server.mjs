// Local-only recorder for synthetic evaluation output. Never receives API keys.
import { createServer } from 'node:http';
import { mkdirSync, writeFileSync } from 'node:fs';
const directory = new URL('../eval/runs/', import.meta.url);
mkdirSync(directory, { recursive: true });
// The eval page runs from the dev server under either local name.
const ORIGINS = ['http://localhost:4174', 'http://127.0.0.1:4174'];
createServer(async (req, res) => {
  if (ORIGINS.includes(req.headers.origin)) {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  if (req.method !== 'POST' || req.url !== '/results' || !ORIGINS.includes(req.headers.origin)) {
    res.writeHead(403);
    res.end();
    return;
  }
  try {
    let body = '';
    for await (const chunk of req) {
      body += chunk;
      if (body.length > 200000) throw new Error('Too large');
    }
    const input = JSON.parse(body);
    // Explicit allowlist prevents accidental persistence of transport credentials.
    const output = {
      date: input.date,
      cases: input.cases.map(row =>
        Object.fromEntries(
          [
            'variant',
            'id',
            'category',
            'before',
            'after',
            'raw',
            'suffix',
            'joined',
            'outcome',
            'firstVisibleMs',
            'totalMs',
            'error',
          ]
            .filter(key => key in row)
            .map(key => [key, row[key]]),
        ),
      ),
    };
    const name = new Date().toISOString().replaceAll(':', '-') + '.json';
    writeFileSync(new URL(name, directory), JSON.stringify(output, null, 2) + '\n');
    res.end(name);
  } catch {
    res.writeHead(400);
    res.end('Invalid evaluation report');
  }
}).listen(4176, '127.0.0.1', () => console.log('Evaluation recorder on http://localhost:4176'));
