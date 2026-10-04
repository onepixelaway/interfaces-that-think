// A small Markdown reader for Try your own article. GPT-6 Luna returns the
// pasted article as Markdown, and this reads only what the reading ideas use: a
// "# " title, "## " section headings, paragraphs, "- " and "1. " lists, and,
// inside text, **bold**, *italics*, and [links](https://…). Anything else is
// kept as plain text. It builds a plain description of the article, which the
// page turns into elements with text only, so nothing pasted runs as HTML.

// Inline text as runs: { text }, { strong: runs }, { em: runs }, { link, runs }.
export function parseInline(text) {
  const runs = [];
  let plain = '';
  const flush = () => {
    if (plain) runs.push({ text: plain });
    plain = '';
  };
  for (let at = 0; at < text.length;) {
    // Plain text up to the next * or [ goes in at once.
    const next = text.slice(at).search(/[*[]/);
    if (next !== 0) {
      plain += next < 0 ? text.slice(at) : text.slice(at, at + next);
      at = next < 0 ? text.length : at + next;
      continue;
    }
    const rest = text.slice(at);
    const strong = rest.match(/^\*\*(?=\S)([\s\S]*?\S)\*\*/);
    const em = !strong && rest.match(/^\*(?=[^\s*])([^*]*?[^\s*])\*/);
    // A link's address may hold one level of parentheses, as Wikipedia's do.
    const link =
      !strong && !em && rest.match(/^\[([^\]]+)\]\((https?:\/\/(?:[^\s()]|\([^\s()]*\))+)\)/);
    if (strong) {
      flush();
      runs.push({ strong: parseInline(strong[1]) });
      at += strong[0].length;
    } else if (em) {
      flush();
      runs.push({ em: parseInline(em[1]) });
      at += em[0].length;
    } else if (link) {
      flush();
      runs.push({ link: link[2], runs: parseInline(link[1]) });
      at += link[0].length;
    } else {
      plain += text[at];
      at++;
    }
  }
  flush();
  return runs;
}

const LIST = { ul: /^\s*[-*+]\s+(.*)$/, ol: /^\s*\d+[.)]\s+(.*)$/ };

// The article: { title, blocks }, each block { type: 'h2' | 'p', runs } or
// { type: 'ul' | 'ol', items: [runs] }. A title written as "# " anywhere before
// the first heading or paragraph is the title; later "# " lines become headings.
export function parseMarkdown(markdown) {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  let title = '';
  const blocks = [];
  let paragraph = [];
  let list = null;
  const endParagraph = () => {
    const text = paragraph.join(' ').replace(/\s+/g, ' ').trim();
    if (text) blocks.push({ type: 'p', runs: parseInline(text) });
    paragraph = [];
  };
  const endList = () => {
    if (list?.items.length) blocks.push(list);
    list = null;
  };
  for (const line of lines) {
    // A heading may close with #s after a space, as in "## Title ##"; "C#" keeps its own.
    const heading = line.match(/^\s*(#{1,6})\s+(.*?)(?:\s+#+)?\s*$/);
    const ul = line.match(LIST.ul);
    const ol = !ul && line.match(LIST.ol);
    const item = ul ? { type: 'ul', text: ul[1] } : ol ? { type: 'ol', text: ol[1] } : null;
    // A section break (*** or - - -) ends what came before, like a blank line.
    if (!line.trim() || /^\s*([-*_])(?:\s*\1){2,}\s*$/.test(line)) {
      endParagraph();
      endList();
    } else if (heading) {
      endParagraph();
      endList();
      const text = heading[2].replace(/\*\*/g, '').trim();
      if (heading[1] === '#' && !title && !blocks.length) title = text;
      else if (text) blocks.push({ type: 'h2', runs: parseInline(text) });
    } else if (item) {
      endParagraph();
      if (list?.type !== item.type) {
        endList();
        list = { type: item.type, items: [] };
      }
      list.items.push(item.text.trim());
    } else if (list && /^\s{2,}\S/.test(line)) {
      // A wrapped line continues the list item above it.
      list.items[list.items.length - 1] += ` ${line.trim()}`;
    } else {
      endList();
      paragraph.push(line.trim());
    }
  }
  endParagraph();
  endList();
  for (const block of blocks) {
    if (block.items) block.items = block.items.map(text => parseInline(text.replace(/\s+/g, ' ')));
  }
  return { title, blocks };
}
