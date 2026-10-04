# Reading Long Form

A reading prototype from [Interfaces that think](https://tareqistyping.com/interfaces-that-think/), exploring new ways to read a long essay with AI. Dario's essay needs no API key: what the reading ideas know about it was written once by Claude and is stored with the page. To read your own article with the same ideas, run the prototype's server with an OpenAI API key (see [Try your own article](#try-your-own-article)).

The essay is [Machines of Loving Grace](https://darioamodei.com/essay/machines-of-loving-grace) by Dario Amodei (October 2024), shown as one continuous page in the type and colors of the original, with no navigation. The byline and a closing note credit the author and link to the original.

## What you can do

Reading ideas are turned on or off from the **Intelligence** menu, and the menu remembers your choices in this browser. The switch beside it changes between light and dark, like the original site; until you use it, the page follows your system setting.

These ideas share one set of key sentences. An idea can refine another, listed under it in the menu; it runs only while its parent is on.

- **Emphasize key information** (on by default). While you scroll, the key sentences turn a dark teal blue over 0.3 seconds; once scrolling rests, they ease back to the regular text color over 2.5 seconds.
- **Fade secondary information on scroll** (on by default). As soon as you scroll, everything except the key sentences fades to 25% over 0.5 seconds. Once scrolling stops, it stays faded for 1.5 seconds, then comes back to full over 0.5 seconds.
- **Collapse secondary information** (off by default). Blocks of secondary text collapse to a small … pill, and back-to-back paragraphs with no key sentences share one pill. Only blocks collapse: a stretch under 30 words between key sentences stays as it is, since a pill would save little, and a few key sentences that only support a neighbor (like the one about people thinking Dario is a doomer) fold into the text around them so the block they sit in collapses whole. Emphasis and fading keep those sentences as key. A list item collapses only partly: one with no key sentences keeps its first sentence, so a bullet or number is never left on its own. Rest the pointer on or near a pill to expand it in place; it collapses again shortly after the pointer leaves that paragraph. A click or tap pins it open until you click again or press Escape. Collapsing replaces the other two ideas, so turning it on turns them off, and turning either of them on turns collapsing off.
  - **Add summary in collapsed area** (on by default, under Collapse secondary information). Inside a … pill, to its left, a 6–15 word sentence set exactly like the body text, with only the pill's grey background behind it, in the author's first-person voice says what the hidden text says and bridges the visible text on either side, so the collapsed view reads as one thread. Bridges go only where the gap needs one, 79 of the 95 pills; the rest keep a plain … pill. It runs only while collapsing is on; until then it's greyed out in the menu.
- **Collapse sections into summaries** (off by default). Each numbered section, like 2. Neuroscience and mind, folds under its heading: the section's first 300 pixels show at 70%, fading out over the next 300, behind a centered callout with a 1–3 sentence summary in the author's voice, using his own words where possible. The callout is a flat, near-white grey with no border or shadow, so it reads as a soft note in the page rather than a card laid over it. It starts just below the line where the section's second sentence begins, and never more than three lines down, so only a sentence or two shows above it. Click the callout (it ends with a … pill), or anywhere on the faded text, to expand the section; Enter or Space does the same. It works alongside every other idea, which keep working on the text inside a folded section.
- **Group lists by other principles** (on by default). Group by, as in a table, for the essay's lists. Dario organizes each list by some principle, usually without naming it. Above seven of the lists, a sentence set like the body text names his grouping in a dropdown, as in “These limits are organized [one at a time].” Resting the pointer on the dropdown (or a tap, or the arrow keys) stacks every option with the chosen one right over it and the others above and below, like a vertical segmented control: Dario's grouping, such as disease by disease or from tools to ideas, and principles Claude suggests, such as by how sure I am, by what’s in the way, or by who has to act. Like the bridges and summaries, everything a reader sees is in Dario’s voice, headings included (“Guesses I’m optimistic about:”). Hovering an option says what it means; a click picks it. The list then shows the same items under headings written as plain phrases, such as “Predictions that can’t be measured yet:”, and hides Dario’s list until you pick his grouping again. Nothing animates. Where the new order would leave words wrong, such as “the previous bullet point”, a few are changed and marked with a dotted underline; hover shows the original words. A regrouped list keeps the marks of the other ideas, so key sentences and collapsed text work the same in it. Two lists are left alone: the four reasons in the opening and the four routes in neuroscience, where no other grouping said anything new.
- **Slide through lists as cards** (off by default). The essay's chunkiest lists show as a row of cards, one item per card: the six properties of powerful AI, the seven discoveries that drive biology, and the four routes in neuroscience. Each card is a flat, near-white grey like the section callouts. A card and a half show at once. An icon in its top-left corner, in the secondary text color, sits above the item's text, which is set a little smaller than the body text. On a phone a card fills the width with the next one peeking in. The cards slide when you swipe or scroll sideways, or focus the cards and press the arrow keys, Home, or End; nothing moves on its own, and with reduced motion they move without sliding. Screen readers hear a labeled carousel holding a list, and the icons are hidden from them. Short lists, like the five fields, and lists whose items run too long for a card, like the predictions in biology, stay as written. The cards follow Group lists by other principles: when a list is regrouped, each group becomes its own row of cards under its heading, so the two ideas work together instead of one turning the other off. Like a regrouped list, the cards keep the marks of the other ideas, so key sentences and collapsed text work the same in them.

At rest, including when the page loads, everything is the regular text color. The colors, opacities, and fade times are set at the top of the key information rules in `style.css`.

The key sentences are a supercut: the essay's own sentences that, read in order and on their own, tell the whole piece, including how it opens and how each section is set up, the sentences that name an idea, like "We could summarize this as a “country of geniuses in a datacenter”", and the closing paragraph. The bold lead-in that opens a bullet point, like **Maximize leverage.**, is always emphasized too.

## The essay notes

The key sentences, the bridges, the section summaries, the list groupings, and which lists show as cards, with an icon for each item, were written once by Claude for this essay and are stored in `dist/essay-notes.js`, so nothing calls a model while you read. Key sentences are listed by number, counting the essay's sentences in order; bridges are keyed by a fingerprint of the text they stand in for; section summaries are keyed by heading; groupings and cards are keyed by the opening words of each list, with items numbered in Dario's order.

The notes also store a fingerprint of the essay's sentences. If the essay text changes, for example after importing it again, the reading ideas mark nothing and say so in the console, and the notes need writing again. `tests/essay-notes.test.mjs` checks that the notes match the essay, that every bridge and summary is short and in the first person, that every grouping places each item of its list once and changes only words that are there, and that every list shown as cards has items short enough for a card and a known icon for each.

## The essay text

The essay lives in `dist/index.html`, between the `essay:start` and `essay:end` markers. It was imported from darioamodei.com with:

```sh
node scripts/import-essay.mjs
```

Run it again to refresh the essay from the source; it replaces only the marked region. It keeps only the text and its basic markup (paragraphs, headings, lists, emphasis, links) and links each footnote marker to its note and back. Section headings get ids, such as `#1-biology-and-health`. Run it with `--dry-run` to see what it would import without writing anything, or pass the path of a saved copy of the page to import that instead.

## Try your own article

The **Try your own article** button, to the right of the Intelligence menu, opens the Interfaces that think dialog with a field to paste an article into. The prototype's server sends it to OpenAI’s GPT-6 Luna (`gpt-6-luna`, at medium reasoning effort) in three steps:

1. **Structure.** It turns the pasted text into Markdown, finding the title, section headings, lists, and bold lead-ins, without changing the author's words. Page debris like share buttons and footnote markers is dropped.
2. **Notes.** With the article's sentences numbered, it writes the notes the reading ideas use: the key sentences, the ones collapsing folds in, section summaries, list groupings, and list cards with their icons. Everything a reader sees is in the author's first-person voice. The page checks the notes against the article and keeps only what fits.
3. **Bridges.** The page finds what collapsing would hide, and it writes the bridges for the pills that need one.

The article then replaces the essay, with every idea working on it. It isn't saved anywhere: the server passes it to OpenAI with `store: false` and keeps nothing, and the page holds it only in memory, so closing or reloading the tab brings back the essay.

### Run it with your own key

```sh
OPENAI_API_KEY=sk-… node server/server.mjs
```

Or keep the key in a `.env` file, which git ignores: copy `.env.example` to `.env`, fill in the key, and run:

```sh
node --env-file=.env server/server.mjs
```

Then open `http://localhost:4175/`. The key stays on the server and never reaches the browser. Use a key just for this, with a spending limit on its project. Without a key, the server serves the essay as usual and the dialog explains that a key is needed; on a static host, the dialog explains that the server isn't running.

The prompts live on the server, in `server/prompts.mjs`, so the page can't send its own requests through the key. To limit abuse:

- Each visitor can read 5 articles, counted by a random id in an HttpOnly cookie, and each IP address 15, so clearing the cookie doesn't reset the count. These counts last until the server restarts; they don't reset each day. If the first step fails, the article is given back.
- An article can be at most 60,000 characters.
- Everyone together can read 200 articles a day, so the key's spending has a ceiling even if someone gets around the other limits.
- An article's later steps each run once on a token from its first step, which lasts an hour, and can send no more text than the article had, plus its context. If a later step's model call fails, the page tries it once more on the same token; if that fails too, the article counts as read.
- A reply the model cut short or refused counts as a failure.
- If the reader closes the page mid-step, the model call is stopped.
- Browsers refuse to send these requests from other sites. Scripts outside a browser can still call the routes, which is what the limits are for.

Counts are kept in memory and reset when the server restarts. To host it, run the server behind your own domain; behind a proxy, set `TRUST_PROXY=1` so it counts the visitor's address, not the proxy's. It uses the last address in `X-Forwarded-For`, the one your proxy added, since the client can write anything before it. That assumes exactly one proxy: behind two (say, a CDN and then nginx), every visitor would share the CDN's address, so have the outer one pass the client's address on. With `TRUST_PROXY` on, make sure the server's port can only be reached through the proxy, or a client could write its own header. Settings, all optional except the key:

| Variable | Default | |
| --- | --- | --- |
| `OPENAI_API_KEY` | | Required for Try your own article |
| `OPENAI_MODEL` | `gpt-6-luna` | |
| `OPENAI_BASE_URL` | `https://api.openai.com/v1` | |
| `ARTICLES_PER_VISITOR` | `5` | |
| `ARTICLES_PER_ADDRESS` | `15` | |
| `ARTICLES_PER_DAY` | `200` | For everyone together |
| `MAX_ARTICLE_CHARACTERS` | `60000` | |
| `PORT` | `4175` | Or pass it after the script |
| `HOST` | `127.0.0.1` | `0.0.0.0` to listen on every address |
| `TRUST_PROXY` | off | `1` behind a proxy that sets `X-Forwarded-For` |

## How it works

The page is plain HTML, CSS, and ES modules with no build step. Your choices in the Intelligence menu and the light/dark switch are kept in this browser's localStorage. There are no external scripts, fonts, icons, or analytics. The page makes no network requests beyond its own files, except to its own server when you read your own article.

## Add a reading idea

Each idea is one entry in `FEATURES` in `dist/features.js`, with an `id`, a menu `label`, whether it starts `on`, and a `start` function that sets it up and returns a function that undoes it. `start` receives the essay's `<article>` element and its notes, so a pasted article can bring its own. `dist/text-emphasis.js` is a complete example.

| File in `dist` | What it does |
| --- | --- |
| `index.html` | The essay page, menu, and light/dark switch |
| `style.css` | Type and colors from darioamodei.com, including its dark palette |
| `app.js` | Intelligence menu and light/dark switch |
| `features.js` | The list of reading ideas, and turning them on and off |
| `essay-notes.js` | Key sentences, bridges, section summaries, list groupings, and list cards for this essay |
| `text-emphasis.js` | Marking the key sentences, and the ideas that use them |
| `collapse-summaries.js` | Add summary in collapsed area |
| `section-summaries.js` | Collapse sections into summaries |
| `regroup-lists.js` | Group lists by other principles |
| `list-carousels.js` | Slide through lists as cards |
| `list-copies.js` | Copies of a list's items, for the ideas that show a list another way |
| `lucide-icons.js` | The Lucide icons the cards use |
| `your-article.js` | Try your own article: the dialog, its three steps, and swapping the article in |
| `markdown.js` | Reading the Markdown the model returns |
| `article-notes.js` | Checking a pasted article's notes against it |

The server, in `server/`, has no dependencies: `server.mjs` serves `dist` and the article routes, `prompts.mjs` holds the instructions and reply shapes, and `limits.mjs` counts articles.

## Run

```sh
node server/server.mjs
```

Open `http://localhost:4175/`. Add `OPENAI_API_KEY` to read your own article (see above). Any static server pointed at `dist` also works for the essay, as does `python3 scripts/dev-server.py`.

## Explorations

`explorations/` holds design studies that aren't part of the page, such as `section-summaries.html`, the color and layout options tried for the section callouts. They link to `dist` for the essay's styles, so serve the prototype folder rather than `dist`:

```sh
python3 scripts/dev-server.py 4176 .
```

Then open `http://localhost:4176/explorations/section-summaries.html`.

## Test

```sh
node --test tests/*.test.mjs
```

Requires Node 22.7 or later. The tests need no network or key: the importer's tests use a made-up page in the source's structure, and the article tests check the Markdown reader, the notes checks, and the limits.

## Publish

Run `node scripts/version-assets.mjs` so browsers load changed files instead of cached ones, and copy `dist` to any static host. For Try your own article, run `server/server.mjs` with your key instead (see above).

## Fonts

Newsreader is by Production Type and is under the SIL Open Font License (see `dist/fonts/OFL.txt`). Pixelta, used for the series name in the dialog, is by Blankids Studio and is under its own license.

## Icons

The icons on the list cards are from [Lucide](https://lucide.dev) and are under the ISC license (see `dist/lucide-LICENSE.txt`). Only the icons the essay uses, and a general set that a pasted article's cards choose from, are copied into `dist/lucide-icons.js`.
