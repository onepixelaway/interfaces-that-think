// Finding a quote in the article and marking it. Quotes are matched loosely
// on punctuation a model or a reader might type differently (curly or straight
// quotes, runs of spaces), and strictly on everything else.
const FOLD = { '‘': "'", '’': "'", '“': '"', '”': '"', '″': '"', ' ': ' ' };

// The text with punctuation folded and whitespace collapsed, and for each of
// its characters, where it came from in the original.
export function fold(text) {
  let folded = '';
  const from = [];
  for (let i = 0; i < text.length; i++) {
    const char = FOLD[text[i]] ?? text[i];
    if (/\s/.test(char)) {
      if (folded.endsWith(' ') || folded === '') continue;
      folded += ' ';
    } else folded += char;
    from.push(i);
  }
  return { folded, from };
}

// Every place the quote appears in the text, as [start, end) in the original.
export function findQuote(text, quote) {
  const needle = fold(quote).folded.trim();
  if (!needle) return [];
  const { folded, from } = fold(text);
  const found = [];
  for (let at = folded.indexOf(needle); at !== -1; at = folded.indexOf(needle, at + 1)) {
    found.push([from[at], from[at + needle.length - 1] + 1]);
  }
  return found;
}

// Where a quote is among the article's blocks: the one place it appears, or
// with block given, its first place in that block. Null if it isn't there, or
// appears more than once and no block says which.
export function locate(texts, quote, block) {
  if (block !== undefined) {
    const [first] = texts[block] === undefined ? [] : findQuote(texts[block], quote);
    return first ? { block, start: first[0], end: first[1] } : null;
  }
  let match = null;
  for (let index = 0; index < texts.length; index++) {
    for (const [start, end] of findQuote(texts[index], quote)) {
      if (match) return null;
      match = { block: index, start, end };
    }
  }
  return match;
}

// The article's blocks of text, in order: what quotes are found in.
export const BLOCKS = 'p, li, h2, h3';
export const blocksOf = root => [...root.querySelectorAll(BLOCKS)];

// Wraps characters [start, end) of an element's text in spans made by make(),
// one per text node the range crosses, and returns them.
export function wrap(element, start, end, make) {
  const walker = element.ownerDocument.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const pieces = [];
  let offset = 0;
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const from = offset;
    offset += node.data.length;
    if (offset <= start || from >= end) continue;
    pieces.push([node, Math.max(start, from) - from, Math.min(end, offset) - from]);
  }
  return pieces.map(([node, from, to]) => {
    if (to < node.data.length) node.splitText(to);
    const piece = from > 0 ? node.splitText(from) : node;
    const span = make();
    piece.replaceWith(span);
    span.append(piece);
    return span;
  });
}

// Lights up words (as spans) with a class, in a color, or puts them out
// (color null).
export function paint(spans, className, color) {
  for (const span of spans) {
    span.classList.toggle(className, Boolean(color));
    if (color) span.style.setProperty('--color', color);
  }
}

// Undoes wrap for every span matching selector inside root.
export function unwrapAll(root, selector) {
  const parents = new Set();
  for (const span of root.querySelectorAll(selector)) {
    parents.add(span.parentNode);
    span.replaceWith(...span.childNodes);
  }
  for (const parent of parents) parent.normalize();
}
