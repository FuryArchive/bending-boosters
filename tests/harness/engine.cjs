'use strict';
// Extract the actual catalog/engine without executing the page, DOM, saves or audio.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {GAME} = require('./env.cjs');

function loadEngine(sourcePath = GAME) {
  sourcePath = path.resolve(sourcePath);
  const html = fs.readFileSync(sourcePath, 'utf8');
  const dataMatch = html.match(/^const DATA = (.*);$/m);
  const start = html.indexOf('  // src/data/overrides.js');
  const end = html.indexOf('  // src/ui/cardview.js', start);
  if (!dataMatch || start < 0 || end <= start) {
    throw new Error(`Missing catalog/engine extraction markers: ${sourcePath}`);
  }
  const data = JSON.parse(dataMatch[1]);
  const ctx = vm.createContext({structuredClone, console});
  vm.runInContext(html.slice(start, end), ctx, {
    filename: sourcePath,
    lineOffset: html.slice(0, start).split('\n').length - 1,
    timeout: 10000,
  });
  ctx.setCatalog(data.base);
  return {ctx, data, html, sourcePath};
}

module.exports = {loadEngine};
if (require.main === module) {
  const {ctx, data, sourcePath} = loadEngine(process.argv[2] || GAME);
  console.log(`Extracted engine from ${sourcePath}; ${data.base.filter(c => ctx.isRunCard(c)).length} Journey cards.`);
}
