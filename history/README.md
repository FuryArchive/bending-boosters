# Build history

These are the shipped single-file builds from before the source was recovered (2026-11-07). They are kept for reference, for rollback, and because two test suites compare against them. Don't edit them.

| File | SHA-256 | What it is |
|---|---|---|
| `1-original.html` | `e83cbd78d35b8271a439a15ace6c56dfe3523d917d2c090408cb8d7caec499ec` | The game as originally delivered by the first agent. |
| `2-bugfixes.html` | `59490ce0392de7a07bf893e4212b5a6fa365505de24fb7e408e761a96c7c4a39` | Nov 4: fixes for 11 review findings. These include the self-redrawing card exploit, lost winnings on reload during defeat, Azula's "Safe" forecast before a lethal hit, the rest-site softlock, stale pack animations, incomplete resets, and enemy restrictions bypassed by effects. |
| `3-visual-edition.html` | `433b99c515a25f76a069fe738459f0c397aeeae820b8aae23ee7c5c928e7d0ce` | Nov 4–5: presentation-only pass covering the ink/jade/gilt palette, booster wrapper, landscape backdrops, larger Journey cards, a scrollable hand on phones, shop grouping and responsive fixes. The engine, catalog and pack/economy code are byte-identical to build 2. **This is the Desktop copy, and `npm run build` reproduces it exactly.** |

The working notes from those passes are still on disk, outside this project:

- `~/workspace/bending-boosters-review/`: the code review (`REVIEW.md`), fix notes (`FIXES.md`, `COMBAT_FIXES.md`), patches and the original test suite.
- `~/workspace/bending-boosters-visual/`: README for the visual pass, before/after screenshots, reference notes and logs.
