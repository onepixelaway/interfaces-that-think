import test from 'node:test';
import assert from 'node:assert/strict';
import { parseInline, parseMarkdown } from '../dist/markdown.js';
import { articleBridges, articleNotes, listKey } from '../dist/article-notes.js';
import { createLimits, createTokens } from '../server/limits.mjs';

test('the Markdown reader keeps the title, headings, paragraphs, and lists', () => {
  const { title, blocks } = parseMarkdown(
    '# A title\n\nFirst paragraph,\nwrapped.\n\n## A section\n\n- **Lead.** One\n- Two\n  continued\n\n1. First\n2. Second\n\nLast *word* with [a link](https://example.com).',
  );
  assert.equal(title, 'A title');
  assert.deepEqual(
    blocks.map(block => block.type),
    ['p', 'h2', 'ul', 'ol', 'p'],
  );
  assert.deepEqual(blocks[0].runs, [{ text: 'First paragraph, wrapped.' }]);
  assert.deepEqual(blocks[2].items[0], [{ strong: [{ text: 'Lead.' }] }, { text: ' One' }]);
  assert.deepEqual(blocks[2].items[1], [{ text: 'Two continued' }]);
  assert.deepEqual(blocks[4].runs, [
    { text: 'Last ' },
    { em: [{ text: 'word' }] },
    { text: ' with ' },
    { link: 'https://example.com', runs: [{ text: 'a link' }] },
    { text: '.' },
  ]);
});

test("the Markdown reader keeps a heading's own #, skips section breaks, and reads links with parentheses", () => {
  const { blocks } = parseMarkdown(
    '## Learning C#\n\n* * *\n\nSee [Foo](https://en.wikipedia.org/wiki/Foo_(bar)).',
  );
  assert.deepEqual(blocks[0], { type: 'h2', runs: [{ text: 'Learning C#' }] });
  assert.deepEqual(
    blocks.map(block => block.type),
    ['h2', 'p'],
  );
  assert.deepEqual(blocks[1].runs[1], {
    link: 'https://en.wikipedia.org/wiki/Foo_(bar)',
    runs: [{ text: 'Foo' }],
  });
});

test('the Markdown reader keeps anything else as plain text', () => {
  assert.deepEqual(parseInline('<img src=x onerror=alert(1)> [x](javascript:alert(1))'), [
    { text: '<img src=x onerror=alert(1)> [x](javascript:alert(1))' },
  ]);
  assert.equal(parseMarkdown('Just text, no title.').title, '');
});

const article = {
  fingerprint: 'abc',
  sections: [
    {
      heading: 'Opening',
      sentences: [
        { id: 's1', text: 'One.' },
        { id: 's2', text: 'Two.' },
      ],
    },
    { heading: 'Part', sentences: [{ id: 's3', text: 'Three.' }] },
  ],
  lists: [{ key: listKey('Alpha item text'), items: ['Alpha item text', 'Beta', 'Gamma'] }],
  headings: ['Part'],
  icons: new Set(['brain', 'bookmark']),
};

test('notes for a pasted article keep only what fits the article', () => {
  const notes = articleNotes(
    {
      keySentences: ['s3', 's1', 's9', 's1'],
      collapseFolds: ['s3', 's2'],
      sections: [
        { heading: 'Part', summary: 'I explain the part.' },
        { heading: 'Nowhere', summary: 'Dropped.' },
      ],
      groupings: [
        {
          list: 0,
          sentence: 'These items are organized',
          asWritten: 'one at a time',
          by: [
            {
              name: 'by sound',
              about: 'How they sound',
              groups: [
                { name: 'Soft:', items: [2, 1] },
                { name: 'Hard', items: [3] },
              ],
              edits: [
                { item: 2, from: 'Beta', to: 'Second' },
                { item: 1, from: 'missing', to: 'x' },
              ],
            },
            { name: 'by half', about: '', groups: [{ name: 'All', items: [1, 2] }], edits: [] },
          ],
        },
      ],
      carousels: [{ list: 0, label: 'Letters', icons: ['brain', 'nope'] }],
    },
    article,
  );
  assert.deepEqual(notes.keySentences, ['s1', 's3']);
  assert.deepEqual(notes.collapseFolds, ['s3']);
  assert.deepEqual(notes.sections, { Part: 'I explain the part.' });
  const grouping = notes.groupings['Alpha item text'];
  assert.equal(grouping.by.length, 1);
  assert.deepEqual(grouping.by[0].groups, [
    ['Soft', [1, 2]],
    ['Hard', [3]],
  ]);
  assert.deepEqual(grouping.by[0].edits, [[2, 'Beta', 'Second']]);
  assert.deepEqual(notes.carousels['Alpha item text'].icons, ['brain', 'bookmark', 'bookmark']);
  assert.equal(notes.essay, 'abc');
});

test('bridges are keyed by the run they stand in for', () => {
  const runs = [
    { key: 'a', hidden: 'Hidden one' },
    { key: 'b', hidden: 'Hidden two' },
  ];
  const bridges = articleBridges(
    {
      bridges: [
        { run: 1, text: 'I say the second thing.' },
        { run: 5, text: 'Nowhere.' },
      ],
    },
    runs,
  );
  assert.deepEqual(bridges, { b: 'I say the second thing.' });
});

test('each visitor and address can read only so many articles', () => {
  const limits = createLimits({ perVisitor: 2, perAddress: 3 });
  assert.equal(limits.take('a', 'ip').left, 1);
  assert.equal(limits.take('a', 'ip').left, 0);
  assert.equal(limits.take('a', 'ip').ok, false);
  // A new cookie on the same address gets only what the address has left.
  assert.equal(limits.take('b', 'ip').left, 0);
  assert.equal(limits.take('b', 'ip').ok, false);
  limits.giveBack('b', 'ip');
  assert.equal(limits.left('b', 'ip'), 1);
});

test("an article's later steps succeed once each, while its token is fresh", () => {
  let time = 0;
  const tokens = createTokens({ ttlMs: 1000, now: () => time });
  tokens.issue(500, 't');
  assert.deepEqual(tokens.use('t', 'notes'), { characters: 500 });
  tokens.finish('t', 'notes');
  assert.equal(tokens.use('t', 'notes'), null);
  assert.equal(tokens.use('other', 'notes'), null);
  time = 2000;
  assert.equal(tokens.use('t', 'bridges'), null);
});

test('a day caps everyone together, and the next day starts fresh', () => {
  let time = Date.parse('2026-10-04T10:00:00Z');
  const limits = createLimits({ perVisitor: 5, perAddress: 5, perDay: 2, now: () => time });
  assert.equal(limits.take('a', 'one').ok, true);
  assert.equal(limits.take('b', 'two').ok, true);
  assert.equal(limits.left('c', 'three'), 0);
  assert.deepEqual(limits.take('c', 'three'), { ok: false, left: 0, full: true });
  time = Date.parse('2026-10-05T10:00:00Z');
  assert.equal(limits.take('c', 'three').ok, true);
});

test('a step that failed can be tried once more, and no more', () => {
  const tokens = createTokens();
  const token = tokens.issue(100);
  assert.ok(tokens.use(token, 'notes'));
  assert.ok(tokens.use(token, 'notes'));
  assert.equal(tokens.use(token, 'notes'), null);
});
