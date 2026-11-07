# M1 Friends Beta Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the recovered TLA game into a shareable friends beta: an earned economy with starter and daily gifts, star-protected selling, first-time tips, first-class resume, save export/import, hosting, and the two cosmetic fixes.

**Architecture:**
- New logic lives in small ES modules (`src/economy/`, `src/save/`, `src/ui/tips.js`, plus additions to `src/engine/run.js`). They are bundled into the existing `BBJ` IIFE and re-exported from `src/ui/index.js`.
- The classic pack-simulator script (`src/boosters/`) only glues DOM and the `S` state to them, through `BBJ.*`.
- Startup moves into a post-bundle `src/boot.js` so load-time code can use `BBJ`.
- Pure logic is tested with `node:test`; game wiring is tested with Playwright.

**Tech Stack:** vanilla JS (ES modules + classic script fragments), `tools/build.mjs`, `node:test` (Node 22), Playwright 1.64.1 with system Chromium (`CHROMIUM_PATH`), GitHub Actions Pages.

**Spec:** `docs/superpowers/specs/2026-11-07-bending-boosters-design.md`, sections 3, 4, 10 and the M1 row of 11.

## Global Constraints

- One self-contained HTML; no server; play money only; keep the fan attribution in Settings.
- Journey module rules (README, "How the build works"):
  - unique top-level names across all modules;
  - only `import { a } from "./x.js";` at the top, followed by one blank line;
  - `export` only at the start of a top-level declaration line;
  - list new modules in `build.config.json`;
  - `npm run check` must pass.
- New logic goes into ES modules. `src/boosters/*.js` only does glue (DOM, `S`, `save()`).
- Economy values from the spec:
  - starting bankroll **$50**;
  - starter gift **3 free Play Boosters** on first launch;
  - **1 free Play Booster per local calendar day; unclaimed packs bank up to 3**;
  - streak cash **day 1 $5, day 2 $5, day 3 $10, day 4 $10, day 5 $15, day 6 $15, day 7 and later $20**; **missing a calendar day resets the streak to day 1**;
  - **Journey is always free to enter**;
  - selling pays **60% of market**;
  - **Journey-eligible cards are never sold below 12 copies**; other cards keep the user's setting (**default 4**).
- **"+ Add funds" only in debug mode (`#debug`).**
- Local date for gifts and streaks. All per-day logic goes through `src/economy/clock.js`.
- Every save change is versioned. Migrations back up the old value before writing.
- Tooling never writes to the Desktop copy.
- Existing suites (combat, progression, browser, visual) stay green. They are edited only where a task states an intended behaviour change.
- Run commands from the project root. Browser suites need `CHROMIUM_PATH` if `/usr/bin/chromium` is absent.

## Decisions beyond the spec (owner confirms in plan review)

1. **First launch counts as streak day 1.** A new player gets 3 starter packs, 1 daily pack and $5, so starts with $55 and 4 free packs.
2. **The daily record survives a reset** ("Reset everything" and "Reset with seed"), so resets can't farm daily cash. A reset does re-grant the 3 starter packs.
3. **Pack price, box price, buylist % and starting money become debug-only settings,** for the same reason "+ Add funds" does.
4. **Export skips** the rebuildable caches `bb.imgidx` and `bb.prices`, and `bb.backup` itself.
5. **Tips are off in `#debug` unless the hash contains `tips`,** which keeps the automated suites deterministic. The gift banner sits inline in the page and never blocks input.
6. **Free packs** open from the big pack and from an "Open free pack" button. "Open 1/10/30" always pay.
7. **Abandoning a run pays like a defeat:** you get the fight, elite and boss money already earned.
8. **Journey payout values stay in `src/engine/run.js` (`PAYOUT`)**, because the test harness evaluates the engine region on its own. `ECONOMY` holds the M1 numbers; the M4 balance pass can consolidate the two.

## Review Focus

1. **System clock moved backwards** (manual change, timezone travel): no grant, no streak change, no crash. Task 2.
2. **Day counting across month and year ends and DST changes:** exact whole-day gaps. Task 2.
3. **Importing a foreign, truncated or tampered file:** a clear error, and the current save is untouched. Task 9.
4. **A storage write failing during a daily grant or an import:** nothing granted twice, nothing half-written, and the player is told. Tasks 4 and 9.
5. **Odd v2 saves** (missing settings or fields): they migrate without a crash, and the old `S.v!==2` branch never wipes the wallet. Task 3.

## File Structure

| Path | Responsibility |
|---|---|
| `src/boot.js` (replaces `src/journey-recovery.js`) | Startup sequence, run after `BBJ` exists |
| `src/economy/clock.js` | `localDayKey`, `daysBetween` |
| `src/economy/config.js` | `ECONOMY` value table |
| `src/economy/daily.js` | `dailyGrant` (pure) |
| `src/economy/sell.js` | `sellExtrasPlan` (pure) |
| `src/save/crc32.js` | `crc32` |
| `src/save/migrate.js` | `MAIN_SAVE_VERSION`, `migrateMain` |
| `src/save/transfer.js` | `collectSave`, `checkSaveFile`, `applySaveFile` |
| `src/ui/tips.js` | tip copy and the tip bubble |
| `src/boosters/20-gifts.js` | glue: gifts, free packs, the broke modal, the home resume card |
| `src/styles/main/18-friends-beta.css` | banner, free-pack button, broke modal, tip bubble, home resume card |
| `tests/unit/*.test.mjs` | pure-module tests |
| `tests/m1.test.cjs` | Playwright scenarios for this milestone |
| `.github/workflows/pages.yml` | build, quick tests, publish |

New Journey modules go in `build.config.json` **after `src/ui/fx.js` and before `src/ui/journey.js`**, in this order: `clock`, `config`, `daily`, `sell`, `crc32`, `migrate`, `transfer`, `tips`. That keeps them outside the engine region the test harness extracts.

---

### Task 1: Repository baseline and boot sequence

**Files:**
- Create: `tests/unit/build-layout.test.mjs`
- Rename: `src/journey-recovery.js` → `src/boot.js`
- Modify: `src/boosters/19-wire-up.js`, `build.config.json`, `src/index.html`, `package.json`

**Interfaces:**
- Produces: slot `boot` (was `journey-recovery`), which holds the whole startup.
- Produces: `npm run test:unit` → `node --test "tests/unit/*.test.mjs"`, included in `test` and `test:quick` right after `check`.

- [ ] **Step 1: Baseline commit**

  Run `node tools/build.mjs --check history/3-visual-edition.html` (expect "identical"), then:
  ```bash
  git init -b main && git add -A && git commit -m "chore: recovered source baseline (build == history/3-visual-edition.html)"
  ```

- [ ] **Step 2: Write the failing test** in `tests/unit/build-layout.test.mjs`:
  ```js
  import test from 'node:test'; import assert from 'node:assert/strict';
  import { build } from '../../tools/build.mjs';
  test('startup runs after the module bundle', () => {
    const { html } = build();
    const bundle = html.indexOf('var BBJ = (() => {'), boot = html.indexOf('load(); initNameKeys();');
    assert.ok(bundle > 0 && boot > bundle);
  });
  ```

- [ ] **Step 3: Run it.** `node --test "tests/unit/*.test.mjs"` should FAIL (boot index < bundle index).

- [ ] **Step 4: Implement.**
  - Move the last two lines of `src/boosters/19-wire-up.js` (`load(); …loadImgIndex();` and the `h0`/`showView(h0)` line) to the top of `src/boot.js`, above the existing recovery block.
  - Rename the slot in `build.config.json` and the `<!-- @slot journey-recovery -->` marker in `src/index.html` to `boot`.
  - Add the `test:unit` script.

- [ ] **Step 5: Verify.** `npm test` → every suite passes, including the new unit test.

- [ ] **Step 6: Commit.** `git commit -am "refactor: run startup after the module bundle (src/boot.js)"`

### Task 2: Clock and daily grant logic

**Files:**
- Create: `src/economy/clock.js`, `src/economy/config.js`, `src/economy/daily.js`, `tests/unit/clock.test.mjs`, `tests/unit/daily.test.mjs`
- Modify: `build.config.json`, `src/ui/index.js` (re-export all four names below)

**Interfaces (produces):**
- `localDayKey(date = new Date()): string`: local calendar date as `"YYYY-MM-DD"`.
- `daysBetween(fromKey: string, toKey: string): number`: whole days, `to − from`, computed from `Date.UTC` of the key parts (DST-proof).
- `ECONOMY = { startMoney: 50, starterPacks: 3, dailyPackBank: 3, streakCash: [5, 5, 10, 10, 15, 15, 20], protectCopies: 12, keepDefault: 4 }`
- `dailyGrant(record: {last: string, streak: number} | null, today: string): {packs, cash, streak, record}`
  - no record → day 1;
  - same day → nothing;
  - gap 1 → streak + 1;
  - gap > 1 → streak 1, packs `min(ECONOMY.dailyPackBank, gap)`;
  - gap < 0 → nothing, record unchanged;
  - cash = `streakCash[min(streak, 7) − 1]`.

- [ ] **Step 1: Write the failing tests.**
  ```js
  // tests/unit/clock.test.mjs
  import test from 'node:test'; import assert from 'node:assert/strict';
  import { daysBetween, localDayKey } from '../../src/economy/clock.js';
  test('daysBetween across month, year and DST boundaries', () => {
    assert.equal(daysBetween('2026-01-31', '2026-02-01'), 1);
    assert.equal(daysBetween('2026-12-31', '2027-01-01'), 1);
    assert.equal(daysBetween('2026-03-07', '2026-03-09'), 2);
    assert.equal(daysBetween('2026-10-31', '2026-11-02'), 2);
    assert.equal(daysBetween('2026-11-07', '2026-11-05'), -2);
  });
  test('localDayKey uses the local calendar date', () =>
    assert.equal(localDayKey(new Date(2026, 0, 5, 23, 59)), '2026-01-05'));

  // tests/unit/daily.test.mjs
  import test from 'node:test'; import assert from 'node:assert/strict';
  import { dailyGrant } from '../../src/economy/daily.js';
  const rec = (last, streak) => ({ last, streak });
  test('first visit is streak day 1', () =>
    assert.deepEqual(dailyGrant(null, '2026-11-07'), { packs: 1, cash: 5, streak: 1, record: rec('2026-11-07', 1) }));
  test('same day grants nothing', () =>
    assert.deepEqual(dailyGrant(rec('2026-11-07', 1), '2026-11-07'), { packs: 0, cash: 0, streak: 1, record: rec('2026-11-07', 1) }));
  test('consecutive days climb the cash ladder and cap at $20', () => {
    let r = null; const cash = [];
    for (let d = 1; d <= 9; d++) { const g = dailyGrant(r, `2026-11-0${d}`); cash.push(g.cash); r = g.record; }
    assert.deepEqual(cash, [5, 5, 10, 10, 15, 15, 20, 20, 20]);
  });
  test('a missed day resets the streak and banks packs up to 3', () => {
    assert.deepEqual(dailyGrant(rec('2026-11-01', 5), '2026-11-03'), { packs: 2, cash: 5, streak: 1, record: rec('2026-11-03', 1) });
    assert.equal(dailyGrant(rec('2026-11-01', 5), '2026-11-20').packs, 3);
  });
  test('clock moved backwards grants nothing and keeps the record', () =>
    assert.deepEqual(dailyGrant(rec('2026-11-07', 4), '2026-11-05'), { packs: 0, cash: 0, streak: 4, record: rec('2026-11-07', 4) }));
  ```

- [ ] **Step 2: Run them.** `node --test "tests/unit/*.test.mjs"` should FAIL with module not found.

- [ ] **Step 3: Implement** the three modules with the signatures above. Register them in `build.config.json` and re-export them from `src/ui/index.js`.

- [ ] **Step 4: Verify.** `npm run test:quick` → PASS (unit, check, combat, progression).

- [ ] **Step 5: Commit.** `git add -A && git commit -m "feat(economy): day clock and daily grant rules"`

### Task 3: Main save v3 migration

**Files:**
- Create: `src/save/migrate.js`, `tests/unit/migrate.test.mjs`, `tests/m1.test.cjs`
- Modify: `src/boosters/03-state.js`, `build.config.json`, `src/ui/index.js`, `package.json` (append `&& node tests/m1.test.cjs` to `test`)

**Interfaces:**
- Produces `MAIN_SAVE_VERSION = 3`.
- Produces `migrateMain(state: object): {state, from: number}`. It mutates and returns. Step v2→v3 adds, only where absent:
  - `freePacks: 0`
  - `daily: null`
  - `tipsSeen: []`
  - `earned: {daily: 0}`
  - `settings.protect: 12`
  - `settings.tips: true`
  - `v: 3`

  It never touches `money`, `deposited` or the collection. A v3 state comes back unchanged.
- `freshState()` (boosters):
  - `v: 3`
  - `freePacks: BBJ.ECONOMY.starterPacks`
  - `starterPending: true`
  - `daily: null`, `tipsSeen: []`, `earned: {daily: 0}`
  - `DEFAULTS` gains `protect: 12, tips: true`
- `load()` (boosters):
  - the legacy gem branch runs only when `(S.v || 1) < 2` (it is currently `S.v !== 2`, which would wipe v3 wallets);
  - then, if `S.v < BBJ.MAIN_SAVE_VERSION`: write the raw string to `bendingBoosters.v1.bak-v{S.v}`, call `BBJ.migrateMain(S)`, then `save()`.
- `tests/m1.test.cjs` skeleton:
  - `const env = require('./harness/env.cjs')`
  - one browser
  - `async function open(time = '2026-11-07T10:00:00Z', hash = '', {tips = false} = {})`: a context with `{viewport: {width: 1440, height: 1000}, timezoneId: 'UTC'}`, HTTPS blocked, `page.clock.setFixedTime(new Date(time))` before `goto(env.GAME URL + hash)`. Unless `tips`, it then runs `S.settings.tips = false; save(); document.querySelectorAll('.bb-tip').forEach(e => e.remove())` so bubbles never cover controls in other groups. Returns `{c, p}`.
  - a `groups` counter
  - ends with `ALL M1 CHECKS PASSED (n groups)`
  - later tasks add groups before that line.

- [ ] **Step 1: Write the failing tests.**
  ```js
  // tests/unit/migrate.test.mjs
  import test from 'node:test'; import assert from 'node:assert/strict';
  import { migrateMain } from '../../src/save/migrate.js';
  test('v2 save gains v3 fields and keeps wallet and collection', () => {
    const { state, from } = migrateMain({ v: 2, money: 321.45, deposited: 50, coll: { 'TLA:1': 3 }, foil: {}, settings: { price: 6.99, keep: 4 } });
    assert.equal(from, 2); assert.equal(state.v, 3); assert.equal(state.money, 321.45);
    assert.deepEqual(state.coll, { 'TLA:1': 3 }); assert.equal(state.freePacks, 0); assert.equal(state.daily, null);
    assert.deepEqual(state.tipsSeen, []); assert.deepEqual(state.earned, { daily: 0 });
    assert.equal(state.settings.protect, 12); assert.equal(state.settings.tips, true); assert.equal(state.settings.keep, 4);
  });
  test('minimal v2 save without settings migrates', () => {
    const { state } = migrateMain({ v: 2, money: 12 });
    assert.equal(state.money, 12); assert.equal(state.settings.protect, 12);
  });
  test('v3 save comes back unchanged', () => {
    const s = { v: 3, money: 1, freePacks: 2, daily: { last: '2026-11-07', streak: 2 }, tipsSeen: ['packs'], earned: { daily: 5 }, settings: { protect: 8, tips: false } };
    assert.deepEqual(migrateMain(structuredClone(s)).state, s);
  });
  ```
  Then the first m1 group, *"v2 save migrates with backup"*:
  - open with `#debug`;
  - `localStorage.setItem('bendingBoosters.v1', JSON.stringify({v:2, money:321.45, deposited:50, coll:{}, foil:{}, settings:{}}))`;
  - reload;
  - assert `S.v === 3`;
  - assert `JSON.parse(localStorage.getItem('bendingBoosters.v1.bak-v2')).money === 321.45`;
  - assert `S.money === 321.45`.

- [ ] **Step 2: Run them.** Both `node --test "tests/unit/*.test.mjs"` and `node tools/build.mjs && node tests/m1.test.cjs` should FAIL.

- [ ] **Step 3: Implement** `migrate.js` and the `03-state.js` changes described above.

- [ ] **Step 4: Verify.** `npm test` → all suites PASS.

- [ ] **Step 5: Commit.** `git add -A && git commit -m "feat(save): versioned main-save migration to v3 with backup"`

### Task 4: Starter and daily gifts in the game

**Files:**
- Create: `src/boosters/20-gifts.js`, `src/styles/main/18-friends-beta.css`
- Modify:
  - `src/boot.js`
  - `src/boosters/09-opening.js` (`tryOpen`)
  - `src/boosters/15-header.js` (`refreshHeader`)
  - `src/boosters/18-settings.js` (`resetProgress`)
  - `src/boosters/19-wire-up.js` (pack click)
  - `src/index.html` (`#giftBanner` at the top of `#v-open`; `#freeBtn` in `.heroSide`)
  - `build.config.json`
  - `tests/browser.test.cjs`, `tests/visual.test.cjs`, `tests/progression.test.cjs`, `tests/m1.test.cjs`

**Interfaces:**
- Consumes `BBJ.localDayKey`, `BBJ.dailyGrant`, `BBJ.ECONOMY` (Task 2) and the v3 fields (Task 3).
- `applyDailyGift(): {packs, cash, streak, starter: boolean} | null`
  - builds `next = {...S, freePacks, money, earned, daily, starterPending: false}`;
  - if `save(next)` succeeds, `Object.assign(S, next)`;
  - otherwise it toasts "Couldn't save today's gift. It will be offered again." and returns `null`;
  - returns `null` when nothing is due.
  - `boot.js` calls it right after `load()`, then `renderGiftBanner(result)`.
- `renderGiftBanner(g)`: inline, dismissible (`#giftBannerClose`). Lines:
  - "Starter gift: 3 free packs." when `g.starter`;
  - "Day {streak} streak: +${cash} and {packs} free pack(s)." when there's cash or packs.
- `tryOpen(n, free = false)`: when `free`, `n` must be 1 and `S.freePacks ≥ 1`. It decrements `freePacks` and leaves `money`/`packSpend` unchanged.
- The big `#pack` opens a free pack when `S.freePacks > 0`, otherwise a paid one.
- `#freeBtn` reads "Open free pack · {n} left" and is visible only while `freePacks > 0`.
- The reveal footer shows `#againFree` while `freePacks > 0`.
- `resetProgress()` keeps the current `S.daily` in the fresh state.

- [ ] **Step 1: Write the failing m1 groups.**
  ```js
  { // starter and daily gifts
    const { c, p } = await open('2026-11-07T10:00:00Z');
    const W = () => p.evaluate(() => ({ money: S.money, free: S.freePacks, streak: S.daily.streak, packs: S.packs, spend: S.packSpend }));
    assert.deepEqual(await W(), { money: 55, free: 4, streak: 1, packs: 0, spend: 0 });
    const banner = await p.locator('#giftBanner').innerText();
    assert.match(banner, /3 free packs/); assert.match(banner, /\+\$5/);
    await p.locator('#pack').click(); await p.evaluate(() => stageClose());
    assert.deepEqual(await W(), { money: 55, free: 3, streak: 1, packs: 1, spend: 0 });
    await p.reload(); assert.equal((await W()).money, 55);                       // same day: nothing new
    await p.clock.setFixedTime(new Date('2026-11-08T09:00:00Z')); await p.reload();
    assert.deepEqual(await W(), { money: 60, free: 4, streak: 2, packs: 1, spend: 0 });
    await p.clock.setFixedTime(new Date('2026-11-12T09:00:00Z')); await p.reload();
    assert.deepEqual(await W(), { money: 65, free: 7, streak: 1, packs: 1, spend: 0 }); // gap 4 → 3 banked packs
    await c.close(); console.log('PASS starter gift, daily streak, banked packs, free pack opening'); groups++;
  }
  { // a failed gift save is not lost or doubled
    const { c, p } = await open('2026-11-07T10:00:00Z');
    await p.addInitScript(() => { const o = Storage.prototype.setItem; window.__fail = true;
      Storage.prototype.setItem = function (k, v) { if (k === 'bendingBoosters.v1' && window.__fail) throw new Error('quota'); return o.call(this, k, v); }; });
    await p.clock.setFixedTime(new Date('2026-11-08T10:00:00Z')); await p.reload();
    assert.deepEqual(await p.evaluate(() => ({ money: S.money, last: S.daily.last })), { money: 55, last: '2026-11-07' });
    assert.deepEqual(await p.evaluate(() => { window.__fail = false; const a = applyDailyGift(), b = applyDailyGift(); return { a: !!a, b, money: S.money }; }), { a: true, b: null, money: 60 });
    await c.close(); console.log('PASS gift survives a storage failure without doubling'); groups++;
  }
  ```
  Also update the Task 3 group's expected `S.money` to `326.45` (a migrated save gets its day-1 gift).

- [ ] **Step 2: Run.** `node tools/build.mjs && node tests/m1.test.cjs` should FAIL.

- [ ] **Step 3: Implement** the interfaces above. Styles go in `18-friends-beta.css`, which is added to the `styles` slot.

- [ ] **Step 4: Update the existing suites** for the intended change:
  - In the `fresh()` helpers of `tests/browser.test.cjs`, `tests/visual.test.cjs`, `tools/capture.cjs` and the browser part of `tests/progression.test.cjs`, add `S.money=50;S.freePacks=0;` before `save()`. This restores the legacy wallet baseline their assertions use.
  - In `visual.test.cjs`, change the migration assertion from `321.45` to `326.45`.

- [ ] **Step 5: Verify.** `npm test` → all suites PASS.

- [ ] **Step 6: Commit.** `git add -A && git commit -m "feat: starter gift, daily pack and streak cash, free packs"`

### Task 5: Add funds debug-only, broke modal, earned vs spent

**Files:**
- Modify:
  - `src/boosters/15-header.js` (`refreshHeader` sets `$('shopBtn').hidden = !BB_DEBUG`)
  - `src/boosters/09-opening.js` (when funds are short: `BB_DEBUG ? openShop(msg) : showBroke(c)`)
  - `src/boosters/20-gifts.js` (add `showBroke(cost)`)
  - `src/index.html` (wrap the price, box, buylist and start fields in `<div id="econSettings">`)
  - `src/boosters/18-settings.js` (hide `#econSettings` unless `BB_DEBUG`; when not debug, save keeps the stored values for those four)
  - `src/boosters/14-stats.js`
  - `tests/m1.test.cjs`

**Interfaces:**
- `showBroke(cost: number): void` opens the modal with:
  - title "Not enough money";
  - "You need {cost} but have {money}.";
  - three ways to earn: a Journey run (always free, pays when it ends), selling extras, tomorrow's daily gift;
  - buttons `#brokeJourney` → `showView('journey')` and `#brokeCollection` → `showView('collection')`;
  - no deposit buttons.
- Stats:
  - replace the "Net profit/loss" tile with **"Earned vs spent"**, value `earned − S.packSpend` (green when ≥ 0), subtitle `earned $X · spent $Y`;
  - `earned = (S.runIncome || 0) + S.soldIncome + (S.earned?.daily || 0)`;
  - add a **"Daily gifts"** tile showing `S.earned.daily`;
  - leave `S.deposited` in the save untouched.

- [ ] **Step 1: Write the failing m1 group.**
  ```js
  {
    const { c, p } = await open();
    assert.equal(await p.locator('#shopBtn').isVisible(), false);
    await p.evaluate(() => { S.money = 1; save(); }); await p.locator('#open10').click();
    assert.match(await p.locator('#mbody').innerText(), /Not enough money/);
    assert.equal(await p.locator('#mbody [data-o]').count(), 0);
    await p.evaluate(() => { document.getElementById('modal').classList.remove('on'); showView('settings'); });
    assert.equal(await p.locator('#econSettings').isVisible(), false);
    await p.evaluate(() => { S.runIncome = 3; S.soldIncome = 2; S.earned.daily = 5; S.packSpend = 6.99; showView('stats'); });
    assert.match(await p.locator('#moneyTiles').innerText(), /Earned vs spent\s*\$3\.01/);
    const dbg = await open('2026-11-07T10:00:00Z', '#debug');
    assert.equal(await dbg.p.locator('#shopBtn').isVisible(), true);
    await dbg.c.close(); await c.close(); console.log('PASS add funds debug-only, broke modal, earned vs spent'); groups++;
  }
  ```

- [ ] **Step 2: Run.** `node tools/build.mjs && node tests/m1.test.cjs` should FAIL.

- [ ] **Step 3: Implement** as described in Interfaces.

- [ ] **Step 4: Verify.** `npm test` → PASS. If a suite reads the old "Net profit/loss" tile, point it at "Earned vs spent".

- [ ] **Step 5: Commit.** `git commit -am "feat: earned economy UI (add funds debug-only, broke modal, earned vs spent)"`

### Task 6: Star-protected selling

**Files:**
- Create: `src/economy/sell.js`, `tests/unit/sell.test.mjs`
- Modify:
  - `src/boosters/11-shop.js` (`dupesIn`)
  - `src/boosters/12-collection.js` (label and confirm)
  - `src/boosters/13-odds-model.js` (the "Sell extras keeps …" sentence states both limits)
  - `src/boosters/18-settings.js` and `src/index.html` (`#sProtect`, number 0–12, label "Keep for Journey cards (★5 needs 12)")
  - `build.config.json`, `src/ui/index.js` (also re-export `isRunCard`, `starsFromCopies`)
  - `tests/m1.test.cjs`

**Interfaces:**
- `sellExtrasPlan(entries, {keep, protect}): {sell: Array<{key, foil, n}>, starLosses: Array<{name, from, to}>}`
  - `entries` is `Array<{key, name, runCard, reg, foil}>`.
  - **Non-Journey cards:** keep `keep` copies per printing; sell regular copies before foils.
  - **Journey cards:** group by `name`, with total `T`. Sell up to `max(0, T − protect)` copies, taking from the printing with the most regular copies first, regular before foil.
  - `starLosses` lists names where `starsFromCopies(T − sold) < starsFromCopies(T)`.
  - `sell` keeps input order and has no zero entries.
  - `keep` and `protect` are clamped to integers ≥ 0.
- `dupesIn(list)` keeps its return shape `[{c, k, foil, n}]` and builds `entries` through `BBJ.sellExtrasPlan`. For Journey cards it includes every printing of the name (`NAME_KEYS`).
- "Sell all extras":
  - label `Sell all extras (keep {keep} · Journey cards {protect}) · $X`;
  - if `starLosses` is non-empty, the second click opens a modal listing `Name ★from → ★to` with `#sellConfirm` and Cancel instead of selling.
- `#sProtect` is clamped to 0–12 on save.

- [ ] **Step 1: Write the failing tests.**
  ```js
  // tests/unit/sell.test.mjs
  import test from 'node:test'; import assert from 'node:assert/strict';
  import { sellExtrasPlan } from '../../src/economy/sell.js';
  const e = (key, name, runCard, reg, foil = 0) => ({ key, name, runCard, reg, foil });
  test('Journey cards keep 12 across printings; others keep 4', () => {
    const plan = sellExtrasPlan([e('TLA:1', 'Aang', true, 10), e('TLE:9', 'Aang', true, 5), e('TLA:2', 'Island', false, 9)], { keep: 4, protect: 12 });
    assert.deepEqual(plan.sell, [{ key: 'TLA:1', foil: false, n: 3 }, { key: 'TLA:2', foil: false, n: 5 }]);
    assert.deepEqual(plan.starLosses, []);
  });
  test('regular copies sell before foils', () =>
    assert.deepEqual(sellExtrasPlan([e('TLA:3', 'Momo', false, 5, 2)], { keep: 4, protect: 12 }).sell, [{ key: 'TLA:3', foil: false, n: 3 }]));
  test('lowering protection reports star losses', () => {
    const plan = sellExtrasPlan([e('TLA:1', 'Aang', true, 12)], { keep: 4, protect: 4 });
    assert.deepEqual(plan.sell, [{ key: 'TLA:1', foil: false, n: 8 }]);
    assert.deepEqual(plan.starLosses, [{ name: 'Aang', from: 5, to: 3 }]);
  });
  test('nothing to sell at the limits', () =>
    assert.deepEqual(sellExtrasPlan([e('TLA:1', 'Aang', true, 12), e('TLA:2', 'Island', false, 4)], { keep: 4, protect: 12 }).sell, []));
  ```
  Then the m1 group, *"selling protects stars"*:
  - pick `run = BASE.find(c => BBJ.isRunCard(c) && c.r === 'C')` and `other = BASE.find(c => !BBJ.isRunCard(c))`;
  - set `S.coll[cardKey(run)] = 15` and `S.coll[cardKey(other)] = 6` (clearing other printings of `run`'s name);
  - `showView('collection')` and click `#sellAll` twice;
  - assert the counts are now 12 and 4;
  - then set `S.settings.protect = 4`, set the run card back to 12, click `#sellAll` twice;
  - assert `#mbody` contains `★5 → ★3`;
  - click Cancel and assert the count is still 12.

- [ ] **Step 2: Run.** The unit tests and m1 should FAIL.

- [ ] **Step 3: Implement** as described in Interfaces.

- [ ] **Step 4: Verify.** `npm test` → PASS.

- [ ] **Step 5: Commit.** `git add -A && git commit -m "feat: selling extras never drops Journey star levels"`

### Task 7: First-time tips

**Files:**
- Create: `src/ui/tips.js`
- Modify:
  - `src/styles/main/18-friends-beta.css` (`.bb-tip`: fixed bottom-right, max-width 320px, above content and below `.modal`)
  - `src/boot.js` (`configureTips`, then the tip for the initial view)
  - `src/boosters/15-header.js` (`showView` calls `window.BBJ && BBJ.showTip(...)`: `open → packs`, `collection → collection`)
  - `src/boosters/09-opening.js` (`stageOpen` → `reveal`)
  - `src/ui/journey.js`: `renderStart` → `journeyStart`, `renderMap` → `map`, `renderFight` → `fight`, the first `onPlayCard` of a run → `flow`, `renderNode` with `p.kind` shop/rest/event → `shop`/`rest`/`event`
  - `src/index.html` and `src/boosters/18-settings.js` (`#sTips` checkbox "Show tips", `#resetTips` button)
  - `build.config.json`, `src/ui/index.js`, `tests/m1.test.cjs`

**Interfaces:**
- `TIPS: Record<id, {title, text}>` with ids `packs`, `reveal`, `collection`, `journeyStart`, `map`, `fight`, `flow`, `shop`, `rest`, `event`. Copy is at most 2 short sentences each, explaining what the screen is for and the one action to try.
- `configureTips({enabled: () => boolean, seen: () => string[], markSeen: (id) => void}): void`
- `showTip(id): boolean`:
  - no-op (`false`) when disabled, already seen, unknown, or another tip is visible;
  - otherwise appends `<div class="bb-tip" data-tip="{id}" role="note"><b>…</b><p>…</p><button class="btn" data-tip-ok>Got it</button></div>`;
  - "Got it" calls `markSeen(id)` and removes the bubble.
- `resetTips(): void` removes any visible bubble.
- Boot configuration:
  - `enabled: () => S.settings.tips && !(BB_DEBUG && !/tips/.test(location.hash))`
  - `seen: () => S.tipsSeen`
  - `markSeen` pushes the id and calls `save()`.
- `#resetTips` sets `S.tipsSeen = []`, calls `save()` and `BBJ.resetTips()`.

- [ ] **Step 1: Write the failing m1 group.**
  ```js
  {
    const { c, p } = await open(undefined, '', { tips: true });
    const tip = id => p.locator(`.bb-tip[data-tip="${id}"]`);
    assert.equal(await tip('packs').isVisible(), true);
    await tip('packs').locator('[data-tip-ok]').click();
    assert.equal(await p.evaluate(() => S.tipsSeen.includes('packs')), true);
    await p.reload(); assert.equal(await tip('packs').count(), 0);
    await p.evaluate(() => showView('collection')); assert.equal(await tip('collection').isVisible(), true);
    await p.evaluate(() => { showView('settings'); document.getElementById('resetTips').click(); }); await p.reload();
    assert.equal(await tip('packs').isVisible(), true);
    const dbg = await open('2026-11-07T10:00:00Z', '#debug', { tips: true }); assert.equal(await dbg.p.locator('.bb-tip').count(), 0);
    await dbg.c.close(); await c.close(); console.log('PASS first-time tips: show once, dismiss, reset, off in debug'); groups++;
  }
  ```

- [ ] **Step 2: Run.** It should FAIL.

- [ ] **Step 3: Implement** as described in Interfaces, and write the ten tips' copy.

- [ ] **Step 4: Verify.** `npm test` → PASS. Then run `npm run screens` and check that no tip covers the End turn button at 1440×1000 or 1280×720.

- [ ] **Step 5: Commit.** `git add -A && git commit -m "feat: first-time tips"`

### Task 8: Resume card on home, abandon pays out

**Files:**
- Modify:
  - `src/engine/run.js`
  - `src/ui/journey.js` (the abandon flow and `api.resume()`)
  - `src/boosters/20-gifts.js` (`renderHomeResume`)
  - `src/index.html` (`#homeResume` in `#v-open`)
  - `src/boot.js` (call after the gift)
  - `src/boosters/15-header.js` (`showView('open')` re-renders it)
  - `src/ui/index.js`
- Create: `tests/unit/run-summary.test.mjs`

**Interfaces:**
- `abandonRun(run): void` sets `status = 'lost'` and `abandoned = true`, and clears `fight` and `pending`. `payout(run)` itself is unchanged.
- `runSummaryFromSave(raw: string | null, epoch: string | null): {book, floor, hp, maxHp, gold, deck: number} | null`. Returns `null` when:
  - the save is missing or won't parse;
  - `(v || 1) < SAVE_VERSION`;
  - the epoch doesn't match;
  - the status isn't `map`, `node` or `fight`.
- Journey `api.resume(): boolean` does exactly what the `#jxResume` click does; it returns `false` when there's no resumable run.
- Abandon:
  - confirm text: `Abandon this run? You'll be paid for what you've won so far: $X.`
  - on OK: `st.run = saved; abandonRun(st.run); renderSummary()` (the existing settlement is idempotent).
- `renderHomeResume()`:
  - when the summary is non-null, shows "Run in progress · Book {n}, floor {f} · {hp}/{maxHp} HP · {deck} cards" and `#homeResumeBtn`;
  - the button runs `showView('journey'); JOURNEY.resume()`;
  - otherwise the card is hidden.

- [ ] **Step 1: Write the failing tests.**
  ```js
  // tests/unit/run-summary.test.mjs
  import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs';
  import { setCatalog } from '../../src/engine/catalog.js';
  import { createRun, abandonRun, payout, runSummaryFromSave } from '../../src/engine/run.js';
  setCatalog(JSON.parse(fs.readFileSync('src/catalog/data.json', 'utf8')).base);
  const save = o => JSON.stringify({ v: 2, status: 'map', book: 2, floor: 7, hp: 31, maxHp: 60, gold: 40, deck: new Array(14).fill({}), epoch: null, ...o });
  test('summary of an in-progress save', () =>
    assert.deepEqual(runSummaryFromSave(save({}), null), { book: 2, floor: 7, hp: 31, maxHp: 60, gold: 40, deck: 14 }));
  test('no summary for missing, broken, finished, old or stale saves', () => {
    for (const raw of [null, '{', save({ status: 'lost' }), save({ v: 1 })]) assert.equal(runSummaryFromSave(raw, null), null);
    assert.equal(runSummaryFromSave(save({ epoch: 'a' }), 'b'), null);
  });
  test('abandoning pays like a defeat', () => {
    const run = createRun({ seed: 'ABANDON', nation: 'water', startCharmId: 'big_hitter' });
    run.stats.fights = 3; run.stats.elites = 1; abandonRun(run);
    assert.equal(run.status, 'lost'); assert.equal(payout(run), 5.5);
  });
  ```
  Then the m1 group, *"resume from home and abandon payout"* (`#debug`):
  - `showView('journey'); BBJ._newRun('HOME-RESUME','water'); BBJ._debugGoto('fight')`;
  - set `stats.fights = 2` in the stored `bb.run` JSON;
  - reload. `showView` rewrote the hash to `#journey`, so debug is off now; run `showView('open')`;
  - assert `#homeResume` text matches `/Book 1, floor \d+ · \d+\/\d+ HP · \d+ cards/`;
  - click `#homeResumeBtn` and assert `BBJ._state.run.seed === 'HOME-RESUME'`;
  - reload, `showView('journey')`, accept the dialog, click `#jxAbandon`;
  - assert `S.money` rose by 2, `S.journey.runs === 1` and `localStorage.getItem('bb.run') === null`.

- [ ] **Step 2: Run.** It should FAIL.

- [ ] **Step 3: Implement** as described in Interfaces.

- [ ] **Step 4: Verify.** `npm test` → PASS.

- [ ] **Step 5: Commit.** `git add -A && git commit -m "feat: resume card on home; abandoning a run pays what was won"`

### Task 9: Save export and import

**Files:**
- Create: `src/save/crc32.js`, `src/save/transfer.js`, `tests/unit/transfer.test.mjs`
- Modify:
  - `src/index.html` (a Settings "Save file" block: `#exportSave`, `#importSave`, hidden `#importFile` `accept=".json"`, `#saveFileMsg`)
  - `src/boosters/18-settings.js`
  - `build.config.json`, `src/ui/index.js`, `tests/m1.test.cjs`

**Interfaces:**
- `crc32(text: string): number`: IEEE polynomial `0xEDB88320` over UTF-8 bytes, unsigned.
- `collectSave(storage, now = new Date()): {app: 'bending-boosters', v: 1, exportedAt, keys, crc}`
  - `storage` is localStorage-shaped: `length`, `key(i)`, `getItem`, `setItem`, `removeItem`;
  - `keys` holds every key starting with `bendingBoosters.` or `bb.`, except `bb.backup`, `bb.imgidx` and `bb.prices`;
  - `crc = crc32(JSON.stringify(keys with sorted entries))`.
- `checkSaveFile(file): {ok: true} | {ok: false, error}`, with errors exactly:
  - "Not a Bending Boosters save file"
  - "Unsupported save file version"
  - "Save file is damaged (checksum mismatch)"
  - "Save file has no main save"
- `applySaveFile(storage, file): void`:
  1. write `bb.backup = JSON.stringify(collectSave(storage))`;
  2. remove the current exportable keys;
  3. set the file's keys;
  4. if any write throws, restore the snapshot and rethrow.
- Glue:
  - **Export:** `save()`, then download `bending-boosters-save-{localDayKey()}.json`.
  - **Import:** pick a file, `JSON.parse` (a failure shows the first error), then `checkSaveFile`. On an error, show it in `#saveFileMsg`. Otherwise confirm "Replace your current save with this file? Your current save is kept as a backup.", then `applySaveFile` and `location.reload()`. If applying throws, show "Import failed: your previous save is unchanged."

- [ ] **Step 1: Write the failing tests.**
  ```js
  // tests/unit/transfer.test.mjs
  import test from 'node:test'; import assert from 'node:assert/strict';
  import { crc32 } from '../../src/save/crc32.js';
  import { collectSave, checkSaveFile, applySaveFile } from '../../src/save/transfer.js';
  class Mem { constructor(o = {}) { this.m = new Map(Object.entries(o)); } get length() { return this.m.size; }
    key(i) { return [...this.m.keys()][i] ?? null; } getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }
    setItem(k, v) { this.m.set(k, String(v)); } removeItem(k) { this.m.delete(k); } }
  test('crc32 known vector', () => assert.equal(crc32('123456789'), 0xCBF43926));
  test('export picks game keys and skips caches', () => {
    const f = collectSave(new Mem({ 'bendingBoosters.v1': '{"v":3}', 'bb.run': '{}', 'bb.imgidx': 'x', 'bb.prices': 'y', 'bb.backup': 'z', other: 'q' }));
    assert.deepEqual(Object.keys(f.keys).sort(), ['bb.run', 'bendingBoosters.v1']);
    assert.deepEqual(checkSaveFile(f), { ok: true });
  });
  test('import round-trips and keeps a backup', () => {
    const f = collectSave(new Mem({ 'bendingBoosters.v1': '{"money":10}' }));
    const s = new Mem({ 'bendingBoosters.v1': '{"money":99}', 'bb.run': '{"old":1}' });
    applySaveFile(s, f);
    assert.equal(s.getItem('bendingBoosters.v1'), '{"money":10}'); assert.equal(s.getItem('bb.run'), null);
    assert.equal(JSON.parse(JSON.parse(s.getItem('bb.backup')).keys['bendingBoosters.v1']).money, 99);
  });
  test('rejects foreign, newer, damaged and incomplete files', () => {
    const f = collectSave(new Mem({ 'bendingBoosters.v1': '{}' }));
    assert.equal(checkSaveFile(null).error, 'Not a Bending Boosters save file');
    assert.equal(checkSaveFile({ ...f, v: 2 }).error, 'Unsupported save file version');
    assert.equal(checkSaveFile({ ...f, keys: { ...f.keys, 'bb.run': 'x' } }).error, 'Save file is damaged (checksum mismatch)');
    assert.equal(checkSaveFile(collectSave(new Mem({ 'bb.run': '{}' }))).error, 'Save file has no main save');
  });
  test('a failed write restores the previous save', () => {
    class Flaky extends Mem { setItem(k, v) { if (k === 'bb.run') throw new Error('quota'); super.setItem(k, v); } }
    const f = collectSave(new Mem({ 'bendingBoosters.v1': '{"money":1}', 'bb.run': '{}' }));
    const s = new Flaky({ 'bendingBoosters.v1': '{"money":2}' });
    assert.throws(() => applySaveFile(s, f)); assert.equal(s.getItem('bendingBoosters.v1'), '{"money":2}');
  });
  ```
  Then the m1 group, *"export and import round-trip"*:
  - `showView('settings')`;
  - `const [d] = await Promise.all([p.waitForEvent('download'), p.click('#exportSave')])`;
  - read `await d.path()` as JSON and note `money`;
  - `S.money = 1; save()`;
  - accept dialogs; `setInputFiles('#importFile', path)`; wait for load;
  - assert `S.money` equals the exported value;
  - write a tampered copy (change one key's value) and import it;
  - assert `#saveFileMsg` matches `/damaged/` and `S.money` is unchanged.

- [ ] **Step 2: Run.** It should FAIL.

- [ ] **Step 3: Implement** as described in Interfaces.

- [ ] **Step 4: Verify.** `npm test` → PASS.

- [ ] **Step 5: Commit.** `git add -A && git commit -m "feat(save): export/import save file with checksum and backup"`

### Task 10: Cosmetic fixes

**Files:**
- Modify:
  - `src/styles/visual-edition.css`: in the rule `.jx-jokers.hudrow .jx-joker.emptyslot{…opacity:.65…}`, set `opacity:1;background:var(--panel)` and keep the dim look with `color:var(--dim)`. This rule loads last, so the fix must live here.
  - `src/ui/journey.js`: "Empty Joker slot" → "Empty charm slot"; "Your Joker row is full" → "Your charm row is full".
  - `tests/m1.test.cjs`

- [ ] **Step 1: Write the failing m1 group** (`#debug`):
  - `showView('journey'); BBJ._newRun('SLOTS','water')`;
  - `const s = p.locator('.jx-joker.emptyslot').first()`;
  - assert `await s.innerText() === 'Empty charm slot'`;
  - assert `getComputedStyle(el).opacity === '1'` and `getComputedStyle(el).backgroundColor` matches `/^rgb\(/` (fully opaque, not `rgba(…, 0)`).

- [ ] **Step 2: Run.** It should FAIL.

- [ ] **Step 3: Apply** the two edits.

- [ ] **Step 4: Verify.** `npm test` → PASS. Run `npm run screens` and check `12-map.png` at 1440×1000: no circle shows through the charm row.

- [ ] **Step 5: Commit.** `git commit -am "fix: opaque empty charm slots; say charm, not Joker"`

### Task 11: Publishing, docs, final check

**Files:**
- Create: `.github/workflows/pages.yml`
- Modify: `package.json` (add `"pages": "node tools/build.mjs --out _site/index.html"`), `.gitignore` (add `_site/`), `README.md`

**Interfaces:**
- The workflow triggers on push to `main` and on `workflow_dispatch`.
- Permissions: `contents: read`, `pages: write`, `id-token: write`.
- **Build job** (with env `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: 1`):
  1. `actions/checkout@v4`
  2. `actions/setup-node@v4` with Node 22
  3. `npm ci`
  4. `npm run test:quick`
  5. `npm run pages`
  6. `actions/upload-pages-artifact@v3` with path `_site`
- **Deploy job:** `actions/deploy-pages@v4` in the `github-pages` environment.
- README gains three sections:
  - **"Economy"**: the values from Global Constraints.
  - **"Saves"**: export/import, backups, and the save versions.
  - **"Publishing"**:
    1. create a public GitHub repo;
    2. `git remote add origin …` and `git push -u origin main`;
    3. Settings → Pages → Source: GitHub Actions;
    4. share the Pages URL.

    Also how to move existing progress: open `dist/bending-boosters.html` from disk in the same browser as the old Desktop copy, use Export, then Import on the hosted site.

- [ ] **Step 1: Validate locally.** Run `npm ci && npm run test:quick && npm run pages` → `_site/index.html` exists and `node tools/build.mjs --check _site/index.html` prints "identical".

- [ ] **Step 2: Add** the workflow and the README sections.

- [ ] **Step 3: Full verification.**
  - `npm test` → all suites PASS, ending with `ALL M1 CHECKS PASSED`.
  - `npm run screens` → review home (gift banner, free-pack button, resume card), settings (save file block, protect, tips) and fight (no tip over End turn).
  - `sha256sum ~/Desktop/bending-boosters\(4\).html` still prints `433b99c5…e0d0ce`.

- [ ] **Step 4: Commit.** `git add -A && git commit -m "ci: publish to GitHub Pages; docs for economy, saves, publishing"`

- [ ] **Step 5: Owner step.** Create the repo, push, enable Pages, and open the URL in a fresh browser profile. Expect $55, 4 free packs and the packs tip.
