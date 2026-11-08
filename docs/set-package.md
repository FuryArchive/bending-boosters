# Set packages

Every card set the game ships is a folder in `src/sets/<code>/`, named by its lowercase set code. The pack simulator, the binder, the odds page, the stats and Journey all read sets from these packages, so adding a set means adding a package, not editing those screens. TLA (`src/sets/tla/`) is the reference package.

## Files

| File | Contents |
|---|---|
| `set.json` | the set record: identity, pack products, special-version sheets, archetypes, decks |
| `cards.json` | every printing the set's packs can contain |
| `prices.json` | a price snapshot; live prices replace it at runtime |
| `mechanics.js`, `theme.js`, … | optional Journey content: the set's mechanics and theme (see "Journey" below) |

All JSON is pretty-printed with one record per line. The build minifies it, so keep it valid JSON.

### `set.json`

| Field | Example (TLA) | Used for |
|---|---|---|
| `code` | `"TLA"` | card keys (`TLA:1`), pickers, saves |
| `name` | `"Avatar: The Last Airbender"` | pickers, header, binder, stats |
| `released` | `"2025-11-21"` | reference |
| `scryfall` | `["tla", "tle"]` | the Scryfall sets whose images and prices the game loads |
| `accent` | `"#e8c25a"` | the set's colour on its pack badge and picker chip |
| `symbol` | `"TLA"` | the badge on the pack |
| `sheets` | `{ "scene cards": { "id": "scene", "label": "Scene", "cls": "bl" }, … }` | the special-version sheets: `id` is stored on each printing (`treat`), `label` is shown, `cls` styles the card |
| `products.play` | see below | the Play Booster |
| `archetypes` | `[{ "id": "WU", "name": "Azorius Airbending Flyers", "theme": "…", "key": ["…"] }, …]` | the decks page and Journey pair names; may be empty |
| `decks` | `[{ "name": "…", "share": "5.9%", "note": "…", "key": "list3" }, …]` | "Standard decks" on the decks page; may be empty |

`products.play`:

| Field | Example | Notes |
|---|---|---|
| `title` | `"The Last Airbender"` | the name on the pack |
| `label` | `"Play Booster"` | |
| `tagline`, `blurb` | `"Master all four elements"`, `"Each pack has 14 cards …"` | optional hero copy next to the pack |
| `note` | HTML | the source of the odds, shown on the odds page |
| `slots` | `[{ "id": "rare", "n": 1, "label": "Rare / Mythic", "base": spec, "rep": [[0.126, spec], …] }, …]` | in pack order; the card count is the sum of `n` |

Each slot rolls once per card: with probability `p` it uses a `rep` entry's spec, otherwise `base`. A third element `true` (`[p, spec, true]`) makes that outcome foil, and `"foil": true` on the slot makes every card in it foil. A slot with `id` `"rare"` becomes a guaranteed mythic when mythic pity triggers.

A **spec** names the cards a roll picks from (uniformly):

| Spec | Cards |
|---|---|
| `{ "src": "base", "r": "C" }` | base printings of that rarity (`C`, `U`, `R`, `M`, `L`) |
| `{ "src": "base", "r": "C", "exclSheet": "allied lands" }` | the same, minus the names on that sheet |
| `{ "src": "eternal" }` | the set's Eternal printings (`cards.json` `eternal`) |
| `{ "src": "names", "sheet": "allied lands" }` | the base printings named on a sheet |
| `{ "src": "nums", "sheet": "default basic" }` | the base printings numbered on a sheet |
| `{ "src": "treat", "sheet": "scene cards", "r": "R" }` | a special-version sheet; `r` keeps only that rarity when the sheet has any |

Changing a slot changes every pack opened afterwards. For TLA, `tests/browser.test.cjs` checks 75 seeded packs against the original build, so its slots must not change.

### `cards.json`

```json
{
  "base": [ {"set":"TLA","num":"1","r":"C","name":"…","artist":"…","cost":"2","type":"Sorcery Lesson","kw":["Kicker 2"],"col":"","fx":{"cast":[["draw",1]]}}, … ],
  "eternal": [ {"set":"TLE","num":"1","r":"M","name":"…", …}, … ],
  "treat": { "scene cards": [ {"name":"Fated Firepower","num":"297","artist":"…"}, … ], … }
}
```

- `base`: every main-set printing. `col` is the colour identity as letters (`"WU"`, or `""` for colourless). `fx` is the Journey effect encoding; cards with Journey effects are only offered in Journey when their set is registered there (see "Journey").
- `eternal`: reprints that the set's packs contain under another set code (TLE for TLA).
- `treat`: special-version sheets. Each entry names a base card and gives the special printing's own `num` (and `artist`). `sheets` in `set.json` says how each one is shown. Sheets without a `sheets` entry (TLA's `allied lands`, `default basic`) are only used by slot specs.

### `prices.json`

```json
{ "date": "2026-11-02", "m": { "TLA:1": [0.25, 0.3], … } }
```

Each value is `[regular, foil]` in US dollars, either may be `null`. Live Scryfall prices replace the snapshot while they are fresh.

## Building

`build.config.json` lists the shipped packages in the `boosters` slot:

```json
{ "sets": ["src/sets/tla"] }
```

The first package is the main set: the pack shop opens it until the player picks another. The build emits every package as one line, `const SET_PACKAGES = [...]`.

For tests, `node tools/build.mjs --with-set tests/fixtures/sets/tst --out test-output/multiset.html` adds the fixture package `TST` after the shipped ones. `tests/sets.test.cjs` uses it to check the pack shop, binder, odds, stats and decks with two sets.

## Journey

A set takes part in Journey when `src/content.js` registers it:

- `registerSet({ code, name, theme })`: `src/sets/<code>/set.js`. Its `code` and `name` must match `set.json` (a unit test checks TLA's).
- `registerMechanic(m)` for each of its mechanics (`src/sets/<code>/mechanics.js`; the hooks are documented at the top of `src/engine/mechanics.js`).
- `registerTheme(theme)` for its theme, and `registerCharms(list)` for theme charms.

New modules must also be listed in `build.config.json`'s Journey modules, between `src/data/overrides.js` and `src/ui/cardview.js`.

## Checklist: a new set's pack side

1. Create `src/sets/<code>/` with `set.json`, `cards.json` and `prices.json` as above. Write `products.play.slots` from the set's published booster information; mark estimates as such in `note`.
2. Add the folder to the `sets` list in `build.config.json`, after TLA.
3. Run `npm test`. The TLA pack checks must still pass.
4. Run `npm run screens` and look at the pack shop with the new set picked, its binder and its odds page.
