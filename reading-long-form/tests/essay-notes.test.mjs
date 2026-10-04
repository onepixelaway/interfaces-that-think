import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { NOTES } from '../dist/essay-notes.js';
import { ICONS } from '../dist/lucide-icons.js';
import { essayFingerprint, splitSentences } from '../dist/text-emphasis.js';

const FIRST_PERSON =
  /\b(?:I|I[’']m|I[’']ve|I[’']d|I[’']ll|me|my|mine|myself|we|We|we[’']re|our|Our|ours|us|ourselves)\b/;
const decode = html =>
  html
    .replace(/<sup class="fn-ref"[\s\S]*?<\/sup>/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
const words = text => text.split(/\s+/).filter(Boolean).length;

// The essay body's sections as the page reads them (see readEssay), from the
// HTML: paragraphs and list items, without footnote markers.
function readSections() {
  const page = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
  const body = page.match(
    /<div class="essay-body">([\s\S]*?)\n\s*<\/div>\n\s*<hr class="dinkus">/,
  )[1];
  const sections = [{ heading: 'Opening', sentences: [] }];
  let count = 0;
  for (const [, tag, inner] of body.matchAll(/<(h2|p|li)\b[^>]*>([\s\S]*?)<\/\1>/g)) {
    if (tag === 'h2') sections.push({ heading: decode(inner).trim(), sentences: [] });
    else {
      for (const sentence of splitSentences(decode(inner))) {
        sections.at(-1).sentences.push({ id: `s${++count}`, text: sentence.text });
      }
    }
  }
  return sections.filter(section => section.sentences.length);
}

// The essay body's lists: each item's HTML, without footnote markers.
function readLists() {
  const page = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
  const body = page.slice(
    page.indexOf('<div class="essay-body">'),
    page.indexOf('<hr class="dinkus">'),
  );
  return [...body.matchAll(/<(ul|ol)>([\s\S]*?)<\/\1>/g)].map(([, , inner]) =>
    [...inner.matchAll(/<li>([\s\S]*?)<\/li>/g)].map(([, item]) =>
      item.replace(/<sup class="fn-ref"[\s\S]*?<\/sup>/g, ''),
    ),
  );
}

test('the notes match the essay text', () => {
  assert.equal(essayFingerprint(readSections()), NOTES.essay);
});

test('the key sentences are real, in order, and each listed once', () => {
  const ids = new Set(readSections().flatMap(section => section.sentences.map(s => s.id)));
  const numbers = NOTES.keySentences.map(id => Number(id.slice(1)));
  assert.ok(NOTES.keySentences.every(id => ids.has(id)));
  assert.deepEqual(
    numbers,
    [...numbers].sort((a, b) => a - b),
  );
  assert.equal(new Set(numbers).size, numbers.length);
});

test('collapsing folds in only key sentences', () => {
  const key = new Set(NOTES.keySentences);
  assert.ok(NOTES.collapseFolds.every(id => key.has(id)));
});

test('each numbered section has a 1 to 3 sentence summary in the first person', () => {
  const numbered = readSections()
    .map(section => section.heading)
    .filter(heading => /^\d+\.\s/.test(heading));
  assert.deepEqual(Object.keys(NOTES.sections), numbered);
  for (const summary of Object.values(NOTES.sections)) {
    const sentences = splitSentences(summary).length;
    assert.ok(sentences >= 1 && sentences <= 3, summary);
    assert.ok(words(summary) <= 70, summary);
    assert.match(summary, FIRST_PERSON);
  }
});

test('each bridge is one short sentence in the first person', () => {
  for (const [key, bridge] of Object.entries(NOTES.bridges)) {
    assert.match(key, /^[0-9a-f]+$/);
    assert.equal(splitSentences(bridge).length, 1, bridge);
    assert.ok(words(bridge) >= 4 && words(bridge) <= 16, bridge);
    assert.match(bridge, FIRST_PERSON);
  }
});

test('each grouping places every item of its list once, in named groups', () => {
  const lists = readLists();
  for (const [key, { sentence, asWritten, by }] of Object.entries(NOTES.groupings)) {
    const matches = lists.filter(items => decode(items[0]).trim().startsWith(key));
    assert.equal(matches.length, 1, key);
    const [items] = matches;
    // The sentence above the list starts, and Dario's grouping or a principle
    // finishes it: "These limits are organized [one at a time] [by whether they last]."
    assert.match(sentence, /^[A-Z][a-z ]+ organized$/, key);
    assert.match(asWritten, /^[a-z][a-z’, -]*[a-z]$/, key);
    assert.ok(asWritten && by.length, key);
    for (const { name, about, groups, edits = [] } of by) {
      assert.match(name, /^by [a-z’, ]*[a-z]$/i, key);
      assert.ok(about, name);
      assert.ok(groups.length >= 2, name);
      const names = groups.map(([group]) => group);
      assert.equal(new Set(names).size, names.length, name);
      assert.ok(names.every(Boolean), name);
      const placed = groups.flatMap(([, numbers]) => numbers);
      assert.deepEqual(
        [...placed].sort((a, b) => a - b),
        items.map((_, index) => index + 1),
        name,
      );
      for (const [, numbers] of groups) {
        assert.deepEqual(
          numbers,
          [...numbers].sort((a, b) => a - b),
          name,
        );
      }
      // An edit changes words that sit in one stretch of text, between tags.
      for (const [item, from, to] of edits) {
        assert.ok(from !== to && to, name);
        const stretches = items[item - 1].split(/<[^>]+>/).map(decode);
        assert.equal(stretches.filter(stretch => stretch.includes(from)).length, 1, from);
      }
    }
  }
});

test('each list shown as cards has short enough items and a known icon for each', () => {
  const lists = readLists();
  assert.ok(Object.keys(NOTES.carousels).length);
  for (const [key, { label, icons }] of Object.entries(NOTES.carousels)) {
    const matches = lists.filter(items => decode(items[0]).trim().startsWith(key));
    assert.equal(matches.length, 1, key);
    const [items] = matches;
    assert.ok(label, key);
    // Chunky enough for a card, and not too long for one.
    assert.ok(items.length >= 3, key);
    for (const item of items) {
      const length = words(decode(item));
      assert.ok(length >= 15 && length <= 100, `${key}: ${length} words`);
    }
    assert.equal(icons.length, items.length, key);
    for (const icon of icons) assert.ok(ICONS[icon], icon);
  }
});

test("every icon the essay's cards use is vendored, with a general set for pasted articles", () => {
  const used = Object.values(NOTES.carousels).flatMap(({ icons }) => icons);
  assert.ok(used.every(icon => ICONS[icon]));
  // A pasted article's cards fall back to this one.
  assert.ok(ICONS.bookmark);
});
