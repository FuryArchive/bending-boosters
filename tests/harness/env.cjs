'use strict';
// Shared paths and browser setup for the test suites. Everything is relative to the project,
// so the suites work from any checkout location.
//
// Environment overrides:
//   CHROMIUM_PATH       browser executable (default: /usr/bin/chromium when present,
//                       otherwise Playwright's own downloaded Chromium)
//   PLAYWRIGHT_MODULE   module path to require instead of the project's `playwright`
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const GAME = path.join(ROOT, 'dist', 'bending-boosters.html');
const HISTORY = {
  original: path.join(ROOT, 'history', '1-original.html'),
  bugfixes: path.join(ROOT, 'history', '2-bugfixes.html'),
  visual: path.join(ROOT, 'history', '3-visual-edition.html'),
};
const OUTPUT = path.join(ROOT, 'test-output');

function playwright() {
  return require(process.env.PLAYWRIGHT_MODULE || 'playwright');
}
function launchOptions(extra = {}) {
  const exe = process.env.CHROMIUM_PATH || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
  return { headless: true, ...(exe ? { executablePath: exe } : {}), ...extra };
}

module.exports = { ROOT, GAME, HISTORY, OUTPUT, playwright, launchOptions };
