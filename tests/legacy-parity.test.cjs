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
