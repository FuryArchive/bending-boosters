import '../../src/content.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { COLOUR_ELEMENT, PAIRS, cardColours } from '../../src/engine/colours.js';
import { isRunCard, keyOf, setCatalog } from '../../src/engine/catalog.js';
import { colourPool, offColourPool, starterDeck } from '../../src/engine/pools.js';
import { cardOffers } from '../../src/engine/offers.js';
import { createRng } from '../../src/engine/rng.js';

const data = JSON.parse(fs.readFileSync(new URL('../../src/catalog/data.json', import.meta.url), 'utf8'));
setCatalog(data.base);

test('a pair pool holds only cards inside the pair, plus colourless', () => {
  const pool = colourPool(['U', 'R'], ['TLA']);
  assert.ok(pool.every(c => cardColours(c).every(x => 'UR'.includes(x))));
  assert.ok(pool.some(c => c.col === 'UR') && pool.some(c => !c.col));
  assert.ok(!pool.some(c => c.col === 'WU' || c.col === 'WURG'));
});
test('pair pool and off-colour pool split the Journey cards', () => {
  const home = colourPool(['U', 'R'], ['TLA']).map(keyOf), away = offColourPool(['U', 'R'], ['TLA']).map(keyOf);
  assert.equal(home.filter(k => away.includes(k)).length, 0);
  assert.equal(home.length + away.length, data.base.filter(isRunCard).length);
});
test('pair starter: 4 Strike, 4 Defend, 2 commons of each colour', () => {
  for (const p of PAIRS) {
    const d = starterDeck(p.split(''), ['TLA']);
    assert.equal(d.length, 12, p);
    assert.equal(d.filter(c => c.key === 'BASIC:strike').length, 4);
    assert.equal(new Set(d.map(c => c.uid)).size, 12);
    for (const col of p) assert.equal(d.filter(c => c.elements.length === 1 && c.elements[0] === COLOUR_ELEMENT[col]).length, 2, p + col);
  }
  assert.equal(starterDeck(['U'], ['TLA']).length, 10);
});
test('pair offers never show an unowned uncommon or better', () => {
  const run = { colours: ['W', 'B'], sets: ['TLA'], book: 3, ownedKeys: [], ownedStars: {} };
  const rng = createRng('OFFERS');
  for (let i = 0; i < 100; i++) for (const c of cardOffers(run, 3, rng)) assert.equal(c.r, 'C');
});
