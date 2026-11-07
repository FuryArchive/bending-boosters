# M2 Set-agnostic Journey Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Journey runs start from a colour pair and a choice of sets. TLA's keywords move out of the engine into a set module, and everything franchise-specific becomes a theme: "Avatar" for TLA runs, plus a new neutral theme. Old runs migrate and play exactly as before.

**Architecture:**
- Three small registries:
  - sets (`src/engine/sets.js`)
  - mechanics (`src/engine/mechanics.js`)
  - themes (`src/engine/themes.js`)
- Content modules (`src/sets/tla/*`, `src/themes/neutral/*`) export plain data. One module, `src/content.js`, registers all of it.
- The engine reads colours, sets and theme from the run (`run.colours`, `run.sets`, `run.theme`).
- The UI reads every player-visible name from the run's theme.
- A legacy-parity suite runs the shipped engine from `history/3-visual-edition.html` side by side with the new one.

**Tech Stack:**
- Plain JS, no new dependencies.
- `node:test` for unit and engine suites.
- Playwright 1.64.1 with Chromium for browser suites.
- The zero-dependency build in `tools/build.mjs`.

**Spec:** `docs/superpowers/specs/2026-11-07-bending-boosters-design.md`, section 5 (and section 10 for module locations). Also read `README.md` ("How the build works") and `AGENTS.md`.

## Global Constraints

- **Colours replace nations:** the five MTG colours W, U, B, R, G are the factions. A new run starts with one of the 10 pairs. A pair ID is always written in WUBRG order: `WU WB WR WG UB UR UG BR BG RG`.
- **Starter deck:** 4 Strike, 4 Defend and the signature commons of both colours.
- **Card offers:** the selected sets' Journey cards in the pair's colours, plus colourless cards. The 10% off-colour chance (`OFF_ELEMENT = 0.1`) stays.
- **Run setup order:** 1. pick sets (a subset of the sets you own cards from, or "All my sets"); 2. pick a colour pair; 3. pick a start charm (unchanged).
- **Ownership:** a card is unlocked when you own a printing of it from that card's set. Commons of the selected sets are always available. Stars count copies across all printings of the same card name.
- **Themes:** a single-set run uses that set's theme (TLA → `"avatar"`). A mixed-set run uses `"neutral"`.
  - **Avatar:** Air Nomads, Water Tribe, Spirit, Fire Nation, Earth Kingdom; today's enemies, events and Legend charms.
  - **Neutral:** "Act I–III"; original non-franchise enemies and events; neutral backdrop. Per Act: 6 enemies, 3 elites and 1 boss. About 6 events (this plan: 6). It uses the generic charms.
- **Engine vs set mechanics:** the engine keeps only generic rules. TLA's Firebending, Earthbend, Lessons, curated card overrides and Avatar State move to `src/sets/tla/mechanics.js`. They hook in through the interface documented in `src/engine/mechanics.js`: on play/Strike/Guard (`onCard` with its mode), on turn start/end, and keyword Flow.
- **Journey save:** `bb.run` goes from v2 to v3. `nation` → `colours: [c]`, plus `sets: ["TLA"]` and `theme: "avatar"`.
  - The pre-migration string is copied to `bb.backup.run-v2` before the run is written again.
  - A run in progress keeps its single colour until it ends. New runs always use pairs.
- **Legacy parity:** a single-colour TLA run gives the same map, enemies and rewards as `history/3-visual-edition.html` for the same seed. This holds for a run migrated from v2 and for one created with `nation:`.
- **Storage:** existing key names stay. The only new key is `bb.backup.run-v2`. The main save stays `v: 2`, `schema: 3`.
- **Existing suites stay green:** combat 46, progression 47, browser 12, visual 11 and friends-beta 14 pass unchanged. No existing expectation changes.
  - Existing unit files only gain new tests. `tests/unit/run.test.mjs` also gains `import '../../src/content.js';`, because native ESM only sees registered content when something imports it.
  - Any new native test that touches cards, runs or themes imports `src/content.js` the same way.
- **Bundle position:** every new Journey module goes **after `src/data/overrides.js` (which stays first) and before `src/ui/cardview.js`**. `tests/harness/engine.cjs` and `tests/progression.test.cjs` evaluate exactly that span of the built file.
- **Names the tests read:** these stay top-level names in the bundle scope: `ELITES`, `EVENTS`, `EVENT_IDS`, `JOKERS`, `H`, `HEXES`, `OFFERINGS`, `enemyForNode`, `createRun({ nation })`, `BBJ._newRun(seed, "water")`.
- **Code the tests run standalone:** `tests/progression.test.cjs` runs the `continueBtn` and `nodeRest` code of `src/ui/journey.js` on its own. Add no new free names inside them.
- **Journey module rules** (README, "How the build works"):
  - top-level names are unique (prefix module-private helpers);
  - only `import { a } from "./x.js";` at the top;
  - `export` only at the start of a line;
  - every module is listed in `build.config.json`;
  - `npm run check` passes.
- **Desktop copy:** tooling never writes to it.
- **Commit messages** end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Decisions beyond the spec (owner confirms in plan review)

1. **Element names stay as internal colour IDs.** The engine and saves keep `"Air" "Water" "Spirit" "Fire" "Earth" "Neutral"` as the IDs of W U B R G and colourless (`COLOUR_ELEMENT` maps them). Renaming them would rewrite every saved run and dozens of tests for no visible gain. The player always sees the theme's names.
2. **Pair pool:** a card is in a pair's colours when every one of its colours is in the pair; colourless cards count too. Single-colour legacy runs keep today's rule (any card that contains the colour), so they play the same.
3. **Off-colour pool:** for a pair, this is every other Journey card of the selected sets. Legacy runs keep today's black ("Spirit") pool.
4. **Pair starter:** 4 Strike, 4 Defend, plus 2 signature commons per colour, so 12 cards. Today's mono deck is 10.
5. **Avatar State is TLA's mechanic** (a "surge" on Air, Water, Earth, Fire). It is active in any run that includes TLA. Themes name it: Avatar "Avatar State", neutral "Convergence".
6. **Charms:**
   - The 16 Legends are Avatar-theme charms. Neutral runs never offer them.
   - "Lesson Scroll" needs TLA in the run.
   - The other 15 charms are generic. Under neutral, four franchise-named ones get neutral names.
7. **The neutral theme is reachable in M2 only via `#debug`** (a Theme select in run setup). Mixed-set runs need a second set, which arrives in M3.
8. **The set step appears only with 2+ Journey sets to choose from.** With only TLA it is one line of text. A player who owns no cards gets every Journey set.
9. **Neutral enemies mirror Avatar stats.** Each slot copies the Avatar Book's armor, trait, pattern, phases and rule ID, so difficulty doesn't move before the M4 balance pass. Only IDs, names and texts are new. The 6 neutral events likewise reuse the logic of 6 Avatar events.
10. **Neutral names:**
    - colours: White, Blue, Black, Red, Green, Colourless;
    - Acts: "Act I: The Road", "Act II: The Wilds", "Act III: The Citadel".
    - Spec §13 lists "Act I–III, generic fantasy" as the default to confirm now.
11. **`nation` stays in v3 for single-colour runs**, so the old Desktop build keeps playing them correctly. Pair runs have no `nation`; the old build falls back to Water offers but doesn't crash.
12. **Pair archetype names:** the name shown under a pair (for example "Azorius Airbending Flyers" for WU) comes from `src/catalog/decks.json`, and only for TLA-only runs.

## Review Focus

1. **The old Desktop build opens a v3 save** in the same browser (both `file://`): a pair run, mid-fight. It must not wipe or crash. Coming back to the new build must find the run intact. *Pinned in Task 8 ("old build opens a pair run").*
2. **A saved run names a theme, set or colours this build doesn't know** (a newer build or a hand-edited save). It must still load and play:
   - an unknown theme falls back to neutral;
   - unknown sets are dropped (all of them → every Journey set);
   - bad colours fall back to the `nation` or to U;
   - an unknown pending event offers a safe "Continue".

   *Pinned in Task 4 (`migrateRun` cases) and Task 5 (`eventById` fallback).*
3. **Unthemed text leaks.** No raw `{Water}`-style placeholder on any Journey screen. A neutral run shows no Avatar names outside card faces. *Pinned in Task 7 (browser scan of start, map, fight, shop, rest, event, reward and summary under both themes).*
4. **A brand-new player with no cards starts a run.** The set step must still offer TLA, the pools must contain commons, and the run starts. *Pinned in Task 1 (`setupSets` with no owned sets) and Task 8 ("fresh player picks a pair").*
5. **A v2 save paused mid-fight** (cards in hand, Flow above 1, a Firebending card) must resume with identical numbers. Mechanics must be reattached after load. *Pinned in Task 4 (parity: old engine serialises mid-fight, new engine migrates and continues).*

---

## File map

| File | Responsibility |
|---|---|
| `src/engine/colours.js` | **new.** `COLOURS`, `COLOUR_ELEMENT`, `ELEMENT_COLOUR`, `PAIRS`, `pairId`, `normColours`, `cardColours` |
| `src/engine/sets.js` | **new.** set registry: `registerSet`, `journeySets`, `setByCode`, `isJourneySet`, `themeForSets` |
| `src/engine/ownership.js` | **new.** `journeyOwnership`, `setupSets` |
| `src/engine/mechanics.js` | **new.** mechanic registry, the documented hook interface, the hook runners |
| `src/engine/themes.js` | **new.** theme registry, `themeOf`, `themeText`, `bookLabel` |
| `src/engine/encounters.js` | **new** (replaces `src/data/enemies.js`). Enemy scaling and `enemyForNode`, with rosters read from the theme; `ruleOf` |
| `src/engine/event-kit.js` | **new** (replaces the helpers in `src/data/events.js`). `TIER_RANK`, `eventJokerPool`, `needGold`, `needHp`, `eventById`, `MISSING_EVENT` |
| `src/sets/tla/set.js` | **new.** `TLA_SET` |
| `src/sets/tla/mechanics.js` | **new.** `TLA_MECHANICS`: Firebending, Earthbend, Lessons, curation, Avatar State |
| `src/sets/tla/enemies.js` | **new.** today's Avatar rosters (moved from `src/data/enemies.js`, same names) |
| `src/sets/tla/events.js` | **new.** today's 10 events (moved from `src/data/events.js`, same names) |
| `src/sets/tla/legends.js` | **new.** the 16 Legend charms (moved from `src/data/jokers.js`) |
| `src/sets/tla/theme.js` | **new.** `AVATAR_THEME` |
| `src/themes/neutral/{enemies,events,theme}.js` | **new.** `NEUTRAL_ROSTERS`/`NEUTRAL_ELITES`/`NEUTRAL_BOSSES`, `NEUTRAL_EVENTS`, `NEUTRAL_THEME` |
| `src/content.js` | **new.** the only module with registration side effects; `CONTENT` |
| `src/engine/cards.js`, `flow.js`, `jokers.js` | TLA keywords out, mechanic hooks in; `mergePatch` |
| `src/engine/catalog.js` | `isRunCard` uses the set registry |
| `src/engine/pools.js`, `offers.js`, `nodes.js` | colour pools, pair starter, theme/set-aware offers and events |
| `src/save/migrate.js` | `RUN_SAVE_VERSION`, `migrateRun`. **Moves** in `build.config.json` to just before `src/engine/run.js` |
| `src/engine/run.js` | v3 `createRun`, migrating `deserialize`, mechanics reattached |
| `src/data/jokers.js`, `items.js`, `src/engine/enemy.js` | `registerCharms`; `{Air}`-style text tokens |
| `src/ui/run-store.js` | `RUN_BACKUP_KEY`, `backupLegacyRun` |
| `src/ui/journey.js`, `cardview.js`, `fx.js` | theme-driven names, colours, Books/Acts, backdrop, enemy art; run setup |
| `src/ui/index.js` | new `BBJ` exports |
| `src/boosters/17-journey-mount.js`, `21-resume.js` | ownership through `BBJ.journeyOwnership`; owned sets; pair names; `bookLabel` |
| `src/styles/journey-sets.css` | **new.** run-setup styles (listed in the `visual-edition` slot after `friends-beta.css`) |
| `tests/unit/{sets,mechanics,pools,themes,neutral}.test.mjs` | **new** unit suites |
| `tests/harness/autoplay.cjs` | **new.** deterministic engine-only run driver |
| `tests/legacy-parity.test.cjs` | **new.** old engine vs new engine |
| `tests/journey-sets.test.cjs` | **new.** browser suite for M2 |
| `package.json`, `README.md`, `tools/capture.cjs` | scripts, docs, screenshots |

**Final module order** (`build.config.json` → `slots.journey[0].journey.modules`). New or moved entries are marked with ←.
```
src/data/overrides.js            (stays first: the test harnesses start reading here)
src/engine/colours.js        ←
src/engine/sets.js           ←
src/engine/mechanics.js      ←
src/engine/cards.js
src/engine/enemy.js
src/engine/jokers.js
src/engine/flow.js
src/engine/catalog.js
src/engine/rng.js
src/engine/map.js
src/engine/pools.js
src/engine/ownership.js      ←
src/engine/themes.js         ←
src/engine/encounters.js     ←  (src/data/enemies.js removed)
src/data/jokers.js
src/engine/offers.js
src/data/items.js
src/engine/event-kit.js      ←  (src/data/events.js removed)
src/engine/nodes.js
src/economy/config.js
src/save/migrate.js          ←  (moved from after src/economy/selling.js)
src/engine/run.js
src/sets/tla/set.js          ←
src/sets/tla/mechanics.js    ←
src/sets/tla/enemies.js      ←
src/sets/tla/events.js       ←
src/sets/tla/legends.js      ←
src/sets/tla/theme.js        ←
src/themes/neutral/enemies.js ←
src/themes/neutral/events.js ←
src/themes/neutral/theme.js  ←
src/content.js               ←
src/ui/cardview.js … (unchanged from here on)
```
Each task adds only its own entries to this list.

**New `BBJ` exports** (from `src/ui/index.js`), added by the task that needs them: `CONTENT`, `PAIRS`, `journeySets`, `journeyOwnership`, `setupSets`, `bookLabel`, `themeIds`, `themeById`.

---

### Task 1: Colours, set registry, content registration and ownership (pure)

**Files:**
- Create: `src/engine/colours.js`, `src/engine/sets.js`, `src/engine/ownership.js`, `src/sets/tla/set.js`, `src/content.js`, `tests/unit/sets.test.mjs`
- Modify: `src/engine/catalog.js` (`isRunCard`), `src/ui/index.js`, `build.config.json`, `tests/unit/run.test.mjs` (add `import '../../src/content.js';` as its first import)

**Interfaces:**
- Produces:
  - `COLOURS = ["W","U","B","R","G"]`, `COLOUR_ELEMENT = { W: "Air", U: "Water", B: "Spirit", R: "Fire", G: "Earth" }`, `ELEMENT_COLOUR` (its inverse)
  - `PAIRS = ["WU","WB","WR","WG","UB","UR","UG","BR","BG","RG"]`
  - `pairId(colours: string[]) -> string`: WUBRG order, joined
  - `normColours(list) -> string[]`: valid letters only, unique, WUBRG order
  - `cardColours(card) -> string[]`: from `card.col`
  - `registerSet({ code, name, theme })`: throws on a duplicate code
  - `journeySets() -> set[]` (registration order), `setByCode(code) -> set | null`, `isJourneySet(code) -> boolean`
  - `themeForSets(codes) -> string`: exactly one code, and it is registered → that set's `theme`; anything else → `"neutral"`
  - `journeyOwnership({ cards, printings, copiesOf, sets }) -> { ownedKeys: string[], ownedStars: { [key]: 2..5 } }`
    - `cards` is the catalog. Only run cards of `sets` are considered.
    - `printings` is every printing the collection knows, as `{ set, num, name }`. `copiesOf(printing)` gives its copy count.
    - A run card is unlocked when some printing with the same `set` and `name` has copies > 0.
    - Its stars are `starsFromCopies(sum of copies over every printing with that name, any set)`, kept only when ≥ 2. That is today's shape.
  - `setupSets({ journey, owned }) -> { choices: string[], selected: string[], showStep: boolean }`
    - `choices` = journey codes that are also in `owned`, in `journey` order. If that is empty, all of `journey`.
    - `selected` = `choices`. `showStep` = `choices.length >= 2`.
  - `TLA_SET = { code: "TLA", name: "Avatar: The Last Airbender", theme: "avatar" }`
  - `CONTENT = { sets: [TLA_SET] }`. `src/content.js` calls `registerSet(TLA_SET)` at top level. Later tasks add their registrations here.
  - `isRunCard(c)` = `isJourneySet(c.set) && c.r !== "L" && !/Land/.test(c.type || "")`
  - `BBJ.CONTENT`, `BBJ.PAIRS`, `BBJ.journeySets`, `BBJ.journeyOwnership`, `BBJ.setupSets`

- [ ] **Step 1: Write the failing tests** in `tests/unit/sets.test.mjs`. Import `src/content.js` first, then `setCatalog(data.base)`.

```js
test('pairs are the ten WUBRG-ordered pairs', () => {
  assert.equal(PAIRS.length, 10); assert.equal(new Set(PAIRS).size, 10);
  for (const p of PAIRS) assert.equal(pairId(p.split('').reverse()), p);
  assert.equal(pairId(['R', 'U']), 'UR');
  assert.deepEqual(normColours(['G', 'x', 'U', 'G']), ['U', 'G']);
});
test('theme follows the sets', () => {
  assert.equal(themeForSets(['TLA']), 'avatar');
  for (const s of [['TLA', 'TMT'], [], ['NOPE']]) assert.equal(themeForSets(s), 'neutral');
});
test('Journey cards come from registered Journey sets only', () => {
  assert.equal(data.base.filter(isRunCard).length, 262);
  assert.equal(data.eternal.some(isRunCard), false);
});
test('a printing unlocks only its own set; stars count every printing', () => {
  const aang = data.base.find(c => c.name === 'Aang, the Last Airbender');
  const printings = [aang, { set: 'TLA', num: '900', name: aang.name }, { set: 'XYZ', num: '1', name: aang.name }];
  const copies = { 'TLA:900': 7, 'XYZ:1': 5 };
  const o = journeyOwnership({ cards: data.base, printings, copiesOf: p => copies[p.set + ':' + p.num] || 0, sets: ['TLA'] });
  assert.ok(o.ownedKeys.includes('TLA:' + aang.num));
  assert.equal(o.ownedStars['TLA:' + aang.num], 5);
  const other = journeyOwnership({ cards: data.base, printings, copiesOf: p => (p.set === 'XYZ' ? 1 : 0), sets: ['TLA'] });
  assert.equal(other.ownedKeys.includes('TLA:' + aang.num), false);
  assert.equal(other.ownedStars['TLA:' + aang.num], undefined);   // 1 copy: no star entry
});
test('set step: owned sets, fallback to every Journey set, step only for 2+', () => {
  assert.deepEqual(setupSets({ journey: ['TLA'], owned: [] }), { choices: ['TLA'], selected: ['TLA'], showStep: false });
  assert.deepEqual(setupSets({ journey: ['TLA', 'TMT'], owned: ['TMT', 'TLE'] }).choices, ['TMT']);
  assert.equal(setupSets({ journey: ['TLA', 'TMT'], owned: ['TLA', 'TMT'] }).showStep, true);
});
```

- [ ] **Step 2:** Run `npm run test:unit`. Expected: FAIL (`Cannot find module …/src/content.js`).
- [ ] **Step 3: Implement** the modules above. Then update `isRunCard`, add the module-order entries for this task, add the `BBJ` exports, and add the import line to `tests/unit/run.test.mjs`.
- [ ] **Step 4: Verify.**
  - `npm run check` → `modules ok`.
  - `npm run test:quick` → unit all pass, combat `# pass 46`, progression `# pass 36`.
- [ ] **Step 5:** Commit: `feat(journey): colours, set registry and ownership by printing set`.

---

### Task 2: Set mechanics as modules

**Files:**
- Create: `src/engine/mechanics.js`, `src/sets/tla/mechanics.js`, `tests/unit/mechanics.test.mjs`, `tests/legacy-parity.test.cjs`
- Modify: `src/engine/cards.js`, `src/engine/flow.js`, `src/engine/jokers.js`, `src/engine/run.js` (fight creation, `serialize`, `deserialize`), `src/content.js`, `build.config.json`, `package.json`, `README.md` (new section "Set mechanics", pointing at the interface comment)

**Interfaces:**
- Consumes: `registerSet`/`journeySets` (Task 1).
- Produces:
  - **The interface.** Copy this comment block to the top of `src/engine/mechanics.js`:
    ```
    // A mechanic is a plain object that a set registers with registerMechanic(). Every hook is optional
    // and pure (no DOM, no Math.random). Hooks run in registration order.
    //   id, set                       unique id; the set code that owns it
    // Card conversion (only for cards whose card.set === m.set):
    //   keyword(word, keywords) -> boolean   claim a printed keyword ("Firebending 2"); write keywords.*
    //   prepare(card, rc)                    after the base fields, before effects (e.g. rc.isLesson)
    //   act(entry, on, rc) -> act | null     translate a catalog fx entry the engine doesn't know (["earth", 2])
    //   finish(card, rc)                     after effects and Power (curated overrides)
    //   text(rc) -> string[]                 extra card text, after the Power line
    // Fights (only when the fight's sets include m.set):
    //   keywordFlow(card, ctx) -> number     Flow this card adds; kept even when a rule suppresses the card
    //   onCard(card, mode, ctx, f, x) -> patch    same as a charm's onCard; mode is "strike" | "guard" | "play"
    //   onTurnStart(f) -> patch, onTurnEnd(f) -> patch   same as the charm hooks
    //   surge: { els: [element ids], name }  play all of these in one turn: Flow × opts.avatarMult
    ```
  - `registerMechanic(m)`: throws on a duplicate `id`
  - `mechanicsFor(sets?) -> m[]`: `undefined` → every registered mechanic
  - `mechKeyword(card, word, keywords) -> boolean`, `mechPrepare(card, rc)`, `mechAct(card, entry, on, rc) -> act | null`, `mechFinish(card, rc)`, `mechText(rc) -> string[]` (`text` runs for every registered mechanic)
  - `mechFlow(f, card, ctx) -> number`, `surgeOf(f) -> { els, name } | null`: the first surge in `f.mech`
  - `mergePatch(a, b) -> patch` in `src/engine/jokers.js`: numbers add, `xdmg` multiplies, booleans OR
  - `createFight({ …, sets })`: sets `f.mech = mechanicsFor(sets)`. Charm patches for `onCard`/`onTurnStart`/`onTurnEnd` are merged with `jokerPatch(hook, f.mech, args, f.jstate)`, passed no `events`. A card suppressed by a rule (Long Feng) skips mechanic `onCard` exactly as it skips charm hooks; its `keywordFlow` still counts.
    - Gain: `kw.firebending || 0` becomes `mechFlow(f, c, ctx)`.
    - `BENDING` becomes `surgeOf(f)?.els`. Without a surge, `elements` stays `[]` and Avatar State never triggers.
  - `run.js`: passes `sets: run.sets` to `createFight`. `serialize` drops `fight.mech`. `deserialize` sets `f.mech = mechanicsFor(run.sets)`.
  - `TLA_MECHANICS`, five entries, each with `set: "TLA"`. Behaviour moves unchanged from `cards.js`/`flow.js`:
    - `firebending`:
      - `keyword`: `/^Firebending (\d+)/` sets `keywords.firebending = N`; bare `"Firebending"` sets 1.
      - `keywordFlow`: `c.keywords.firebending || 0`.
      - `text`: `Firebending N`.
    - `earthbend`: `act`: `["earth", n]` → `{ k: "block", n: 3 + 2 * n, on, stone: true }`. `n` defaults to 1.
    - `lessons`: `prepare` sets `rc.isLesson = /Lesson/.test(card.type || "")`. The rc literal keeps `isLesson: false` in the same position.
    - `curation`: `finish` applies `OVERRIDES[card.name]` exactly as `toRunCard` does today. `src/data/overrides.js` stays where it is.
    - `avatar-state`: `surge: { els: ["Air", "Water", "Earth", "Fire"], name: "Avatar State" }`.

- [ ] **Step 1: Write the characterisation suite** `tests/legacy-parity.test.cjs` (`node:test`, CommonJS):
  - `old = loadEngine(env.HISTORY.visual)`, `neu = loadEngine(env.GAME)`.
  - Compare objects across realms only after `const plain = x => JSON.parse(JSON.stringify(x))`.
```js
test('every catalog card converts exactly as in the shipped build', () => {
  for (const c of neu.data.base) {
    const a = plain(old.ctx.toRunCard(c)), b = plain(neu.ctx.toRunCard(c));
    delete a.uid; delete b.uid;
    assert.deepStrictEqual(b, a, c.name);
    const ra = old.ctx.toRunCard(c), rb = neu.ctx.toRunCard(c);
    assert.deepStrictEqual(plain(neu.ctx.actLines(rb)), plain(old.ctx.actLines(ra)), c.name);
    assert.deepStrictEqual(plain(neu.ctx.keywordNames(rb)), plain(old.ctx.keywordNames(ra)), c.name);
  }
});
```
  Add `node tests/legacy-parity.test.cjs` to `test:quick` and `test`, right after the progression suite. Run it: PASS. It is a guard for the refactor.
- [ ] **Step 2: Write the failing unit test** `tests/unit/mechanics.test.mjs`. Use a test mechanic `{ id: "test-spark", set: "TST", keyword: (w, k) => w === "Spark" && (k.spark = true), keywordFlow: c => (c.keywords.spark ? 2 : 0), onCard: (c, m) => (c.keywords.spark && m === "strike" ? { base: 5 } : null), onTurnStart: () => ({ block: 3 }) }`, registered with `registerSet({ code: "TST", name: "Test", theme: "neutral" })`. Build fights with `createFight` and a small enemy `{ id: "dummy", hp: 999, atk: 1, pattern: ["strike"] }`. Assert:
  - the spark card is `toRunCard({ set: 'TST', num: '1', name: 'Spark Test', type: 'Creature', pt: '2/2', cost: '1 R', col: 'R', kw: ['Spark'] })`, so the `keyword` hook is exercised too; its `keywords.spark` is `true`;
  - with `sets: ["TST"]`, at Flow 1 against armor 0: its `previewCard(f, i, "strike")` has `dmg` 5 higher and `gain` 2 higher than the same card in a fight with `sets: ["TLA"]`; the first turn starts with `f.player.block === 3`;
  - `surgeOf(fightWith(["TST"]))` is `null`. Playing Air, Water, Earth and Fire cards in one turn never sets `res.avatar`. With `["TLA"]` the fourth one does;
  - with `["TST"]`, a `keywords: { firebending: 2 }` card gains no Firebending Flow;
  - `mergePatch({ base: 2, xdmg: 1.5, zero: false }, { base: 3, xdmg: 2, zero: true })` deep-equals `{ base: 5, xdmg: 3, zero: true }`.
- [ ] **Step 3:** Run `npm run test:unit`. Expected: FAIL (no `mechanics.js`).
- [ ] **Step 4: Implement.**
  - Add the registry and the hook points in `cards.js` and `flow.js`.
  - Remove `OVERRIDES` from `cards.js`'s imports.
  - Register `TLA_MECHANICS` in `src/content.js`.
- [ ] **Step 5: Verify.**
  - `npm run check`.
  - `npm run test:quick`: legacy-parity passes, combat `# pass 46`, progression `# pass 36`.
  - `node tests/visual.test.cjs` → `PASS all 262 Journey card effect boxes`.
- [ ] **Step 6:** Commit: `refactor(journey): TLA keywords become set mechanics`.

---

### Task 3: Colour pools, pair starter deck and card offers (pure)

**Files:**
- Create: `tests/unit/pools.test.mjs`
- Modify: `src/engine/pools.js`, `src/engine/offers.js` (`cardOffers`), `src/engine/nodes.js` (`H.randomCard`), `tests/legacy-parity.test.cjs`

**Interfaces:**
- Consumes: `COLOUR_ELEMENT`, `normColours`, `cardColours`, `journeySets` (Task 1).
- Produces (in `pools.js`; `nationPool` and `spiritPool` are removed):
  - `NATIONS`: unchanged. Still used by migration and the `nation:` alias. Also `NATION_COLOUR = { water: "U", earth: "G", fire: "R", air: "W" }`.
  - `runColours(run) -> string[]`: `run.colours` if non-empty, else `[NATION_COLOUR[run.nation] || "U"]`
  - `runSets(run) -> string[]`: `run.sets` if non-empty, else every Journey set code
  - `colourPool(colours, sets) -> card[]`: run cards of `sets`, in catalog order.
    - One colour `c`: `!card.col || card.col.includes(c)` (today's rule).
    - Two colours: every letter of `card.col` is in `colours`; colourless counts.
  - `offColourPool(colours, sets) -> card[]`:
    - one colour: run cards of `sets` with `!col || col.includes("B")` (today's Spirit pool);
    - two colours: run cards of `sets` not in `colourPool(colours, sets)`.
  - `starterDeck(colours, sets) -> rc[]`: 4 Strike and 4 Defend (uids `d1`–`d8`), then each colour's signature commons, in WUBRG order. Uids continue from `d9`.
    - Signature commons use today's rule: the lowest-numbered mono common of that colour, then the next one whose first tag differs.
    - Candidates come from `sets`, ordered by set position in `sets`, then by `+num`.
  - `cardOffers(run, n, rng)`: `home = colourPool(runColours(run), runSets(run))`, `away = offColourPool(…)`. Everything else is unchanged.
  - `H.randomCard`: its pools are also limited to `runSets(run)`.

- [ ] **Step 1: Write the failing tests** `tests/unit/pools.test.mjs`:
```js
test('a pair pool holds only cards inside the pair, plus colourless', () => {
  const pool = colourPool(['U', 'R'], ['TLA']);
  assert.ok(pool.every(c => cardColours(c).every(x => 'UR'.includes(x))));
  assert.ok(pool.some(c => c.col === 'UR') && pool.some(c => !c.col));
  assert.ok(!pool.some(c => c.col === 'WU' || c.col === 'WURG'));
});
test('pair pool and off-colour pool split the Journey cards', () => {
  const home = colourPool(['U', 'R'], ['TLA']).map(keyOf), away = offColourPool(['U', 'R'], ['TLA']).map(keyOf);
  assert.equal(home.filter(k => away.includes(k)).length, 0);
  assert.equal(home.length + away.length, data.base.filter(isRunCard).length);
});
test('pair starter: 4 Strike, 4 Defend, 2 commons of each colour', () => {
  for (const p of PAIRS) {
    const d = starterDeck(p.split(''), ['TLA']);
    assert.equal(d.length, 12, p);
    assert.equal(d.filter(c => c.key === 'BASIC:strike').length, 4);
    assert.equal(new Set(d.map(c => c.uid)).size, 12);
    for (const col of p) assert.equal(d.filter(c => c.elements.length === 1 && c.elements[0] === COLOUR_ELEMENT[col]).length, 2, p + col);
  }
  assert.equal(starterDeck(['U'], ['TLA']).length, 10);
});
test('pair offers never show an unowned uncommon or better', () => {
  const run = { colours: ['W', 'B'], sets: ['TLA'], book: 3, ownedKeys: [], ownedStars: {} };
  const rng = createRng('OFFERS');
  for (let i = 0; i < 100; i++) for (const c of cardOffers(run, 3, rng)) assert.equal(c.r, 'C');
});
```
  Then add to `tests/legacy-parity.test.cjs`, for each of `water earth fire air` with `c = NATION_COLOUR[id]`:
  - `old.nationPool(id)` keys === `neu.colourPool([c], ['TLA'])` keys, same order;
  - `old.spiritPool()` keys === `neu.offColourPool([c], ['TLA'])` keys;
  - `plain(old.starterDeck(id))` deep-equals `plain(neu.starterDeck([c], ['TLA']))`;
  - for 50 seeds, `old.cardOffers(run, 3, old.createRng(s))` keys === `neu.cardOffers(run, 3, neu.createRng(s))` keys, where `run = { nation: id, book: 2, ownedKeys: <every 3rd run-card key>, ownedStars: {} }`.
- [ ] **Step 2:** Run `npm run test:unit`. Expected: FAIL (`colourPool` is not exported).
- [ ] **Step 3: Implement** the pools and switch `cardOffers` and `H.randomCard` over. Callers of `starterDeck(nation)` (only `createRun`) pass `starterDeck(runColours({ nation }), runSets({}))` until Task 4.
- [ ] **Step 4: Verify.** `npm run check && npm run test:quick`: all green, parity included.
- [ ] **Step 5:** Commit: `feat(journey): colour pools and pair starter deck`.

---

### Task 4: Journey save v3 and colour-pair runs

**Files:**
- Create: `tests/harness/autoplay.cjs`
- Modify: `src/save/migrate.js`, `src/engine/run.js`, `src/ui/run-store.js`, `src/ui/journey.js` (`loadSave` only), `build.config.json` (move `src/save/migrate.js`), `tests/unit/migrate.test.mjs`, `tests/unit/run.test.mjs`, `tests/legacy-parity.test.cjs`, `README.md` (saves paragraph: `bb.run` v3, `bb.backup.run-v2`)

**Interfaces:**
- Consumes: `NATION_COLOUR`, `runColours`, `runSets`, `starterDeck` (Task 3); `normColours`, `isJourneySet`, `journeySets`, `themeForSets` (Task 1).
- Produces:
  - `RUN_SAVE_VERSION = 3`.
  - `migrateRun(run) -> run`: pure, idempotent; mutates and returns the same object.
    - **v2:** `colours = [NATION_COLOUR[run.nation] || "U"]`, `sets = ["TLA"]`, `theme = "avatar"`, `v = 3`. Keeps `nation`.
    - **v ≥ 3:**
      - `colours = normColours(colours)`; if that leaves 0 or more than 2, fall back as for v2.
      - `sets` = the registered Journey sets among `sets`; if none, every Journey set code.
      - `theme` stays as is (Task 5 resolves unknown themes); a missing `theme` becomes `themeForSets(sets)`.
      - A `v` above 3 stays as is.
  - `createRun({ seed, colours, sets, theme, nation, ownedKeys = [], ownedStars = {}, startCharmId })`:
    - `colours = colours ? normColours(colours) : [NATION_COLOUR[nation || "water"]]`, and it must have 1 or 2 entries; otherwise throw `Error("A run needs one or two colours")`;
    - `sets = sets` filtered to Journey sets (throw if none), default every Journey set;
    - `theme = theme || themeForSets(sets)`;
    - the run literal keeps today's key order, with `colours, sets, theme` added at the end and `v: 3`;
    - `nation` is kept only for single-colour runs (the given `nation`, or the `NATIONS` entry for that colour);
    - `deck = starterDeck(colours, sets)`.
  - `deserialize(str)`: `null` unless the value is an object with `(v || 1) >= 2`. Then `migrateRun(run)`, then today's fight rebuild, plus `f.mech`.
  - `RUN_BACKUP_KEY = "bb.backup.run-v2"`; `backupLegacyRun(raw) -> boolean`. When `raw` parses to `v === 2`, it writes `raw` to that key, inside try/catch. `journey.js`'s `loadSave()` calls it before `deserialize(s)`.
  - `tests/harness/autoplay.cjs`: `autoplay(e, run, { maxSteps = 20000, forceWin = false, onStep, until } = {}) -> { steps, enemies: string[], events: string[], charms: string[] }`. It returns early, without throwing, as soon as `until(run)` is true. It is deterministic, so both engines follow the same policy:
```js
function act(e, run, forceWin, seen) {
  const p = run.pending;
  if (run.status === 'map') {
    if (p && p.kind === 'start') { seen.charms.push(...p.charms); return e.takeStartCharm(run, 0); }
    const node = e.availableNodes(run)[0]; e.enterNode(run, node.id);
    if (run.fight) { seen.enemies.push(run.fight.enemy.def.id); if (forceWin) run.fight.enemy.hp = 0; }
    if (run.pending && run.pending.kind === 'event') seen.events.push(run.pending.id);
    return;
  }
  if (run.status === 'fight') {
    const f = run.fight, i = f.hand.findIndex((c, k) => e.canPlayCard(f, k).ok);
    return i >= 0 ? e.runPlayCard(run, i) : e.runEndTurn(run);
  }
  if (!p) return e.leaveNode(run);
  if (p.jokers && !p.jokerTaken) seen.charms.push(...p.jokers);
  if (p.cards && !p.cardTaken) return e.takeCard(run, 0);
  if (p.jokers && !p.jokerTaken) return e.takeJoker(run, 0);
  if (p.kind === 'swap') return e.resolveSwap(run, null);
  if (p.kind === 'select') return e.resolveSelect(run, []);
  if (p.kind === 'event' && !p.result) return e.applyEvent(run, e.eventChoices(run).findIndex(c => c.ok));
  if (p.kind === 'rest' && !p.done) return e.rest(run, 'heal');
  return e.leaveNode(run);
}
```
    The loop calls `act` until the status is `won` or `lost`. It throws `Error("run did not end")` at `maxSteps`, and calls `onStep(run, step)` after each action. (`hp = 0` under `forceWin` makes the next play or End turn win before the enemy acts.)

- [ ] **Step 1: Write the failing tests.**
  - `tests/unit/migrate.test.mjs`:
    - a v2 `fire` run migrates to `colours ["R"]`, `sets ["TLA"]`, `theme "avatar"`, `v 3`, `nation "fire"`, with every other field deep-equal;
    - `migrateRun(migrateRun(x))` deep-equals `migrateRun(x)`;
    - a v3 run with `colours ["X", "Q"]` and `nation "earth"` gets `["G"]`, and the same with no `nation` gets `["U"]`;
    - `sets ["TMT", "TLA"]` becomes `["TLA"]`, and `["NOPE"]` becomes `["TLA"]`;
    - `theme "tmt"` stays `"tmt"`;
    - `v 4` stays 4.
  - `tests/unit/run.test.mjs`:
    - `createRun({ seed: 'P', colours: ['R', 'U'] })` has `colours ["U","R"]`, `sets ["TLA"]`, `theme "avatar"`, `v 3`, no `nation`, a 12-card deck;
    - three colours throw;
    - `createRun({ seed: 'T', nation: 'water' })` has `colours ["U"]`, `nation "water"`, a 10-card deck;
    - `deserialize(serialize(run))` keeps `colours`, `sets` and `theme`;
    - a v2 string deserialises to v3.
  - `tests/legacy-parity.test.cjs`:
```js
const strip = r => { const o = JSON.parse(neu.ctx.serialize(r)); for (const k of ['v', 'colours', 'sets', 'theme']) delete o[k]; return o; };
const stripOld = r => { const o = JSON.parse(old.ctx.serialize(r)); delete o.v; return o; };
for (const nation of ['water', 'earth', 'fire', 'air']) for (const forceWin of [false, true]) {
  test(`a legacy ${nation} run plays the same as the shipped build${forceWin ? ' (all three Books)' : ''}`, () => {
    const seed = `PARITY-${nation}`, args = { seed, nation, ownedKeys: [], ownedStars: {} };
    const a = old.ctx.createRun(args), b = neu.ctx.createRun(args), trail = [];
    autoplay(old.ctx, a, { forceWin, onStep: r => trail.push(stripOld(r)) });
    let i = 0;
    autoplay(neu.ctx, b, { forceWin, onStep: r => assert.deepStrictEqual(strip(r), trail[i++]) });
    assert.equal(i, trail.length);
    if (forceWin) assert.equal(b.status, 'won');
  });
}
test('a v2 save paused mid-fight resumes identically in the new build', () => {
  const a = old.ctx.createRun({ seed: 'PARITY-MIDFIGHT', nation: 'fire', ownedKeys: [], ownedStars: {} });
  autoplay(old.ctx, a, { until: r => r.fight && r.fight.turn >= 2 && r.fight.chain.length > 0 });
  const b = neu.ctx.deserialize(old.ctx.serialize(a));
  assert.equal(b.v, 3); assert.deepStrictEqual(plain(b.colours), ['R']);
  const trail = [];
  autoplay(old.ctx, a, { onStep: r => trail.push(stripOld(r)) });
  let i = 0;
  autoplay(neu.ctx, b, { onStep: r => assert.deepStrictEqual(strip(r), trail[i++]) });
  assert.equal(i, trail.length);
});
```
    Keep the suite under 60 s. If it is slower, compare every 10th step plus every step that enters a node or ends a fight.
- [ ] **Step 2:** Run `npm run test:quick`. Expected: FAIL (`migrateRun` is not exported).
- [ ] **Step 3: Implement.**
  - Move `src/save/migrate.js` in `build.config.json` (see the final order above).
  - Make the `run.js` changes and add `backupLegacyRun`, called from `loadSave()`.
- [ ] **Step 4: Verify.**
  - `npm run check && npm run test:quick`: all green.
  - Then `npm test`. The visual group "pre-visual wallet and active Journey save resume unchanged" passes; it resumes a `history/2-bugfixes.html` run through the v2 → v3 path.
- [ ] **Step 5:** Commit: `feat(save): Journey save v3 with colours, sets and theme; colour-pair runs`.

---

### Task 5: Theme registry and the Avatar theme

**Files:**
- Create: `src/engine/themes.js`, `src/engine/encounters.js`, `src/engine/event-kit.js`, `src/sets/tla/enemies.js`, `src/sets/tla/events.js`, `src/sets/tla/legends.js`, `src/sets/tla/theme.js`, `tests/unit/themes.test.mjs`
- Delete: `src/data/enemies.js`, `src/data/events.js` (use `git mv` into `src/engine/encounters.js` and `src/sets/tla/events.js`, so history follows)
- Modify: `src/data/jokers.js`, `src/engine/offers.js`, `src/engine/nodes.js`, `src/engine/run.js`, `src/ui/journey.js` (imports only: events by `eventById`), `src/content.js`, `build.config.json`

**Interfaces:**
- Consumes: `runSets` (Task 3); `run.theme` (Task 4).
- Produces:
  - **Theme shape.** Copy this comment block into `src/engine/themes.js`:
    ```
    // { id, name,
    //   colours: { Air|Water|Spirit|Fire|Earth|Neutral: { name, short, hex } },
    //   books: { 1|2|3: { kicker, title, el, places, bossName, hue: [hi, mid, lo],
    //                     backdrop: { sky, horizon, far, near, moon, mote, drift },
    //                     roster: enemy[], elites: enemy[], boss: enemy } },
    //   events: { [id]: event },        // key order = the order events are drawn from
    //   enemyArt: { [enemyId]: "soldier" | "beast" | "spirit" | "machine" | "archer" | "bender" | "boss" },
    //   text: { book, books, element, surge, surgeHint },
    //   names: { charm: {}, offering: {}, tag: {} } }   // display renames; missing ids keep their own name
    ```
  - `LEGACY_THEME = "avatar"` (every save from before v3 is an Avatar run) and `FALLBACK_THEME = "neutral"`
  - `registerTheme(t)`: throws on a duplicate `id` or a missing `books[1..3]`
  - `themeById(id) -> theme | null`, `themeIds() -> string[]`
  - `themeOf(run) -> theme`:
    - `run.theme` missing → `LEGACY_THEME`;
    - unknown → `themeById(FALLBACK_THEME) || themeById(LEGACY_THEME)`.
  - `enemyForNode(run, node, rng)` in `encounters.js`: today's scaling constants and math. The `roster`/`elites`/`boss`/`bossName` come from `themeOf(run).books[book]`. Also `ruleOf(id, text)` (today's `R`).
  - `event-kit.js`: `TIER_RANK`, `eventJokerPool`, `needGold`, `needHp` (moved unchanged); `MISSING_EVENT = { name: "A quiet road", text: "Nothing happens here.", choices: [{ label: "Continue", apply: () => "You move on." }] }`; `eventById(run, id) -> event` (the run's theme, then any registered theme, then `MISSING_EVENT`)
  - `src/sets/tla/enemies.js` keeps the names `BOOK_ROSTERS`, `ELITES`, `BOOK_BOSSES`, `BOSS_NAMES` with today's data, in today's order. `src/sets/tla/events.js` keeps `EVENTS` and `EVENT_IDS`.
  - `src/data/jokers.js`:
    - `JOKERS` holds today's 16 charms; `registerCharms(list)` appends and throws on a duplicate id;
    - `lesson_scroll` gains `set: "TLA"`.
  - `AVATAR_LEGENDS`: the 16 legends exactly as today, each with `theme: "avatar"`. Registered right after the charms, so the order of `JOKERS` is unchanged.
  - `charmFits(j, run) -> boolean` in `offers.js`: `(!j.theme || j.theme === themeOf(run).id) && (!j.set || runSets(run).includes(j.set))`.
    - `eligible` applies it.
    - `startCharms(rng, run)` applies it to today's common-charm list. `createRun` passes the run.
  - `openNode` draws events from `Object.keys(themeOf(run).events)`. `eventChoices`/`applyEvent` use `eventById(run, p.id)`.
  - `AVATAR_THEME` (`id "avatar"`, `name "Avatar"`):
    - `colours`, as `name`/`short`/`hex`:
      - Air: Air Nomads / Air / `#f2c46d`
      - Water: Water Tribe / Water / `#5aa7e0`
      - Spirit: Spirit / Spirit / `#9a7bd1`
      - Fire: Fire Nation / Fire / `#e8543a`
      - Earth: Earth Kingdom / Earth / `#6fa356`
      - Neutral: Neutral / Neutral / `#b9ab95`
    - `books`:
      - `kicker`/`title`/`el`/`places`/`bossName` from today's `BOOK_INFO` and `BOSS_NAMES`;
      - `hue` from `BOOK_HUE`;
      - `backdrop` from `fx.js` `THEMES[1..3]`, with `drift: 1, 1, 2`;
      - `roster`/`elites`/`boss` from `src/sets/tla/enemies.js`.
    - `events: EVENTS`, `enemyArt`: today's `ARCH` table.
    - `text: { book: "Book", books: "Books", element: "element", surge: "Avatar State", surgeHint: "All four bending elements in one turn" }`
    - `names: { charm: {}, offering: {}, tag: { team: "Team Avatar" } }`
    - The UI keeps its own tables until Task 7 switches to these.

- [ ] **Step 1: Write the failing tests** `tests/unit/themes.test.mjs`:
  - `themeOf({}).id === 'avatar'`, and `themeOf({ theme: 'nope' })` returns a registered theme without throwing;
  - `registerTheme` rejects a duplicate id and a theme with no `books[3]`;
  - Avatar Book 1 roster ids are `['fn_soldier','komodo_rider','pirate','navy_marine','hungry_spirit','canyon_crawler']`; every Book has 6/3/1;
  - event keys are `['library','cabbage','divide','fortune','dojo','swamp','jasmine','oasis','fire_days','tunnel']`;
  - with a test theme `{ id: 'test-plain', …minimal books… }` registered, `eligible({ theme: 'test-plain', sets: ['TLA'], jokers: [], ownedKeys: <all legend keys>, book: 3 }, 'elite', [])` contains no `kind: 'legend'`, while the same run with `theme: 'avatar'` contains all 16. A run with `sets: ['TST']` (Task 2's test set) never gets `lesson_scroll`;
  - `eventById({ theme: 'avatar' }, 'n_nope')` is `MISSING_EVENT`.

  Then add `'every colour pair completes all three Books under the Avatar theme'` to `tests/legacy-parity.test.cjs` (it runs the built engine, which `autoplay` needs). For every pair `p` in `PAIRS`:
  - `neu.ctx.createRun({ seed: 'PAIR-' + p, colours: p.split('') })` with `autoplay(…, { forceWin: true })` ends `won`;
  - the enemy ids seen include `zhao`, `azula_catacombs` and `ozai`, and every one is in the Avatar rosters;
  - every event seen is an Avatar event id.
- [ ] **Step 2:** Run `npm run test:quick`. Expected: FAIL (`themes.js` is missing).
- [ ] **Step 3: Implement.**
  - Move the data with `git mv` and split off the helpers.
  - Register `AVATAR_THEME` and `AVATAR_LEGENDS` in `src/content.js`.
  - Change `journey.js`'s `EVENTS[...]` lookups to `eventById(st.run, id)`.
- [ ] **Step 4: Verify.**
  - `npm run check && npm run test:quick`: legacy parity must stay green, because content moved but nothing changed.
  - Then `npm test`.
- [ ] **Step 5:** Commit: `feat(journey): theme registry; Avatar theme holds today's enemies, events and Legends`.

---

### Task 6: The neutral theme

**Files:**
- Create: `src/themes/neutral/enemies.js`, `src/themes/neutral/events.js`, `src/themes/neutral/theme.js`, `tests/unit/neutral.test.mjs`
- Modify: `src/content.js`, `build.config.json`

**Interfaces:**
- Consumes: the theme shape, `ruleOf`, the `event-kit` helpers (Task 5).
- Produces `NEUTRAL_THEME` (`id "neutral"`, `name "Neutral"`):
  - **colours:** `name` = `short` = White, Blue, Black, Red, Green, Colourless (Air, Water, Spirit, Fire, Earth, Neutral). The `hex` values equal the Avatar theme's.
  - **books.** Every Act has `el: "Neutral"`.

    | Act | kicker | title | places | bossName | hue | backdrop (sky, horizon, far, near, moon, mote; drift) |
    |---|---|---|---|---|---|---|
    | 1 | Act I | The Road | Crossroads, Mill Town, the Old Bridge | The Toll Knight | `#c9c4d8 #34364a #0c0d14` | `#1b1e2a #3d4052 #2c3040 #1a1d29 #d6d0c0 #d8d3c4`; 1 |
    | 2 | Act II | The Wilds | Thornwood, the Sunken Fen, the High Pass | The Mirror Witch | `#a9d0b8 #21402f #08130d` | `#14211f #34463f #26372f #15241f #c9d3b5 #c2d0b0`; 1 |
    | 3 | Act III | The Citadel | The Outer Wall, the Undercroft, the Throne of Ash | The Ashen King | `#f0b39a #5a2420 #170708` | `#24171a #53373a #3c282c #26181c #e2c3a0 #e0b28c`; 2 |

  - **Enemies:** each slot copies the Avatar slot of the same Book and index. Same `armor`, `trait`, `pattern`, `phases` (`atHpPct`, `pattern`), `copyJoker`, and `rule.id`/`phases[].rule.id`. New `id`, `name` and rule `text`:

    | Book | roster (6), in Avatar order | elites (3) | boss |
    |---|---|---|---|
    | 1 | `n_bandit` Road Bandit, `n_boar_rider` Boar Rider, `n_cutthroat` Cutthroat, `n_militia` Militia Sergeant, `n_ghoul` Hungry Ghoul, `n_cave_spider` Cave Spider | `n_war_wagon` War Wagon ("Red cards give half Block"), `n_river_serpent` River Serpent, `n_crossbow` Crossbow Squad | `n_toll_knight` The Toll Knight; phase: "The bridge is sealed: Blue cards deal no damage until you play a Black card" |
    | 2 | `n_hexer` Hedge Hexer, `n_dune_raider` Dune Raider, `n_pit_fighter` Pit Fighter, `n_wasp_swarm` Wasp Swarm, `n_gate_warden` Gate Warden, `n_mole` Burrowing Mole | `n_hermit` Mountain Hermit ("Green cards cost +1"), `n_spymaster` The Spymaster (Long Feng's rule text, unchanged), `n_archivist` The Archivist ("Each card drawn beyond 5 in a turn costs 2 HP") | `n_mirror_witch` The Mirror Witch: "The witch mirrors you: her next attack gains +1 damage per 2 peak Flow this turn. Lightning ignores half your Block" |
    | 3 | `n_royal_guard` Royal Guard, `n_jailer` Jailer, `n_battle_mage` Battle Mage, `n_shade` Shade, `n_siege_kite` Siege Kite, `n_iron_golem` Iron Golem | `n_bombardier` The Bombardier, `n_eclipse_knight` Eclipse Knight ("Red cards deal half damage"), `n_twin_blades` Twin Blades | `n_ashen_king` The Ashen King; phase: "The ash falls: enemy hits ×1.25, and your most-played colour costs +1" |

    `enemyArt` maps each neutral id to the silhouette of its Avatar slot.
  - **Events** (6). Each one copies the `req`/`apply` logic of the Avatar event named in brackets, with new wording. The neutral texts call charms "Charm", never "Joker".
    - `n_peddler` Travelling Peddler [cabbage]
    - `n_ravine` The Ravine [divide]
    - `n_drill_yard` Drill Yard [dojo]
    - `n_still_pool` Still Pool [swamp]
    - `n_shrine` Wayside Shrine [jasmine]
    - `n_card_sharp` Card Sharp [fire_days]
  - **text:** `{ book: "Act", books: "Acts", element: "colour", surge: "Convergence", surgeHint: "White, Blue, Red and Green in one turn" }`
  - **names:**
    - charm: `pai_sho_pro` "Practice Dummy", `cabbage_cart` "Merchant's Cart", `glider_staff` "Wind Staff", `cosmic_fire` "Comet Shard";
    - offering: `mend` "Healing Draught", `purify` "Cleansing Rite", `tide_turn` "Turning Ink", `focus` "Focus Stone";
    - tag: `team` "Teamwork".

- [ ] **Step 1: Write the failing tests** `tests/unit/neutral.test.mjs`:
  - `themeOf({ theme: 'nope' }).id === 'neutral'`;
  - each Act has 6/3/1, every id starts with `n_`, and all ids are unique;
  - **mirror check:** for every slot, `{ armor, trait, pattern, phases with rule ids only, copyJoker, rule id }` deep-equals the Avatar slot's;
  - there are exactly 6 events, ids start with `n_`, and every event has a choice with no `req` (a safe way out);
  - **franchise scan:** read the three neutral source files as text and assert none matches `/Avatar|Aang|Zuko|Azula|Ozai|Zhao|Iroh|Katara|Sokka|Toph|Appa|Momo|Nation|Tribe|Kingdom|Nomad|bend|Ba Sing Se|Omashu|Joker|\bBook\b/`.

  Then add to `tests/legacy-parity.test.cjs`, `'a neutral run completes all three Acts'`:
  - `createRun({ seed: 'NEUTRAL-1', colours: ['W', 'B'], theme: 'neutral' })` with `forceWin` ends `won`;
  - every enemy and event id seen starts with `n_`;
  - no offered charm is a Legend.
- [ ] **Step 2:** Run `npm run test:quick`. Expected: FAIL (`neutral` isn't registered).
- [ ] **Step 3: Implement** the three modules and register `NEUTRAL_THEME` in `src/content.js`.
- [ ] **Step 4: Verify.** `npm run check && npm run test:quick`.
- [ ] **Step 5:** Commit: `feat(journey): neutral theme, Acts I–III`.

---

### Task 7: Theme-driven Journey UI

**Files:**
- Create: `tests/journey-sets.test.cjs` (browser suite; it gets more groups in Task 8)
- Modify: `src/engine/themes.js` (`themeText`, `bookLabel`), `src/data/jokers.js`, `src/data/items.js`, `src/engine/enemy.js` (text tokens only), `src/ui/journey.js`, `src/ui/cardview.js`, `src/ui/fx.js`, `src/boosters/21-resume.js`, `src/ui/index.js`, `package.json` (add `node tests/journey-sets.test.cjs` to `test`, after friends-beta), `tests/unit/themes.test.mjs`, `tests/legacy-parity.test.cjs`

**Interfaces:**
- Consumes: the theme shape, `themeOf` (Task 5); `NEUTRAL_THEME` (Task 6); `surgeOf`/`mechanicsFor` (Task 2); `COLOUR_ELEMENT` (Task 1).
- Produces:
  - `themeText(theme, s) -> string`:
    - `{Air}` `{Water}` `{Spirit}` `{Fire}` `{Earth}` `{Neutral}` → `theme.colours[el].short`;
    - `{element}` → `theme.text.element`, `{book}` → `theme.text.book`, `{books}` → `theme.text.books`;
    - other braces are left alone.
  - `bookLabel(run) -> string`: `` `${themeOf(run).text.book} ${b}` `` with `b` = `run.book` clamped to the integers 1–3. Only theme data, never save strings. For an Avatar run this gives "Book 1", which keeps the friends-beta `/Book 1/` check unchanged. Export it as `BBJ.bookLabel`, plus `BBJ.themeIds` and `BBJ.themeById`.
  - **Data texts become tokens.** Under Avatar they render exactly as today:
    - `element_focus`: "Same-{element} chains give +1 more Flow"
    - `two_elements`: "Switching between two different {element}s gives +1 Flow"
    - `glider_staff`: "{Air} Guards +4; Gusts also give 2 Block"
    - `spirit_lens`: "{Spirit} cards resolve at +3 Flow"
    - `cosmic_fire`: "At Flow 8+, {Fire} Strikes hit twice"
    - `tide_turn`: "Convert up to 3 cards to one {element}"
    - `HEXES`: "{Water} cards cost +1 this turn" and "{Fire} cards cost +1 this turn"
    - Legend texts stay literal.
  - **`journey.js` changes:**
    - Delete `ELEM_COLOR`, `BOOK_INFO`, `BOOK_HUE` and `ARCH`. Every former use reads `T = themeOf(st.run)`, or the setup's theme on the start screen:
      - `glyph(el, size)` colours from `T.colours[el].hex`;
      - Book kicker, title, places and boss from `T.books[b]`;
      - enemy art from `T.enemyArt[id] || "soldier"` and `T.books[b].hue`.
    - `NODE_NAME.boss = "{book} boss"` and `NODE_DESC.boss = "The {book}'s boss, with its own rules. Win to move on."`. Render both, and every charm, offering and hex text, through `themeText`.
    - Charm names come from `T.names.charm[id] || j.name`, offering names from `T.names.offering[id] || it.name`.
    - The Ally token shows as `` `${T.colours[el].short} Ally` ``.
    - Tide Turn chips are labelled with `T.colours[el].short`.
    - The Strike/Defend art element is `COLOUR_ELEMENT[st.run.colours[0]]`.
    - Surge: the name, uppercase overlay title and Flow tooltip come from `T.text.surge` and `T.text.surgeHint`. The overlay orbs come from `surgeOf`'s `els` for `mechanicsFor(st.run.sets)`. Without a surge, the tooltip has no surge sentence and the overlay never shows.
    - Start-screen and summary copy use `{book}`/`{books}`/`{element}` tokens, for example "Three {books}, fifteen floors each." and "All three {books} cleared."
    - `ownedKeys().length} of 262` uses the number of Journey cards in the selected sets.
    - `bd.setTheme(`${T.id}:${book}`, T.books[book].backdrop)`.
  - `cardview.js`: `tagName(t, theme)` returns `theme.names.tag[t] ?? TAG_NAME[t] ?? t`.
  - `fx.js`: `setTheme(key, palette)` uses `palette` when given; its `drift` replaces the `theme===3` check. `setTheme('none')` is unchanged.
  - `21-resume.js`: "Book ${b.book}" becomes `BBJ.bookLabel(run)` (escaped, like the other fields).
  - `_newRun(seed, opt)`: a string is a legacy `nation` (as today); an object passes `{ colours, sets, theme }` to `createRun`.
  - Keep `continueBtn` and `nodeRest` free of new names; they have no themed text.

- [ ] **Step 1: Write the failing tests.**
  - `tests/unit/themes.test.mjs`:
    - `themeText(AVATAR_THEME, '{Air} Guards +4') === 'Air Guards +4'`;
    - `themeText(NEUTRAL_THEME, '{Air} Guards +4') === 'White Guards +4'`;
    - `{element}` → `element` / `colour`;
    - `'{Foo}'` is unchanged;
    - `bookLabel({ theme: 'neutral', book: 2 }) === 'Act 2'`, and `bookLabel({ book: '<img>' }) === 'Book 1'`.
  - `tests/legacy-parity.test.cjs`: every `JOKERS` text, every `OFFERINGS` text and every `HEXES` text of the shipped build equals `themeText(avatar, new text)` for the same id.
  - `tests/journey-sets.test.cjs`: same harness style as `friends-beta.test.cjs` (fresh isolated profile, `#debug`, page errors fail the group).
    - Group **"no raw placeholders"**:
      - For `{ colours: ['U','R'] }` and then `{ colours: ['W','B'], theme: 'neutral' }`, call `BBJ._newRun(seed, opt)`.
      - Visit the start screen, map, `_debugGoto('fight')`, `'shop'`, `'rest'`, `'event'`, and a reward (win the fight by setting `BBJ._state.run.fight.enemy.hp = 0` and clicking End turn).
      - Then the summary: use the in-page two-step Abandon on the Journey start screen, as `friends-beta.test.cjs`'s "resume and abandon" group does.
      - On each screen, `#journeyRoot` text plus all `[title]` attributes must not match `/\{[A-Za-z]+\}/`.
    - Group **"neutral run shows no Avatar names"**:
      - The same screens under neutral. Collect text and titles outside `.jc` card faces.
      - Assert none matches `/Avatar|Book|Water Tribe|Fire Nation|Earth Kingdom|Air Nomads|Zhao|Azula|Ozai|Pai Sho|Cabbage|Glider/`.
      - The HUD shows "Act I".
    - Group **"Avatar run reads as before"**: a `UR` run's map header shows "Book One: Water" and the boss "Admiral Zhao".
- [ ] **Step 2:** Run `npm run build && node tests/journey-sets.test.cjs`. Expected: FAIL (`_newRun` ignores options, and `{Air}` shows raw until the UI renders tokens).
- [ ] **Step 3: Implement** the changes above.
- [ ] **Step 4: Verify.**
  - `npm test`: all suites green, including visual (11 groups) and friends-beta (14).
  - Then `npm run screens`, and look at `test-output/screens/12-map.png` and `21-fight*.png`: the Avatar visuals look as before.
- [ ] **Step 5:** Commit: `feat(ui): Journey names, colours, Books and backdrop come from the run's theme`.

---

### Task 8: Run setup: sets, colour pair, start charm

**Files:**
- Create: `src/styles/journey-sets.css`
- Modify: `src/ui/journey.js` (`renderStart`, `startRun`, resume card, summary), `src/boosters/17-journey-mount.js`, `build.config.json` (stylesheet), `tools/capture.cjs` (new `11-journey-setup` shot, and a neutral map shot `13-neutral-map`), `tests/journey-sets.test.cjs`, `README.md` (Journey description: colour pairs, sets, themes; test table row for the two new suites)

**Interfaces:**
- Consumes: `PAIRS`, `pairId`, `journeySets`, `journeyOwnership`, `setupSets` (Task 1); `DECK_TYPES` (`cards.js`); themes and `bookLabel` (Tasks 5–7).
- Produces:
  - **Mount** (`17-journey-mount.js`) passes:
    - `ownership: sets => BBJ.journeyOwnership({ cards: BASE, printings: BASE.concat(specList(), ETERN), copiesOf: c => (S.coll[cardKey(c)] || 0) + (S.foil[cardKey(c)] || 0), sets })`
    - `ownedSets: () =>` the set codes of every key in `S.coll`/`S.foil` with copies > 0
    - `pairNames`: `DECKS.arch`'s `name`, keyed by `pairId(a.id.split(''))`
    - `journey.js` uses `L.ownership(sets)` in place of its own `ownedKeys`/`ownedStars`.
  - **Start screen state:** `st.setup = { sets, pair, theme }`, initialised from `setupSets({ journey: journeySets().map(s => s.code), owned: L.ownedSets() })`. `st.nation` is gone.
  - **Steps on one screen:**
    1. **Sets:**
       - if `showStep`: one toggle chip per choice (set `name`) plus "All my sets". At least one stays selected.
       - otherwise one line: "Cards from {set name}".
    2. **Colours:** 10 buttons in `PAIRS` order. Each shows:
       - both glyphs;
       - "{name A} & {name B}", from the theme `themeForSets(sets)`, or the debug theme;
       - `L.pairNames[pair]` when the sets are exactly `["TLA"]`;
       - both colours' `DECK_TYPES` tag names.
       - The Begin button reads "Begin: Water Tribe & Fire Nation", or "Pick two colours to begin" (disabled).
    3. **Start charm:** today's `pending.kind === "start"` screen, unchanged.
  - **Debug only:** a "Theme" select ("Set theme" plus every `themeIds()` entry by `name`), saved in `st.setup.theme`.
  - `startRun(seed)` calls `createRun({ seed, colours: st.setup.pair.split(''), sets: st.setup.sets, theme: st.setup.theme || undefined, ...L.ownership(st.setup.sets) })`.
  - The resume card and the summary show the run's colours (glyphs and theme names) and `bookLabel`/kicker in place of the nation.

- [ ] **Step 1: Write the failing browser groups** in `tests/journey-sets.test.cjs`:
  - **"fresh player picks a pair":**
    - fresh profile without `#debug`, no cards bought; open the Journey tab;
    - the set step is the single line "Cards from Avatar: The Last Airbender" (no chips);
    - there are 10 `[data-pair]` buttons; click `UR` and Begin; pick start charm 0; the map is visible;
    - `bb.run` has `v 3`, colours `["U","R"]`, sets `["TLA"]`, theme `"avatar"`, no `nation`, 12 deck cards.
  - **"v2 save resumes and is backed up":**
    - in `history/3-visual-edition.html#debug` on a fresh profile: `BBJ._newRun('OLD-FIRE', 'fire')`, `_debugGoto('fight')`, play one card;
    - `raw = localStorage['bb.run']`; then go to the new build;
    - the Journey resume card names "Fire Nation"; Resume shows the same hand (compare card uids with `JSON.parse(raw).fight.hand`);
    - `localStorage['bb.backup.run-v2'] === raw`;
    - after ending the turn, `bb.run` has `v 3`, `colours ["R"]`, `nation "fire"`.
  - **"old build opens a pair run":**
    - new build: `_newRun('PAIR-OLD', { colours: ['U','R'] })`, `_debugGoto('fight')`;
    - go to `history/3-visual-edition.html#debug` with the same profile: no page errors; Journey shows "Run in progress"; Resume shows the fight;
    - back to the new build: `bb.run` still has `colours ["U","R"]`, `theme "avatar"`.
  - **"debug theme select":** `#debug`; choose Theme "Neutral", pair `WB`, Begin, charm 0; the HUD shows "Act I"; `bb.run.theme === "neutral"`.
- [ ] **Step 2:** Run `npm run build && node tests/journey-sets.test.cjs`. Expected: FAIL (no `[data-pair]`).
- [ ] **Step 3: Implement** the mount glue, the setup screen, the styles and the capture shots.
- [ ] **Step 4: Verify.**
  - `npm test`: every suite green: unit, combat 46, progression 47, legacy-parity, browser 12, visual 11, friends-beta 14, journey-sets.
  - `npm run screens`: check `11-journey-setup.png` at 1440 and on the 390 px phone shot. The 10 pair buttons wrap without horizontal scroll.
  - `node tools/build.mjs`: the build reports its size; note it in the commit body.
- [ ] **Step 5:** Commit: `feat(journey): run setup with sets, colour pair and start charm`.

---

## M2 exit (spec §5) → where it is proven

| Exit criterion | Proof |
|---|---|
| A migrated legacy single-colour TLA run plays the same as today | `tests/legacy-parity.test.cjs`: per-step equality with the shipped engine, natural and all-Books, and the mid-fight v2 resume (Tasks 2–5) |
| Existing combat and progression tests pass unchanged | `npm test`, with those files untouched (Global Constraints) |
| A new TLA colour-pair run under the Avatar theme completes | legacy-parity "every colour pair completes all three Books" (Task 5); browser "fresh player picks a pair" (Task 8) |
| A neutral-theme run completes | legacy-parity "a neutral run completes all three Acts" (Task 6); browser neutral groups (Tasks 7, 8) |
| v2 saves load and resume | unit `migrateRun` (Task 4); browser "v2 save resumes and is backed up" (Task 8); visual "pre-visual … resume unchanged" |

Out of scope for M2:
- moving TLA's catalog JSON into `src/sets/tla/` (M3);
- a set picker in the pack shop (M3);
- any balance change (M4).
