// Imports “Machines of Loving Grace” by Dario Amodei into dist/index.html,
// replacing the copy between the essay markers:
//
//   node scripts/import-essay.mjs             import from darioamodei.com
//   node scripts/import-essay.mjs --dry-run   report what would be imported
//   node scripts/import-essay.mjs saved.html  import from a saved copy of the page
//
// Only the text and its basic markup are kept: paragraphs, headings, lists,
// emphasis, links, and footnotes. Everything else from the source is dropped.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const SOURCE = 'https://darioamodei.com/essay/machines-of-loving-grace';
const AUTHOR = 'Dario Amodei';
export const AUTHOR_URL = 'https://darioamodei.com/';
const PAGE = fileURLToPath(new URL('../dist/index.html', import.meta.url));
const START = '<!-- essay:start -->';
const END = '<!-- essay:end -->';
const ALLOWED = new Set([
  'p',
  'h2',
  'h3',
  'h4',
  'ul',
  'ol',
  'li',
  'em',
  'strong',
  'a',
  'sup',
  'br',
]);

function match(html, pattern, name) {
  const found = html.match(pattern);
  if (!found) throw new Error(`Could not find the ${name} in the source page.`);
  return found[1];
}
function absolute(href) {
  if (href.startsWith('/') && !href.startsWith('//')) return new URL(SOURCE).origin + href;
  return href;
}
// Rebuilds every tag from an allowlist, so no source attributes, styles, or
// scripts survive. Links keep only a web or in-page address.
export function sanitize(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|iframe|noscript|template|svg|object)\b[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g, (tag, close, name, attributes) => {
      name = name.toLowerCase();
      if (!ALLOWED.has(name)) return '';
      if (close) return name === 'br' ? '' : `</${name}>`;
      if (name === 'br') return '<br>';
      if (name !== 'a') return `<${name}>`;
      const href = attributes.match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
      const url = absolute((href?.[1] ?? href?.[2] ?? '').trim());
      return /^(https?:\/\/|#)/i.test(url) ? `<a href="${url.replaceAll('"', '&quot;')}">` : '<a>';
    });
}
const plain = html =>
  html
    .replace(/<[^>]*>/g, '')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .trim();
const slug = html =>
  plain(html)
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export function extractEssay(html) {
  const body = html.slice(html.indexOf('<body'));
  const title =
    body.match(/<div class="w-embed"><h1 class="post-title">([\s\S]*?)<\/h1>/)?.[1] ??
    match(body, /<h1 class="post-title[^"]*">([\s\S]*?)<\/h1>/, 'title');
  const notes = [
    ...match(
      body,
      /<div[^>]*data-footnotes="footnotes"[^>]*>\s*<ol[^>]*>([\s\S]*?)<\/ol>\s*<\/div>/,
      'footnotes',
    ).matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g),
  ].map(note => sanitize(note[1]).trim());
  return {
    title: sanitize(title).trim(),
    subtitle: sanitize(match(body, /<div class="post-subtitle">([\s\S]*?)<\/div>/, 'subtitle')),
    date: plain(match(body, /<div class="post-date">([\s\S]*?)<\/div>/, 'date')),
    body: sanitize(
      match(
        body,
        /<div id="main-content"[^>]*>([\s\S]*?)<\/div>\s*<hr class="u-hr-dinkus"\s*\/?>/,
        'essay body',
      ),
    ),
    afterword: sanitize(
      match(
        body,
        /<hr class="u-hr-dinkus"\s*\/?>\s*<div class="rich-text w-richtext">([\s\S]*?)<\/div>\s*<\/section>/,
        'afterword',
      ),
    ),
    notes,
  };
}

// The source marks footnotes with bare numbers; link each one to its note and back.
function linkFootnotes(html, count, linked) {
  return html.replace(/<sup>(\d+)<\/sup>/g, (sup, number) => {
    const n = Number(number);
    if (n < 1 || n > count) return sup;
    const id = linked.has(n) ? '' : ` id="ref-${n}"`;
    linked.add(n);
    return `<sup class="fn-ref"${id}><a href="#note-${n}" aria-label="Footnote ${n}">${n}</a></sup>`;
  });
}
// One block per line, so diffs of the page stay readable.
const blocks = (html, indent) =>
  html
    .replace(/\s*<(p|h2|h3|h4|ul|ol)>/g, `\n${indent}<$1>`)
    .replace(/\s*<li>/g, `\n${indent}  <li>`)
    .replace(/\s*<\/(ul|ol)>/g, `\n${indent}</$1>`)
    .replace(/<h2>([\s\S]*?)<\/h2>/g, (heading, text) => `<h2 id="${slug(text)}">${text}</h2>`);

export function renderEssay({ title, subtitle, date, body, afterword, notes }) {
  const indent = '          ';
  // Link the title and body first, so each note knows whether it has a reference.
  const linked = new Set();
  const header = linkFootnotes(title, notes.length, linked);
  const main = linkFootnotes(body, notes.length, linked);
  const list = notes.map((note, i) => {
    const n = i + 1;
    const back = linked.has(n)
      ? ` <a class="fn-back" href="#ref-${n}" aria-label="Back to reference ${n}">↩&#xFE0E;</a>`
      : '';
    return `${indent}  <li id="note-${n}">${note}${back}</li>`;
  });
  return {
    missing: notes.length - linked.size,
    html: `${START}
        <header class="essay-header">
          <h1 class="essay-title">${header}</h1>
          <p class="essay-subtitle">${subtitle.trim()}</p>
          <p class="essay-byline">By <a href="${AUTHOR_URL}">${AUTHOR}</a> · ${date} · <a class="essay-original" href="${SOURCE}">Original essay</a></p>
        </header>
        <div class="essay-body">${blocks(main, indent)}
        </div>
        <hr class="dinkus">
        <div class="essay-afterword">${blocks(afterword, indent)}
        </div>
        <section class="footnotes" aria-labelledby="footnotes-heading">
          <h2 id="footnotes-heading">Footnotes</h2>
          <ol>
${list.join('\n')}
          </ol>
        </section>
${END}`,
  };
}

export function replaceEssay(page, html) {
  const start = page.indexOf(START);
  const end = page.indexOf(END);
  if (start < 0 || end < start) throw new Error(`dist/index.html is missing ${START} or ${END}.`);
  return page.slice(0, start) + html + page.slice(end + END.length);
}

async function main(args) {
  const dryRun = args.includes('--dry-run');
  const source = args.find(arg => !arg.startsWith('--'));
  let html;
  if (source) html = readFileSync(source, 'utf8');
  else {
    const response = await fetch(SOURCE);
    if (!response.ok) throw new Error(`${SOURCE} returned ${response.status}.`);
    html = await response.text();
  }
  const essay = extractEssay(html);
  const { html: rendered, missing } = renderEssay(essay);
  const words = plain(essay.body.replace(/<sup>\d+<\/sup>/g, '').replace(/></g, '> <')).split(
    /\s+/,
  ).length;
  console.log(
    [
      `Title: ${plain(essay.title.replace(/<sup>.*<\/sup>/, ''))}`,
      `Date: ${essay.date}`,
      `Sections: ${[...essay.body.matchAll(/<h2>([\s\S]*?)<\/h2>/g)].map(h => plain(h[1])).join(' · ')}`,
      `Paragraphs: ${(essay.body.match(/<p>/g) || []).length}, list items: ${(essay.body.match(/<li>/g) || []).length}, links: ${(essay.body.match(/<a /g) || []).length}`,
      `Words: about ${words.toLocaleString('en-US')}`,
      `Footnotes: ${essay.notes.length}${missing ? `, ${missing} without a reference in the text` : ''}`,
    ].join('\n'),
  );
  if (dryRun) return;
  writeFileSync(PAGE, replaceEssay(readFileSync(PAGE, 'utf8'), rendered));
  console.log('Wrote dist/index.html. Run node scripts/version-assets.mjs before publishing.');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
