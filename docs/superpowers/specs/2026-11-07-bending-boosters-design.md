# Bending Boosters: game design spec

- **Date:** 2026-11-07
- **Status:** design approved in conversation; this written spec awaits review
- **Scope:** the whole game, from the current build to "finished", in six milestones
- **Baseline:** the recovered source in this repository. Its build is byte-identical to the shipped `history/3-visual-edition.html`.

---

## 1. Purpose and audience

Bending Boosters is a browser game for **the owner and a small circle of friends**. Friends open a **hosted link** and play mainly in a **desktop browser**. Phone layouts must keep working, but they are not the design target.

The finished game is **one tight loop**: Journey runs earn money, money opens packs, and the collection changes what the next run can do. Neither half should feel optional.

### Success criteria

1. A friend who has never seen the game opens the link, learns it from the first-time tips, and completes the loop (open packs, play a run, earn, open more) without help.
2. Friends have a reason to come back daily: the daily gift and streak, the daily seed, and grading returns.
3. A new card set can be added by following a documented, repeatable pipeline. The game supports a handful of hand-picked sets, and Journey can be played with any one of them or any mix.
4. Every milestone ships a playable build with green tests. Existing saves always migrate.

### Constraints

- Single self-contained HTML file. Card images and live prices load from Scryfall at runtime. Everything else is built in.
- No server, no accounts. Friend features use copy/paste codes and **trust friends**: codes are checksummed against typos, not protected against cheating.
- Play money only.
- Fan project: keep the existing attribution in Settings. Distribution is limited to friends.

---

## 2. Baseline (what exists today)

- **Pack simulator:**
  - TLA Play Boosters ($6.99) and a box price
  - wallet with "+ Add funds"
  - collection binder, archetype decks (10 TLA colour pairs), stats, odds page and settings
  - "Sell 1" and "Sell all extras (keep 4)" at 60% of market
- **Journey:**
  - 4 nations (Water/Earth/Fire/Air, one colour each, plus a 10% off-colour "Spirit" pool)
  - 3 Books × 15 floors with a branching map (fight, event, elite, rest, shop, treasure, boss)
  - Strike/Guard cards, the Flow multiplier, 32 charms (including Avatar Legend charms that need the legend card)
  - 10 events, and per Book: 6 enemies, 3 elites, 1 boss
- **Link between the halves:**
  - commons are always offered; uncommons, rares and mythics are offered only if owned
  - copies give stars (1/2/4/7/12 copies → ★1–★5)
  - legend charms need the legend card
  - Journey pays $1 per fight, $2.50 per elite, $6/$10/$14 for the bosses and +$10 for a win
- **Measured economy:**
  - a pack holds about $7.12 at market value; selling a whole pack returns about $4.00
  - a winning run pays about $65–70; an early loss pays $3–8

---

## 3. Core loop and economy (M1)

### Income

| Source | Rule |
|---|---|
| Starting bankroll | $50 on first launch |
| Starter gift | 3 free Play Boosters on first launch. TLA in M1; from M3 the player picks the set. |
| Daily pack | 1 free Play Booster per local calendar day. Unclaimed packs bank up to 3. TLA in M1; from M3 the player picks the set when claiming. |
| Daily streak cash | Paid on the first visit of each local day: day 1 $5, day 2 $5, day 3 $10, day 4 $10, day 5 $15, day 6 $15, day 7 and later $20. Missing a calendar day resets the streak to day 1. |
| Journey payouts | Today's table as the baseline. Difficulty ladder +10% per level (M6). Daily-seed run +$10 once per day (M6). |
| Selling | 60% of market price (unchanged). |

- **Journey is always free to enter**, so a broke player can always earn.
- **"+ Add funds" is available only in debug mode** (`#debug`).
- Stats replaces "net vs deposits" with "earned vs spent". Old saves keep `deposited` for history.

### Selling protects stars

- "Sell all extras" never sells a **Journey-eligible** card below **12 copies** (★5).
- Cards that can't appear in Journey keep the user's setting (default 4).
- If the player lowers the protected count, the sell dialog lists each card whose star level would drop before confirming.

### Balance target

A "decent" run (clears Book One, dies in Book Two) should be worth about **3–6 packs**. A full week of daily streak is about $80 plus 7 packs, a little more than one winning run. The M4 balance pass verifies both with simulation and adjusts payouts. All economy numbers live in one data module so tuning is a data change.

---

## 4. First-time experience, save/resume, sharing (M1)

- **Tips:** short, dismissible tips the first time each screen or feature appears (pack shop, reveal, collection, Journey start, map, first fight, Flow, shop, rest, event). There is a "Reset tips" button in Settings. Seen tips are stored in the main save.
- **Save/resume:**
  - The run already saves after every action.
  - Make it first-class: a "Resume run" card on the Journey tab and on the home screen, with Book, floor, HP and deck size.
  - "Abandon run" asks for confirmation and settles any payout.
  - Finished-but-unpaid runs settle on load (existing behaviour).
- **Export/Import save:**
  - Settings → Export downloads one JSON file containing all `bendingBoosters.*` and `bb.*` keys, a version and a checksum.
  - Import validates the file, backs up the current save to a `bb.backup` key, then replaces the save.
  - This also migrates the owner's current progress from the Desktop file to the hosted link.
- **Hosting:**
  - `npm run build` produces `dist/bending-boosters.html`, published as `index.html`.
  - Default: GitHub Pages via a GitHub Actions workflow if the repo is public. If the repo must stay private, use Cloudflare Pages or Netlify (both free with private repos).
  - The Desktop copy is never overwritten by tooling.
- **Housekeeping:** set up git and fix the two known cosmetic bugs:
  - the backdrop moon showing through the empty charm slot at 1440×1000;
  - the "Empty Joker slot" label.

**M1 exit:**
- A fresh profile on the hosted link completes the starter gift, tips, a pack opening and a Journey run, and the next day collects the daily gift and streak (tested with a fake clock).
- Export → import round-trips.
- All existing tests stay green.

---

## 5. Set-agnostic Journey (M2)

### Colours replace nations

- The five MTG colours (W, U, B, R, G) are the factions.
- **A run starts with a colour pair**, one of 10. This matches how sets design their draft archetypes; TLA already ships 10 pair archetypes in `src/catalog/decks.json`.
- The starter deck is 4 Strike, 4 Defend, and the signature commons of both colours.
- Card offers come from the selected sets' Journey cards in the pair's colours, plus colourless, with today's 10% off-colour chance.

### Run setup

1. **Pick sets:** any subset of the sets you own cards from, or "All my sets".
2. **Pick a colour pair.**
3. **Pick a start charm** (unchanged).

### Ownership across sets

- "Owned = unlocked" applies to each printing's set.
- Commons of the selected sets are always available.
- **Stars count copies across all printings of the same card name.**

### Themes

A theme is a data pack containing:
- colour display names
- Book/Act titles and subtitles
- enemy rosters for each Book (normal, elite, boss)
- events
- themed charms
- backdrop palette
- small UI flavour strings

Which theme applies:
- A **single-set** run uses that set's theme. TLA's theme is "Avatar": Air Nomads, Water Tribe, Spirit, Fire Nation, Earth Kingdom, today's enemies, events and Legend charms.
- A **mixed-set** run uses the **neutral theme**: "Act I–III", original non-franchise enemies and events, neutral backdrop.

M2 ships a starter neutral content set:
- 6 enemies, 3 elites and 1 boss per Act
- about 6 events
- the generic charms

### Set mechanics as modules

- Set-specific keywords become modules that a set registers: for TLA, Firebending, Waterbend, Earthbend, Airbend, Lessons and so on, from today's `src/data/overrides.js` and keyword handling.
- The engine keeps only generic rules: Strike/Guard, Flow, damage, block, statuses, draw, energy, tokens.
- Mechanic modules hook in through a small, documented interface (on play, on Strike, on Guard, on turn start/end, keyword Flow).

### Save migration

- Journey save `bb.run` goes from v2 to v3: `nation` → `colours: [c]` (legacy mono), `sets: ["TLA"]`, `theme: "avatar"`.
- **A run in progress keeps its single colour until it ends. New runs always use pairs.**
- The pre-migration value is copied to a backup key before writing.

**M2 exit:**
- A migrated legacy single-colour TLA run plays the same as today (same seed → same map, enemies and rewards). Existing combat and progression tests pass unchanged or are adapted only where the nation→colour API changed.
- A new TLA colour-pair run under the Avatar theme completes.
- A neutral-theme run completes.
- v2 saves load and resume.

---

## 6. Sets and the set pipeline (M3)

### Set package

`src/sets/<code>/` contains:

| File | Contents |
|---|---|
| `set.json` | name, code, release date, symbol and colour accent; **products** (Play Booster: slots, rarity odds, foil rate, special/bonus sheets; other products added in M5); the archetype list (10 colour pairs with names and generic tags) |
| `cards.json` | every printing (number, name, rarity, cost, colours, type, P/T, keywords, artist, image reference, sheet) plus its **curated Journey encoding**: effects, tags, archetype tags, and which set mechanics it uses |
| `prices.json` | price snapshot taken at import; live refresh at runtime as today |
| `mechanics.js` | that set's keyword modules |
| `theme/` | optional theme pack (see section 5) |

TLA moves from `src/catalog/` into `src/sets/tla/` first, with a byte-compatibility check on pack generation: 75 seeded openings must match `history/1-original.html`, as the current browser test already checks.

### Pipeline

1. **Import:** `npm run import-set <code>` (run on the owner's machine) pulls card data, image references and prices from Scryfall into a draft `cards.json`.
2. **Curate (fully curated):** an agent encodes every card from its rules text, following `docs/card-encoding-guide.md`, the vocabulary of supported effects with examples taken from TLA.
3. **Validate (automatic):**
   - every effect is one the engine knows;
   - numbers fall in the band for the card's mana cost;
   - set mechanics resolve to registered modules;
   - archetype tags are from the generic list;
   - product odds add up to 1.
4. **Review report:** lists approximations and cards that would need a new engine effect. The owner reviews this list, not every card. A new engine effect is added only once several cards need it.
5. **Simulate:** thousands of seeded fights and runs check for no infinite loops, no extreme first-turn kills, and no crashes.

### UI

- Set picker in the pack shop and binder.
- Set logo/accent on packs.
- Journey run setup lists the sets you own cards from.

### Set #2: Teenage Mutant Ninja Turtles (TMT)

- Released 2026-03-06; about 190 main-set cards.
- Play Boosters include the bonus "Source Material" sheet (PZA).
- Mechanics include Sneak, Ninjas and Mutagen tokens.
- Ships with its own theme.

**M3 exit:**
- TMT is fully playable in packs and in Journey under its theme.
- A mixed TLA+TMT run works under the neutral theme.
- Validation and simulation are green.
- The pipeline is documented well enough that set #3 is a checklist.

Sets #3 and later are chosen by the owner and follow the same pipeline after M3.

---

## 7. Journey depth (M4)

### Archetypes

Generic archetype tags, the same in every set:

| Tag | Tag | Tag | Tag |
|---|---|---|---|
| `evasion` | `go-wide` (tokens) | `ramp` (big) | `spells` (spells-matter) |
| `drain` (sacrifice/drain) | `counters` | `lifegain` | `flow` (Flow chain) |

- Curation tags every card.
- Each set maps its 10 pair archetypes onto these tags.
- Card offers are weighted toward your pair's tags, so builds come together.
- Each tag gets 1–2 generic payoff charms. Sets add themed payoffs.

### Charms and relics

- Grow from 32 to **about 60 charms** with clear tiers and archetype hooks.
- New **boss relics**: after each boss, choose 1 of 3 strong relics, each with a drawback.

### Events

Grow from 10 to **about 30**:
- about 15 neutral events that appear in every run;
- 8–10 themed events per set;
- more risk/reward choices, and a few short multi-step stories.

### Enemies

- Per Book: **8 normal enemies, 4 elites, 2 possible bosses** (picked at random).
- New intents: multi-hit, Flow-drain, Block-steal, summon minion, phase shift at 50% HP.
- Elite and boss rules stay visible up front.

### Balance

A Node simulation bot plays seeded runs per colour pair and reports:
- win rate by Book
- damage curves
- card and charm over- and under-performance
- economy per run

Targets at ladder level 0 with an average deck:

| Outcome | Target |
|---|---|
| Book One clear | about 70% |
| Full 3-Book win | 25–35% |

The balance pass also confirms the economy targets in section 3.

**M4 exit:** all content above is in at least one theme plus the neutral theme. The simulation targets are met within ±5 points. A balance report is committed under `docs/balance/`.

---

## 8. Collection and packs (M5)

| Feature | Design |
|---|---|
| **Products** | Per set: Play Booster, Collector-style Booster (premium price, more foils and special treatments), Bundle (9 Play Boosters plus extras at a discount), Box. Odds come from the set's published product info; when none is published, documented estimates are marked as such in `set.json`. |
| **Rotating deals** | One product 15–25% off each day, plus a weekly featured set. Both are derived from the date, so all friends see the same deals. |
| **Singles market** | Buy any card at current market price ×1.15; sell at 60% (unchanged). Prices drift daily around the base price (live or snapshot) on a seeded, mean-reverting walk, never more than ±30% away. |
| **Crafting** | Extra copies beyond the protected count break into shards: C 5, U 20, R 100, M 400. Crafting costs 8× that: C 40, U 160, R 800, M 3200. Crafted cards are non-foil. Numbers are tuned in the balance pass. |
| **Sealed runs** | Buy a sealed kit (6 Play Boosters of one set, same price as 6 packs). Open it, then play a Journey run using only those cards plus basics. You keep every card, and get a bonus payout based on how far the run got. Draft with simulated opponents is a later option (section 12). |
| **Binder overhaul** | Per set: 9-card pages in collector-number order; completion % by rarity and colour; foil and special-print shelf; missing cards shown dimmed. |
| **Grading** | $3 fee per card. The card returns the **next local calendar day**. Default grade odds: 10: 10%, 9: 25%, 8: 30%, 7: 20%, 6 or below: 15%. Value multipliers: 10 → 3×, 9 → 1.5×, 8 → 1.1×, 7 → 1×, 6 or below → 0.8×. Graded cards show in slabs and sell at the graded value. |
| **Showcase shelf** | Pin up to 8 cards. "Share" renders an image and a showcase code; friends can import a code to view a showcase. |
| **Pull history** | The last 500 packs (set, product, contents, value, time), best pulls, and luck vs expected odds by rarity. |

**M5 exit:** every feature above works for TLA and TMT, has tests (date-derived features use a fake clock), and keeps local storage within budget (section 10).

---

## 9. Long-term goals (M6)

### Difficulty ladder

- Levels 1–10. Winning at a level unlocks the next. Each level adds one modifier (cumulative) and +10% payouts.
- Default modifiers, tuned by simulation:

| Level | Modifier |
|---|---|
| 1 | Elites +15% HP |
| 2 | Normal enemies +10% attack |
| 3 | Start with 50 max HP |
| 4 | Shop prices +20% |
| 5 | Bosses gain a second rule |
| 6 | Rest heals 20% less |
| 7 | Card rewards offer one fewer choice |
| 8 | Random start charm |
| 9 | All enemies +10% HP |
| 10 | Book Three always uses its harder boss |

### Achievements and unlocks

- About 40 achievements covering run feats, collection feats and economy feats.
- Rewards: card backs, backdrops, titles and extra start-charm choices.

### Binder goals

Per set: all commons, all uncommons, all rares and mythics, all foils. Each pays cash, packs or a title.

### Daily seed

- One run per **UTC** date, so friends in different timezones share it.
- Fixed sets and colour pair, picked from the date out of all sets in the game.
- **Ownership and stars are ignored** (every card of those sets available at ★1), so everyone plays the same run.
- Once-a-day bonus payout.
- Score = floors cleared × 100 + bosses × 500 + peak Flow × 10 + remaining HP on a win.
- The **score code** is base64url JSON `{v, date, name, score, pair, sets, floors, result}` plus a CRC32 checksum.
- Importing friends' codes builds a local "friends board" for that date.

### Trade codes

- Choose cards, then generate a base64url JSON code `{v, id, from, cards:[[key, count, foil]], ts}` plus a CRC32 checksum.
- **Generating the code removes the cards from the sender.**
- The receiver redeems it once; redeemed ids are stored locally.
- As agreed, this trusts friends: codes can be copied or forged.

**M6 exit:** all features have tests, including code round-trips and checksum rejection. The ladder modifiers are applied and visible on run setup.

---

## 10. Technical design

### Code

- Same build (`tools/build.mjs`) and module rules (README, "How the build works").
- **New code goes into ES modules.** A `src/boosters/` file is converted to a module when a milestone substantially rewrites it. There is no big-bang rewrite.
- New top-level areas:
  - `src/sets/<code>/` (section 6)
  - `src/themes/neutral/`
  - `src/engine/sets.js`: set registry; card lookup by key and by name
  - `src/engine/themes.js`
  - `src/economy/`: daily gift, streak, payouts and prices, one data table
  - `src/meta/`: achievements, ladder, codes
- **Card keys stay `SET:number`.** A name index groups printings for stars.

### Saves

- Every save shape has a version.
- Migrations live in one module, run in order on load, and back up the old value before writing.
- Each migration step has a unit test using a fixture from the previous version.
- Storage budget: everything stays well under 5 MB of localStorage. Pull history is capped at 500 packs. If the budget is ever exceeded, history moves to IndexedDB first.

### Clock

- All "per day" rules go through one clock module, which tests can fake.
- Local date for gifts, streaks and grading; UTC date for the daily seed.

### Testing (every milestone)

- Existing suites (combat, progression, browser, visual) stay green.
- New unit tests for each module, migration tests, and set validation.
- The simulation bot (M4) runs in CI-style scripts.
- `npm run screens` captures for visual review.

### Hosting

Build in GitHub Actions and publish `dist/` (section 4).

---

## 11. Roadmap

| Milestone | Contents | Exit criteria |
|---|---|---|
| **M1 Friends beta** | Economy (Add funds → debug only, starter gift, daily pack and streak, star-protected selling, stats change), tips, save/resume, export/import, hosting, git, cosmetic fixes | Section 4 |
| **M2 Set-agnostic Journey** | Colour pairs, set registry, themes (Avatar + neutral starter), mechanic modules, run setup, v3 migration | Section 5 |
| **M3 Pipeline + TMT** | Set package format, TLA moved, importer, encoding guide, validation, review report, simulation, set picker, TMT + theme | Section 6 |
| **M4 Journey depth** | Archetypes, ~60 charms, boss relics, ~30 events, enemy expansion, balance pass | Section 7 |
| **M5 Collection and packs** | Products, deals, singles market, crafting, sealed runs, binder overhaul, grading, showcase, pull history | Section 8 |
| **M6 Long-term** | Ladder, achievements and unlocks, binder goals, daily seed and codes, trade codes | Section 9 |

Each milestone gets its own implementation plan, written when the milestone starts, so later plans can use what earlier milestones taught.

---

## 12. Out of scope (for now)

- Real money, accounts, servers, cloud saves, real-time multiplayer.
- Phone-first design: phones must work, but desktop is the target. No Safari or real-device certification.
- Draft against simulated opponents (possible after M5).
- Sets beyond the owner's hand-picked handful.

## 13. Defaults to confirm when each milestone starts

These have working defaults so nothing blocks; confirm or change them at the milestone's kickoff.

- **Hosting provider:** GitHub Pages with a public repo (M1).
- **Neutral theme name and art direction:** "Act I–III", generic fantasy (M2).
- **Set #3 onward:** owner's choice, after M3.
- **Exact economy, crafting, grading and ladder numbers:** the defaults above, adjusted by the M4 balance pass and later playtests.

## 14. Decision log (from the planning conversation)

| Topic | Decision |
|---|---|
| Audience | Friends / small circle |
| Heart of the game | One tight loop: Journey ↔ packs ↔ collection |
| Money | Earned; daily freebies (1 pack + growing streak cash); Add funds debug-only |
| Collection → run | Owned = unlocked; copies give stars |
| Run length | 3 Books, with first-class save/resume |
| Long-term | Ladder, binder goals, unlocks & achievements, daily seed vs friends |
| First start | Starter gift + first-time tips |
| Combat | Keep the Strike/Guard/Flow core; add depth (archetypes, charms, events, enemies) |
| Sharing | Hosted link |
| Devices | Desktop browser first |
| Packs side | Sell dupes, more products, trades, singles market, crafting, deals, sealed runs, binder overhaul, grading, showcase, pull history |
| Friend features | No server, trust friends |
| Sets | Hand-picked handful; fully curated; Journey set-agnostic, sets picked per run |
| Identity | MTG colours plus per-set themes; neutral theme for mixed runs |
| Run colours | Colour pair |
| Set #2 | Teenage Mutant Ninja Turtles (TMT) |
| Selling vs stars | Selling extras never drops star level |
| Grading time | Next real day |
| Roadmap | Friends beta first |
