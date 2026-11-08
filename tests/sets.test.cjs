// M3a browser checks: set packages in the pack simulator. Runs on a test build that adds the
// fixture package tests/fixtures/sets/tst (node tools/build.mjs --with-set ...).
'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const env = require('./harness/env.cjs');
const { chromium } = env.playwright();

const MULTI = path.join(env.OUTPUT, 'multiset.html');
execFileSync(process.execPath, [path.join(env.ROOT, 'tools/build.mjs'), '--with-set', 'tests/fixtures/sets/tst', '--out', MULTI], { stdio: 'ignore' });
const GAME_URL = pathToFileURL(env.GAME).href;
const MULTI_URL = pathToFileURL(MULTI).href;
const errors = [];
let browser;
let groups = 0;

async function fresh({ url = MULTI_URL, debug = true } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  await ctx.route('https://**/*', (r) => r.abort());
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.stack));
  await page.goto(url + (debug ? '#debug' : ''));
  await page.evaluate(() => { S.settings.sound = false; S.settings.real = false; S.settings.fast = true; });
  return { page, ctx };
}
async function group(name, fn) {
  await fn();
  groups++;
  console.log('PASS ' + name);
}
const seededPacks = (page, seed, n, code) => page.evaluate(({ seed, n, code }) => {
  resetProgress({ ...S.settings, seed });
  return Array.from({ length: n }, () => (code ? openPack(code) : openPack()).map((p) => [cardKey(p.c), p.foil, p.slot]));
}, { seed, n, code });

(async () => {
  browser = await chromium.launch(env.launchOptions({ args: ['--mute-audio', '--disable-dev-shm-usage'] }));
  try {
    await group('TST packs follow its own slots; TLA packs are unchanged', async () => {
      const one = await fresh({ url: GAME_URL });
      const a = await seededPacks(one.page, 'PARITY-M3', 20);
      await one.ctx.close();
      const multi = await fresh();
      assert.deepEqual(await seededPacks(multi.page, 'PARITY-M3', 20), a);
      const tst = await seededPacks(multi.page, 'TST-PACKS', 50, 'TST');
      for (const pack of tst) {
        assert.equal(pack.length, 6);
        assert.deepEqual(pack.map(([, , slot]) => slot), ['common', 'common', 'common', 'unc', 'rare', 'foil']);
        assert.ok(pack.every(([k]) => k.startsWith('TST:')), JSON.stringify(pack));
        assert.equal(pack[5][1], true);
      }
      const rare = await multi.page.evaluate(() => {
        resetProgress({ ...S.settings, seed: 'TST-PACKS' });
        return Array.from({ length: 50 }, () => openPack('TST')[4].c.r);
      });
      assert.ok(rare.every((r) => r === 'R' || r === 'M'));
      assert.ok(rare.includes('M'));
      await multi.ctx.close();
    });

    await group('cards from every set are found and priced', async () => {
      const { page, ctx } = await fresh();
      const r = await page.evaluate(() => ({
        name: findCard('TST:9') && findCard('TST:9').name, foil: priceOf(findCard('TST:9'), true),
        tle: !!findCard('TLE:1'), query: scryfallQuery(['tla', 'tle']),
      }));
      assert.deepEqual(r, { name: 'Fixture Titan', foil: 20, tle: true, query: '(set:tla or set:tle)' });
      await ctx.close();
    });

    await group('image cache refreshes when the sets change', async () => {
      const { page, ctx } = await fresh();
      assert.deepEqual(await page.evaluate(() => [
        imgCacheFresh({ v: 2, t: Date.now(), codes: ['tla', 'tle'], m: {} }, ['tla', 'tle']),
        imgCacheFresh({ v: 2, t: Date.now(), codes: ['tle', 'tla'], m: {} }, ['tla', 'tle']),
        imgCacheFresh({ v: 2, t: Date.now(), codes: ['tla', 'tle'], m: {} }, ['tla', 'tle', 'tst']),
        imgCacheFresh({ v: 2, t: Date.now(), m: {} }, ['tla', 'tle']),
      ]), [true, true, false, false]);
      await ctx.close();
    });

    await group('a shared name shares stars', async () => {
      const { page, ctx } = await fresh();
      const r = await page.evaluate(() => {
        const tla = BASE.find((c) => c.name === 'Otter-Penguin');
        S.coll = { [cardKey(tla)]: 7, 'TST:1': 5 }; S.foil = {}; S.settings.keepJourney = 12;
        const plan = sellExtrasPlan(null).plan;
        return { owned: owned('Otter-Penguin'), sold: plan.filter((p) => p.key === cardKey(tla) || p.key === 'TST:1').length };
      });
      assert.deepEqual(r, { owned: 12, sold: 0 });
      await ctx.close();
    });

    await group('unknown set keys are kept and ignored', async () => {
      const { page, ctx } = await fresh({ url: GAME_URL });
      await page.evaluate(() => {
        S.coll['TMT:5'] = 3; S.foil['TMT:6'] = 1; S.hist.push(['TMT:5@common']); save();
        collectionValue(); showView('collection'); renderCollection(); showView('stats'); renderStats();
        sellList(sellExtrasPlan(null).items); showView('decks');
      });
      assert.equal(await page.evaluate(() => S.coll['TMT:5']), 3);
      await ctx.close();
    });

    const opened = (page) => page.waitForFunction(() => ST && ST.cards && ST.cards.length > 0)
      .then(() => page.evaluate(() => ST.cards.map((p) => cardKey(p.c))));

    await group('the set picker opens the chosen set', async () => {
      const { page, ctx } = await fresh();
      assert.equal(await page.locator('[data-pick-set]').count(), 2);
      await page.locator('[data-pick-set="TST"]').click();
      assert.match(await page.locator('#pack').innerText(), /Test Set/);
      await page.locator('#open1').click();
      const keys = await opened(page);
      assert.ok(keys.length === 6 && keys.every((k) => k.startsWith('TST:')), keys.join());
      await page.reload();
      assert.equal(await page.evaluate(() => S.settings.packSet), 'TST');
      assert.match(await page.locator('#pack').innerText(), /Test Set/);
      await ctx.close();
    });

    await group('an unknown packSet falls back', async () => {
      const { page, ctx } = await fresh();
      await page.evaluate(() => { S.settings.packSet = 'NOPE'; save(); });
      await page.reload();
      await page.evaluate(() => { S.settings.fast = true; });
      assert.equal(await page.evaluate(() => packSet()), 'TLA');
      await page.locator('#open1').click();
      const keys = await opened(page);
      assert.ok(keys.length === 14 && keys.every((k) => /^(TLA|TLE):/.test(k)), keys.join());
      await ctx.close();
    });

    await group('one set looks like today', async () => {
      const { page, ctx } = await fresh({ url: GAME_URL });
      assert.equal(await page.locator('#setPick').isVisible(), false);
      assert.match(await page.locator('header').innerText(), /Avatar: The Last Airbender \(TLA\) play booster simulator/);
      assert.match(await page.locator('#pack').innerText(), /PLAY BOOSTER · 14 CARDS\s*The Last Airbender/);
      await page.evaluate(() => showView('odds'));
      assert.equal(await page.locator('#oddsSet').isVisible(), false);
      await ctx.close();
    });

    await group('odds per set', async () => {
      const { page, ctx } = await fresh();
      await page.evaluate(() => showView('odds'));
      assert.equal(await page.locator('#oddsSet').isVisible(), true);
      await page.locator('#oddsSet').selectOption('TST');
      assert.equal(await page.locator('#slotTable h3').count(), 4);
      assert.match(await page.locator('#oddsNote').innerText(), /Fixture\./);
      await page.locator('#oddsSet').selectOption('TLA');
      assert.equal(await page.locator('#slotTable h3').count(), 7);
      await ctx.close();
    });

    assert.deepEqual(errors, []);
    console.log(`ALL SET-PACKAGE CHECKS PASSED (${groups} groups; no page errors)`);
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error(e); console.error(errors.join('\n')); process.exitCode = 1; });
