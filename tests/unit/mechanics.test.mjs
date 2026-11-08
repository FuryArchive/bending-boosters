import '../../src/content.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerSet } from '../../src/engine/sets.js';
import { registerMechanic, surgeOf } from '../../src/engine/mechanics.js';
import { basicCard, toRunCard } from '../../src/engine/cards.js';
import { createFight, playCard, previewCard } from '../../src/engine/flow.js';
import { mergePatch } from '../../src/engine/jokers.js';
import { createRng } from '../../src/engine/rng.js';

registerSet({ code: 'TST', name: 'Test', theme: 'neutral' });
registerMechanic({
  id: 'test-spark', set: 'TST',
  keyword: (w, k) => w === 'Spark' && (k.spark = true),
  keywordFlow: c => (c.keywords.spark ? 2 : 0),
  onCard: (c, m) => (c.keywords.spark && m === 'strike' ? { base: 5 } : null),
  onTurnStart: () => ({ block: 3 }),
});

const fightWith = (sets, deck) => createFight({
  deck, player: { hp: 60, maxHp: 60 }, enemy: { id: 'dummy', hp: 999, atk: 1, pattern: ['strike'] },
  jokers: [], jstate: {}, rng: createRng('MECH'), sets,
});
const spark = () => toRunCard({ set: 'TST', num: '1', name: 'Spark Test', type: 'Creature', pt: '2/2', cost: '1 R', col: 'R', kw: ['Spark'] });
const free = (over) => ({ ...basicCard('strike'), energy: 0, ...over });

test('a set keyword is parsed by its mechanic', () => {
  assert.equal(spark().keywords.spark, true);
});
test('mechanic hooks apply only in fights that include their set', () => {
  const on = fightWith(['TST'], [spark()]), off = fightWith(['TLA'], [spark()]);
  const a = previewCard(on, 0, 'strike'), b = previewCard(off, 0, 'strike');
  assert.equal(a.dmg - b.dmg, 5);
  assert.equal(a.gain - b.gain, 2);
  assert.equal(on.player.block, 3);
  assert.equal(off.player.block, 0);
});
test('Avatar State is TLA\'s surge, absent from other sets\' fights', () => {
  const four = () => ['Air', 'Water', 'Earth', 'Fire'].map((el, i) => free({ uid: 'el' + i, elements: [el] }));
  assert.equal(surgeOf(fightWith(['TST'], four())), null);
  for (const [sets, expected] of [[['TLA'], true], [['TST'], false]]) {
    const f = fightWith(sets, four());
    let last = null;
    while (f.hand.length) last = playCard(f, 0, 'strike').res;
    assert.equal(last.avatar, expected, sets[0]);
  }
});
test('Firebending Flow comes from TLA', () => {
  const card = () => free({ uid: 'fb', keywords: { firebending: 2 } });
  assert.equal(previewCard(fightWith(['TLA'], [card()]), 0, 'strike').gain, 3);
  assert.equal(previewCard(fightWith(['TST'], [card()]), 0, 'strike').gain, 1);
});
test('patches merge: numbers add, xdmg multiplies, flags OR', () => {
  assert.deepEqual(mergePatch({ base: 2, xdmg: 1.5, zero: false }, { base: 3, xdmg: 2, zero: true }), { base: 5, xdmg: 3, zero: true });
});
