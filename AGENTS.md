# Notes for coding agents

- Edit `src/`, never a built HTML. `dist/` is generated, and `history/` holds frozen past builds.
- Build with `npm run build`, then open `dist/bending-boosters.html`. Run `npm test` before calling a change done. Run `npm run check` after touching anything in `src/data`, `src/engine` or `src/ui`.
- The Journey modules share one scope once built. Keep top-level names unique, put plain named imports at the top, and put `export` only at the start of a top-level declaration line. Add new modules to `build.config.json`. README.md ("How the build works") explains why.
- `src/boosters/*.js` is one classic script split into ordered files with shared globals. It is not ES modules.
- `src/catalog/*.json` holds one record per line. The build minifies it back, so keep it valid JSON.
- Don't change localStorage keys (`bendingBoosters.v1`, `bb.run`, …) without a migration, because players have existing saves.
- Don't overwrite the player's Desktop copy; the user ships builds themselves.
- If someone edited a built HTML directly, recover the change with `node tools/extract.mjs edited.html --out /tmp/x`, then diff `/tmp/x/src` against `src/`.
