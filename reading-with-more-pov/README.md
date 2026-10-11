# Reading With More POV

A reading prototype from [Interfaces that think](https://tareqistyping.com/interfaces-that-think/): you read an article alongside a panel of AI readers who comment on it, argue with each other, and react with emoji, either as comments on the document or as a group reading along with you, on a couch at the bottom of the screen or as cursors in the margins. The article is Dan Koe’s [How to fix your entire life in 1 day](https://x.com/thedankoe/status/2010751592346030461) (January 2026), shown with its cover and graphics in a minimal black layout, somewhere between X and Medium, set in DM Sans. The byline, the top bar, and a closing note link to the original.

What the default readers say was written once by Claude and is stored with the page, so reading needs no API key. To change who the readers are, run the prototype’s server with an OpenAI API key (see [Change the readers](#change-the-readers)).

## The readers

Three AI characters read the article, each with their own personality:

- 🔎 **Professor**, skeptical researcher: checks the article against prior work (studies, books, history, the original sources of its ideas) and says whether it supports a claim, complicates it, or rejects it.
- 😏 **Buzz**, your buddy: sarcastic, funny, and on your side. Talks about you far more than himself, and roasts you like a good friend would.
- 🧭 **Coach**, founder mentor: relates the article to running a company (“As CEO, …”, “For a founder, consider …”) and turns it into one concrete thing to try, friendly and understanding.

Under Readers, the Reading mode menu turns each reader on or off. Hiding a reader hides their reactions and the threads and remarks they started, replies and all.

Between them they leave 30 discussions and 50 reactions in document style, and 44 short remarks for the live styles. Many discussions and remarks are threads where the readers reply to each other.

## Three comment styles

The **Reading mode** menu in the top bar picks how the readers show up, under Comment style; it starts on Reading couch. Each style has its own options, greyed out while another style is chosen.

### Document style comments

The comments live on the document, like annotations.

- **Read the discussions.** Words the readers commented on have a faint underline. Hover to see who commented; click (or focus and press Enter) to open the discussion in a panel on the right: the words, then each thread as a chain of replies, like a post on X, with “Replying to” where a reader answers another. The arrows step through every discussion in order, and Escape closes the panel. The page makes room for the panel and keeps the words you clicked where they were. On a phone the panel slides up as a sheet.
- **See the reactions.** Only this part comes from Google Docs: emoji reactions sit in the right margin, level with the words they react to, as chips with an emoji and a count. Hover a chip to light up the words (in a faint version of Docs’ yellow) and see who reacted. When the margin is too narrow, as on a phone or with the panel open, the chips sit inline after the words.
- **React yourself.** Click a chip to add your reaction to it, or click your own (marked in blue) to take it back. Or select any words in the article and a smiley appears in the margin, as in Docs; pick one of ten emoji to react to those words.
- **Choose what’s shown.** Under Document style comments, the menu turns comments and emoji reactions on or off.

### Reading couch and reading cursors

The two live styles should feel like a group of people reading the article with you. They share how the readers talk; they differ in where the readers are.

- **They talk about the line you’re on.** A dot in the left margin marks the line in focus, at the reading line, 30% of the way down the screen; it rides along with that line as you scroll, then moves to the next. Words a reader has a remark about are faintly underlined. The remark shows the moment the dot reaches the line before those words, stays while the dot is on them or the line after, and comes down as soon as the dot moves on, while the underline stays. Scroll back and it shows again. On the reading couch, when a reader starts talking, the dot pops in as a small portrait of their face, tilting as it reads the line, and turns back into a dot as soon as the line moves off the words they’re talking about, or after 2.2 seconds at most.
- **One remark per line, two at a time.** Words get one remark at most, always said to you: 44 lines in all, 24 of them Professor’s, 11 Buzz’s, and 9 Coach’s, so the jokes and the founder advice stay occasional. Remarks are short (20 words at most), unlike the document comments. At most two readers talk at once; another waits for one to finish.
- **They react.** With the style’s Emoji reactions on, the readers’ reactions come as you pass the words they reacted to.

#### Reading couch

The readers sit on a couch across the bottom quarter of the screen, over a fade to black, facing the article. You’re behind a fluffy couch (three plump back cushions joined by thin seams, each centered on its reader, and rolled arms), so its back is in front and you see the tops of their heads, as animated SVG characters in flat colors (each a shade of their bubble: Professor gray, Buzz light blue, Coach gold), with eyes only and an accessory each:

- **Professor** is a gumdrop with round glasses and a raised brow.
- **Buzz** is a rounded bot in a backwards cap, with a wink. From behind you see the brim; turned around, the strap on his forehead.
- **Coach** is a soft bean with a sprout growing out of their head, a sweatband, and smiling eyes.

They jump onto the couch from off screen when the row appears (Professor and Coach in an arc from their sides of the screen, Buzz up from below), and while they read they sway, breathe, and blink, with Buzz’s cap and Coach’s sprout bobbing along. When one has something to say, they hop up, turn a little toward you (their face slides into view, looking toward the middle of the couch), and the bubble shows over their head; when it’s done they turn back to the article. A reaction pops up as a thought bubble by the reader’s head, with two small bubbles leading up to it, and fades. Each reader has a lane of their own, 170 pixels wide with a 12-pixel gap between lanes; their bubble stays over them in it, and at the ends of the couch a long bubble can reach outward past it, so bubbles never overlap. Each default reader’s bubble has its own look, with an icon and a label in place of their name: Professor’s is gray, labeled Fact check with a book; Buzz’s is blue, labeled LOLZ with a laughing face; Coach’s is gold, labeled Advice with a light bulb. Anyone else’s is blue with their name. Professor’s remarks name the research behind them, and the bubble has a More button that opens it: who did the work, what they found, and how it bears on the claim. An open bubble stays until you close it, even once you’ve scrolled past, and Professor waits to say anything else until you do. A reader added from the menu takes whichever of the three shapes is free, in their own color, and each reader’s name sits on the couch below them.

#### Reading cursors

Each reader has a cursor, like a collaborator’s in Figma: an arrow in a bright version of their color with their name on a tag. Professor and Coach keep to the right margin and Buzz to the left. While they read, the cursors drift in their margins near the reading line, picking a new spot every few seconds, and glide there on a soft spring.

When a reader has something to say, their cursor moves to the edge of the sentence, which lights up in their color as if hovered, and the tag turns into cursor chat with their remark, out in the margin so it doesn’t cover the text. A reaction shows as cursor chat with just the emoji. Two cursors chatting on the same side stack, the later one below the earlier one’s chat, and idle cursors move out of the way. If the sentence scrolls off screen, the cursor lets it go. When the margin is too narrow, as on a phone, the cursors sit at the screen’s edges and their chat opens inward, over the text.

Your choices, your reactions, and any readers you change are kept in this browser’s localStorage.

## Change the readers

Each reader in the Reading mode menu has an edit button. A reader has a name, a role, and a description of who they are and how they read.

A new name shows at once. A new role or description means the reader reads the article again: the server sends their description, the article, and the other readers’ threads to OpenAI’s GPT-6 Luna (`gpt-6-luna`, at medium reasoning effort), which writes 6 to 10 comments, 2 to 5 replies to the others, 6 to 12 reactions, and 10 to 16 short remarks for the live styles, in that reader’s voice. It takes a minute or two; you can close the dialog and keep reading, and the menu shows who’s reading. The page checks the reply against the article, keeping only comments, reactions, and remarks whose words it finds and replies to threads it offered, then replaces everything that reader said before.

**Reset** in the menu brings back the three readers and what they first said. **Remove reader** in the dialog takes one off the panel.

### Run it with your own key

Run the commands in this README from the `reading-with-more-pov` folder.

```sh
OPENAI_API_KEY=sk-… node server/server.mjs
```

Or keep the key in a `.env` file, which git ignores: copy `.env.example` to `.env`, fill in the key, and run:

```sh
node --env-file=.env server/server.mjs
```

Then open `http://localhost:4177/`. The key stays on the server and never reaches the browser. Use a key just for this, with a spending limit on its project. Without a key, or on a static host, everything works except reading again, and the dialog says why.

The prompt lives on the server, in `server/prompts.mjs`, and the server reads the article from `dist/index.html` itself, so the page sends only the reader and the other threads. To limit abuse:

- Each visitor can have readers read again 10 times, counted by a random id in an HttpOnly cookie, and each IP address 30 times, so clearing the cookie doesn’t reset the count. Everyone together gets 300 a day. A reading that fails is given back, unless the page closed partway through, since the model may already have done the work.
- A reader’s fields and the threads sent along are cut to fixed lengths, and the request body to 200 KB.
- A reply the model cut short or refused counts as a failure, and closing the page mid-reading stops the model call.
- Browsers refuse to send these requests from other sites. Scripts outside a browser can still call the route, which is what the limits are for.

Counts are kept in memory and reset when the server restarts. Behind a proxy, set `TRUST_PROXY=1` so it counts the visitor’s address (the last one in `X-Forwarded-For`), and make sure the server’s port can only be reached through the proxy. Settings, all optional except the key:

| Variable | Default | |
| --- | --- | --- |
| `OPENAI_API_KEY` | | Required for readers to read again |
| `OPENAI_MODEL` | `gpt-6-luna` | |
| `OPENAI_BASE_URL` | `https://api.openai.com/v1` | |
| `READINGS_PER_VISITOR` | `10` | |
| `READINGS_PER_ADDRESS` | `30` | |
| `READINGS_PER_DAY` | `300` | For everyone together |
| `PORT` | `4177` | Or pass it after the script |
| `HOST` | `127.0.0.1` | `0.0.0.0` to listen on every address |
| `TRUST_PROXY` | off | `1` behind a proxy that sets `X-Forwarded-For` |

## How it works

The page is plain HTML, CSS, and ES modules with no build step, external scripts, fonts, or analytics. It makes no network requests beyond its own files, except to its own server when a reader reads again.

The article lives in `dist/index.html`, between the `article:start` and `article:end` markers, with its text and images unchanged. Comments and reactions are attached to a quote: the article’s exact words, usually one sentence. A quote is found by its words (curly and straight quotes, and runs of spaces, count as the same), so it must appear exactly once in the article; your own reactions also remember which paragraph they’re in.

| File in `dist` | What it does |
| --- | --- |
| `index.html` | The article, top bar, Reading mode menu, discussion panel, and dialogs |
| `style.css` | The black theme, type, reactions, panel, and dialogs |
| `app.js` | Marking the article, the reactions margin, the discussion panel, reacting, the menu, and editing readers |
| `focus.js` | The line in focus, which the live styles talk about |
| `reading-dot.js` | The reading dot that marks the line in focus, and becomes a reader’s face |
| `live.js` | The live styles: when each reader speaks or reacts as you scroll |
| `row.js` | Reading couch: the couch, the readers’ lanes, hops, turns, speech bubbles, and floating reactions |
| `critters.js` | The three characters on the couch, as SVG |
| `cursors.js` | Reading cursors: the readers’ cursors, how they move, and cursor chat |
| `readers.js` | The three readers, and the emoji you can react with |
| `panel-notes.js` | What the readers said in document style: threads and reactions, each on a quote |
| `live-notes.js` | What the readers say in the live styles: short remarks, each on a quote |
| `notes.js` | Putting together what every reader said, and checking a new reading |
| `anchors.js` | Finding a quote in the article and marking it |

The server, in `server/`, has no dependencies: `server.mjs` serves `dist` and the reading route, `article.mjs` reads the article’s text from the page, `prompts.mjs` holds the instructions and reply shape, and `limits.mjs` counts readings.

## Run

```sh
node server/server.mjs
```

Open `http://localhost:4177/`. Any static server pointed at `dist` also works, as does `python3 scripts/dev-server.py`.

## Test

```sh
node --test tests/*.test.mjs
```

Requires Node 22.7 or later, with no network or key: the server tests run the real server against a stand-in for OpenAI. They check that every quote is found exactly once in the article, that every comment, reaction, and remark is by a known reader, that remarks are short, that a new reading is checked against the article and replaces the old one, and that the server’s limits hold.

## Publish

Run `node scripts/version-assets.mjs` so browsers load changed files instead of cached ones, and copy `dist` to any static host. For readers to read again, run `server/server.mjs` with your key instead (see above).

## Credits

*How to fix your entire life in 1 day* is by [Dan Koe](https://x.com/thedankoe) and is not covered by the MIT License. Its text, cover, and graphics appear in `dist`, credited and linked to the original. The readers are AI characters; Dan didn’t write or review what they say.

DM Sans is by the DM Sans Project Authors and is under the SIL Open Font License (see `dist/fonts/OFL.txt`). Pixelta, used for the series name, is by Blankids Studio and is under its own license.
