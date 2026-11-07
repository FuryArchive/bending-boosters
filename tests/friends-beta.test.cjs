// M1 "friends beta" browser checks: gifts, economy UI, selling, saves, resume, tips.
// Fresh isolated profiles; outside HTTPS blocked; dates faked with Playwright's clock.
'use strict';
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const env = require('./harness/env.cjs');
const { chromium } = env.playwright();

const GAME_URL = pathToFileURL(env.GAME).href;
const OLD_URL = pathToFileURL(env.HISTORY.visual).href;
const errors = [];
let browser;
let groups = 0;

async function fresh({ debug = true, time = '2026-11-07T10:00:00', timezoneId = 'Asia/Krasnoyarsk', storageFails = false, url = GAME_URL } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId, reducedMotion: 'reduce', acceptDownloads: true });
  await ctx.route('https://**/*', (r) => r.abort());
  // A page loaded with "#...failstore" gets a localStorage that refuses every write.
  await ctx.addInitScript(() => {
    if (/failstore/.test(location.hash)) {
      Storage.prototype.setItem = function () { throw new Error('QuotaExceededError (test)'); };
    }
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.stack));
  await page.clock.setFixedTime(new Date(time));
  await page.goto(url + (debug ? '#debug' : '') + (storageFails ? (debug ? '-failstore' : '#failstore') : ''));
  await page.evaluate(() => { S.settings.sound = false; S.settings.real = false; S.settings.fast = true; });
  return { page, ctx };
}
async function reloadAt(page, time) {
  await page.clock.setFixedTime(new Date(time));
  await page.reload();
}
const state = (page) => page.evaluate(() => ({ money: S.money, freePacks: S.freePacks, streak: (S.daily || {}).streak, starterGiven: S.starterGiven, packs: S.packs, v: S.v }));
async function group(name, fn) {
  await fn();
  groups++;
  console.log('PASS ' + name);
}

(async () => {
  browser = await chromium.launch(env.launchOptions({ args: ['--mute-audio', '--disable-dev-shm-usage'] }));
  try {
    const A = await fresh();
    await group('first launch', async () => {
      const s = await state(A.page);
      assert.equal(s.money, 55); assert.equal(s.freePacks, 4); assert.equal(s.starterGiven, true); assert.equal(s.streak, 1);
      assert.match(await A.page.locator('#giftPanel').innerText(), /streak day 1/);
    });
    await group('next day', async () => {
      await reloadAt(A.page, '2026-11-08T09:00:00');
      const s = await state(A.page);
      assert.equal(s.money, 60); assert.equal(s.streak, 2); assert.equal(s.freePacks, 5);
    });
    await group('same-day reload', async () => {
      await A.page.reload();
      assert.equal((await state(A.page)).money, 60);
    });
    await group('missed day', async () => {
      await reloadAt(A.page, '2026-11-10T09:00:00');
      const s = await state(A.page);
      assert.equal(s.streak, 1); assert.equal(s.money, 65); assert.equal(s.freePacks, 7);
    });
    await A.ctx.close();

    await group('free pack', async () => {
      const { page, ctx } = await fresh();
      await page.locator('#openFree').click();
      await page.waitForFunction(() => S.packs === 1);
      const s = await state(page);
      assert.equal(s.freePacks, 3); assert.equal(s.money, 55); assert.equal(s.packs, 1);
      await ctx.close();
    });

    await group('storage failure', async () => {
      const { page, ctx } = await fresh({ storageFails: true });
      let s = await state(page);
      assert.equal(s.money, 50); assert.equal(s.freePacks, 0);
      await page.goto(GAME_URL + '#debug'); // same profile; a hash change alone does not reload
      await page.reload();                  // storage works again
      s = await state(page);
      assert.equal(s.money, 55); assert.equal(s.freePacks, 4);
      await page.reload();
      assert.equal((await state(page)).money, 55);
      await ctx.close();
    });

    await group('add funds hidden', async () => {
      const plain = await fresh({ debug: false });
      assert.equal(await plain.page.locator('#shopBtn').isVisible(), false);
      await plain.page.evaluate(() => showView('settings'));
      assert.equal(await plain.page.locator('#econSettings').isVisible(), false);
      assert.equal(await plain.page.locator('#econStart').isVisible(), false);
      await plain.ctx.close();
      const dbg = await fresh({ debug: true });
      assert.equal(await dbg.page.locator('#shopBtn').isVisible(), true);
      await dbg.ctx.close();
    });

    await group('broke', async () => {
      const { page, ctx } = await fresh({ debug: false });
      await page.evaluate(() => { S.money = 0; S.freePacks = 0; save(); refreshHeader(); });
      await page.locator('#open1').click();
      await page.locator('#goJourney').click();
      assert.equal(await page.evaluate(() => document.getElementById('v-journey').classList.contains('on')), true);
      await ctx.close();
    });

    await group('existing player', async () => {
      const { page, ctx } = await fresh({ url: OLD_URL });
      await page.evaluate(() => { S.money = 20; save(); showView('journey'); BBJ._newRun('LEGACY', 'water'); });
      assert.ok(await page.evaluate(() => localStorage.getItem('bb.run')));
      await page.goto(GAME_URL + '#debug');
      const s = await state(page);
      assert.equal(s.v, 3); assert.equal(s.starterGiven, true); assert.equal(s.freePacks, 1); assert.equal(s.money, 25);
      assert.ok(await page.evaluate(() => localStorage.getItem('bb.run')));
      await ctx.close();
    });

    await group('star-protected selling', async () => {
      const { page, ctx } = await fresh();
      const keys = await page.evaluate(() => {
        const jc = BASE.find((c) => BBJ.isRunCard(c) && c.r === 'C' && (NAME_KEYS[c.name] || []).length === 1);
        const land = BASE.find((c) => c.r === 'L');
        const jk = cardKey(jc), lk = cardKey(land);
        S.coll = { [jk]: 14, [lk]: 9 }; S.foil = {}; save(); showView('collection');
        return { jk, lk };
      });
      await page.locator('#sellAll').click();
      await page.locator('#sellAll').click();
      assert.deepEqual(await page.evaluate((k) => [S.coll[k.jk], S.coll[k.lk]], keys), [12, 4]);
      await page.evaluate((k) => { S.settings.keepJourney = 4; S.coll[k.jk] = 12; save(); renderCollection(); }, keys);
      await page.locator('#sellAll').click();
      assert.match(await page.locator('#sellWarn').innerText(), /★5 → ★3/);
      assert.equal(await page.evaluate((k) => S.coll[k.jk], keys), 12); // first click only warns
      await ctx.close();
    });

    assert.deepEqual(errors, []);
    console.log(`ALL FRIENDS-BETA CHECKS PASSED (${groups} groups; no page errors)`);
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error(e); console.error(errors.join('\n')); process.exitCode = 1; });
