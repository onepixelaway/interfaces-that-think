import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  AUTHOR_URL,
  SOURCE,
  extractEssay,
  renderEssay,
  replaceEssay,
  sanitize,
} from '../scripts/import-essay.mjs';

// The same structure as the source page, with placeholder text.
const fixture = `<!DOCTYPE html><html><head><script>track()</script></head><body>
<header class="header"><h1 class="header-name">Site name</h1></header>
<nav class="toc-container"><h2>Contents</h2></nav>
<main><article><section data-footnotes="body">
<h1 class="post-title w-condition-invisible">A Test Essay</h1>
<div class="w-embed"><h1 class="post-title">A Test Essay<sup>1</sup></h1></div>
<div class="post-subtitle">A subtitle for testing</div>
<div class="post-date">January 2025</div>
<div id="main-content" data-toc-contents="" class="rich-text w-richtext"><p>First <strong>bold</strong> and <em>italic</em> text.<sup>2</sup></p><ul role="list"><li>An item with a <a href="https://example.com/a?x=1&amp;y=2" target="_blank">link</a>.</li><li>A <a href="javascript:alert(1)">bad link</a> and a <a href="/archive">relative one</a>.</li></ul><h2>The Second Section’s Name</h2><p onclick="x()" style="color:red">Second paragraph<sup>3</sup> with <img src="x.png"> an image.<script>evil()</script></p><div class="w-embed"><iframe src="https://example.com"></iframe></div></div><hr class="u-hr-dinkus"/><div class="rich-text w-richtext"><p><em>Thanks to the reviewers.</em></p></div></section>
<section class="u-mt-md u-mb-sm"><h2 class="h3 u-mb-sm">Footnotes</h2><div data-footnotes="footnotes" class="rich-text cc-footnotes w-richtext"><ol role="list"><li><a href="https://example.com/note">A source</a></li><li>Note two.</li><li>Note three.</li><li>An unreferenced note.</li></ol></div></section>
<footer><a href="/privacy-policy">Privacy policy</a></footer></article></main></body></html>`;

test('extracts the essay parts and leaves out the site around it', () => {
  const essay = extractEssay(fixture);
  assert.equal(essay.title, 'A Test Essay<sup>1</sup>');
  assert.equal(essay.subtitle, 'A subtitle for testing');
  assert.equal(essay.date, 'January 2025');
  assert.equal(essay.afterword, '<p><em>Thanks to the reviewers.</em></p>');
  assert.equal(essay.notes.length, 4);
  assert.equal(essay.notes[0], '<a href="https://example.com/note">A source</a>');
  assert.doesNotMatch(essay.body, /Site name|Contents|Privacy policy/);
});

test('sanitizing keeps text markup and drops attributes, scripts, embeds, and unsafe links', () => {
  const { body } = extractEssay(fixture);
  assert.doesNotMatch(body, /script|evil|iframe|img|onclick|style|role=|target=|javascript/);
  assert.match(body, /<p>Second paragraph<sup>3<\/sup> with {2}an image\.<\/p>/);
  assert.match(body, /<a href="https:\/\/example.com\/a\?x=1&amp;y=2">link<\/a>/);
  assert.match(body, /<a>bad link<\/a>/);
  assert.match(body, /<a href="https:\/\/darioamodei.com\/archive">relative one<\/a>/);
  assert.equal(sanitize('<p class="x">a<br/>b</p>'), '<p>a<br>b</p>');
  assert.equal(sanitize(`<a href='#note-1' title="t">x</a>`), '<a href="#note-1">x</a>');
});

test('renders linked footnotes, section ids, and a byline that credits the source', () => {
  const { html, missing } = renderEssay(extractEssay(fixture));
  assert.equal(missing, 1);
  assert.match(
    html,
    /<h1 class="essay-title">A Test Essay<sup class="fn-ref" id="ref-1"><a href="#note-1" aria-label="Footnote 1">1<\/a><\/sup><\/h1>/,
  );
  assert.match(html, /<sup class="fn-ref" id="ref-2"><a href="#note-2"/);
  assert.match(html, /<sup class="fn-ref" id="ref-3"><a href="#note-3"/);
  assert.match(html, /<li id="note-2">Note two\. <a class="fn-back" href="#ref-2"/);
  assert.match(html, /<li id="note-4">An unreferenced note\.<\/li>/);
  assert.match(html, /<h2 id="the-second-sections-name">The Second Section’s Name<\/h2>/);
  assert.ok(
    html.includes(
      `By <a href="${AUTHOR_URL}">Dario Amodei</a> · January 2025 · <a class="essay-original" href="${SOURCE}">Original essay</a>`,
    ),
  );
  assert.ok(html.startsWith('<!-- essay:start -->') && html.endsWith('<!-- essay:end -->'));
});

test('replaces only the marked region of the page and keeps it re-runnable', () => {
  const page = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
  const { html } = renderEssay(extractEssay(fixture));
  const once = replaceEssay(page, html);
  assert.equal(replaceEssay(once, html), once);
  assert.match(once, /<footer class="credit">/);
  assert.match(once, /<p id="notice"/);
  assert.match(once, /<h1 class="essay-title">A Test Essay<sup/);
  assert.equal(once.split('<!-- essay:start -->').length, 2);
  assert.throws(() => replaceEssay('<html></html>', html), /missing/);
});
