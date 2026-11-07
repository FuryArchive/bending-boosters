import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planSellExtras, starDrops } from '../../src/economy/selling.js';
const e = (key, name, journey, reg, foil, regValue = 1, foilValue = 3) => ({ key, name, journey, reg, foil, regValue, foilValue });
test('journey card keeps 12 copies by default', () => {
  assert.deepEqual(planSellExtras([e('TLA:1', 'Aang', true, 15, 0)], { keep: 4, keepJourney: 12 }), [{ key: 'TLA:1', foil: false, n: 3 }]);
});
test('non-journey card keeps the keep setting', () => {
  assert.deepEqual(planSellExtras([e('TLA:300', 'Plains', false, 9, 0)], { keep: 4, keepJourney: 12 }), [{ key: 'TLA:300', foil: false, n: 5 }]);
});
test('protection counts all printings of a name; cheapest copies go first', () => {
  const plan = planSellExtras([e('TLA:5', 'Katara', true, 8, 2, 0.5, 4), e('TLA:290', 'Katara', true, 4, 0, 2, 0)], { keep: 4, keepJourney: 12 });
  assert.deepEqual(plan, [{ key: 'TLA:5', foil: false, n: 2 }]);
});
test('regular copies go before foils even when the foil is cheaper', () => {
  assert.deepEqual(planSellExtras([e('TLA:7', 'Fated Firepower', true, 13, 1, 2, 1)], { keep: 4, keepJourney: 12 }), [{ key: 'TLA:7', foil: false, n: 2 }]);
});
test('nothing to sell at or below protection', () => {
  assert.deepEqual(planSellExtras([e('TLA:1', 'Aang', true, 12, 0)], { keep: 4, keepJourney: 12 }), []);
});
test('lowering journey protection reports star drops', () => {
  const entries = [e('TLA:1', 'Aang', true, 12, 0)];
  const plan = planSellExtras(entries, { keep: 4, keepJourney: 4 });
  assert.deepEqual(starDrops(entries, plan), [{ name: 'Aang', from: 5, to: 3 }]);
});
