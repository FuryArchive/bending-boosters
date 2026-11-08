# Notes for coding agents

**When you start:** read the vault note `/home/fury/Documents/Obsidian Vault/10 Projects/Bending Boosters/Bending Boosters - Overview.md`, beginning with "Resume here". Then read the handoff rules in `/home/fury/Documents/Obsidian Vault/20 AI & Development/Agent Handoff.md`.

**When you stop (every session, even if the work is unfinished):** commit your work here (once git exists), then update the vault note's "Resume here" block and "Session log", and this project's row in `10 Projects/Projects Board.md`.

- Edit `src/`, never a built HTML. `dist/` is generated, and `history/` holds frozen past builds.
- Build with `npm run build`, then open `dist/bending-boosters.html`. Run `npm test` before calling a change done. Run `npm run check` after touching anything in `src/data`, `src/engine` or `src/ui`.
- The Journey modules share one scope once built. Keep top-level names unique, put plain named imports at the top, and put `export` only at the start of a top-level declaration line. Add new modules to `build.config.json`. README.md ("How the build works") explains why.
- `src/boosters/*.js` is one classic script split into ordered files with shared globals. It is not ES modules.
- `src/sets/*/{set,cards,prices}.json` hold one record per line. The build minifies them back, so keep them valid JSON.
- Every economy number (bankroll, gifts, streak cash, prices, sell rate, keep counts, Journey payouts) lives in `src/economy/config.js`. Change it there, not in the UI code.
- New pack-simulator code that needs logic should call a pure ES module through `BBJ` (see `src/ui/index.js` exports), and startup code goes in `src/boot.js`, which runs after `BBJ` exists.
- Don't change localStorage keys (`bendingBoosters.v1`, `bb.run`, …) without a migration, because players have existing saves.
- Don't overwrite the player's Desktop copy; the user ships builds themselves.
- If someone edited a built HTML directly, recover the change with `node tools/extract.mjs edited.html --out /tmp/x`, then diff `/tmp/x/src` against `src/`.
