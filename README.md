# Interfaces That Think

UI/UX experiments for new interactions. Each prototype lives in its own folder.

## Prototypes

- **[Text and Autocomplete](text-and-autocomplete/README.md)** — a document editor prototype with AI autocomplete, drag-to-resize, rephrasing, and sentence combining.
- **[Gmail Smart Compose](gmail-smart-compose/README.md)** — a recreation of Gmail's inline Smart Compose suggestions in a dark compose window, with no model or key needed.
- **[Reading Long Form](reading-long-form/README.md)** — Dario Amodei's essay *Machines of Loving Grace* as one long page, with reading ideas that emphasize, collapse, and summarize it from notes written once by Claude, and a server that reads your own article with GPT-6 Luna when you give it a key.
- **[Reading With More POV](reading-with-more-pov/README.md)** — Dan Koe's *How to fix your entire life in 1 day* in a minimal black layout, read alongside three AI readers (a skeptical researcher, your sarcastic buddy, and a founder coach), in three comment styles: Google Docs–style comments and emoji reactions on the document; the readers as animated characters on a couch at the bottom of the screen, hopping up to talk as you scroll; or their cursors moving through the margins with Figma-style cursor chat. Edit a reader and they read the article again in their new voice.

## Run locally

From the repository root, run any preview in its own terminal:

```sh
python3 text-and-autocomplete/scripts/dev-server.py
python3 -m http.server 4173 --directory gmail-smart-compose/dist
node reading-long-form/server/server.mjs
node reading-with-more-pov/server/server.mjs
```

Open `http://localhost:4174/` for Text and Autocomplete, `http://localhost:4173/` for Gmail Smart Compose, `http://localhost:4175/` for Reading Long Form, or `http://localhost:4177/` for Reading With More POV. Each prototype's README covers the rest, including API-key setup, tests, and Text and Autocomplete's live evaluation.

## Publish

Each prototype's `dist` folder is a complete static site: plain HTML, CSS, and ES modules with relative paths and no build step. Copy a `dist` folder to any static host, including a subfolder of an existing site. Development tooling (tests, scripts, evaluation) lives outside `dist` and is never published. Text and Autocomplete and Gmail Smart Compose also keep their hosting configuration in `.openai/hosting.json`.

## Tests and formatting

There are no dependencies to install. Run the tests with Node 22.7 or later:

```sh
node --test text-and-autocomplete/tests/*.test.mjs
node --test reading-long-form/tests/*.test.mjs
node --test reading-with-more-pov/tests/*.test.mjs
```

JavaScript and CSS are formatted with [Prettier](https://prettier.io/):

```sh
npx prettier@3.9.9 --single-quote --arrow-parens=avoid --print-width=100 --write "**/*.{js,mjs,css}"
```

HTML is formatted by hand, because whitespace inside an editable document becomes part of its text.

## License

The code is released under the [MIT License](LICENSE). If you use or build on these prototypes, crediting Tareq Ismail and linking to [Interfaces that think](https://tareqistyping.com/interfaces-that-think/) is appreciated.

The fonts in each prototype's `dist/fonts` folder are not covered by the MIT License. DM Sans and Newsreader are under the SIL Open Font License (see `OFL.txt` in those folders). Pixelta is by Blankids Studio and is under its own license.

*Machines of Loving Grace* is by Dario Amodei and is not covered by the MIT License. It is included in `reading-long-form/dist/index.html`, credited and linked to the original at [darioamodei.com](https://darioamodei.com/essay/machines-of-loving-grace).

*How to fix your entire life in 1 day* is by Dan Koe and is not covered by the MIT License. Its text and images are included in `reading-with-more-pov/dist`, credited and linked to the original [on X](https://x.com/thedankoe/status/2010751592346030461).
