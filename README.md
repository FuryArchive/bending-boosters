# Bending Boosters

A browser game in one self-contained HTML file, built from the source in `src/`. It has two parts:

- **Pack simulator.** Open Avatar: The Last Airbender (TLA) Magic: The Gathering play boosters with play money. It includes real printing odds, Scryfall card images and prices, a collection binder, archetype decks, stats, an odds page and settings.
- **Journey.** A roguelike deckbuilder played with the set's cards. It has three Books (Water, Earth, Fire) of 15 floors each, a branching map with fights, shops, rests, events, treasure and bosses, Strike/Guard cards, a Flow multiplier, and Charms and Legends.

## Where this source came from

The original source files were lost. On 2026-11-07, `src/` was recovered from the shipped game, `~/Desktop/bending-boosters(4).html` (SHA-256 `433b99c5…e0d0ce`), by `tools/extract.mjs`.

Running `npm run build` reproduces that file **byte for byte**. All four existing test suites pass against the rebuilt file: 46 combat tests, 47 progression tests, 12 browser scenario groups and 10 visual/input groups.

The Journey code had been bundled with esbuild, and each module's original path survived in the bundle. Those modules were restored as real ES modules at their original paths (`src/engine/cards.js`, etc.), with their imports and exports recomputed by scope analysis. They load natively in Node, and esbuild can bundle them. The pack simulator was never modular: it was one inline script. It is now split into ordered files along its own section headers.

The three earlier builds are kept in [`history/`](history/README.md).

## Quick start

```bash
npm install            # dev tools only: acorn, eslint-scope, playwright (the game itself has no dependencies)
npm run build          # -> dist/bending-boosters.html  (open it in a browser)
npm test               # build + module check + all test suites (needs Chromium)
```

`npm run build` and `node tools/build.mjs` need nothing but Node 18+. The build never touches the copy on your Desktop. To ship a change, copy `dist/bending-boosters.html` over the Desktop copy yourself.

Saves live in the browser's `localStorage` under the keys `bendingBoosters.v1` (wallet, collection, settings), `bb.run` (the active Journey run), `bb.prices` and `bb.imgidx` (caches). They are unchanged from the shipped game. Depending on the browser, opening the game from a different file path can mean starting from a separate save.

## Layout

```
build.config.json        which file goes where, in what order (the build's only config)
src/index.html           page template: head, markup, and <!-- @slot name --> markers
src/styles/main/         main stylesheet, in cascade order (00-root … 17-decks)
src/styles/visual-edition.css   the Nov 2026 visual pass, loaded last as its own <style>
src/boosters/            the pack simulator: one classic script split into ordered sections
src/catalog/             data.json (cards: base/eternal/treat), decks.json, prices.json
src/data/  src/engine/   Journey content and rules engine (pure ES modules, no DOM)
src/ui/                  Journey UI: journey.js (screens), cardview, fx/backdrop, sfx, anim
src/ui/index.js          Journey entry point; its exports become the global `BBJ`
src/journey-recovery.js  runs after BBJ is defined: settles unpaid finished runs on load
tools/build.mjs          the build (zero dependencies)
tools/check-modules.mjs  static checks for the Journey modules
tools/extract.mjs        split a built HTML back into src/ (used for the recovery)
tools/capture.cjs        screenshots of every main screen -> test-output/screens/
tests/                   regression suites (see Tests)
history/                 the three shipped builds and what changed between them
```

## How the build works

`tools/build.mjs` fills each `<!-- @slot name -->` line of `src/index.html` with the parts listed for that slot in `build.config.json`, in order:

- **`styles`, `visual-edition`**: CSS files, joined as-is. Order is cascade order.
- **`boosters`**: the pack-simulator files, joined as-is into one `<script>`. They share one global scope, like the original single script, so a function defined in `03-state.js` is visible everywhere after it. The `{ "const": "DATA", "json": … }` entries turn each pretty-printed catalog file back into a one-line `const DATA = {…};`.
- **`journey`**: the Journey ES modules, assembled into the same esbuild-style IIFE that the game always used (`var BBJ = (() => { … })();`). For each module in `build.config.json` order, the build drops the leading `import` lines, removes the `export ` keyword and indents by two spaces. The `// src/...` comment lines in the output are part of the format, and the tests use them to find the engine.
- **`journey-recovery`**: a plain script appended after the bundle.

Every module ends up in **one shared scope**, so the Journey modules follow a few rules. Both the build and `npm run check` enforce them:

1. Top-level names must be unique across all Journey modules.
2. Use only `import { a, b } from "./x.js";` at the very top of the file, followed by exactly one blank line. No renaming, `default` or `* as` imports.
3. Write `export` only directly in front of a top-level `function`/`var`/`let`/`const`/`class`, at the start of the line.
4. List a new module in `build.config.json` after the modules its top-level code needs.
5. Remember that the build indents every line by two spaces, including lines inside multi-line template strings. This is invisible in HTML.

**Why not just run esbuild?** After the original esbuild build, later passes edited the bundle by hand: the bug-fix comments in the engine and the hand-written backdrop drawing code. Running esbuild would reformat those parts. It would still work (esbuild 0.28 bundles these sources fine), but the output would no longer match the shipped game exactly. Switching to esbuild later is a small change to the `journey` slot if you ever want it.

## Tests

| Command | What it runs |
|---|---|
| `npm run check` | Journey module rules (unique names, imports present, no writes to imports) |
| `npm run test:quick` | build, check, combat engine (46), progression rules (36; the browser part is skipped) |
| `npm test` | all of the above, plus the progression browser checks (47 total), `browser.test.cjs` (12 groups: packs, odds, resets, saves, recovery) and `visual.test.cjs` (10 groups: layouts from 320 px to 1440 px, touch and keyboard input, all 262 Journey cards) |
| `npm run screens` | screenshots of all main screens and Journey encounters into `test-output/screens/` |

The browser suites use Playwright with fresh, isolated profiles, muted audio and outside HTTPS blocked. They never touch your real saves. They use `/usr/bin/chromium` when it exists. Set `CHROMIUM_PATH=/path/to/chrome` to use another browser, or run `npx playwright install chromium` to use Playwright's own build.

`browser.test.cjs` checks 75 seeded booster openings against `history/1-original.html`, so pack odds can't drift by accident. `visual.test.cjs` checks that saves from `history/2-bugfixes.html` still resume.

## Known issues (not fixed in the recovery)

- At about 1440×1000, the backdrop's moon (`src/ui/fx.js`, the `bg.arc(W*.88, H2*.25, …)` line) sits behind the last empty charm slot. It shows through as a faint ghost circle on the map and shop screens.
- Empty charm slots read "Empty Joker slot" (`src/ui/journey.js`); everywhere else the game says Charm.
- Testing was done in desktop Chromium only, with phone layouts emulated. There has been no Safari/Firefox or real-device testing.
