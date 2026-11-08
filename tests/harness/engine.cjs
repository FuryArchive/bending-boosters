'use strict';
// Extract the actual catalog/engine without executing the page, DOM, saves or audio.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {GAME} = require('./env.cjs');

// The card catalog inside a built game: the `const DATA = …` line of builds before set packages,
// or the base cards of every package in `const SET_PACKAGES = […]`.
function catalogOf(html) {
  const data = html.match(/^const DATA = (.*);$/m);
  if (data) return JSON.parse(data[1]);
  const sets = html.match(/^const SET_PACKAGES = (.*);$/m);
  if (!sets) return null;
  const pkgs = JSON.parse(sets[1]);
  return { ...pkgs[0].cards, base: pkgs.flatMap((p) => p.cards.base) };
}

function loadEngine(sourcePath = GAME) {
  sourcePath = path.resolve(sourcePath);
  const html = fs.readFileSync(sourcePath, 'utf8');
  const data = catalogOf(html);
  const start = html.indexOf('  // src/data/overrides.js');
  const end = html.indexOf('  // src/ui/cardview.js', start);
  if (!data || start < 0 || end <= start) {
    throw new Error(`Missing catalog/engine extraction markers: ${sourcePath}`);
  }
  const ctx = vm.createContext({structuredClone, console});
  vm.runInContext(html.slice(start, end), ctx, {
    filename: sourcePath,
    lineOffset: html.slice(0, start).split('\n').length - 1,
    timeout: 10000,
  });
  ctx.setCatalog(data.base);
  return {ctx, data, html, sourcePath};
}

module.exports = {loadEngine, catalogOf};
if (require.main === module) {
  const {ctx, data, sourcePath} = loadEngine(process.argv[2] || GAME);
  console.log(`Extracted engine from ${sourcePath}; ${data.base.filter(c => ctx.isRunCard(c)).length} Journey cards.`);
}
