// The article's text, read from the page between its article:start and
// article:end markers: one string per block (paragraph, list item, heading),
// in the same order the page's anchors.js counts them.
const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", nbsp: ' ' };

const decode = text => text.replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (_, name) => ENTITIES[name]);

// Each block's tag and text.
function blocks(html) {
  const start = html.indexOf('<!-- article:start -->');
  const end = html.indexOf('<!-- article:end -->');
  if (start === -1 || end === -1) throw new Error('The page has no article markers.');
  const article = html.slice(start, end);
  return [...article.matchAll(/<(p|li|h2|h3)\b[^>]*>([\s\S]*?)<\/\1>/g)].map(match => ({
    tag: match[1],
    text: decode(match[2].replace(/<[^>]+>/g, ''))
      .replace(/\s+/g, ' ')
      .trim(),
  }));
}

export const articleBlocks = html => blocks(html).map(block => block.text);

// The article as the model reads it: headings marked, every block numbered.
export function articleForModel(html) {
  return blocks(html)
    .map(({ tag, text }, index) =>
      tag === 'h2' || tag === 'h3' ? `\n## ${text}` : `[${index + 1}] ${text}`,
    )
    .join('\n');
}
