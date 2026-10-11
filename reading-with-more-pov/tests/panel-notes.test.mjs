import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { THREADS, REACTIONS } from '../dist/panel-notes.js';
import { ASIDES } from '../dist/live-notes.js';
import { READERS, REACTION_CHOICES } from '../dist/readers.js';
import { findQuote, fold, locate } from '../dist/anchors.js';
import { articleBlocks } from '../server/article.mjs';

const html = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
const blocks = articleBlocks(html);
const readers = new Set(READERS.map(reader => reader.id));

test('the article is read into its blocks of text', () => {
  assert.equal(
    blocks[0],
    "If you're anything like me, you think new years resolutions are stupid.",
  );
  assert.ok(blocks.includes('Part 1) Morning – Psychological Excavation – Vision & Anti-Vision'));
  assert.equal(blocks.at(-1), '– Dan');
  assert.ok(blocks.length > 200);
});

test('every quote is found exactly once in the article', () => {
  for (const { quote } of [...THREADS, ...REACTIONS]) {
    assert.ok(locate(blocks, quote), `Not found once: ${quote}`);
  }
});

test('every comment and reaction is by a known reader, and threads have unique ids', () => {
  assert.equal(new Set(THREADS.map(thread => thread.id)).size, THREADS.length);
  for (const thread of THREADS) {
    assert.ok(thread.comments.length > 0);
    for (const comment of thread.comments) {
      assert.ok(readers.has(comment.reader), comment.reader);
      assert.ok(comment.text.length > 0 && comment.text.length <= 400, comment.text);
    }
  }
  for (const reaction of REACTIONS) {
    assert.ok(readers.has(reaction.reader), reaction.reader);
    assert.ok(reaction.emoji.length > 0);
  }
});

test('no reader reacts twice with the same emoji to the same words', () => {
  const seen = new Set();
  for (const { quote, reader, emoji } of REACTIONS) {
    const key = `${quote}|${reader}|${emoji}`;
    assert.ok(!seen.has(key), key);
    seen.add(key);
  }
});

test('every reader has what the menu and the model need', () => {
  for (const reader of READERS) {
    assert.match(reader.id, /^[a-z]+$/);
    for (const field of ['name', 'role', 'about']) assert.ok(reader[field], field);
    assert.match(reader.color, /^#[0-9a-f]{6}$/);
  }
  assert.equal(new Set(REACTION_CHOICES).size, REACTION_CHOICES.length);
});

test('quotes match across curly and straight punctuation and spacing', () => {
  assert.deepEqual(findQuote('He said “don’t”  go.', 'said "don\'t" go'), [[3, 19]]);
  assert.deepEqual(findQuote('a b a b', 'a b'), [
    [0, 3],
    [4, 7],
  ]);
  assert.equal(fold(' a \n b ').folded, 'a b ');
  assert.equal(locate(['x y', 'x y'], 'x y'), null);
  assert.deepEqual(locate(['x y', 'x y'], 'x y', 1), { block: 1, start: 0, end: 3 });
});

test('reading live, every remark is short, by a known reader, on words found once, and any more is brief', () => {
  assert.equal(new Set(ASIDES.map(aside => aside.id)).size, ASIDES.length);
  for (const aside of ASIDES) {
    assert.ok(locate(blocks, aside.quote), `Not found once: ${aside.quote}`);
    for (const comment of aside.comments) {
      assert.ok(readers.has(comment.reader), comment.reader);
      assert.ok(comment.text.split(/\s+/).length <= 20, `Too long: ${comment.text}`);
      if (comment.more)
        assert.ok(comment.more.split(/\s+/).length <= 90, `More too long: ${aside.id}`);
    }
  }
});
