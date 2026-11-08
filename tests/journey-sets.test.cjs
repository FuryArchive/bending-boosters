// M2 browser checks: themed Journey screens, run setup, Journey saves across builds.
// Fresh isolated profiles; outside HTTPS blocked.
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

async function fresh({ debug = true, url = GAME_URL } = {}) {
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
const idle = (page) => page.waitForFunction(() => !BBJ._state.busy);
// Visible Journey text plus every title attribute. Card faces are the set's own content
// (card names, type lines), so the franchise check can leave them out.
const screenText = (page, { cards = true } = {}) => page.evaluate((cards) => {
  const parts = [];
  const walk = (el) => {
    if (!cards && el.classList && (el.classList.contains('jc') || el.classList.contains('jx-hcard'))) return;
    if (el.nodeType === 3) parts.push(el.textContent);
    if (el.getAttribute && el.getAttribute('title')) parts.push(el.getAttribute('title'));
    for (const c of el.childNodes) walk(c);
  };
  walk(document.getElementById('journeyRoot'));
  return parts.join('\n');
}, cards);
// Map, fight, reward, shop, rest, event and summary screens of a debug run, as text.
async function tour(page, seed, opt) {
  const screens = {};
  await page.evaluate(({ seed, opt }) => { showView('journey'); BBJ._newRun(seed, opt); }, { seed, opt });
  await idle(page);
  screens.map = [await screenText(page), await screenText(page, { cards: false })];
  await page.evaluate(() => BBJ._debugGoto('fight'));
  await page.waitForFunction(() => BBJ._state.screen === 'fight' && !BBJ._state.busy);
  screens.fight = [await screenText(page), await screenText(page, { cards: false })];
  await page.evaluate(() => BBJ._debugForce('weak'));
  const strike = page.locator('.jx-hcard:not(.cant) [data-mode="strike"]').first();
  await strike.locator('xpath=ancestor::*[contains(@class,"jx-hcard")]').hover();
  await strike.click();
  await page.waitForFunction(() => BBJ._state.run.pending && BBJ._state.run.pending.kind === 'reward' && !BBJ._state.busy);
  screens.reward = [await screenText(page), await screenText(page, { cards: false })];
  for (const type of ['shop', 'rest', 'event']) {
    await page.evaluate((t) => BBJ._debugGoto(t), type);
    await idle(page);
    screens[type] = [await screenText(page), await screenText(page, { cards: false })];
  }
  await page.evaluate(() => history.replaceState(null, '', '#debug'));
  await page.reload();
  await page.evaluate(() => { S.settings.sound = false; showView('journey'); });
  await page.locator('#jxAbandon').click();
  await page.locator('#jxAbandon').click();
  await page.locator('.jx-summary').waitFor();
  screens.summary = [await screenText(page), await screenText(page, { cards: false })];
  return screens;
}
const PLACEHOLDER = /\{[A-Za-z]+\}/;
const AVATAR_WORDS = /Avatar|Book|Water Tribe|Fire Nation|Earth Kingdom|Air Nomads|Zhao|Azula|Ozai|Pai Sho|Cabbage|Glider/;

(async () => {
  browser = await chromium.launch(env.launchOptions({ args: ['--mute-audio', '--disable-dev-shm-usage'] }));
  try {
    let neutralScreens;
    await group('no raw placeholders', async () => {
      for (const opt of [{ colours: ['U', 'R'] }, { colours: ['W', 'B'], theme: 'neutral' }]) {
        const { page, ctx } = await fresh();
        await page.evaluate(() => showView('journey'));
        assert.doesNotMatch(await screenText(page), PLACEHOLDER, 'start');
        const screens = await tour(page, 'PLACEHOLDERS', opt);
        for (const [name, [all]] of Object.entries(screens)) assert.doesNotMatch(all, PLACEHOLDER, `${opt.theme || 'avatar'} ${name}`);
        if (opt.theme === 'neutral') neutralScreens = screens;
        await ctx.close();
      }
    });

    await group('neutral run shows no Avatar names', async () => {
      for (const [name, [, outsideCards]] of Object.entries(neutralScreens)) {
        const hit = outsideCards.match(AVATAR_WORDS);
        assert.equal(hit, null, `${name}: "${hit && hit[0]}" in\n${outsideCards}`);
      }
      const { page, ctx } = await fresh();
      await page.evaluate(() => { showView('journey'); BBJ._newRun('NEUTRAL-HUD', { colours: ['W', 'B'], theme: 'neutral' }); BBJ._debugGoto('fight'); });
      await page.waitForFunction(() => BBJ._state.screen === 'fight' && !BBJ._state.busy);
      assert.match(await page.locator('#journeyRoot').innerText(), /Act I\b/);
      await ctx.close();
    });

    await group('Avatar run reads as before', async () => {
      const { page, ctx } = await fresh();
      await page.evaluate(() => { showView('journey'); BBJ._newRun('AVATAR-MAP', { colours: ['U', 'R'] }); });
      await idle(page);
      const text = await page.locator('#journeyRoot').innerText();
      assert.match(text, /Book One: Water/);
      assert.match(text, /Admiral Zhao/);
      await ctx.close();
    });

    const bbRun = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('bb.run')));
    async function pickCharm(page) {
      await page.locator('[data-ci]').first().click();
      await page.waitForFunction(() => BBJ._state.screen === 'map' && !BBJ._state.busy);
    }

    await group('fresh player picks a pair', async () => {
      const { page, ctx } = await fresh({ debug: false });
      await page.evaluate(() => showView('journey'));
      const text = await page.locator('#journeyRoot').innerText();
      assert.match(text, /Cards from Avatar: The Last Airbender/);
      assert.equal(await page.locator('[data-set]').count(), 0);
      assert.equal(await page.locator('[data-pair]').count(), 10);
      assert.equal(await page.locator('#jxStart').isDisabled(), true);
      await page.locator('[data-pair="UR"]').click();
      assert.match(await page.locator('#jxStart').innerText(), /Water Tribe & Fire Nation/);
      await page.locator('#jxStart').click();
      await pickCharm(page);
      const r = await bbRun(page);
      assert.deepEqual([r.v, r.colours, r.sets, r.theme, 'nation' in r, r.deck.length], [3, ['U', 'R'], ['TLA'], 'avatar', false, 12]);
      await ctx.close();
    });

    await group('v2 save resumes and is backed up', async () => {
      const { page, ctx } = await fresh({ url: OLD_URL });
      await page.evaluate(() => { showView('journey'); BBJ._newRun('OLD-FIRE', 'fire'); BBJ._debugGoto('fight'); });
      await page.waitForFunction(() => BBJ._state.screen === 'fight' && !BBJ._state.busy);
      const strike = page.locator('.jx-hcard:not(.cant) [data-mode="strike"]').first();
      await strike.locator('xpath=ancestor::*[contains(@class,"jx-hcard")]').hover();
      await strike.click();
      await page.waitForFunction(() => BBJ._debugFight().chain === 1 && !BBJ._state.busy);
      const raw = await page.evaluate(() => localStorage.getItem('bb.run'));
      assert.equal(JSON.parse(raw).v, 2);
      await page.goto(GAME_URL + '#debug');
      await page.evaluate(() => { S.settings.sound = false; showView('journey'); });
      assert.match(await page.locator('.jx-resume').innerText(), /Fire Nation/);
      await page.locator('#jxResume').click();
      await page.waitForFunction(() => BBJ._state.screen === 'fight' && !BBJ._state.busy);
      assert.deepEqual(await page.evaluate(() => BBJ._state.run.fight.hand.map((c) => c.uid)), JSON.parse(raw).fight.hand.map((c) => c.uid));
      assert.equal(await page.evaluate(() => localStorage.getItem('bb.backup.run-v2')), raw);
      await page.locator('#jxEnd').click();
      await page.waitForFunction(() => BBJ._debugFight() && BBJ._debugFight().turn === 2 && !BBJ._state.busy);
      const r = await bbRun(page);
      assert.deepEqual([r.v, r.colours, r.nation], [3, ['R'], 'fire']);
      await ctx.close();
    });

    await group('old build opens a pair run', async () => {
      const { page, ctx } = await fresh();
      await page.evaluate(() => { showView('journey'); BBJ._newRun('PAIR-OLD', { colours: ['U', 'R'] }); BBJ._debugGoto('fight'); });
      await page.waitForFunction(() => BBJ._state.screen === 'fight' && !BBJ._state.busy);
      await page.goto(OLD_URL + '#debug');
      await page.evaluate(() => { S.settings.sound = false; showView('journey'); });
      assert.match(await page.locator('#journeyRoot').innerText(), /Run in progress/);
      await page.locator('#jxResume').click();
      await page.waitForFunction(() => BBJ._state.screen === 'fight' && !BBJ._state.busy);
      await page.goto(GAME_URL + '#debug');
      const r = await bbRun(page);
      assert.deepEqual([r.colours, r.theme], [['U', 'R'], 'avatar']);
      await ctx.close();
    });

    await group('debug theme select', async () => {
      const { page, ctx } = await fresh();
      await page.evaluate(() => showView('journey'));
      await page.locator('#jxTheme').selectOption('neutral');
      await page.locator('[data-pair="WB"]').click();
      assert.match(await page.locator('#jxStart').innerText(), /White & Black/);
      await page.locator('#jxStart').click();
      await pickCharm(page);
      assert.match(await page.locator('.jx-hudbook').innerText(), /Act I\b/);
      assert.equal((await bbRun(page)).theme, 'neutral');
      await ctx.close();
    });

    assert.deepEqual(errors, []);
    console.log(`ALL JOURNEY-SETS CHECKS PASSED (${groups} groups; no page errors)`);
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error(e); console.error(errors.join('\n')); process.exitCode = 1; });
