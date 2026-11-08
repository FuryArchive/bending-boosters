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
