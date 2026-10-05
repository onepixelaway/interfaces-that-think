# Text and Autocomplete

A document editor prototype from [Interfaces that think](https://tareqistyping.com/interfaces-that-think/), exploring new ways to write with AI: autocomplete, resizing text by dragging, rephrasing, and combining sentences. It runs in the browser on your own OpenAI API key.

## What you can do

Each feature can be turned on or off from the **Intelligence** menu.

- **Autocomplete.** Pause at the end of a paragraph to see a suggestion. Press Tab to accept it or Escape to dismiss it. With **Multiple tab autocomplete** (the default), press Tab again right after accepting to swap in the next of three alternatives.
- **Suggested paragraph.** In an empty paragraph, the editor drafts a paragraph in three writing styles. Press Tab to accept it, then Tab again to switch styles.
- **Drag to resize.** Select text and drag the handle at the end of the selection right or down to expand it, or left or up to shorten it (35–250%). The rewrite previews in place and is kept when you release. With the handle focused, arrow keys adjust, Enter keeps, Home returns to the original length, and Escape cancels.
- **Double-click to rephrase.** Double-click a selection for new wording. Keep double-clicking to step through alternatives, like a thesaurus.
- **Drag to combine.** Drag a selection onto another sentence to merge the two into one sentence. This works with a mouse only.

AI edits go through the browser's undo, so Undo restores the original. Documents are limited to 500 words and are not saved between visits.

## How it works

The app talks to [`gpt-realtime-2.1-mini`](https://developers.openai.com/api/docs/models/gpt-realtime-2.1-mini) over OpenAI's [Realtime WebSocket API](https://developers.openai.com/api/docs/guides/voice-websockets?api=realtime). Each request sends the whole document, which is limited to 12,000 characters, split at the caret or selection, with no conversation history. Your key goes only from your browser to OpenAI, which returns a short-lived token for the session. The primary key is used in memory for the connection request and is not saved in localStorage or sessionStorage. Disconnecting or reloading requires entering it again; refreshing no longer reconnects automatically. **Clear key** clears the input and disconnects. Earlier versions saved a key in localStorage: opening this version of the editor or evaluation page attempts to delete only that legacy entry, without reading or using it. If browser storage blocks deletion, the page asks you to clear this site's data in browser settings. Other site data is left alone.

Memory-only handling avoids keeping the key between visits; it does not protect a key in use from scripts running on the page, browser extensions with access, or a compromised browser. If you host the prototype, give it its own origin (such as a subdomain) rather than a folder of a site that runs other scripts. There are no external scripts, fonts, or analytics.

In browsers that support WebMCP, the page also registers an `update_document` tool so a browser agent can replace the document. That tool sends nothing to OpenAI.

Language models can't count characters reliably, so when resizing, the app measures each draft. If it misses the dragged length by more than 15 characters, the app asks for several versions at different lengths and keeps the closest.

| File in `dist` | What it does |
| --- | --- |
| `app.js` | Editor, autocomplete, and connect dialog |
| `compose-core.js` | Autocomplete and suggested-paragraph prompts, and checks on replies |
| `rewrite-core.js` | Resize and rephrase prompts, and the length-measuring loop |
| `combine-core.js` | Combine prompt and sentence handling |
| `selection-rewrite.js`, `rewrite-preview.js` | Resize handle and in-place previews |
| `selection-combine.js` | Drag-to-combine interaction |
| `realtime.js` | WebSocket connection to OpenAI |
| `key-storage.js`, `diagnostics.js` | Legacy key cleanup and debug log |

## Run

```sh
python3 scripts/dev-server.py
```

Open `http://localhost:4174/` and connect with your own OpenAI API key. Its project needs access to `gpt-realtime-2.1-mini` and API billing. Any static server pointed at `dist` also works.

## Test

```sh
node --test tests/*.test.mjs
```

Requires Node 22.7 or later. The tests use a fake connection, so they need no key and cost nothing.

## Publish

Run `node scripts/version-assets.mjs` so browsers load changed files instead of cached ones, then copy `dist` to any static host, including a subfolder of an existing site. Everything the app needs is in `dist`.

## Evaluate autocomplete

`eval/` holds 24 development cases and 12 held-out cases that run Tab autocomplete (one suggestion per request) against the real model. With the dev server running, open `http://localhost:4174/eval/`. Enter a key directly in the evaluation page for each run; it is kept in memory until the run finishes and is cleared on completion, failure, or stopping. API usage is billed to that key. To save results, also run `node scripts/eval-results-server.mjs` and click **Save report locally**; reports go to `eval/runs/`. To compare with an older version, copy its JavaScript modules into `eval/baseline/`; without them, **Both versions** runs only the current one and says so. Git ignores both folders.

## Debug log

**Save debug log**, below the page, downloads the last 1,200 events from the current tab: requests, validation results, and why suggestions were shown or hidden. Text snippets are capped at 800 characters, key-like strings are redacted, and nothing is uploaded. In the console, `window.textAndAutocompleteDebug.snapshot()` returns the log.
