# M3a Set Packages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every card set the game ships becomes a package in `src/sets/<code>/`. TLA moves there first and packs stay identical. The pack simulator then works for any number of packages: a set picker, set accents, and a per-set binder, odds, stats and decks.

**Architecture:**
- The build reads each package (`set.json`, `cards.json`, `prices.json`) and inlines all of them as one constant, `SET_PACKAGES`, in the pack-simulator script.
- TLA's booster slot model moves from code into `set.json` as data. The pack simulator rolls packs, indexes cards and builds every screen from that registry.
- A small fixture package, `tests/fixtures/sets/tst/`, is added only to test builds (`--with-set`). It proves two sets work before TMT exists.

**Tech Stack:**
- Plain JS (the classic pack-simulator script plus the Journey ES modules), no new dependencies.
- `tools/build.mjs`, `node:test`, Playwright 1.64.1 with Chromium.

**Spec:** `docs/superpowers/specs/2026-11-07-bending-boosters-design.md`, section 6 ("Set package", "UI"). Also read `README.md` ("How the build works") and `AGENTS.md`.

**M3 is three plans.** Section 6 covers three pieces of work. Each one ships working software on its own, and each plan is written when the previous one lands (the way section 11 treats milestones):

| Plan | Contents | Ends with |
|---|---|---|
| **M3a Set packages** (this plan) | Package format; TLA moved; booster model as data; multi-set pack simulator (set picker, accents, per-set binder, odds, stats and decks) | TLA works exactly as before from its package; a test-only second package proves two sets |
| M3b TMT packs | `npm run import-set <code>`; the TMT package (cards 1–190 plus showcase sheets, the PZA "Source Material" bonus sheet, prices, Play Booster odds); TMT openable in the pack shop and collectable | Friends can open TMT packs |
| M3c TMT in Journey | `docs/card-encoding-guide.md`; full TMT curation (Sneak, Ninjas, Mutagen tokens, Alliance, Disappear); validation; review report; simulation; TMT mechanics and theme | Spec §6 M3 exit: TMT playable in Journey under its theme, mixed TLA+TMT runs under neutral |

Facts checked on Scryfall on 2026-11-08 for M3b/M3c:
- TMT "Teenage Mutant Ninja Turtles", released 2026-03-06, 320 printings. The main set is numbers 1–190: 67 common, 55 uncommon, 53 rare, 15 mythic.
- PZA "Source Material" (20 masterpieces) and TMC "Eternal" (132) are its child sets.

## Global Constraints

- **Pack parity:** the 75 seeded TLA openings must still match `history/1-original.html`. `tests/browser.test.cjs` already checks this; it must pass unchanged. Pool contents, pool order and the number of `rnd()` calls per pack stay exactly as they are today.
- **Journey parity:** `tests/legacy-parity.test.cjs` and every other existing suite pass unchanged.
- **Card keys** stay `SET:number`. The save keys `bendingBoosters.v1`, `bb.run`, `bb.prices` and `bb.imgidx` keep their names. The only new save field is `S.settings.packSet`; there are no new localStorage keys.
- **Economy numbers** (pack price, box price, sell rate) stay in `src/economy/config.js`. There are no per-set prices in M3a.
- **Package JSON files** are pretty-printed with one record per line, like today's `src/catalog/*.json`. The build minifies them.
- **One set looks like today:** with only one package, the pack shop, binder, odds and decks pages show no set picker and read as they do now. Pickers appear only with 2+ packages.
- **Code layout:** pack-simulator files stay one classic script (`src/boosters/*.js`, shared globals). New logic there is plain functions; the Journey module rules (README) still apply to `src/engine`, `src/ui` and `src/sets/**/*.js`.
- **Desktop copy:** tooling never writes to it.
- **Commit messages** end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Decisions beyond the spec (owner confirms in plan review)

1. **M3 is split into M3a, M3b and M3c** as in the table above.
2. **`cards.json` keeps today's `{ base, eternal, treat }` shape** rather than the spec's flat list of printings with a `sheet` field. The shape already names every printing, and keeping it guarantees pack parity. M3b may flatten it if TMT needs that; the importer writes whichever shape M3b settles on.
3. **The archetypes and the "standard decks" move into `set.json`** (`archetypes`, `decks`), and `src/catalog/decks.json` goes away. The Journey `TLA_SET` record stays in `src/sets/tla/set.js`; a test keeps its code and name equal to `set.json`'s.
4. **Pool sources get generic names:**
   - `{src:"allied"}` → `{src:"names", sheet:"allied lands"}`: the base printings named on a sheet;
   - `{src:"basic"}` → `{src:"nums", sheet:"default basic"}`: the base printings numbered on a sheet;
   - the `excl` flag → `exclSheet:"allied lands"`.

   They select exactly the same cards in the same order.
5. **Free packs open the set picked in the pack shop.** This is how "the player picks the set when claiming" (spec §3) arrives for the starter gift and daily pack.
6. **Eternal printings never count as "owned any printing" for the NEW badge.** That rule was `c.set === "TLE"`; it becomes `c.treat === "etern"`, which is the same for TLA.

## Review Focus

1. **A save holds cards from a set this build doesn't ship** (from a newer build, or after a set is removed). Collection value, the binder, "Sell all extras", stats and pull history must skip those keys without crashing and without deleting them. *Pinned in Task 3 ("unknown set keys are kept and ignored").*
2. **`S.settings.packSet` names a set this build doesn't have.** The shop must fall back to the first package and open packs normally. *Pinned in Task 4.*
3. **The same seed gives the same TLA packs when a second package is present.** Per-set pool caches must not share keys, and adding a set must not change TLA's `rnd()` sequence. *Pinned in Task 2 (multi-set build vs normal build, same seed).*
4. **A cached image index from a one-set build is reused after a set is added.** It must refresh, or the new set's cards never get images. *Pinned in Task 3 (`imgCacheFresh` false when the codes differ).*
5. **Two sets share a card name** (common for reprints such as Negate). Star-protected selling must count copies across both sets by name and never drop a Journey card's stars. *Pinned in Task 3 (fixture card with a TLA run card's name).*

---

## File map

| File | Responsibility |
|---|---|
| `src/sets/tla/set.json` | **new.** `code, name, released, scryfall, accent, symbol, archetypes, decks`; from Task 2 also `sheets`, `products` |
| `src/sets/tla/cards.json` | **moved** from `src/catalog/data.json` (same shape) |
| `src/sets/tla/prices.json` | **moved** from `src/catalog/prices.json` |
| `src/catalog/decks.json` | **removed** (moved into `set.json`) |
| `tests/fixtures/sets/tst/{set,cards,prices}.json` | **new.** 9-card test set, only in test builds |
| `tools/build.mjs` | `{ "sets": [...] }` part → `const SET_PACKAGES = […];`; `--with-set <dir>` |
| `tools/extract.mjs` | writes `SET_PACKAGES` back to `src/sets/<code>/*.json` |
| `src/boosters/00b-packages.js` | **new.** pack-side registry: `PKG`, `MAIN_SET`, `PRICES`, `pkgOf`, `pkgBase`, `pkgEternal`, `pkgSpecials` |
| `src/boosters/02-card-pools.js` | pools and slots read from the package; `pool(spec, code)`, `slotsOf(code)` |
| `src/boosters/05-images.js` | `scryfallQuery(codes)`, `imgCacheFresh(cache, codes)` |
| `src/boosters/08-card-render.js`, `12-collection.js`, `16-decks.js`, `09-opening.js`, `13-odds-model.js`, `14-stats.js`, `17-journey-mount.js` | cross-set lookups and per-set screens |
| `src/boosters/15-header.js`, `src/index.html` | header subtitle, pack shop set picker, pack title and accent |
| `src/styles/set-packages.css` | **new.** set picker and accent styles |
| `src/ui/journey.js` | pair names per set (`L.pairNames[code]`) |
| `tests/unit/build.test.mjs` | **new.** build output for packages |
| `tests/sets.test.cjs` | **new.** browser suite on a multi-set test build |
| `docs/set-package.md` | **new.** the package format and the checklist for adding a set's pack side |
| `build.config.json`, `package.json`, `README.md`, `AGENTS.md` | config, scripts, docs |

---

### Task 1: Set packages in the build; TLA moved

**Files:**
- Create: `src/sets/tla/set.json`, `src/boosters/00b-packages.js`, `tests/fixtures/sets/tst/set.json`, `tests/fixtures/sets/tst/cards.json`, `tests/fixtures/sets/tst/prices.json`, `tests/unit/build.test.mjs`
- Move: `git mv src/catalog/data.json src/sets/tla/cards.json`, `git mv src/catalog/prices.json src/sets/tla/prices.json`. `src/catalog/decks.json` is deleted after its content moves into `set.json`.
- Modify: `tools/build.mjs`, `tools/extract.mjs`, `build.config.json`, `README.md` (Layout, "How the build works"), `AGENTS.md` (the catalog rule now names `src/sets/*/*.json`)

**Interfaces:**
- Produces:
  - **`src/sets/tla/set.json`:**
    - `code "TLA"`, `name "Avatar: The Last Airbender"`, `released "2025-11-21"`;
    - `scryfall: ["tla", "tle"]`, `accent "#e8c25a"`, `symbol "TLA"`;
    - `archetypes` = today's `decks.json` `arch` and `decks` = today's `std`, both verbatim, in order.
  - **Fixture `tests/fixtures/sets/tst/set.json`:**
    - `code "TST"`, `name "Test Set"`, `released "2026-01-01"`, `scryfall: []`, `accent "#7fc8a9"`, `symbol "TST"`, `archetypes: []`, `decks: []`.
    - Its `cards.json` = `{ base: [...], eternal: [], treat: {} }` with 9 TST cards: numbers 1–4 `C`, 5–6 `U`, 7–8 `R`, 9 `M`. Each has `col`, `cost`, `type`, `kw: []`, `artist "Fixture"`.
    - Card 1 is named exactly like the TLA common "Otter-Penguin" (Review Focus 5).
    - Its `prices.json` = `{ "date": "2026-01-01", "m": { "TST:9": [12.5, 20] } }`.
  - **Build part** `{ "sets": ["src/sets/tla"] }` in the `boosters` slot emits one line:

    ```
    const SET_PACKAGES = [{...set.json, cards: <cards.json>, prices: <prices.json>}, ...];
    ```

    - It fails with `"<dir>: missing set.json"` when a file is missing, and with `"duplicate set code <CODE>"` on duplicate codes.
    - `node tools/build.mjs --with-set <dir> [--out <file>]` appends extra package dirs to every `sets` part.
  - **`src/boosters/00b-packages.js`** (classic script, placed right after the `sets` part):
    - `const PKG` (code → package) and `const MAIN_SET` (the first package's code);
    - `const DATA = PKG.TLA.cards`, `const DECKS = { arch: PKG.TLA.archetypes, std: PKG.TLA.decks }` (temporary names, removed in Task 3);
    - `const PRICES = { date: <MAIN_SET's date>, m: <every package's prices merged> }`.
  - `tools/extract.mjs` turns a `const SET_PACKAGES = …;` line back into `src/sets/<lowercase code>/set.json`, `cards.json` and `prices.json`, pretty-printed one record per line.

- [ ] **Step 1: Write the failing tests** `tests/unit/build.test.mjs`. Use the exported `build(dir, { withSets })`, and add that option to `build`'s signature.
```js
test('the build inlines every set package once', () => {
  const { html } = build();
  const line = html.match(/^const SET_PACKAGES = (.*);$/m);
  assert.ok(line);
  const pk = JSON.parse(line[1]);
  assert.deepEqual(pk.map(p => p.code), ['TLA']);
  assert.equal(pk[0].cards.base.length, 286);
  assert.equal(pk[0].archetypes.length, 10);
  assert.equal(pk[0].decks.length, 6);
  assert.ok(pk[0].prices.m['TLA:1']);
  assert.doesNotMatch(html, /^const (DATA|DECKS|PRICES) = \{/m);
});
test('--with-set adds a test package after the shipped ones', () => {
  const { html } = build(undefined, { withSets: ['tests/fixtures/sets/tst'] });
  assert.deepEqual(JSON.parse(html.match(/^const SET_PACKAGES = (.*);$/m)[1]).map(p => p.code), ['TLA', 'TST']);
});
test('a package without set.json, or a repeated code, stops the build', () => {
  assert.throws(() => build(undefined, { withSets: ['tests/fixtures'] }), /missing set\.json/);
  assert.throws(() => build(undefined, { withSets: ['src/sets/tla'] }), /duplicate set code TLA/);
});
```
- [ ] **Step 2:** Run `npm run test:unit`. Expected: FAIL (no `SET_PACKAGES` line).
- [ ] **Step 3: Implement.**
  - Move the files and write `set.json` and the fixture.
  - Implement the `sets` part, `--with-set` and `00b-packages.js`.
  - In `build.config.json`, replace the `DATA`/`DECKS`/`PRICES` parts with `{ "sets": ["src/sets/tla"] }` followed by `"src/boosters/00b-packages.js"`.
  - Update `extract.mjs`, the README and AGENTS.md.
- [ ] **Step 4: Verify.**
  - `npm test`: everything green, including `browser.test.cjs` "75 seeded packs match original".
  - `node tools/extract.mjs dist/bending-boosters.html --out /tmp/x`, then for each of `set.json`, `cards.json` and `prices.json`, `node -e` deep-compares `/tmp/x/src/sets/tla/<f>` with `src/sets/tla/<f>`: equal.
- [ ] **Step 5:** Commit: `feat(sets): set packages in the build; TLA moves to src/sets/tla`.

---

### Task 2: The booster model as data

**Files:**
- Modify: `src/sets/tla/set.json` (adds `sheets`, `products`), `tests/fixtures/sets/tst/set.json` (adds `sheets: {}`, `products`), `src/boosters/02-card-pools.js`, `src/boosters/09-opening.js`, `src/boosters/13-odds-model.js` (reads `slotsOf(MAIN_SET)`)
- Create: `tests/sets.test.cjs` (browser suite on a multi-set build; it grows in Tasks 3–5), and add it to `package.json` `test`, after `journey-sets`

**Interfaces:**
- Consumes: `PKG`, `MAIN_SET` (Task 1).
- Produces:
  - **`set.json` `sheets`:** today's `TREAT_INFO`, verbatim: `{ "scene cards": { "id": "scene", "label": "Scene", "cls": "bl" }, … }`, in the same key order.
  - **`set.json` `products.play`:**
    - `{ "title": "The Last Airbender", "label": "Play Booster", "note": <today's odds-page source note as HTML>, "slots": [...] }`;
    - each slot is `{ id, n, label, foil?, base: spec, rep: [[p, spec] | [p, spec, true], ...] }`, today's `SLOTS` written out in order, with `SPECIALS()` expanded in place;
    - spec forms: `{src:"base", r, exclSheet?}`, `{src:"eternal"}`, `{src:"names", sheet}`, `{src:"nums", sheet}`, `{src:"treat", sheet, r?}`.
  - **Fixture `products.play`:**
    - `{ "title": "Test Set", "label": "Play Booster", "note": "Fixture.", "slots": [...] }`;
    - common ×3 (base C); uncommon ×1 (base U); rare ×1 (base R, `rep [[0.25, {src:"base", r:"M"}]]`); foil ×1 (`foil: true`, base C).
  - **`02-card-pools.js`:**
    - `pool(spec, code = MAIN_SET)` caches by `code + JSON.stringify(spec)`;
    - `slotsOf(code) -> slot[]`; `const SLOTS = slotsOf(MAIN_SET)` stays, for the code that still reads it;
    - `rollSlot(slot, forceMythic, code = MAIN_SET)`;
    - `treatCards(sheet, code = MAIN_SET)`; `TREAT_INFO` becomes `PKG[MAIN_SET].sheets`.
  - **`09-opening.js`:** `openPack(code = MAIN_SET)` rolls `slotsOf(code)`. Everything else is unchanged.

- [ ] **Step 1: Write the failing browser test** `tests/sets.test.cjs`. Use the same harness style as `friends-beta.test.cjs`, and build `test-output/multiset.html` with `node tools/build.mjs --with-set tests/fixtures/sets/tst --out test-output/multiset.html` at the start. Group **"TST packs follow its own slots; TLA packs are unchanged"**:
```js
// normal build, seed PARITY-M3: 20 TLA packs -> a
// multi-set build, same seed: 20 TLA packs -> b; assert.deepEqual(b, a)  (same keys, foils, slots)
// multi-set build: 50 packs of openPack('TST'):
//   every key starts with 'TST:'; each pack has 6 cards; slot ids in order common×3, unc, rare, foil;
//   the 'foil' slot card is foil; rare-slot cards are R or M; at least one M among the 50.
```
- [ ] **Step 2:** Run `npm run build && node tests/sets.test.cjs`. Expected: FAIL (`openPack('TST')` still rolls TLA slots).
- [ ] **Step 3: Implement.**
  - Move the slot data into `set.json`.
  - Turn the hard-coded `SLOTS`, `SPECIALS` and `TREAT_INFO` into reads from the package.
  - Rename the pool sources as in Decision 4.
- [ ] **Step 4: Verify.**
  - `npm test`: green, including "75 seeded packs match original" and the odds page groups.
  - `node tests/sets.test.cjs` → `PASS`.
- [ ] **Step 5:** Commit: `feat(sets): booster slots and sheets come from set.json`.

---

### Task 3: Cross-set cards, prices, images and Journey catalog

**Files:**
- Modify: `src/boosters/00b-packages.js`, `02-card-pools.js`, `05-images.js`, `08-card-render.js` (`findCard`), `09-opening.js` (`ownedAnyName`), `12-collection.js` (`specList`, `ownedName`), `16-decks.js` (`NAME_KEYS`, `DECKS`), `17-journey-mount.js`, `src/ui/journey.js` (`pairNames` per set), `tests/sets.test.cjs`, `tests/unit/sets.test.mjs`

**Interfaces:**
- Consumes: Tasks 1–2.
- Produces (pack side; `DATA` and `DECKS` are removed):
  - `pkgOf(code) -> package | null`
  - `pkgBase(code) -> card[]`: base printings
  - `pkgEternal(code) -> card[]`: eternal printings, each with `treat: "etern"`
  - `pkgSpecials(code) -> card[]`: today's `specList()` per set
  - `ALL_BASE`: every package's base, in package order
  - `findCard(key)`: indexes every package's base, eternal and specials
  - `NAME_KEYS` covers every package's base and specials; `owned(name)` therefore counts copies across sets
  - `ownedName(name, code)`: `code` is a package code, or an eternal set code such as `"TLE"`
  - `ownedAnyName(c)` ignores `c.treat === "etern"` (Decision 6)
- Images:
  - `scryfallQuery(codes: string[]) -> string`: for `["tla","tle"]` it gives `(set:tla or set:tle)`
  - the index fetch uses every package's `scryfall` codes
  - `imgCacheFresh(cache, codes) -> boolean`: false unless `cache.v === 2`, the cache is under 14 days old, and `cache.codes` equals the codes, in any order. New caches store `codes`.
- Mount:
  - `BASE` for Journey (`L.BASE`) = `ALL_BASE`;
  - `ownership` printings = every package's base + specials + eternal;
  - `pairNames: { [code]: { [pairId]: name } }` from each package's `archetypes`.
  - `journey.js` reads `L.pairNames[su.sets[0]]` when exactly one set is selected.

- [ ] **Step 1: Write the failing tests.**
  - `tests/unit/sets.test.mjs`:
```js
test('the Journey TLA set record matches its package', () => {
  const pkg = JSON.parse(fs.readFileSync(new URL('../../src/sets/tla/set.json', import.meta.url), 'utf8'));
  assert.deepEqual([TLA_SET.code, TLA_SET.name], [pkg.code, pkg.name]);
});
```
  - `tests/sets.test.cjs` (multi-set build):
    - **"cards from every set are found and priced":** `findCard('TST:9').name` is the fixture mythic. `priceOf(findCard('TST:9'), true) === 20`. `findCard('TLE:1')` still works. `scryfallQuery(['tla','tle'])` equals `'(set:tla or set:tle)'`.
    - **"image cache refreshes when the sets change":** `imgCacheFresh({ v: 2, t: Date.now(), codes: ['tla','tle'], m: {} }, ['tla','tle'])` is true; with `['tla','tle','tst']` it is false; a cache with no `codes` is false.
    - **"a shared name shares stars":** with 7 copies of `TLA:<Otter-Penguin num>` and 5 of `TST:1` in `S.coll`, `owned('Otter-Penguin') === 12`. `sellExtrasPlan(null).plan` sells no copy of either key while `keepJourney` is 12.
    - **"unknown set keys are kept and ignored":** in the *normal* build, set `S.coll['TMT:5'] = 3`, `S.foil['TMT:6'] = 1` and a pull-history entry `'TMT:5@common'`. Then `collectionValue()`, `renderCollection()`, `renderStats()`, `sellList(sellExtrasPlan(null).items)` and `showView('decks')` all run without page errors, and `S.coll['TMT:5'] === 3` afterwards.
- [ ] **Step 2:** Run `npm run build && node tests/sets.test.cjs && npm run test:unit`. Expected: FAIL (`findCard('TST:9')` is undefined; `scryfallQuery` is not defined).
- [ ] **Step 3: Implement** the helpers and switch every `BASE`/`ETERN`/`TREAT`/`DATA`/`DECKS` read over. Keep `BASE`, `ETERN` and `TREAT` as `MAIN_SET`'s, for the TLA-only screens until Tasks 4–5.
- [ ] **Step 4: Verify.** `npm test` is green, and `node tests/sets.test.cjs` → all PASS.
- [ ] **Step 5:** Commit: `feat(sets): cards, prices, images and Journey read every package`.

---

### Task 4: Pack shop set picker, pack title and accent, odds per set

**Files:**
- Create: `src/styles/set-packages.css` (listed in `visual-edition` after `journey-sets.css`)
- Modify: `src/index.html` (pack hero and `#setPick`, odds `#oddsSet`), `src/boosters/09-opening.js` (`tryOpen`, pack title), `src/boosters/13-odds-model.js`, `src/boosters/15-header.js` (subtitle), `src/boosters/00b-packages.js` (`packSet()`), `tests/sets.test.cjs`, `tests/journey-sets.test.cjs` (no change expected; it must stay green)

**Interfaces:**
- Consumes: `slotsOf`, `openPack(code)`, `pkgOf` (Tasks 2–3).
- Produces:
  - `packSet() -> code`: `S.settings.packSet` when `pkgOf` knows it, else `MAIN_SET` (Review Focus 2).
  - `tryOpen(n, free)` opens `packSet()` packs. Free packs work the same way (Decision 5).
  - **`#setPick`:** one `button.chip[data-pick-set="<code>"]` per package, labelled with the set `name`, the chosen one `.on`. It's hidden when there is 1 package. A click saves `S.settings.packSet`.
  - **The pack** (`#pack`) shows the chosen package's `products.play.title`, with `"PLAY BOOSTER · <cards per pack> CARDS"` above it. It sets `--set-accent` to `accent` and shows `symbol` on the pack art. For TLA the visible text stays "PLAY BOOSTER · 14 CARDS" and "The Last Airbender".
  - **Header subtitle:**
    - one package: `"<name> (<code>) play booster simulator"`, which for TLA is "Avatar: The Last Airbender (TLA) play booster simulator", as today;
    - more: `"Magic: The Gathering play booster simulator · <codes joined by ', '>"`.
  - **Odds page:** `#oddsSet` select (hidden with 1 package) picks the set; the slot table, expected values and the source note (`products.play.note`) come from that set.

- [ ] **Step 1: Write the failing tests** in `tests/sets.test.cjs`:
  - **"the set picker opens the chosen set":**
    - the multi-set build shows 2 `[data-pick-set]` chips;
    - click `TST`, then `#open1`: every card on the reveal stage is a `TST:` key, and `#pack` contains "Test Set";
    - `S.settings.packSet === 'TST'` survives a reload.
  - **"an unknown packSet falls back":** set `S.settings.packSet = 'NOPE'`, `save()`, reload. `packSet()` returns `'TLA'` and `#open1` opens TLA cards.
  - **"one set looks like today":** in the normal build, `#setPick` and `#oddsSet` are hidden; the header reads "Avatar: The Last Airbender (TLA) play booster simulator"; `#pack` reads "The Last Airbender".
  - **"odds per set":** in the multi-set build, choose `TST` in `#oddsSet`; `#slotTable` lists the 4 TST slots, and the fixture note shows.
- [ ] **Step 2:** Run `npm run build && node tests/sets.test.cjs`. Expected: FAIL (no `[data-pick-set]`).
- [ ] **Step 3: Implement** the markup, glue and styles.
- [ ] **Step 4: Verify.**
  - `npm test` green; `node tests/sets.test.cjs` PASS.
  - `npm run screens` and look at `01-home.png`: the TLA pack hero is unchanged.
  - Add a shot of the multi-set build's home with TST chosen, `28-multiset-home` in `tools/capture.cjs` (build it with `--with-set`), and check the picker and accent at 1440 and 390 px.
- [ ] **Step 5:** Commit: `feat(sets): pack shop set picker, per-set pack art and odds`.

---

### Task 5: Binder, stats and decks per set; package docs

**Files:**
- Create: `docs/set-package.md`
- Modify: `src/index.html` (`#fSet` options are built in code), `src/boosters/12-collection.js`, `src/boosters/14-stats.js`, `src/boosters/16-decks.js`, `README.md` (link the doc), `tests/sets.test.cjs`

**Interfaces:**
- Consumes: `pkgBase`, `pkgEternal`, `pkgSpecials`, `ownedName` (Task 3).
- Produces:
  - **`#fSet` options**, built from the packages in package order. For each package with code `X`:
    - `X` "`X` · main set";
    - when its eternal list is non-empty, `<eternal code>` "`<eternal code>` · Eternal" (`TLE` for TLA);
    - `SPEC:X` "Special versions" (shown as "`X` · special versions" when there are 2+ packages).
    - For TLA the values stay `TLA`, `TLE` and `SPEC:TLA`. An old saved filter value `SPEC` maps to `SPEC:<MAIN_SET>`.
  - `#colSummary` shows the completion of the package the filter belongs to.
  - **Stats:** one "Main set" completion line per package.
  - **Decks:** with 2+ packages that have `archetypes`, a `#deckSet` select picks the set; the archetype grid and standard decks come from it. Packages without archetypes are not listed. With one such package, no select appears.
  - **`docs/set-package.md`:**
    - every `set.json` field and slot spec form, with TLA's values as the example;
    - the `cards.json` and `prices.json` shapes;
    - how `mechanics.js` and a theme are registered in `src/content.js`;
    - the build list in `build.config.json` and the `--with-set` test flag;
    - the checklist for adding a set's pack side, which M3b follows for TMT.

- [ ] **Step 1: Write the failing tests** in `tests/sets.test.cjs`:
  - **"binder per set":** in the multi-set build, `#fSet` has the options `TLA`, `TLE`, `SPEC:TLA`, `TST` and `SPEC:TST`. Choosing `TST` lists 9 cards, and `#colSummary` counts out of 9.
  - **"stats name every set":** `#statsBody` (or the completion tile area) contains both "Avatar: The Last Airbender" and "Test Set" completion lines.
  - **"decks stay TLA-only while TST has no archetypes":** `#deckSet` is hidden; the archetype grid shows 10 TLA archetypes.
  - **"old binder filter value":** setting the saved filter to `SPEC` before `renderCollection()` shows TLA special versions.
- [ ] **Step 2:** Run `npm run build && node tests/sets.test.cjs`. Expected: FAIL (`#fSet` has no `TST` option).
- [ ] **Step 3: Implement** the per-set binder, stats and decks, then write `docs/set-package.md`.
- [ ] **Step 4: Verify.**
  - `npm test`: every suite green (unit, combat 46, progression 47, legacy-parity, browser 12, visual 11, friends-beta 14, journey-sets 8, sets).
  - `npm run screens`: `03-collection.png` and `04-decks.png` look as before.
- [ ] **Step 5:** Commit: `feat(sets): binder, stats and decks per set; set package docs`.

---

## M3a exit

| Exit check | Proof |
|---|---|
| TLA lives in `src/sets/tla/` and opens the same packs | `browser.test.cjs` "75 seeded packs match original" and `sets.test.cjs` "TLA packs are unchanged" |
| Any package works in the pack shop, binder, odds, stats and decks | `sets.test.cjs` on the `--with-set` fixture build |
| One-set builds look like today | `sets.test.cjs` "one set looks like today"; screenshots 01, 03, 04 |
| The format is documented | `docs/set-package.md` |
