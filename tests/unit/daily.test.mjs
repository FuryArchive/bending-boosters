import { test } from 'node:test';
import assert from 'node:assert/strict';
import { claimDaily } from '../../src/economy/daily.js';
import { daysBetween, localDay } from '../../src/economy/clock.js';
import { ECONOMY } from '../../src/economy/config.js';

const fresh = { last: null, streak: 0 };
test('first ever claim is streak day 1: $5 and 1 pack', () => {
  assert.deepEqual(claimDaily(fresh, '2026-11-07'),
    { daily: { last: '2026-11-07', streak: 1 }, claimed: true, cash: 5, packs: 1, streakDay: 1 });
});
test('consecutive days follow 5,5,10,10,15,15,20 then stay 20', () => {
  let d = fresh; const cash = [];
  for (let i = 0; i < 9; i++) { const r = claimDaily(d, `2026-11-${String(7 + i).padStart(2, '0')}`); cash.push(r.cash); assert.equal(r.packs, 1); d = r.daily; }
  assert.deepEqual(cash, [5, 5, 10, 10, 15, 15, 20, 20, 20]);
});
test('a missed day resets the streak and accrues packs', () => {
  const r = claimDaily({ last: '2026-11-07', streak: 5 }, '2026-11-09');
  assert.deepEqual([r.daily.streak, r.cash, r.packs], [1, 5, 2]);
});
test('long absence accrues at most 3 packs', () => {
  assert.equal(claimDaily({ last: '2026-11-01', streak: 3 }, '2026-11-20').packs, 3);
});
test('same day pays nothing', () => {
  const d = { last: '2026-11-07', streak: 2 };
  assert.deepEqual(claimDaily(d, '2026-11-07'), { daily: d, claimed: false, cash: 0, packs: 0, streakDay: 2 });
});
test('clock moved backwards pays nothing and keeps the streak', () => {
  const d = { last: '2026-11-07', streak: 4 };
  const r = claimDaily(d, '2026-11-05');
  assert.equal(r.claimed, false); assert.equal(r.cash, 0); assert.deepEqual(r.daily, d);
});
test('daysBetween crosses months and is negative backwards', () => {
  assert.equal(daysBetween('2026-10-31', '2026-11-01'), 1);
  assert.equal(daysBetween('2026-11-05', '2026-11-03'), -2);
});
test('localDay formats YYYY-MM-DD', () => {
  assert.match(localDay(Date.UTC(2026, 10, 7, 12)), /^\d{4}-\d{2}-\d{2}$/);
});
test('payout table matches the spec', () => {
  assert.deepEqual(ECONOMY.journeyPayout, { fight: 1, elite: 2.5, boss: [6, 10, 14], win: 10 });
});
