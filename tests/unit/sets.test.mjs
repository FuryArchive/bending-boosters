import '../../src/content.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PAIRS, pairId, normColours } from '../../src/engine/colours.js';
import { themeForSets } from '../../src/engine/sets.js';
import { isRunCard, setCatalog } from '../../src/engine/catalog.js';
import { journeyOwnership, setupSets } from '../../src/engine/ownership.js';

const data = JSON.parse(fs.readFileSync(new URL('../../src/catalog/data.json', import.meta.url), 'utf8'));
setCatalog(data.base);

test('pairs are the ten WUBRG-ordered pairs', () => {
  assert.equal(PAIRS.length, 10); assert.equal(new Set(PAIRS).size, 10);
  for (const p of PAIRS) assert.equal(pairId(p.split('').reverse()), p);
  assert.equal(pairId(['R', 'U']), 'UR');
  assert.deepEqual(normColours(['G', 'x', 'U', 'G']), ['U', 'G']);
});
test('theme follows the sets', () => {
  assert.equal(themeForSets(['TLA']), 'avatar');
  for (const s of [['TLA', 'TMT'], [], ['NOPE']]) assert.equal(themeForSets(s), 'neutral');
});
test('Journey cards come from registered Journey sets only', () => {
  assert.equal(data.base.filter(isRunCard).length, 262);
  assert.equal(data.eternal.some(isRunCard), false);
});
test('a printing unlocks only its own set; stars count every printing', () => {
  const aang = data.base.find(c => c.name === 'Aang, the Last Airbender');
  const printings = [aang, { set: 'TLA', num: '900', name: aang.name }, { set: 'XYZ', num: '1', name: aang.name }];
  const copies = { 'TLA:900': 7, 'XYZ:1': 5 };
  const o = journeyOwnership({ cards: data.base, printings, copiesOf: p => copies[p.set + ':' + p.num] || 0, sets: ['TLA'] });
  assert.ok(o.ownedKeys.includes('TLA:' + aang.num));
  assert.equal(o.ownedStars['TLA:' + aang.num], 5);
  const other = journeyOwnership({ cards: data.base, printings, copiesOf: p => (p.set === 'XYZ' ? 1 : 0), sets: ['TLA'] });
  assert.equal(other.ownedKeys.includes('TLA:' + aang.num), false);
  assert.equal(other.ownedStars['TLA:' + aang.num], undefined); // 1 copy: no star entry
});
test('set step: owned sets, fallback to every Journey set, step only for 2+', () => {
  assert.deepEqual(setupSets({ journey: ['TLA'], owned: [] }), { choices: ['TLA'], selected: ['TLA'], showStep: false });
  assert.deepEqual(setupSets({ journey: ['TLA', 'TMT'], owned: ['TMT', 'TLE'] }).choices, ['TMT']);
  assert.equal(setupSets({ journey: ['TLA', 'TMT'], owned: ['TLA', 'TMT'] }).showStep, true);
});
