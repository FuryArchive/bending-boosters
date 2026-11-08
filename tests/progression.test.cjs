#!/usr/bin/env node
'use strict';
// Correctness tests, not defect reproductions. No shared harness or source writes.
// node progression-regression.cjs [source.html] [--browser]
// SOURCE=/path/to/source.html node progression-regression.cjs
// --browser also uses isolated, muted Chromium; external HTTP(S) is blocked.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { pathToFileURL } = require('node:url');
const { test } = require('node:test');
const env = require('./harness/env.cjs');

const sourcePath = path.resolve(process.argv.slice(2).find(a => !a.startsWith('--')) ||
  process.env.SOURCE || env.GAME);
const html = fs.readFileSync(sourcePath, 'utf8');
function section(start, end) {
  const a = html.indexOf(start), b = html.indexOf(end, a + start.length);
  assert(a >= 0 && b > a, `Missing source boundaries: ${start}, ${end}`);
  return html.slice(a, b);
}
// Private version of the evidence harness: execute the actual engine/catalog.
const e = vm.createContext({ structuredClone, console });
vm.runInContext(section('  // src/data/overrides.js', '  // src/ui/cardview.js'), e,
  { filename: sourcePath });
e.setCatalog(require('./harness/engine.cjs').catalogOf(html).base);
// Execute the actual rest renderer, without requiring a browser for unit tests.
const ui = vm.createContext({ st: { run: null }, sceneArt: () => '' });
vm.runInContext(section('    const continueBtn =', '    function cont()') +
  section('    const nodeRest =', '    const nodeEvent ='), ui);
function renderRest(run) {
  ui.st.run = run;
  return vm.runInContext('nodeRest.html(st.run.pending)', ui);
}
const snapshot = x => JSON.stringify(x);
const plain = x => JSON.parse(snapshot(x));
const newRun = () => e.createRun({ seed: 'PROGRESSION-REGRESSION', nation: 'water',
  ownedKeys: [], ownedStars: {} });
function atNode(type, eventId) {
  const r = newRun(), nodes = r.maps[1].floors.flat();
  const node = nodes.find(n => n.type === type);
  assert(node, `Fixture needs a ${type} node`);
  const prev = nodes.find(n => n.next.includes(node.id));
  r.pending = null;
  r.nodeId = prev ? prev.id : null;
  r.floor = prev ? prev.floor : 0;
  e.enterNode(r, node.id);
  if (eventId) r.pending.id = eventId;
  return r;
}
const atRest = () => atNode('rest');
const atEvent = id => atNode('event', id);
function button(markup, attr) {
  const escaped = attr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = markup.match(new RegExp(`<button\\b[^>]*${escaped}[^>]*>[\\s\\S]*?<\\/button>`));
  assert(match, `Missing button: ${attr}`);
  return { disabled: /\bdisabled\b/.test(match[0].split('>')[0]), html: match[0] };
}
function assertExit(r, before = { hp: r.hp, gold: r.gold, deck: plain(r.deck) }) {
  e.leaveNode(r);
  assert.equal(r.status, 'map');
  assert.equal(r.pending, null);
  assert(e.availableNodes(r).length > 0, 'Next nodes must be reachable');
  assert.deepEqual({ hp: r.hp, gold: r.gold, deck: plain(r.deck) }, before);
}
function assertRejectedEvent(r, why) {
  const before = snapshot(r);
  assert.throws(() => e.applyEvent(r, 0), why);
  assert.equal(snapshot(r), before, 'Rejected choice must not change resources, pending, or RNG');
}
const heldRares = () => [{ id: 'spirit_lens', stars: 1 }, { id: 'wanderers_luck', stars: 1 }];
const allLegendKeys = () => Array.from(e.JOKERS.filter(j => j.kind === 'legend'),
  j => e.keyOf(e.cardByName(j.cardName)));
// Independent eligibility oracle: do not use the new pool helper to predict rewards.
function expectedRareIds(r) {
  return Array.from(e.JOKERS).filter(j => ['rare', 'mythic'].includes(j.tier) &&
    !r.jokers.some(held => held.id === j.id) && !(j.xmult && r.book <= 1) &&
    (j.kind !== 'legend' || r.ownedKeys.includes(e.keyOf(e.cardByName(j.cardName)))))
    .map(j => j.id).sort();
}
function assertReward(r, eligibleIds, hpBefore) {
  assert.equal(r.hp, hpBefore - 6);
  assert.equal(r.pending.kind, 'reward');
  const ids = plain(r.pending.jokers);
  assert.equal(ids.length, Math.min(3, eligibleIds.length));
  assert.equal(new Set(ids).size, ids.length, 'Reward IDs must be distinct');
  assert(ids.every(id => eligibleIds.includes(id)), 'Only eligible rare-or-better Jokers');
  assert.equal(r.pending.back.kind, 'event');
  assert.match(r.pending.back.result, /valuable/);
  return ids;
}
console.log(`# Source: ${sourcePath}`);

test('rest: fully developed, full-HP deck has an enabled exit and explained disabled actions', () => {
  const r = atRest();
  r.deck.forEach(c => { c.upgraded = true; c.stars = 5; });
  const view = renderRest(r);
  for (const choice of ['heal', 'upgrade', 'train'])
    assert.equal(button(view, `data-rest="${choice}"`).disabled, true);
  assert.match(view, /full HP/);
  assert.match(view, /No cards available to upgrade/);
  assert.match(view, /No cards below 5★/);
  const exit = button(view, 'id="jxCont"');
  assert.equal(exit.disabled, false);
  assert.match(exit.html, /Leave without resting/);
  assertExit(r);
});

test('rest: even an empty deck has a leave route', () => {
  const r = atRest(); r.deck = [];
  const view = renderRest(r);
  assert(button(view, 'data-rest="upgrade"').disabled);
  assert(button(view, 'data-rest="train"').disabled);
  assert(!button(view, 'id="jxCont"').disabled);
  assertExit(r);
});

for (const [name, upgrade, train] of [
  ['both available', true, true], ['upgrade only', true, false],
  ['train only', false, true], ['neither', false, false]
]) test(`rest controls: target eligibility is independent (${name})`, () => {
  const r = atRest(); r.hp -= 5;
  r.deck.forEach(c => { c.upgraded = true; c.stars = 5; });
  if (upgrade) r.deck[0].upgraded = false;
  if (train) r.deck[r.deck.length - 1].stars = 4;
  const view = renderRest(r);
  assert.equal(button(view, 'data-rest="heal"').disabled, false);
  assert.equal(button(view, 'data-rest="upgrade"').disabled, !upgrade);
  assert.equal(button(view, 'data-rest="train"').disabled, !train);
  assert.equal(button(view, 'id="jxCont"').disabled, false);
});

for (const missing of [1, 30]) test(`rest control: Heal recovers 30%, capped at max HP (missing ${missing})`, () => {
  const r = atRest(); r.hp -= missing;
  const hp = r.hp;
  assert.equal(e.rest(r, 'heal').ok, true);
  assert.equal(r.hp, Math.min(r.maxHp, hp + Math.floor(r.maxHp * 0.3)));
  assert.equal(r.pending.done, 'heal');
  assert.match(button(renderRest(r), 'id="jxCont"').html, />Continue</);
  const after = snapshot(r);
  assert.equal(e.rest(r, 'upgrade', 0).ok, false);
  assert.equal(snapshot(r), after, 'Rest grants only one action');
  assertExit(r);
});

for (const choice of ['upgrade', 'train']) test(`rest control: ${choice} succeeds once, then can continue`, () => {
  const r = atRest();
  if (choice === 'train') r.deck[0].stars = 4;
  const otherCards = snapshot(r.deck.slice(1));
  assert.equal(e.rest(r, choice, 0).ok, true);
  assert.equal(r.pending.done, choice);
  assert.equal(choice === 'train' ? r.deck[0].stars : r.deck[0].upgraded,
    choice === 'train' ? 5 : true);
  assert.equal(snapshot(r.deck.slice(1)), otherCards);
  const after = snapshot(r);
  assert.equal(e.rest(r, 'heal').ok, false);
  assert.equal(snapshot(r), after);
  assertExit(r);
});

test('rest controls: invalid or maxed targets do not consume the action or remove the exit', () => {
  const r = atRest(); r.deck[0].upgraded = true; r.deck[0].stars = 5;
  for (const [choice, idx] of [['upgrade', 0], ['train', 0], ['train', -1],
    ['upgrade', r.deck.length], ['unknown', 0]]) {
    const before = snapshot(r);
    assert.equal(e.rest(r, choice, idx).ok, false);
    assert.equal(snapshot(r), before);
  }
  assert(!button(renderRest(r), 'id="jxCont"').disabled);
  assert.equal(e.rest(r, 'upgrade', 1).ok, true, 'A failed choice must not consume the rest');
});

for (const occupied of [0, 1, 2]) for (const gold of [19, 20, 40])
  test(`Cabbage: ${occupied} occupied slots, ${gold} gold is an all-or-nothing purchase`, () => {
    const r = atEvent('cabbage'); r.gold = gold;
    r.offerings = ['mend', 'focus'].slice(0, occupied);
    const before = snapshot(r), c = e.eventChoices(r)[0];
    assert.equal(snapshot(r), before, 'Eligibility checks must be pure');
    const allowed = occupied === 0 && gold >= 20;
    assert.equal(c.ok, allowed);
    if (!allowed) {
      assert.match(c.why, gold < 20 ? /20 gold/ : /2 free Offering slots/);
      assertRejectedEvent(r, gold < 20 ? /20 gold/ : /2 free Offering slots/);
    } else {
      e.applyEvent(r, 0);
      assert.equal(r.gold, gold - 20);
      assert.equal(r.offerings.length, 2);
      assert(r.offerings.every(id => e.itemById(id)));
      assert.equal(r.pending.result, 'You got 2 Offerings.');
      assertRejectedEvent(r, /already chosen/);
      assertExit(r);
    }
  });

test('Cabbage: rechecks capacity and gold when applying a previously enabled choice', () => {
  for (const change of [r => r.offerings.push('mend'), r => { r.gold = 19; }]) {
    const r = atEvent('cabbage'); r.gold = 40;
    assert.equal(e.eventChoices(r)[0].ok, true);
    change(r);
    assertRejectedEvent(r, /2 free Offering slots|20 gold/);
  }
});

for (const id of ['cabbage', 'divide']) test(`${id}: safe/leave choice has no resource or RNG cost`, () => {
  const r = atEvent(id); r.offerings = ['mend', 'focus']; r.jokers = heldRares();
  const before = plain(r);
  assert.equal(e.eventChoices(r)[1].ok, true);
  e.applyEvent(r, 1);
  before.pending.result = r.pending.result;
  assert.deepEqual(plain(r), before);
  assertExit(r);
});

test('Great Divide: exhausted Book One pool disables the route without taking HP or advancing RNG', () => {
  const r = atEvent('divide'); r.jokers = heldRares();
  assert.deepEqual(expectedRareIds(r), []);
  const before = snapshot(r), c = e.eventChoices(r)[0];
  assert.equal(c.ok, false);
  assert.match(c.why, /No eligible rare-or-better Jokers/);
  assert.equal(snapshot(r), before);
  assertRejectedEvent(r, /No eligible rare-or-better Jokers/);
});

test('Great Divide: helper also refuses an empty pool without creating an empty reward', () => {
  const r = atEvent('divide'); r.jokers = heldRares();
  const rng = e.createRng('EMPTY-POOL'), before = snapshot(r), state = rng.getState();
  assert.equal(e.H.jokerPick(r, rng, 'rare'), false);
  assert.equal(snapshot(r), before);
  assert.equal(rng.getState(), state);
});

for (const hp of [6, 7]) test(`Great Divide HP boundary: ${hp} HP`, () => {
  const r = atEvent('divide'); r.hp = hp;
  assert.equal(e.eventChoices(r)[0].ok, hp > 6);
  if (hp === 6) assertRejectedEvent(r, /more than 6 HP/);
  else {
    const ids = expectedRareIds(r);
    e.applyEvent(r, 0);
    assertReward(r, ids, hp);
    assert.equal(r.hp, 1);
  }
});

for (const held of [[], [{ id: 'spirit_lens', stars: 1 }]])
  test(`Great Divide: delivers all ${2 - held.length} available rare Charms without common/uncommon filler`, () => {
    const r = atEvent('divide'); r.jokers = held;
    const expected = expectedRareIds(r), hp = r.hp;
    assert.equal(e.eventChoices(r)[0].ok, true);
    e.applyEvent(r, 0);
    assert.deepEqual(assertReward(r, expected, hp).sort(), expected);
  });

test('Great Divide controls: owned rare Legend unlocks a reward, but unowned Legends do not', () => {
  const r = atEvent('divide'); r.jokers = heldRares();
  const legend = e.jokerById('sokka_boomer');
  assert.equal(e.eventChoices(r)[0].ok, false);
  r.ownedKeys = [e.keyOf(e.cardByName(legend.cardName))];
  assert.equal(e.eventChoices(r)[0].ok, true);
  const hp = r.hp;
  e.applyEvent(r, 0);
  assert.deepEqual(assertReward(r, [legend.id], hp), [legend.id]);
});

test('Great Divide controls: mythic multipliers stay gated in Book One and become available in Book Two', () => {
  const r = atEvent('divide'); r.jokers = heldRares();
  assert.equal(e.eventChoices(r)[0].ok, false);
  r.book = 2;
  assert.deepEqual(expectedRareIds(r), ['cosmic_fire']);
  assert.equal(e.eventChoices(r)[0].ok, true);
  const hp = r.hp;
  e.applyEvent(r, 0);
  assert.deepEqual(assertReward(r, ['cosmic_fire'], hp), ['cosmic_fire']);
});

test('Great Divide: rechecks reward availability before charging for a stale choice', () => {
  const r = atEvent('divide');
  assert.equal(e.eventChoices(r)[0].ok, true);
  r.jokers = heldRares();
  assertRejectedEvent(r, /No eligible rare-or-better Jokers/);
});

test('Great Divide: 200 seeds preserve book/ownership/held restrictions and deterministic distinct rewards', () => {
  for (let seed = 0; seed < 200; seed++) {
    const r = atEvent('divide'); r.book = seed % 3 + 1;
    r.ownedKeys = seed % 2 ? allLegendKeys() : [];
    if (seed % 4 === 0) r.jokers = [{ id: 'spirit_lens', stars: 1 }];
    if (seed % 5 === 0) r.jokers.push({ id: 'cosmic_fire', stars: 1 });
    r.rngState = e.hashStr(`DIVIDE-${seed}`) | 0;
    const expected = expectedRareIds(r), hp = r.hp, copy = structuredClone(r);
    const before = snapshot(r);
    for (let i = 0; i < 3; i++) assert.equal(e.eventChoices(r)[0].ok, true);
    assert.equal(snapshot(r), before, 'Rendering choices cannot consume RNG');
    e.applyEvent(r, 0); e.applyEvent(copy, 0);
    assertReward(r, expected, hp);
    assert.equal(snapshot(r), snapshot(copy), 'Same state/seed must generate the same result');
  }
});

for (const mode of ['take', 'skip', 'swap']) test(`Great Divide reward lifecycle: ${mode} returns to event and permits leaving`, () => {
  const r = atEvent('divide');
  if (mode === 'swap') r.jokers = ['lone_wanderer', 'element_focus', 'ally_banner',
    'big_hitter', 'pai_sho_pro'].map(id => ({ id, stars: 1 }));
  const event = r.pending, hp = r.hp;
  e.applyEvent(r, 0);
  const incoming = r.pending.jokers[0];
  e.takeJoker(r, mode === 'skip' ? null : 0);
  if (mode === 'swap') {
    assert.equal(r.pending.kind, 'swap');
    e.resolveSwap(r, 0);
  }
  assert.equal(r.pending, event);
  assert.equal(r.hp, hp - 6);
  assert.equal(r.jokers.some(j => j.id === incoming), mode !== 'skip');
  assertRejectedEvent(r, /already chosen/);
  assertExit(r);
});

if (process.argv.includes('--browser')) test('isolated Chromium: actual rest/event UI and click wiring', async t => {
  const { chromium } = env.playwright();
  const browser = await chromium.launch(env.launchOptions({ args: ['--mute-audio'] }));
  try {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    await context.route(/^https?:/, route => route.abort());
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(pathToFileURL(sourcePath).href + '#debug');
    await page.evaluate(() => {
      S.settings.sound = false; S.settings.real = false;
      showView('journey');
    });
    async function setup(kind, opts = {}) {
      await page.evaluate(({ kind, opts, eventIds }) => {
        BBJ._newRun('PROGRESSION-REGRESSION', 'water');
        const r = BBJ._state.run;
        if (opts.maxed) r.deck.forEach(c => { c.upgraded = true; c.stars = 5; });
        if (opts.hp !== undefined) r.hp = opts.hp;
        if (opts.occupied !== undefined) {
          r.gold = 40; r.offerings = ['mend', 'focus'].slice(0, opts.occupied);
        }
        if (opts.exhausted) {
          r.ownedKeys = [];
          r.jokers = [{ id: 'spirit_lens', stars: 1 }, { id: 'wanderers_luck', stars: 1 }];
        }
        if (kind === 'event') r.seenEvents = eventIds.filter(id => id !== opts.id);
        if (!BBJ._debugGoto(kind)) throw new Error(`Unable to enter ${kind} fixture`);
        if (kind === 'event' && r.pending.id !== opts.id) throw new Error('Wrong event fixture');
      }, { kind, opts, eventIds: Array.from(e.EVENT_IDS) });
    }
    const runState = () => page.evaluate(() => {
      const r = BBJ._state.run;
      return { hp: r.hp, gold: r.gold, offerings: [...r.offerings], pending: r.pending,
        screen: BBJ._state.screen, deck: r.deck, status: r.status, jokers: r.jokers };
    });
    async function leave() {
      await page.locator('#jxCont').click();
      assert.equal((await runState()).status, 'map');
      assert(await page.locator('[data-go]').count() > 0);
    }
    await t.test('maxed deck can leave at full HP; all useless choices are disabled/explained', async () => {
      await setup('rest', { maxed: true });
      for (const c of ['heal', 'upgrade', 'train'])
        assert(await page.locator(`[data-rest="${c}"]`).isDisabled());
      assert.match(await page.locator('[data-rest="upgrade"]').innerText(), /No cards/);
      assert.match(await page.locator('[data-rest="train"]').innerText(), /No cards below 5★/);
      assert(await page.locator('#jxCont').isEnabled());
      const before = await runState();
      await leave();
      const after = await runState();
      assert.equal(after.hp, before.hp); assert.equal(after.gold, before.gold);
      assert.deepEqual(after.deck, before.deck);
    });
    await t.test('normal Heal still works and leads to Continue', async () => {
      await setup('rest', { hp: 30 });
      assert(await page.locator('[data-rest="heal"]').isEnabled());
      await page.locator('[data-rest="heal"]').click();
      assert.equal((await runState()).hp, 48);
      assert.equal((await runState()).pending.done, 'heal');
      assert.equal(await page.locator('[data-rest]').count(), 0);
      await leave();
    });
    for (const c of ['upgrade', 'train']) await t.test(`normal ${c} modal still applies one action`, async () => {
      await setup('rest');
      assert(await page.locator(`[data-rest="${c}"]`).isEnabled());
      await page.locator(`[data-rest="${c}"]`).click();
      await page.locator('.jx-modal [data-di="0"]').click();
      await page.locator('#jxPickOk').click();
      const state = await runState();
      assert.equal(state.pending.done, c);
      assert.equal(c === 'upgrade' ? state.deck[0].upgraded : state.deck[0].stars,
        c === 'upgrade' ? true : 2);
      await leave();
    });
    await t.test('closing the selection modal retains a working no-benefit exit', async () => {
      await setup('rest');
      await page.locator('[data-rest="upgrade"]').click();
      await page.locator('.jx-modal .x').click();
      assert.equal((await runState()).pending.done, null);
      await leave();
    });
    for (const occupied of [1, 2]) await t.test(`Cabbage UI refuses partial/full capacity (${occupied} occupied)`, async () => {
      await setup('event', { id: 'cabbage', occupied });
      assert(await page.locator('[data-ch="0"]').isDisabled());
      assert.match(await page.locator('[data-ch="0"]').innerText(), /2 free Offering slots/);
      const before = await runState();
      await page.locator('[data-ch="1"]').click();
      const after = await runState();
      assert.equal(after.gold, before.gold);
      assert.deepEqual(after.offerings, before.offerings);
      await leave();
    });
    await t.test('Cabbage UI purchase delivers exactly two for 20 gold', async () => {
      await setup('event', { id: 'cabbage', occupied: 0 });
      assert(await page.locator('[data-ch="0"]').isEnabled());
      await page.locator('[data-ch="0"]').click();
      const r = await runState();
      assert.equal(r.gold, 20); assert.equal(r.offerings.length, 2);
      assert.match(await page.locator('.jx-evresult').innerText(), /2 Offerings/);
      await leave();
    });
    await t.test('Great Divide exhausted pool is explained/disabled; safe path still exits', async () => {
      await setup('event', { id: 'divide', exhausted: true });
      assert(await page.locator('[data-ch="0"]').isDisabled());
      assert.match(await page.locator('[data-ch="0"]').innerText(), /No eligible rare-or-better Jokers/);
      const hp = (await runState()).hp;
      await page.locator('[data-ch="1"]').click();
      assert.equal((await runState()).hp, hp);
      await leave();
    });
    await t.test('Great Divide eligible route charges once, offers real rewards, and returns to event', async () => {
      await setup('event', { id: 'divide' });
      await page.evaluate(() => { BBJ._state.run.jokers = []; });
      const before = await runState();
      await page.locator('[data-ch="0"]').click();
      const r = await runState();
      assert.equal(r.hp, before.hp - 6);
      assert.equal(await page.locator('[data-jk]').count(), 2);
      await page.locator('[data-jk="0"]').click();
      assert.equal((await runState()).pending.kind, 'event');
      assert.equal((await runState()).hp, r.hp);
      await leave();
    });
    assert.deepEqual(errors, [], 'No browser runtime errors');
  } finally {
    await browser.close();
  }
});
