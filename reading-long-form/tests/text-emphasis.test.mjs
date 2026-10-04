import test from 'node:test';
import assert from 'node:assert/strict';
import {
  fingerprint,
  mergeRanges,
  restRanges,
  sharedBy,
  splitSentences,
} from '../dist/text-emphasis.js';

test('splits sentences with exact offsets and trimmed whitespace', () => {
  const text = 'First point here.  Second one, e.g. with an aside? Third!\n';
  const sentences = splitSentences(text);
  assert.deepEqual(
    sentences.map(sentence => sentence.text),
    ['First point here.', 'Second one, e.g. with an aside?', 'Third!'],
  );
  for (const sentence of sentences) {
    assert.equal(text.slice(sentence.start, sentence.end).replace(/\s+/g, ' '), sentence.text);
  }
});

test('a fragment with no letters or digits joins the sentence before it', () => {
  const sentences = splitSentences('It ends here. …');
  assert.equal(sentences.length, 1);
  assert.equal(sentences[0].text, 'It ends here. …');
  assert.deepEqual(splitSentences('   '), []);
});

test('fingerprints are stable and change with the text', () => {
  assert.equal(fingerprint('abc'), fingerprint('abc'));
  assert.notEqual(fingerprint('abc'), fingerprint('abd'));
});

test('initials and titles do not end a sentence', () => {
  const sentences = splitSentences('In Iain M. Banks’s novel, Dr. Smith wins. Plan ahead.');
  assert.deepEqual(
    sentences.map(sentence => sentence.text),
    ['In Iain M. Banks’s novel, Dr. Smith wins.', 'Plan ahead.'],
  );
  assert.deepEqual(
    splitSentences('I prefer AGI. It is short.').map(sentence => sentence.text),
    ['I prefer AGI.', 'It is short.'],
  );
});

test('a sentence the splitter breaks before a lowercase word stays whole', () => {
  assert.deepEqual(
    splitSentences('Everyone (including us!) will need to help. Then it works.').map(s => s.text),
    ['Everyone (including us!) will need to help.', 'Then it works.'],
  );
});

test('a quotation of several sentences stays in one sentence', () => {
  assert.deepEqual(
    splitSentences('They say “AI can only analyze data. Garbage in, garbage out”. I disagree.').map(
      s => s.text,
    ),
    ['They say “AI can only analyze data. Garbage in, garbage out”.', 'I disagree.'],
  );
});

test('overlapping ranges in a block merge, so emphasis spans never nest', () => {
  assert.deepEqual(
    mergeRanges([
      { start: 20, end: 40 },
      { start: 0, end: 18 },
      { start: 0, end: 18 },
      { start: 30, end: 55 },
    ]).map(({ start, end }) => [start, end]),
    [
      [0, 18],
      [20, 55],
    ],
  );
});

test('the key-sentence engine starts with the first idea and stops after the last', () => {
  const log = [];
  const use = sharedBy(context => {
    log.push(`start ${context}`);
    return () => log.push('stop');
  });
  const releaseFade = use('a');
  const releaseKey = use('b');
  releaseFade();
  releaseFade();
  assert.deepEqual(log, ['start a']);
  releaseKey();
  assert.deepEqual(log, ['start a', 'stop']);
  const again = use('c');
  again();
  assert.deepEqual(log, ['start a', 'stop', 'start c', 'stop']);
});

test('the text outside key ranges splits into runs, trimmed, with punctuation-only gaps left alone', () => {
  const text = 'Key one. Hidden two. Key three. … Key four. Hidden five.';
  const keys = ['Key one.', 'Key three.', 'Key four.'].map(key => {
    const start = text.indexOf(key);
    return { start, end: start + key.length };
  });
  assert.deepEqual(
    restRanges(text, keys).map(({ start, end }) => text.slice(start, end)),
    ['Hidden two.', 'Hidden five.'],
  );
  assert.deepEqual(
    restRanges('All hidden here.', []).map(({ start, end }) => [start, end]),
    [[0, 16]],
  );
  assert.deepEqual(restRanges('Key only.', [{ start: 0, end: 9 }]), []);
});
