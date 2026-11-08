import '../../src/content.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRun, payout, runBrief, abandonRun, serialize, deserialize } from '../../src/engine/run.js';
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
test('a new run takes a colour pair, the Journey sets and their theme', () => {
  const r = createRun({ seed: 'P', colours: ['R', 'U'] });
  assert.deepEqual(r.colours, ['U', 'R']); assert.deepEqual(r.sets, ['TLA']); assert.equal(r.theme, 'avatar');
  assert.equal(r.v, 3); assert.equal('nation' in r, false); assert.equal(r.deck.length, 12);
});
test('a run needs one or two colours', () => {
  assert.throws(() => createRun({ seed: 'P', colours: ['W', 'U', 'B'] }), /one or two colours/);
  assert.throws(() => createRun({ seed: 'P', colours: [] }), /one or two colours/);
});
test('the nation alias makes a legacy single-colour run', () => {
  const r = createRun({ seed: 'T', nation: 'water' });
  assert.deepEqual(r.colours, ['U']); assert.equal(r.nation, 'water'); assert.equal(r.deck.length, 10);
});
test('colours, sets and theme survive a save round trip', () => {
  const r = deserialize(serialize(createRun({ seed: 'P', colours: ['W', 'B'] })));
  assert.deepEqual([r.colours, r.sets, r.theme], [['W', 'B'], ['TLA'], 'avatar']);
});
test('a v2 save deserialises as v3', () => {
  const old = createRun({ seed: 'OLD', nation: 'air' });
  for (const k of ['colours', 'sets', 'theme']) delete old[k];
  old.v = 2;
  const r = deserialize(JSON.stringify(old));
  assert.equal(r.v, 3); assert.deepEqual(r.colours, ['W']); assert.equal(r.theme, 'avatar');
});
