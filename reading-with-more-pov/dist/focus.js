// The line in focus: the line of text at the reading line, a little above the
// middle of the screen. The reading dot marks it, and the readers talk about
// the words around it.
import { blocksOf } from './anchors.js?v=bdd6fa0a4449';

// The reading line, as a share of the screen's height from the top.
const READING_LINE = 0.3;
const readingLine = () => innerHeight * READING_LINE;

export function createFocus(article) {
  const blocks = blocksOf(article);
  const range = document.createRange();
  // The article's line height, looked up again only when the window resizes.
  let pitch = null;
  addEventListener('resize', () => (pitch = null));

  // The line of text at the reading line, or the nearest one to it.
  function line() {
    const y = readingLine();
    let best = null;
    let distance = Infinity;
    for (const block of blocks) {
      const box = block.getBoundingClientRect();
      // Only blocks around the reading line can hold the nearest line.
      if (box.bottom < y - 80 || box.top > y + 80) continue;
      range.selectNodeContents(block);
      for (const rect of range.getClientRects()) {
        if (!rect.height) continue;
        const away =
          rect.top <= y && rect.bottom >= y
            ? 0
            : Math.min(Math.abs(rect.top - y), Math.abs(rect.bottom - y));
        if (away < distance) {
          distance = away;
          best = rect;
        }
      }
    }
    return best;
  }

  // Whether words (as spans) are on the line in focus, or one line before or
  // after it. A line's reach is a little short of two lines, so within a
  // paragraph only the next line over counts, and across a paragraph break,
  // the last or first line of the next paragraph does too.
  function near(spans, focus = line()) {
    if (!focus || !spans?.[0]?.isConnected) return false;
    pitch ??= parseFloat(getComputedStyle(article).lineHeight) || 0;
    const reach = (pitch || focus.height * 1.6) * 1.9;
    const center = focus.top + focus.height / 2;
    for (const span of spans) {
      for (const rect of span.getClientRects()) {
        if (Math.abs(rect.top + rect.height / 2 - center) <= reach) return true;
      }
    }
    return false;
  }

  return { line, near };
}
