# M1 Friends Beta Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the current TLA game shareable with friends. That means an earned-money loop (starter gift, daily pack and streak cash, star-protected selling, "+ Add funds" debug-only), first-time tips, first-class save/resume, save export/import, a hosted link, git, and two cosmetic fixes.

**Architecture:**
- New rules go into pure ES modules (`src/economy/`, `src/save/`, `src/meta/`), unit-tested directly in Node.
- They reach the classic pack-simulator script through new exports on the global `BBJ`.
- Startup moves from the end of the pack-simulator script into `src/boot.js`, which runs after `BBJ` exists, so boot code can use those modules.
- The pack-simulator files only get thin UI glue.

**Tech Stack:**
- Plain JS, no new runtime dependencies.
- `node:test` for unit tests.
- Playwright 1.64.1 with Chromium for browser tests (its `page.clock` API stands in for the date).
- Zero-dependency build: `tools/build.mjs`.

**Spec:** `docs/superpowers/specs/2026-11-07-bending-boosters-design.md`, sections 3, 4 and 10. Also read `README.md` ("How the build works") and `AGENTS.md`.

## Global Constraints

- **Starting money:** $50 bankroll and 3 free Play Boosters on first launch.
- **Daily pack:** 1 free Play Booster per **local calendar day**. Missed days accrue, up to 3 packs.
- **Streak cash:** day 1 $5, day 2 $5, day 3 $10, day 4 $10, day 5 $15, day 6 $15, day 7+ $20. Missing a calendar day resets the streak to day 1.
- **Journey:** always free to enter. Payouts stay fight $1, elite $2.50, bosses $6/$10/$14, win +$10.
- **Selling:** 60% of market. "Sell all extras" never takes a **Journey-eligible** card (by name, across printings) below **12** copies. Other cards keep the setting (default **4**). If the Journey protection is lowered below 12, list each star drop before confirming.
- **Debug-only:** "+ Add funds" appears only in debug mode (`#debug` in the URL). The same goes for the economy settings that bypass the loop: pack price, box price, sell %, starting money.
- **One place for economy numbers:** they live in one data module, `src/economy/config.js`.
- **Day rules:** all per-day rules take their date from `src/economy/clock.js`. Pure functions receive the time as a parameter. Browser tests set the date with Playwright `page.clock`.
- **Storage keys:** existing localStorage keys keep their names (`bendingBoosters.v1`, `bb.run`, `bb.prices`, `bb.imgidx`). The only new key is `bb.backup`.
- **Single file:** the game stays one self-contained HTML. No new network requests.
- **Journey module rules:** unique top-level names; `import { … } from "./x.js";` at the top followed by one blank line; `export` only at line start; every new module listed in `build.config.json`. `npm run check` must pass.
- **Existing tests:** the existing suites (combat, progression, browser, visual) stay green. Change an existing expectation only where it encodes the old economy, and say why in the commit message.
- **Desktop copy:** never write to the player's Desktop copy.
- **Commit messages** end with:
  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01CnmRrhqKWkiVRVG61PBTX7
  ```

## Review Focus

1. **The clock goes backwards** (timezone travel, manual clock change) or the page reloads the same day. That must pay nothing and leave the streak alone. *Pinned in Task 2 (`claimDaily` backwards/same-day tests) and Task 4 (browser same-day reload).*
2. **A bad import file:** not JSON, someone else's JSON, edited (checksum mismatch), from a newer version, or missing the main save. It must be rejected with a clear message, and the current save left untouched. *Pinned in Task 6.*
3. **Storage write fails** during the daily claim or import. The claim must be retried on a later load and never credited twice; an import must never be half-applied. *Pinned in Task 4 (failing `setItem` at boot) and Task 6 (failing `setItem` mid-import restores the backup).*
4. **An existing player's save from the Desktop build** (main save v2 plus an in-progress Journey run). It must migrate to v3 without a starter gift, receive the daily gift, and resume the run. *Pinned in Task 3 (unit) and Task 4 (browser, using a v2 save from `history/3-visual-edition.html`).*
5. **A tip on screen during play** must not block cards, End turn or map nodes. *Pinned in Task 8 (click End turn while the fight tip is open).*

---

## File map

| File | Responsibility |
|---|---|
| `src/economy/config.js` | **new.** `ECONOMY` table: every economy number |
| `src/economy/clock.js` | **new.** `localDay`, `utcDay`, `daysBetween` |
| `src/economy/daily.js` | **new.** `claimDaily`: daily pack plus streak cash rules |
| `src/economy/selling.js` | **new.** `planSellExtras`, `starDrops` |
| `src/save/migrate.js` | **new.** main-save versioning: `MAIN_SAVE_VERSION`, `migrateMain`, `freshMainFields` |
| `src/save/crc32.js` | **new.** `crc32` |
| `src/save/savefile.js` | **new.** export/parse/import of all save keys |
| `src/meta/tips.js` | **new.** `TIPS` data |
| `src/ui/tips.js` | **new.** tip card rendering: `initTips`, `showTip`, `resetTips` |
| `src/ui/run-store.js` | **new.** `RUN_KEY`, `readSavedRun` |
| `src/boot.js` | **new.** startup sequence (moved from `19-wire-up.js`) plus gifts, tips init and resume card |
| `src/boosters/20-gifts.js` | **new.** `applyGifts`, `renderGiftPanel`, free-pack button |
| `src/boosters/21-resume.js` | **new.** `renderResumeCard` on the home screen |
| `src/boosters/22-savefile.js` | **new.** Settings export/import/reset-tips UI glue |
| `src/styles/friends-beta.css` | **new.** styles for the gift panel, resume card, tips and sell warning |
| `src/engine/run.js` | payouts from `ECONOMY`; new `runBrief`, `abandonRun` |
| `src/ui/journey.js` | uses `run-store`; in-page two-step Abandon that pays out; `api.resume()`; tip hooks; "Empty charm slot" |
| `src/ui/index.js` | new `BBJ` exports |
| `src/boosters/03-state.js` | `freshState` v3 fields; `load()` calls `BBJ.migrateMain` |
| `src/boosters/09-opening.js` | `tryOpen(n, free)`; not-enough-money dialog; reveal tip |
| `src/boosters/11-shop.js` | `openShop` debug-only; `dupesIn` uses `BBJ.planSellExtras` |
| `src/boosters/12-collection.js` | sell-all star-drop warning |
| `src/boosters/14-stats.js` | "Earned" and "Earned vs spent" tiles |
| `src/boosters/15-header.js` | tip hooks in `showView` |
| `src/boosters/18-settings.js` | Journey keep input; economy inputs debug-only |
| `src/boosters/19-wire-up.js` | startup lines removed (moved to `src/boot.js`) |
| `src/index.html` | gift panel, free-pack button, resume container, settings controls, `boot` slot |
| `build.config.json` | new modules, booster files, `boot` slot, stylesheet |
| `tests/unit/*.test.mjs` | **new.** unit tests (`node --test tests/unit/`) |
| `tests/friends-beta.test.cjs` | **new.** browser tests for M1 |
| `.github/workflows/pages.yml` | **new.** build and deploy to GitHub Pages |
| `package.json`, `README.md` | scripts, docs |

**Module order in `build.config.json` → `slots.journey[0].journey.modules`:**
- Insert `src/economy/config.js` **immediately before** `src/engine/run.js`. It is then inside the engine region that `tests/harness/engine.cjs` evaluates, which `run.js` needs.
- Insert, in this order, **immediately before** `src/ui/journey.js`:
  `src/economy/clock.js`, `src/economy/daily.js`, `src/economy/selling.js`, `src/save/migrate.js`, `src/save/crc32.js`, `src/save/savefile.js`, `src/meta/tips.js`, `src/ui/tips.js`, `src/ui/run-store.js`

**New `BBJ` exports (re-exported from `src/ui/index.js`):**
`ECONOMY`, `localDay`, `claimDaily`, `planSellExtras`, `starDrops`, `isRunCard`, `MAIN_SAVE_VERSION`, `migrateMain`, `freshMainFields`, `exportSave`, `parseSaveFile`, `importSave`, `readSavedRun`, `runBrief`, `initTips`, `showTip`, `resetTips`

---

### Task 1: Repository baseline and unit-test runner

**Files:**
- Modify: `package.json`
- Create: `tests/unit/smoke.test.mjs`

**Interfaces:**
- Produces: `npm run test:unit` runs `node --test tests/unit/`. It is included in both `test` and `test:quick`. Git tag `recovered-baseline` marks the byte-identical recovery.

- [ ] **Step 1:** `git init -b main` in the project root, then make the first commit containing all current files: `chore: recovered source baseline`. Then run `git tag recovered-baseline`.
- [ ] **Step 2: Write the smoke test** `tests/unit/smoke.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { payout } from '../../src/engine/run.js';
test('engine modules import natively', () => {
  assert.equal(typeof payout, 'function');
});
```

- [ ] **Step 3:** In `package.json`, add `"test:unit": "node --test tests/unit/"`. Insert `node --test tests/unit/ &&` right after `node tools/check-modules.mjs &&` in both `test` and `test:quick`.
- [ ] **Step 4: Verify.** Run `npm run test:quick`. Expected: build OK, `modules ok`, unit `# pass 1`, combat `# pass 46`, progression `# pass 36`. Then run `node tools/build.mjs --check history/3-visual-edition.html`. Expected: `identical`.
- [ ] **Step 5:** Commit: `test: add unit test runner`.

---

### Task 2: Economy config, clock and daily rules (pure)

**Files:**
- Create: `src/economy/config.js`, `src/economy/clock.js`, `src/economy/daily.js`, `tests/unit/daily.test.mjs`
- Modify: `src/engine/run.js:15` (PAYOUT), `build.config.json`

**Interfaces:**
- Produces:
  - `export var ECONOMY = { startingBankroll: 50, starterPacks: 3, dailyPackMaxAccrual: 3, streakCash: [5, 5, 10, 10, 15, 15, 20], packPrice: 6.99, boxPrice: 149.99, sellRatePercent: 60, keepDefault: 4, keepJourneyDefault: 12, journeyPayout: { fight: 1, elite: 2.5, boss: [6, 10, 14], win: 10 } }`
  - `localDay(ms = Date.now()) -> "YYYY-MM-DD"` (local time); `utcDay(ms = Date.now()) -> "YYYY-MM-DD"`
  - `daysBetween(fromDay, toDay) -> integer`: `toDay − fromDay` in calendar days, negative when backwards. Compute it from `Date.UTC` of both strings, so DST can't affect it.
  - `claimDaily(daily, today) -> { daily: { last, streak }, claimed: boolean, cash: number, packs: number, streakDay: number }`. Input `daily` is `{ last: string|null, streak: number }`. It never mutates its input.

- [ ] **Step 1: Write the failing tests** `tests/unit/daily.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { claimDaily } from '../../src/economy/daily.js';
import { daysBetween, localDay } from '../../src/economy/clock.js';
import { ECONOMY } from '../../src/economy/config.js';

const fresh = { last: null, streak: 0 };
test('first ever claim is streak day 1: $5 and 1 pack', () => {
  assert.deepEqual(claimDaily(fresh, '2026-11-07'),
    { daily: { last: '2026-11-07', streak: 1 }, claimed: true, cash: 5, packs: 1, streakDay: 1 });
});
test('consecutive days follow 5,5,10,10,15,15,20 then stay 20', () => {
  let d = fresh; const cash = [];
  for (let i = 0; i < 9; i++) { const r = claimDaily(d, `2026-11-${String(7 + i).padStart(2, '0')}`); cash.push(r.cash); assert.equal(r.packs, 1); d = r.daily; }
  assert.deepEqual(cash, [5, 5, 10, 10, 15, 15, 20, 20, 20]);
});
test('a missed day resets the streak and accrues packs', () => {
  const r = claimDaily({ last: '2026-11-07', streak: 5 }, '2026-11-09');
  assert.deepEqual([r.daily.streak, r.cash, r.packs], [1, 5, 2]);
});
test('long absence accrues at most 3 packs', () => {
  assert.equal(claimDaily({ last: '2026-11-01', streak: 3 }, '2026-11-20').packs, 3);
});
test('same day pays nothing', () => {
  const d = { last: '2026-11-07', streak: 2 };
  assert.deepEqual(claimDaily(d, '2026-11-07'), { daily: d, claimed: false, cash: 0, packs: 0, streakDay: 2 });
});
test('clock moved backwards pays nothing and keeps the streak', () => {
  const d = { last: '2026-11-07', streak: 4 };
  const r = claimDaily(d, '2026-11-05');
  assert.equal(r.claimed, false); assert.equal(r.cash, 0); assert.deepEqual(r.daily, d);
});
test('daysBetween crosses months and is negative backwards', () => {
  assert.equal(daysBetween('2026-10-31', '2026-11-01'), 1);
  assert.equal(daysBetween('2026-11-05', '2026-11-03'), -2);
});
test('localDay formats YYYY-MM-DD', () => {
  assert.match(localDay(Date.UTC(2026, 10, 7, 12)), /^\d{4}-\d{2}-\d{2}$/);
});
test('payout table matches the spec', () => {
  assert.deepEqual(ECONOMY.journeyPayout, { fight: 1, elite: 2.5, boss: [6, 10, 14], win: 10 });
});
```

- [ ] **Step 2: Run to verify it fails.** Run `node --test tests/unit/daily.test.mjs`. Expected: FAIL, cannot find module `src/economy/daily.js`.
- [ ] **Step 3: Implement** `config.js`, `clock.js` and `daily.js` with the signatures above.
  - `claimDaily` rules:
    - `last === null` → streak 1, packs 1.
    - Gap `g = daysBetween(last, today)`:
      - `g <= 0` → unclaimed result.
      - `g === 1` → streak + 1, otherwise streak 1.
      - packs = `min(g, dailyPackMaxAccrual)`.
    - cash = `streakCash[min(streak, length) − 1]`.
  - In `src/engine/run.js`, replace the `PAYOUT` literal with `var PAYOUT = ECONOMY.journeyPayout;`, importing `ECONOMY` from `"../economy/config.js"`.
  - Add the modules to `build.config.json` as in the File map.
- [ ] **Step 4: Verify.** Run `npm run test:quick`. Expected: all pass, including `# pass 10` for the unit tests. Then run `npm run check`. Expected: `modules ok`.
- [ ] **Step 5:** Commit: `feat(economy): config table, clock and daily claim rules`.

---

### Task 3: Main-save v3 migration and boot after BBJ

**Files:**
- Create: `src/save/migrate.js`, `src/boot.js`, `tests/unit/migrate.test.mjs`
- Modify:
  - `src/boosters/03-state.js` (`freshState`, `load`)
  - `src/boosters/19-wire-up.js`: delete lines 7–8 (the `load(); initNameKeys(); …` line and the `const h0=…` line). Keep the `resize` listener on line 6.
  - `src/index.html`: rename the `journey-recovery` slot to `boot`
  - `build.config.json`: slot `boot: ["src/boot.js", "src/journey-recovery.js"]`; also add the new modules
  - `src/ui/index.js`
  - `README.md` ("Where this source came from": now past tense, pointing to tag `recovered-baseline`)

**Interfaces:**
- Consumes: `ECONOMY` (Task 2).
- Produces:
  - `MAIN_SAVE_VERSION = 3`
  - `freshMainFields() -> { freePacks: 0, freeOpened: 0, daily: { last: null, streak: 0 }, dailyIncome: 0, tips: {}, starterGiven: false }`
  - `migrateMain(state) -> state`. It mutates and returns the state. For v2: adds `freshMainFields()` with `starterGiven: true`, sets `settings.keepJourney = settings.keepJourney ?? ECONOMY.keepJourneyDefault`, and sets `v = 3`. A v3 state is returned unchanged.
  - `src/boot.js` runs these lines, moved verbatim from `19-wire-up.js`: `Object.assign(DEFAULTS, { start: ECONOMY.startingBankroll, price: ECONOMY.packPrice, boxPrice: ECONOMY.boxPrice, buy: ECONOMY.sellRatePercent, keep: ECONOMY.keepDefault, keepJourney: ECONOMY.keepJourneyDefault })` using `BBJ.ECONOMY`, then `load(); initNameKeys(); refreshHeader(); imgStatus(); loadImgIndex();` and the `h0` line. Later tasks append calls here.
  - `freshState()` returns `v: 3` plus `...BBJ.freshMainFields()`.
  - `load()` keeps its legacy pre-v2 branch, then calls `BBJ.migrateMain(S)`.

- [ ] **Step 1: Write the failing tests** `tests/unit/migrate.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { migrateMain, freshMainFields, MAIN_SAVE_VERSION } from '../../src/save/migrate.js';
const v2 = () => ({ v: 2, money: 12.5, coll: { 'TLA:1': 3 }, settings: { keep: 4 } });
test('v2 save becomes v3 without a starter gift', () => {
  const s = migrateMain(v2());
  assert.equal(s.v, MAIN_SAVE_VERSION);
  assert.equal(s.starterGiven, true);
  assert.deepEqual(s.daily, { last: null, streak: 0 });
  assert.equal(s.freePacks, 0); assert.equal(s.settings.keepJourney, 12);
  assert.equal(s.money, 12.5); assert.deepEqual(s.coll, { 'TLA:1': 3 });
});
test('existing keepJourney is preserved', () => {
  const s = v2(); s.settings.keepJourney = 7;
  assert.equal(migrateMain(s).settings.keepJourney, 7);
});
test('v3 save is unchanged', () => {
  const s = { v: 3, ...freshMainFields(), money: 1, settings: { keepJourney: 12 } };
  assert.deepEqual(migrateMain(structuredClone(s)), s);
});
test('fresh fields mean a first launch', () => {
  assert.equal(freshMainFields().starterGiven, false);
});
```

- [ ] **Step 2: Run to verify it fails.** Run `node --test tests/unit/migrate.test.mjs`. Expected: FAIL, module not found.
- [ ] **Step 3: Implement** `migrate.js`, `boot.js` and the edits listed above. Exports go through `src/ui/index.js`.
- [ ] **Step 4: Verify.** Run `npm test`. Expected: everything passes, including all 12 browser groups and 10 visual groups. The visual group "pre-visual wallet and active Journey save resume" covers v2 → v3 with an active run. Then run `node tools/build.mjs --check history/3-visual-edition.html`. Expected: **differs** (by design from here on).
- [ ] **Step 5:** Commit: `feat(save): main save v3 migration; boot after BBJ`.

---

### Task 4: Starter gift, daily gift, free packs, earned-money UI

**Files:**
- Create: `src/boosters/20-gifts.js`, `src/styles/friends-beta.css`, `tests/friends-beta.test.cjs`
- Modify:
  - `src/boosters/09-opening.js:39-51`
  - `src/boosters/11-shop.js:3-9,25`
  - `src/boosters/14-stats.js:14-23`
  - `src/boosters/18-settings.js`
  - `src/index.html`: home `#giftPanel`, button `#openFree` with `#freeCount`, Settings economy inputs wrapped in `#econSettings`
  - `src/boot.js`
  - `build.config.json`: `20-gifts.js` after `19-wire-up.js`; `friends-beta.css` after `visual-edition.css` in the `visual-edition` slot
  - `package.json`: `test` script gets `&& node tests/friends-beta.test.cjs`

**Interfaces:**
- Consumes: `BBJ.claimDaily`, `BBJ.localDay`, `BBJ.ECONOMY` (Task 2); v3 fields (Task 3).
- Produces:
  - `applyGifts(now = Date.now()) -> { starter: number, cash: number, packs: number, streakDay: number } | null`
    - Builds the next state from a copy of `S`:
      - starter packs if `!starterGiven`;
      - the `claimDaily(S.daily, BBJ.localDay(now))` result;
      - `money += cash`, `dailyIncome += cash`, `freePacks += starter + packs`.
    - Commits with `save(next)` and only then copies it into `S`, the same pattern as `settleJourney`. A failed save changes nothing and returns `null`.
    - Called from `src/boot.js` right after `load()`.
  - `renderGiftPanel(result)`: shows a non-blocking banner in `#giftPanel`, e.g. "Daily gift: +$5 and 1 free pack · streak day 1" (plus "Welcome gift: 3 free packs" on first launch). It also shows or hides `#openFree`.
  - `tryOpen(n, free = false)`:
    - Free opens require `S.freePacks >= n`, decrement it, increment `S.freeOpened`, and don't debit money.
    - When money is short and not in debug mode, show a "Not enough money" modal with buttons `#goJourney`, `#goCollection`, and `#goFree` when free packs exist. In debug mode it shows `openShop` as before.
  - `openShop` / `#shopBtn` are visible only when `BB_DEBUG`. `#econSettings` (price, box, sell %, starting money) is visible only when `BB_DEBUG`.
  - Stats: replace "Net profit/loss" with:
    - `tile('Earned', …)` = `runIncome + soldIncome + dailyIncome`
    - `tile('Earned vs spent', …)` = earned − `packSpend`, green when ≥ 0
  - Test helper in `tests/friends-beta.test.cjs`:
    `fresh({ debug = true, time = '2026-11-07T10:00:00', timezoneId = 'Asia/Krasnoyarsk', storageFails = false } = {}) -> { page, ctx }`
    - Builds a new context with that timezone, `page.clock.install({ time })` **before** `goto`, outside HTTPS aborted, and `pageerror` collected.
    - `storageFails` adds an init script that makes `localStorage.setItem` throw.

- [ ] **Step 1: Write the failing browser tests** in `tests/friends-beta.test.cjs`, one `group(name, fn)` per bullet, printing `PASS <name>`:
  - `first launch`: `S.money === 55`, `S.freePacks === 4`, `S.starterGiven === true`, `S.daily.streak === 1`, `#giftPanel` contains `streak day 1`.
  - `free pack`: click `#openFree` → `S.freePacks === 3`, `S.money === 55`, `S.packs === 1`.
  - `next day`: `page.clock.setSystemTime('2026-11-08T09:00:00')` then reload → `S.money === 60`, `S.daily.streak === 2`, `S.freePacks === 5`.
  - `same-day reload`: reload again → money still 60.
  - `missed day`: set `2026-11-10T09:00:00`, reload → streak 1, money 65, `freePacks` up by 2.
  - `storage failure`: `fresh({ storageFails: true })` → after boot `S.money === 50` and `S.freePacks === 0`. Then a new context without the failure loads the same origin → credited exactly once (`S.money === 55`).
  - `add funds hidden`: `fresh({ debug: false })` → `#shopBtn` and `#econSettings` are not visible. With `debug: true`, `#shopBtn` is visible.
  - `broke`: `fresh({ debug: false })`, set `S.money = 0; S.freePacks = 0`, click `#open1` → modal shows `#goJourney`; clicking it shows `#v-journey`.
  - `existing player`:
    1. Load `history/3-visual-edition.html` in a fresh context.
    2. Set `S.money = 20` and start a run via `BBJ._newRun('LEGACY', 'water')`.
    3. In the **same context**, load `dist/bending-boosters.html`.
    4. Expect `S.v === 3`, `S.starterGiven === true`, `S.freePacks === 1` (daily only), `S.money === 25`, and `localStorage['bb.run']` still present.
- [ ] **Step 2: Run to verify it fails.** Run `node tools/build.mjs && node tests/friends-beta.test.cjs`. Expected: FAIL at `first launch` (`S.money` is 50).
- [ ] **Step 3: Implement** `20-gifts.js` and the edits listed above. In `src/boot.js` call `renderGiftPanel(applyGifts())` after `load()`. Write the CSS for `#giftPanel` and `#openFree` in `friends-beta.css`.
- [ ] **Step 4: Verify.** Run `npm test`. Expected: all suites pass, and the new file prints `PASS` for all 9 groups. If an existing test asserted `S.money === 50` after a fresh load, change it to the new value and record why in the commit message.
- [ ] **Step 5:** Commit: `feat(economy): starter gift, daily pack and streak cash, free packs; add funds debug-only`.

---

### Task 5: Star-protected "Sell all extras"

**Files:**
- Create: `src/economy/selling.js`, `tests/unit/selling.test.mjs`
- Modify:
  - `src/boosters/11-shop.js:11-18` (`dupesIn`)
  - `src/boosters/12-collection.js:40-58` (sell-all)
  - `src/boosters/18-settings.js` (`#sKeepJourney`)
  - `src/boosters/03-state.js` (`DEFAULTS.keepJourney`)
  - `src/index.html` (Settings input `#sKeepJourney` next to `#sKeep`)
  - `tests/friends-beta.test.cjs`

**Interfaces:**
- Consumes: `starsFromCopies` from `src/engine/cards.js`; `isRunCard` from `src/engine/catalog.js` (both now exported on `BBJ`).
- Produces:
  - `planSellExtras(entries, { keep, keepJourney }) -> Array<{ key, foil: boolean, n }>`
    - `entries` is `Array<{ key, name, journey: boolean, reg: number, foil: number, regValue: number, foilValue: number }>`.
    - It groups entries by `name`. The protected count is `keepJourney` if any entry of that name is `journey`, otherwise `keep`.
    - It sells `total − protected` copies, cheapest copies first. Ties: regular before foil, then `key` ascending.
  - `starDrops(entries, plan) -> Array<{ name, from, to }>`: Journey names whose `starsFromCopies` value decreases.
  - `dupesIn(list)` builds the entries per card name (from `NAME_KEYS`, `S.coll`, `S.foil`, `sellPrice`, `BBJ.isRunCard`) for the names in `list` (or all names when `null`). It returns today's `{ c, k, foil, n }` items, so `sellList` is unchanged.
  - Sell-all: when `S.settings.keepJourney < 12` and `starDrops` is non-empty, the first click lists the drops in `#sellWarn` ("Sliced Ashes ★4 → ★3", …). The confirm click sells.

- [ ] **Step 1: Write the failing tests** `tests/unit/selling.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planSellExtras, starDrops } from '../../src/economy/selling.js';
const e = (key, name, journey, reg, foil, regValue = 1, foilValue = 3) => ({ key, name, journey, reg, foil, regValue, foilValue });
test('journey card keeps 12 copies by default', () => {
  assert.deepEqual(planSellExtras([e('TLA:1', 'Aang', true, 15, 0)], { keep: 4, keepJourney: 12 }), [{ key: 'TLA:1', foil: false, n: 3 }]);
});
test('non-journey card keeps the keep setting', () => {
  assert.deepEqual(planSellExtras([e('TLA:300', 'Plains', false, 9, 0)], { keep: 4, keepJourney: 12 }), [{ key: 'TLA:300', foil: false, n: 5 }]);
});
test('protection counts all printings of a name; cheapest copies go first', () => {
  const plan = planSellExtras([e('TLA:5', 'Katara', true, 8, 2, 0.5, 4), e('TLA:290', 'Katara', true, 4, 0, 2, 0)], { keep: 4, keepJourney: 12 });
  assert.deepEqual(plan, [{ key: 'TLA:5', foil: false, n: 2 }]);
});
test('nothing to sell at or below protection', () => {
  assert.deepEqual(planSellExtras([e('TLA:1', 'Aang', true, 12, 0)], { keep: 4, keepJourney: 12 }), []);
});
test('lowering journey protection reports star drops', () => {
  const entries = [e('TLA:1', 'Aang', true, 12, 0)];
  const plan = planSellExtras(entries, { keep: 4, keepJourney: 4 });
  assert.deepEqual(starDrops(entries, plan), [{ name: 'Aang', from: 5, to: 3 }]);
});
```

- [ ] **Step 2: Run to verify it fails.** Run `node --test tests/unit/selling.test.mjs`. Expected: FAIL, module not found.
- [ ] **Step 3: Implement** `selling.js` and the glue listed above.
- [ ] **Step 4: Add the browser group** `star-protected selling` to `tests/friends-beta.test.cjs`. Give a Journey card 14 copies and a basic land 9, then click sell-all twice. Expect 12 and 4 copies left. Set `keepJourney = 4`; the first sell-all click shows `#sellWarn` containing `★5 → ★3`.
- [ ] **Step 5: Verify.** Run `npm test`. Expected: all suites pass, with unit `# pass` including the 5 selling tests and `PASS star-protected selling`.
- [ ] **Step 6:** Commit: `feat(economy): sell extras never drops Journey stars`.

---

### Task 6: Save export and import

**Files:**
- Create: `src/save/crc32.js`, `src/save/savefile.js`, `src/boosters/22-savefile.js`, `tests/unit/savefile.test.mjs`
- Modify:
  - `src/index.html`: Settings "Your save" block with `#exportSave`, `#importSave` (file input `#importFile`), `#importMsg`
  - `build.config.json`: `22-savefile.js` after `20-gifts.js`
  - `tests/friends-beta.test.cjs`

**Interfaces:**
- Produces:
  - `crc32(text) -> string`: 8 lowercase hex characters, computed over the UTF-8 bytes. No `TextEncoder`; encode by hand.
  - `SAVE_FILE_FORMAT = "bending-boosters-save"`, `SAVE_FILE_VERSION = 1`
  - `saveKeys(storage) -> string[]`: keys starting with `bendingBoosters.` or `bb.`, except `bb.backup`, sorted.
  - `exportSave(storage, now = Date.now()) -> { format, version, exportedAt, keys, checksum }`. `keys` is an object of raw strings. `checksum = crc32(JSON.stringify(keys))`, with keys inserted in sorted order.
  - `parseSaveFile(text) -> { ok: true, keys } | { ok: false, error }`. Errors, exact strings:
    - `"This file isn't a save file."` (not JSON)
    - `"This isn't a Bending Boosters save."` (wrong `format`)
    - `"This save was made by a newer version of the game."` (`version > 1`)
    - `"This save file is damaged or was edited."` (checksum mismatch)
    - `"This save has no wallet or collection in it."` (no `bendingBoosters.v1`)
  - `importSave(storage, keys) -> { ok: true } | { ok: false, error }`:
    1. Write `bb.backup = JSON.stringify({ at: ISO, keys: <current saveKeys values> })`.
    2. Remove current `saveKeys` that aren't in `keys`, then write `keys`.
    3. On any throw, restore every key from the backup and return `{ ok: false, error: "Couldn't import: browser storage is full or blocked. Your save was not changed." }`.
  - UI:
    - `#exportSave` downloads `bending-boosters-save-<localDay>.json` (Blob plus a temporary `<a download>`).
    - `#importFile` change → `parseSaveFile` → an in-page confirm ("Replace your current save? A backup is kept.") → `importSave` → `location.reload()`.
    - Errors show in `#importMsg`.

- [ ] **Step 1: Write the failing tests** `tests/unit/savefile.test.mjs`. Include a `memStorage(init, { failOnSet })` helper implementing `length`, `key(i)`, `getItem`, `setItem` and `removeItem`.

```js
test('crc32 known vector', () => { assert.equal(crc32('123456789'), 'cbf43926'); });
test('export includes bb.* and bendingBoosters.*, not bb.backup or others', () => {
  const s = memStorage({ 'bendingBoosters.v1': '{"v":3}', 'bb.run': 'R', 'bb.backup': 'X', other: 'Y' });
  assert.deepEqual(Object.keys(exportSave(s, 0).keys), ['bb.run', 'bendingBoosters.v1']);
});
test('round trip export → parse → import into another storage', () => {
  const a = memStorage({ 'bendingBoosters.v1': '{"v":3,"money":9}', 'bb.run': 'R' });
  const b = memStorage({ 'bendingBoosters.v1': '{"v":3,"money":1}', 'bb.prices': 'P' });
  const p = parseSaveFile(JSON.stringify(exportSave(a, 0)));
  assert.equal(p.ok, true); assert.deepEqual(importSave(b, p.keys), { ok: true });
  assert.equal(b.getItem('bendingBoosters.v1'), '{"v":3,"money":9}');
  assert.equal(b.getItem('bb.prices'), null);
  assert.equal(JSON.parse(b.getItem('bb.backup')).keys['bendingBoosters.v1'], '{"v":3,"money":1}');
});
test('rejects bad files with the exact messages', () => {
  const good = exportSave(memStorage({ 'bendingBoosters.v1': '{}' }), 0);
  assert.equal(parseSaveFile('nope').error, "This file isn't a save file.");
  assert.equal(parseSaveFile('{"a":1}').error, "This isn't a Bending Boosters save.");
  assert.equal(parseSaveFile(JSON.stringify({ ...good, version: 2 })).error, 'This save was made by a newer version of the game.');
  assert.equal(parseSaveFile(JSON.stringify({ ...good, keys: { ...good.keys, 'bb.run': 'x' } })).error, 'This save file is damaged or was edited.');
  const empty = exportSave(memStorage({ 'bb.run': 'R' }), 0);
  assert.equal(parseSaveFile(JSON.stringify(empty)).error, 'This save has no wallet or collection in it.');
});
test('failed import restores the previous save', () => {
  const b = memStorage({ 'bendingBoosters.v1': 'OLD', 'bb.run': 'OLDRUN' }, { failOnSet: 'bb.run' });
  const r = importSave(b, { 'bendingBoosters.v1': 'NEW', 'bb.run': 'NEWRUN' });
  assert.equal(r.ok, false);
  assert.equal(b.getItem('bendingBoosters.v1'), 'OLD'); assert.equal(b.getItem('bb.run'), 'OLDRUN');
});
```

`failOnSet: 'bb.run'` makes `setItem('bb.run', …)` throw once, after `bendingBoosters.v1` has already been written.

- [ ] **Step 2: Run to verify it fails.** Run `node --test tests/unit/savefile.test.mjs`. Expected: FAIL, module not found.
- [ ] **Step 3: Implement** `crc32.js`, `savefile.js` and `22-savefile.js`.
- [ ] **Step 4: Add the browser group** `export and import`:
  1. Profile A opens 2 packs; click `#exportSave` and capture the download with `page.waitForEvent('download')`.
  2. Profile B sets `#importFile` to that file and confirms; after the reload, `S.packs === 2` and the money matches A.
  3. Importing a text file containing `nope` shows `This file isn't a save file.` in `#importMsg`, and B is unchanged.
- [ ] **Step 5: Verify.** Run `npm test`. Expected: all pass.
- [ ] **Step 6:** Commit: `feat(save): export and import save files with backup`.

---

### Task 7: Resume card on home; Abandon pays out

**Files:**
- Create: `src/ui/run-store.js`, `src/boosters/21-resume.js`
- Modify:
  - `src/engine/run.js` (add `runBrief`, `abandonRun`)
  - `src/ui/journey.js`:
    - `:87`: `SAVE_KEY` → import `RUN_KEY`
    - `:121-150`: `loadSave` uses `readSavedRun`
    - `:245-272`: Abandon becomes two-step in-page
    - `api`: add `resume`
    - `renderSummary`: "Run abandoned" heading when `r.abandoned`
  - `src/index.html`: home `#resumeCard` above `.lastHead`
  - `src/boot.js`
  - `build.config.json`: `21-resume.js` after `20-gifts.js`
  - `tests/unit/smoke.test.mjs` → rename to `tests/unit/run.test.mjs`
  - `tests/friends-beta.test.cjs`

**Interfaces:**
- Produces:
  - `RUN_KEY = "bb.run"`
  - `readSavedRun(epoch) -> run | null`: uses `deserialize`. It returns `null` on a parse error or when `(run.epoch || null) !== (epoch || null)`, and never deletes anything.
  - `runBrief(run) -> { book, floor, hp, maxHp, deck: number, status }`
  - `abandonRun(run) -> run`: sets `status = "lost"`, `abandoned = true`, `fight = null`, and `pending = null`. The payout is unchanged: `payout(run)` pays for fights already won.
  - `api.resume() -> boolean`: resumes a saved run that is in progress (`map`/`node`/`fight`). This is the same code path as `#jxResume`.
  - Journey Abandon: `#jxAbandon` → its label becomes "Click again to abandon (pays $X.XX)" for 3 seconds → second click → `abandonRun(saved)` → `st.run = saved` → `renderSummary()`, which settles. This replaces `confirm()`.
  - `renderResumeCard()`:
    - Fills `#resumeCard` with "Run in progress · Book {book}, floor {floor} · {hp}/{maxHp} HP · {deck} cards" and a `#resumeGo` button.
    - It's hidden when there is no in-progress run.
    - `#resumeGo` → `showView('journey'); JOURNEY.resume()`.
    - Called from `src/boot.js`, from `showView('open')`, and after `settleJourney`.

- [ ] **Step 1: Write the failing unit tests** in `tests/unit/run.test.mjs`. Build a run with `createRun({ seed: 'T', nation: 'water' })` after `setCatalog` (load `src/catalog/data.json`).
  - `runBrief` returns `{ book: 1, floor: 0, hp: 60, maxHp: 60, deck: <starter deck length>, status: 'map' }`.
  - `abandonRun` sets `status 'lost'` and `abandoned true`, and `payout()` equals `payout()` before abandoning.
- [ ] **Step 2: Run to verify it fails.** Run `node --test tests/unit/run.test.mjs`. Expected: FAIL, `runBrief` is not exported.
- [ ] **Step 3: Implement** the engine functions, `run-store.js`, the journey edits, `21-resume.js` and the boot call.
- [ ] **Step 4: Add the browser group** `resume and abandon`:
  1. `BBJ._newRun('RESUME', 'water'); BBJ._debugGoto('fight')`; `BBJ._debugForce('weak')` (enemy HP 1). Hover the first `.jx-hcard:not(.cant)`, then click its `[data-mode="strike"]` half (halves only take clicks while the card is hovered or focused). Take the reward and return to the map.
  2. Reload: `#resumeCard` shows `Book 1` and `HP`. Clicking `#resumeGo` shows `#v-journey` with the map, and `BBJ._state.run.seed === 'RESUME'`.
  3. On the Journey start screen, clicking `#jxAbandon` twice gives `S.money` increased by exactly the earned payout, removes `bb.run`, and shows "Run abandoned".
- [ ] **Step 5: Verify.** Run `npm test`. Expected: all pass; the existing browser groups for resets and recovery still pass.
- [ ] **Step 6:** Commit: `feat(journey): resume card on home; abandon pays what you earned`.

---

### Task 8: First-time tips

**Files:**
- Create: `src/meta/tips.js`, `src/ui/tips.js`, `tests/unit/tips.test.mjs`
- Modify:
  - `src/boosters/15-header.js` (`showView`)
  - `src/boosters/09-opening.js` (`stageOpen`)
  - `src/ui/journey.js` (`renderStart`, `renderMap`, `renderFight`, after the first `onPlayCard` of a run, `renderNode` per kind)
  - `src/boosters/22-savefile.js` (`#resetTips`)
  - `src/index.html` (`#resetTips` in Settings)
  - `src/boot.js`
  - `src/styles/friends-beta.css`
  - `tests/friends-beta.test.cjs`

**Interfaces:**
- Produces:
  - `TIPS: Array<{ id, title, text }>`. The ids are exactly: `packs`, `reveal`, `collection`, `journey-start`, `map`, `fight`, `flow`, `shop`, `rest`, `event`. Each `text` is 1–2 sentences.
  - `initTips(store)`: `store` is `{ isSeen(id): boolean, markSeen(id): void, reset(): void, enabled(): boolean }`.
  - `showTip(id) -> boolean`: shows the tip card if it's enabled and unseen. One card at a time; later ids queue.
  - `resetTips()`: calls `store.reset()`.
  - The card element is `#tipCard`: `position: fixed`, top-right just below the header, `max-width: 340px`, `z-index` under `#modal`, with a "Got it" button `#tipOk` that calls `markSeen`.
  - Boot store backed by `S.tips`:
    - `enabled = () => !BB_DEBUG || !!S.settings.debugTips`
    - `markSeen` saves
    - `reset` clears `S.tips` and saves

  Hook points:

  | Id | Fires from |
  |---|---|
  | `packs` | `showView('open')` and boot on the home view |
  | `reveal` | `stageOpen` |
  | `collection` | `showView('collection')` |
  | `journey-start` | `renderStart` |
  | `map` | `renderMap` |
  | `fight` | `renderFight` |
  | `flow` | after the first card is played in a run |
  | `shop` / `rest` / `event` | `renderNode` by `p.kind` |

- [ ] **Step 1: Write the failing unit test** `tests/unit/tips.test.mjs`. It asserts that the ids equal the list above, in order; that ids are unique; and that every `text` has 1 to 220 characters.
- [ ] **Step 2: Run to verify it fails.** Run `node --test tests/unit/tips.test.mjs`. Expected: FAIL, module not found.
- [ ] **Step 3: Implement** the modules, hooks, boot store and CSS.
- [ ] **Step 4: Add the browser group** `tips`:
  1. `fresh({ debug: false })`: `#tipCard` shows the `packs` title. Click `#tipOk` and reload; the tip is not shown again.
  2. Settings `#resetTips` → back on the home view the tip shows again.
  3. In debug mode with `S.settings.debugTips = true`, start a fight. While `#tipCard` shows the `fight` tip, `page.locator('#jxEnd').click()` succeeds (no interception) and the turn advances (`BBJ._debugFight().turn === 2`).
  4. In debug mode without `debugTips`, `#tipCard` never appears.
- [ ] **Step 5: Verify.** Run `npm test`. Expected: all pass. The existing suites run in debug mode, so tips stay hidden there.
- [ ] **Step 6:** Commit: `feat(meta): first-time tips with reset`.

---

### Task 9: Cosmetic fixes

**Files:**
- Modify:
  - `src/ui/journey.js:290`: the label becomes `Empty charm slot`
  - `src/styles/friends-beta.css`: `.jx-joker.emptyslot` gets an opaque background, `rgba(16, 26, 29, .92)` over the current border styling
  - `tests/visual.test.cjs`: in the "populated loadout" group

- [ ] **Step 1: Write the failing assertions** in the visual group:

```js
assert(!(await p.content()).includes('Empty Joker slot'));
const alpha = await p.evaluate(() => { const e = document.querySelector('.jx-joker.emptyslot'); const m = getComputedStyle(e).backgroundColor.match(/rgba?\(([^)]+)\)/)[1].split(',').map(Number); return m.length === 4 ? m[3] : 1; });
assert(alpha >= 0.9, 'empty charm slot must hide the backdrop');
```

  Use a loadout with fewer than 5 charms so empty slots render; the map screen of a fresh run works.
- [ ] **Step 2: Run to verify it fails.** Run `node tools/build.mjs && node tests/visual.test.cjs`. Expected: FAIL, `Empty Joker slot` is present.
- [ ] **Step 3: Implement** both edits.
- [ ] **Step 4: Verify.** Run `npm test`. Expected: all pass. Run `npm run screens` and inspect `test-output/screens/12-map.png` and `14-shop.png`: there should be no ghost circle behind the last empty slot.
- [ ] **Step 5:** Commit: `fix(ui): opaque empty charm slots; say charm, not joker`.

---

### Task 10: Hosting, docs and M1 exit check

**Files:**
- Create: `.github/workflows/pages.yml`
- Modify: `README.md` (Quick start: hosted link, daily gift, economy; Tests: unit tests and `friends-beta.test.cjs`), `AGENTS.md` (economy numbers live in `src/economy/config.js`)

**Interfaces:**
- Produces a workflow that, on push to `main`:
  1. checks out the repo;
  2. sets up Node 22;
  3. runs `node tools/build.mjs`;
  4. copies `dist/bending-boosters.html` to `_site/index.html`;
  5. runs `actions/upload-pages-artifact@v3` with `path: _site`;
  6. deploys with `actions/deploy-pages@v4`.

  Permissions: `pages: write`, `id-token: write`, `contents: read`. Concurrency group: `pages`.

- [ ] **Step 1: Confirm with the owner** (spec §13): a public GitHub repo with Pages (default), or private plus Cloudflare Pages/Netlify. If the answer is private, replace this task's workflow with that host's "deploy a static folder" setup, publishing the same `_site/index.html`.
- [ ] **Step 2:** Write `pages.yml`. Create the repo (`gh repo create bending-boosters --public --source . --push` when the owner approves) and set Pages → Source → GitHub Actions.
- [ ] **Step 3: Verify the deploy.** The Actions run is green. Then run `tests/friends-beta.test.cjs`'s `first launch`, `free pack` and `next day` groups against the Pages URL (temporarily set `env.GAME` to the URL) and expect PASS.
- [ ] **Step 4: Run the M1 exit check.**
  - `npm test`: all green.
  - `npm run screens`: inspect the home screen (gift panel, free-pack button, resume card), Settings (save block, reset tips), a fight with a tip, and the map.
  - Move the owner's progress. The Desktop build has no Export button, but Chromium-based browsers share localStorage between all `file://` pages.
    1. In the browser the owner plays in, open `dist/bending-boosters.html` from disk. Their wallet and collection should show, migrated to v3.
    2. Settings → Export.
    3. On the hosted link, Settings → Import. Progress should carry over.
    4. If step 1 shows a fresh wallet (a non-Chromium browser), stop and ask the owner before trying anything else.
- [ ] **Step 5:** Commit: `chore: deploy to GitHub Pages; M1 docs`.
