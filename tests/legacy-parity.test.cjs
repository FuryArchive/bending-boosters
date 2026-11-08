#!/usr/bin/env node
'use strict';
// The shipped engine (history/3-visual-edition.html) and the current build, side by side.
// Legacy single-colour TLA runs must convert cards, offer cards and play exactly as they shipped.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const env = require('./harness/env.cjs');
const { loadEngine } = require('./harness/engine.cjs');

const old = loadEngine(env.HISTORY.visual);
const neu = loadEngine(env.GAME);
// Objects from two vm contexts have different prototypes: compare them as plain JSON.
const plain = x => JSON.parse(JSON.stringify(x));

test('every catalog card converts exactly as in the shipped build', () => {
  for (const c of neu.data.base) {
    const a = plain(old.ctx.toRunCard(c)), b = plain(neu.ctx.toRunCard(c));
    delete a.uid; delete b.uid;
    assert.deepStrictEqual(b, a, c.name);
    const ra = old.ctx.toRunCard(c), rb = neu.ctx.toRunCard(c);
    assert.deepStrictEqual(plain(neu.ctx.actLines(rb)), plain(old.ctx.actLines(ra)), c.name);
    assert.deepStrictEqual(plain(neu.ctx.keywordNames(rb)), plain(old.ctx.keywordNames(ra)), c.name);
  }
});

const keys = list => Array.from(list, c => c.set + ':' + c.num);
for (const nation of ['water', 'earth', 'fire', 'air']) {
  test(`${nation}: pools, starter deck and card offers match the shipped build`, () => {
    const c = neu.ctx.NATION_COLOUR[nation];
    assert.deepStrictEqual(keys(neu.ctx.colourPool([c], ['TLA'])), keys(old.ctx.nationPool(nation)));
    assert.deepStrictEqual(keys(neu.ctx.offColourPool([c], ['TLA'])), keys(old.ctx.spiritPool()));
    assert.deepStrictEqual(plain(neu.ctx.starterDeck([c], ['TLA'])), plain(old.ctx.starterDeck(nation)));
    const owned = neu.data.base.filter(x => neu.ctx.isRunCard(x)).filter((x, i) => i % 3 === 0).map(x => x.set + ':' + x.num);
    for (let s = 0; s < 50; s++) {
      const run = { nation, book: 2, ownedKeys: owned, ownedStars: {} };
      assert.deepStrictEqual(keys(neu.ctx.cardOffers(run, 3, neu.ctx.createRng('OFFER-' + s))),
        keys(old.ctx.cardOffers(run, 3, old.ctx.createRng('OFFER-' + s))), `seed ${s}`);
    }
  });
}

const { autoplay } = require('./harness/autoplay.cjs');
const strip = r => { const o = JSON.parse(neu.ctx.serialize(r)); for (const k of ['v', 'colours', 'sets', 'theme']) delete o[k]; return o; };
const stripOld = r => { const o = JSON.parse(old.ctx.serialize(r)); delete o.v; return o; };
for (const nation of ['water', 'earth', 'fire', 'air']) for (const forceWin of [false, true]) {
  test(`a legacy ${nation} run plays the same as the shipped build${forceWin ? ' (all three Books)' : ''}`, () => {
    const args = { seed: `PARITY-${nation}`, nation, ownedKeys: [], ownedStars: {} };
    const a = old.ctx.createRun(args), b = neu.ctx.createRun(args), trail = [];
    autoplay(old.ctx, a, { forceWin, onStep: r => trail.push(stripOld(r)) });
    let i = 0;
    autoplay(neu.ctx, b, { forceWin, onStep: r => assert.deepStrictEqual(strip(r), trail[i++], `step ${i}`) });
    assert.equal(i, trail.length);
    if (forceWin) assert.equal(b.status, 'won');
  });
}
test('a v2 save paused mid-fight resumes identically in the new build', () => {
  const a = old.ctx.createRun({ seed: 'PARITY-MIDFIGHT', nation: 'fire', ownedKeys: [], ownedStars: {} });
  autoplay(old.ctx, a, { until: r => r.fight && r.fight.turn >= 2 && r.fight.chain.length > 0 });
  assert.ok(a.fight, 'paused in a fight');
  const b = neu.ctx.deserialize(old.ctx.serialize(a));
  assert.equal(b.v, 3); assert.deepStrictEqual(plain(b.colours), ['R']);
  const trail = [];
  autoplay(old.ctx, a, { onStep: r => trail.push(stripOld(r)) });
  let i = 0;
  autoplay(neu.ctx, b, { onStep: r => assert.deepStrictEqual(strip(r), trail[i++], `step ${i}`) });
  assert.equal(i, trail.length);
});

test('every colour pair completes all three Books under the Avatar theme', () => {
  const avatar = neu.ctx.themeById('avatar'), ids = new Set();
  for (const b of [1, 2, 3]) for (const e of [...avatar.books[b].roster, ...avatar.books[b].elites, avatar.books[b].boss]) ids.add(e.id);
  for (const p of neu.ctx.PAIRS) {
    const run = neu.ctx.createRun({ seed: 'PAIR-' + p, colours: p.split('') });
    const seen = autoplay(neu.ctx, run, { forceWin: true });
    assert.equal(run.status, 'won', p);
    for (const boss of ['zhao', 'azula_catacombs', 'ozai']) assert.ok(seen.enemies.includes(boss), p + ' ' + boss);
    assert.ok(seen.enemies.every(id => ids.has(id)), p);
    assert.ok(seen.events.every(id => id in avatar.events), p);
  }
});

test('a neutral run completes all three Acts', () => {
  const run = neu.ctx.createRun({ seed: 'NEUTRAL-1', colours: ['W', 'B'], theme: 'neutral' });
  const seen = autoplay(neu.ctx, run, { forceWin: true });
  assert.equal(run.status, 'won');
  assert.ok(seen.enemies.length > 0 && seen.enemies.every(id => id.startsWith('n_')), seen.enemies.join());
  assert.ok(seen.events.every(id => id.startsWith('n_')), seen.events.join());
  assert.ok(!seen.charms.some(id => neu.ctx.jokerById(id).kind === 'legend'));
});

test('charm, offering and hex texts read exactly as shipped under the Avatar theme', () => {
  const avatar = neu.ctx.themeById('avatar'), tt = s => neu.ctx.themeText(avatar, s);
  for (const j of old.ctx.JOKERS) assert.equal(tt(neu.ctx.jokerById(j.id).text), j.text, j.id);
  for (const o of old.ctx.OFFERINGS) assert.equal(tt(neu.ctx.itemById(o.id).text), o.text, o.id);
  old.ctx.HEXES.forEach((h, i) => {
    assert.deepStrictEqual(plain(neu.ctx.HEXES[i]), plain(h), h.id); // saved inside fights: unchanged
    assert.equal(tt(neu.ctx.hexText(h)), h.text, h.id);
  });
});
