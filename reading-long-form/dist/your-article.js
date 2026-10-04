// Try your own article: a reader pastes an article, and the page reads it with
// every reading idea instead of Dario's essay. The prototype's server sends the
// text to OpenAI's GPT-6 Luna in three steps: it turns the text into Markdown
// (finding the title, headings, lists, and bold lead-ins, without changing the
// words), writes the notes the reading ideas need (the key sentences, section
// summaries, list groupings, and cards), and writes the bridges for what
// collapses. The server holds the API key and limits how many articles each
// visitor can read; see the README. The article lives only in this tab: nothing
// is stored, so closing or reloading the tab, or going back to Dario's essay,
// lets it go.
import { NOTES } from './essay-notes.js?v=1a76717430d3';
import {
  clean,
  essaySentences,
  markKeySentences,
  runParts,
  runText,
} from './text-emphasis.js?v=8e863dc0fe81';
import { parseMarkdown } from './markdown.js?v=ef1c5b90a8d7';
import { articleBridges, articleNotes, listKey } from './article-notes.js?v=e55d7fa839bc';
import { ICONS } from './lucide-icons.js?v=d471d097d2c5';

const API = 'api/article';

async function call(path, body) {
  const response = await fetch(`${API}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'same-origin',
  }).catch(() => {
    throw new Error('The server couldn’t be reached. Check your connection and try again.');
  });
  // A static host may answer with a page of its own instead of the server's JSON.
  if (!response.headers.get('Content-Type')?.includes('application/json')) {
    throw new Error('This copy of the prototype isn’t running its server.');
  }
  const reply = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw Object.assign(new Error(reply.error || 'The article could not be read. Try again.'), {
      status: response.status,
    });
  }
  return reply;
}

// A later step whose model call failed (502) is tried once more on the same
// token, as the server allows, so a hiccup doesn't use up another article.
const retried = (path, body) =>
  call(path, body).catch(error => {
    if (error.status === 502) return call(path, body);
    throw error;
  });

// Text runs from the Markdown reader as elements, built from text only.
function appendRuns(parent, runs) {
  for (const run of runs) {
    if (run.text !== undefined) parent.append(run.text);
    else if (run.strong)
      appendRuns(parent.appendChild(document.createElement('strong')), run.strong);
    else if (run.em) appendRuns(parent.appendChild(document.createElement('em')), run.em);
    else if (run.link) {
      const link = document.createElement('a');
      link.href = run.link;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      appendRuns(link, run.runs);
      parent.append(link);
    }
  }
}

// The article as the essay's own elements, off the page: a header and a body.
function buildArticle({ title, blocks }) {
  const essay = document.createElement('article');
  essay.className = 'essay';
  const header = document.createElement('header');
  header.className = 'essay-header';
  const heading = document.createElement('h1');
  heading.className = 'essay-title';
  heading.textContent = title || 'Your article';
  const byline = document.createElement('p');
  byline.className = 'essay-byline';
  byline.textContent = 'Your article · Only in this tab, never saved';
  header.append(heading, byline);
  const body = document.createElement('div');
  body.className = 'essay-body';
  for (const block of blocks) {
    const element = document.createElement(block.type);
    if (block.items) {
      for (const runs of block.items)
        appendRuns(element.appendChild(document.createElement('li')), runs);
    } else appendRuns(element, block.runs);
    body.append(element);
  }
  essay.append(header, body);
  return essay;
}

// What the notes step needs to know about the article.
function describe(essay) {
  const { fingerprint, sections } = essaySentences(essay);
  const lists = [...essay.querySelectorAll('.essay-body > ul, .essay-body > ol')].map(list => {
    const items = [...list.querySelectorAll(':scope > li')].map(item => clean(item.textContent));
    return { key: listKey(items[0] ?? ''), items };
  });
  const headings = [...essay.querySelectorAll('.essay-body > h2')].map(h => h.textContent.trim());
  return { fingerprint, sections, lists, headings, icons: new Set(Object.keys(ICONS)) };
}

// The runs Collapse secondary information would hide, each with the key its
// bridge goes under, its text, and the visible text on either side, found by
// marking the article off the page and undoing it.
function collapsedRuns(essay, notes) {
  const stop = markKeySentences({ essay, notes, collapsing: true });
  try {
    return findRuns(essay);
  } finally {
    stop();
  }
}

function findRuns(essay) {
  const parts = runParts(essay);
  const between = setRange => {
    const range = document.createRange();
    setRange(range);
    return clean(range.toString());
  };
  const runs = [...essay.querySelectorAll('.emph-more')].map(marker => {
    const own = parts.get(marker.dataset.run) ?? [];
    const block = marker.closest('p, li');
    // A run ends in a span inside its block, or is a whole paragraph that
    // follows another.
    const last = own.at(-1) ?? marker;
    const lastBlock = last.closest('p, li');
    // A whole paragraph's run has nothing before it in its block, so the
    // paragraph before stands in.
    const before =
      between(range => {
        range.setStart(block, 0);
        range.setEndBefore(marker);
      }) || clean(block.previousElementSibling?.textContent);
    let after =
      lastBlock === last
        ? ''
        : between(range => {
            range.setStartAfter(last);
            range.setEnd(lastBlock, lastBlock.childNodes.length);
          });
    if (!after) after = clean(lastBlock.nextElementSibling?.textContent);
    return {
      key: marker.dataset.key,
      hidden: runText(own),
      before: before.slice(-400),
      after: after.slice(0, 400),
    };
  });
  return runs;
}

export function tryYourOwnArticle({ swap }) {
  const $ = id => document.getElementById(id);
  const dialog = $('article-dialog');
  const form = $('article-form');
  const field = $('article-text');
  const submit = $('article-submit');
  const left = $('article-left');
  const error = $('article-error');
  let status = null;
  let reading = 0;

  const showLeft = () => {
    if (!status?.available) {
      left.textContent = status?.reachable
        ? 'This copy of the prototype has no OpenAI API key set, so it can’t read your own article. The README explains how to add one.'
        : 'This copy of the prototype isn’t running its server, so it can’t read your own article. The README explains how to run it with an OpenAI API key.';
      submit.disabled = true;
      return;
    }
    submit.disabled = busy || !status.left;
    left.textContent = status.left
      ? `You can read ${status.left} more ${status.left === 1 ? 'article' : 'articles'} here. Up to ${status.maxCharacters.toLocaleString()} characters each.`
      : 'You’ve read as many articles here as this prototype allows.';
  };
  let busy = false;
  const setBusy = label => {
    busy = Boolean(label);
    submit.textContent = label || 'Try it with your own text';
    submit.disabled = busy || !status?.left;
    field.disabled = busy;
  };

  // How many articles are left comes from the server each time the dialog opens,
  // since reading elsewhere changes it; until it does, nothing can be sent.
  // Only the newest answer counts, so an older, slower one can't undo it.
  let asked = 0;
  $('try-article').addEventListener('click', async () => {
    error.textContent = '';
    dialog.showModal();
    submit.disabled = true;
    const ask = ++asked;
    let answer;
    try {
      answer = { ...(await call('')), reachable: true };
    } catch {
      answer = { available: false, reachable: false };
    }
    if (ask !== asked) return;
    status = answer;
    showLeft();
  });
  $('close-article').addEventListener('click', () => dialog.close());

  // What a pasted article stands in for, to put back when you go back to
  // Dario's essay: the essay's header, body, and closing note, and the title.
  let essay = null;
  const live = () => document.querySelector('.essay');
  const set = (shown, credit, title, hidden) => {
    live().querySelector('.essay-header').replaceWith(shown.header);
    live().querySelector('.essay-body').replaceWith(shown.body);
    document.querySelector('.credit p').replaceWith(credit);
    for (const element of live().querySelectorAll('.dinkus, .essay-afterword, .footnotes')) {
      element.hidden = hidden;
    }
    document.title = title;
    window.scrollTo(0, 0);
  };
  $('try-essay').addEventListener('click', () => {
    if (essay) {
      const back = essay;
      essay = null;
      swap(() => set(back, back.credit, back.title, false), NOTES);
    }
    dialog.close();
  });
  // Closing the dialog while it works abandons that article.
  dialog.addEventListener('close', () => {
    reading++;
    setBusy('');
    showLeft();
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const text = field.value.trim();
    if (!text) {
      error.textContent = 'Paste an article first.';
      return;
    }
    const attempt = ++reading;
    const current = () => attempt === reading;
    error.textContent = '';
    try {
      setBusy('Reading its structure…');
      const parsed = await call('/parse', { text });
      status.left = parsed.left;
      if (!current()) {
        showLeft();
        return;
      }
      const article = parseMarkdown(parsed.markdown);
      if (!article.blocks.length) throw new Error('No article text was found in what you pasted.');
      const pasted = buildArticle(article);
      const about = describe(pasted);

      setBusy('Choosing what matters…');
      const raw = await retried('/notes', {
        token: parsed.token,
        sections: about.sections,
        lists: about.lists,
        headings: about.headings,
      });
      if (!current()) return;
      const notes = articleNotes(raw, about);

      setBusy('Writing the bridges…');
      const runs = collapsedRuns(pasted, notes);
      if (runs.length) {
        const written = await retried('/bridges', {
          token: parsed.token,
          runs,
        });
        if (!current()) return;
        notes.bridges = articleBridges(written, runs);
      }

      swap(() => {
        essay ??= {
          header: live().querySelector('.essay-header'),
          body: live().querySelector('.essay-body'),
          credit: document.querySelector('.credit p'),
          title: document.title,
        };
        const credit = document.createElement('p');
        credit.textContent =
          'Your article, read with the ideas from Reading Long Form, a prototype from Interfaces that think. It isn’t saved anywhere: it stays in this tab until you close or reload it, or go back to Dario’s essay.';
        set(
          {
            header: pasted.querySelector('.essay-header'),
            body: pasted.querySelector('.essay-body'),
          },
          credit,
          `${article.title || 'Your article'} — Reading Long Form`,
          true,
        );
      }, notes);
      field.value = '';
      dialog.close();
    } catch (problem) {
      if (!current()) return;
      error.textContent = problem.message;
      setBusy('');
      showLeft();
      // Disabling the field while it worked took focus away; give it back.
      field.focus();
    }
  });
}
