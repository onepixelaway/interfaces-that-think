// Stamps each reference between the files in dist with a hash of the file it
// names (`./app.js?v=…`), so browsers load changed files instead of cached ones.
// The references come from the files themselves: the .js and .css names that
// imports, script sources, and stylesheet links give (not names in comments). A
// file's hash includes the stamps inside it, so files are stamped after the ones
// they name.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const directory = fileURLToPath(new URL('../dist/', import.meta.url));
// A reference to a file in dist from an import, src, or href, with or without a
// stamp.
const REFERENCE =
  /((?:\bfrom|\bimport)\s*|\b(?:src|href)=)(['"])(\.\/)?([\w-]+\.(?:js|css))(?:\?v=[a-f0-9]+)?\2/g;

const files = readdirSync(directory).filter(file => /\.(?:js|css|html)$/.test(file));
const read = file => readFileSync(directory + file, 'utf8');
const references = file =>
  [...new Set([...read(file).matchAll(REFERENCE)].map(match => match[4]))].filter(name =>
    files.includes(name),
  );
const hash = file => createHash('sha256').update(read(file)).digest('hex').slice(0, 12);

const done = new Set();
function stamp(file, path = []) {
  if (done.has(file)) return;
  if (path.includes(file)) throw new Error(`Files name each other: ${[...path, file].join(' → ')}`);
  for (const name of references(file)) stamp(name, [...path, file]);
  const text = read(file).replace(REFERENCE, (match, lead, quote, dot = '', name) =>
    files.includes(name) ? `${lead}${quote}${dot}${name}?v=${hash(name)}${quote}` : match,
  );
  writeFileSync(directory + file, text);
  done.add(file);
}
files.forEach(file => stamp(file));
