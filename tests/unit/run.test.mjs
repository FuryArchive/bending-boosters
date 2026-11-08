import '../../src/content.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRun, payout, runBrief, abandonRun } from '../../src/engine/run.js';
import { setCatalog } from '../../src/engine/catalog.js';

setCatalog(JSON.parse(fs.readFileSync(new URL('../../src/catalog/data.json', import.meta.url), 'utf8')).base);
const newRun = () => createRun({ seed: 'T', nation: 'water' });

test('engine modules import natively', () => {
  assert.equal(typeof payout, 'function');
});
test('runBrief summarises a fresh run', () => {
  const r = newRun();
  assert.deepEqual(runBrief(r), { book: 1, floor: 0, hp: 60, maxHp: 60, deck: r.deck.length, status: 'map' });
});
test('runBrief only ever returns numbers for display fields', () => {
  const b = runBrief({ book: '<img onerror=x>', floor: '2', hp: 5, maxHp: 9, deck: [1, 2], status: 'map' });
  assert.deepEqual(b, { book: 0, floor: 2, hp: 5, maxHp: 9, deck: 2, status: 'map' });
});
test('abandonRun ends the run as lost and keeps the earned payout', () => {
  const r = newRun();
  r.stats.fights = 3; r.stats.elites = 1;
  const before = payout(r);
  const a = abandonRun(r);
  assert.equal(a.status, 'lost'); assert.equal(a.abandoned, true);
  assert.equal(a.fight, null); assert.equal(a.pending, null);
  assert.equal(payout(a), before);
  assert.equal(before, 3 * 1 + 2.5);
});
