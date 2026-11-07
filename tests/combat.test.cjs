'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const {loadEngine} = require('./harness/engine.cjs');
const {ctx: e, data, html, sourcePath} = loadEngine(process.argv[2] || undefined);
console.log(`Combat regression source: ${sourcePath}`);

const plain = value => JSON.parse(JSON.stringify(value));
const snapshot = f => JSON.stringify({fight: f, rngState: f.rng.getState()});
const rc = (name, uid = 'subject', upgraded = false) => {
  const card = data.base.find(c => c.name === name);
  assert(card, `Catalog card not found: ${name}`);
  return e.toRunCard(card, {uid, upgraded});
};
const filler = (n, prefix = 'f') => Array.from({length: n}, (_, i) => e.basicCard(i % 2 ? 'strike' : 'defend', prefix + i));
const synthetic = (props = {}) => ({...e.basicCard('strike', 'subject'), ...props});
const longFeng = () => e.ELITES[2].find(x => x.id === 'long_feng');
function fight(deck = filler(8), def = {}, extra = {}) {
  return e.createFight({
    deck, player: {hp: 60, maxHp: 60},
    enemy: {hp: 10000, atk: 9, pattern: ['strike'], countdown: 1, ...def},
    rng: e.createRng(0), ...extra,
  });
}
function inHand(f, uid) {
  if (!f.hand.some(c => c.uid === uid)) {
    const i = f.drawPile.findIndex(c => c.uid === uid);
    assert(i >= 0, `Missing card ${uid}`);
    const [c] = f.drawPile.splice(i, 1);
    if (f.hand.length) f.drawPile.push(f.hand.pop());
    f.hand.push(c);
  }
  return f.hand.findIndex(c => c.uid === uid);
}
function fixture(c, extra = {}, def = {}) {
  const f = fight([c, ...filler(7)], def, extra);
  inHand(f, c.uid);
  return f;
}
const play = (f, uid = 'subject', mode) => e.playCard(f, inHand(f, uid), mode);
const allCards = f => [...f.hand, ...f.drawPile, ...f.discardPile, ...f.exhaustPile, ...f.powers];
function preview(f, uid = 'subject', mode) {
  const i = inHand(f, uid), before = snapshot(f);
  const a = e.previewCard(f, i, mode), b = e.previewCard(f, i, mode);
  assert.equal(snapshot(f), before, 'Preview mutated fight state or RNG');
  assert.deepEqual(plain(a), plain(b), 'Repeated previews differ');
  return a;
}
function incoming(f) {
  const before = snapshot(f), n = e.incomingDamage(f);
  assert.equal(e.incomingDamage(f), n);
  assert.equal(snapshot(f), before, 'Incoming preview mutated fight state or RNG');
  return n;
}
function previewAndPlay(f, uid = 'subject', mode) {
  const prediction = preview(f, uid, mode);
  assert(prediction, 'Expected a playable card');
  const out = play(f, uid, mode);
  assert.deepEqual(plain(out.res), plain(prediction), 'Preview/execution card results differ');
  return out;
}

// Finding 1: actual reported deck, plus draw/lifecycle controls.
test('1: Spirit Oasis + upgraded True Ancestry cannot redraw the resolving card', () => {
  const f = fight([rc('The Spirit Oasis', 'oasis'), rc('True Ancestry', 'a', true), ...filler(6)]);
  play(f, 'oasis', 'play');
  e.endTurn(f);
  assert.equal(f.hand.length, 6);
  assert.equal(f.drawPile.length, 1);
  const energy = f.energy, hp = f.player.hp;
  const {events, res} = previewAndPlay(f, 'a', 'play');
  assert.equal(res.cost, 0);
  assert.equal(events.find(ev => ev.t === 'draw').n, 1, 'Only the one remaining card can be drawn');
  assert.equal(f.hand.length, 6);
  assert(!f.hand.some(c => c.uid === 'a'));
  assert.equal(f.discardPile.filter(c => c.uid === 'a').length, 1);
  assert.equal(allCards(f).length, 8);
  assert.equal(new Set(allCards(f).map(c => c.uid)).size, 8);
  assert.equal(f.energy, energy);
  assert.equal(f.player.hp, hp);
  assert.equal(f.flow, 2);
  assert.equal(f.result, 'ongoing');
  // A later, independent draw may reshuffle that card: this is not a global draw ban.
  assert.equal(e.drawCards(f, 1, []), 1);
  assert(f.hand.some(c => c.uid === 'a'));
});

test('1: empty-deck draw resolves once, then discards; other discarded cards remain drawable', () => {
  for (const withOther of [false, true]) {
    const c = rc('True Ancestry', 'subject', true), f = fixture(c);
    f.hand = [c]; f.drawPile = []; f.discardPile = withOther ? [e.basicCard('strike', 'old')] : [];
    const out = previewAndPlay(f, 'subject', 'play');
    assert.equal(out.events.find(ev => ev.t === 'draw')?.n || 0, withOther ? 1 : 0);
    assert.deepEqual(f.hand.map(c => c.uid), withOther ? ['old'] : []);
    assert.equal(f.discardPile.length, 1);
    assert.equal(f.discardPile[0], c);
  }
});

for (const kind of ['discard', 'exhaust', 'token', 'power']) {
  test(`1: resolving ${kind} draw card has the correct final destination`, () => {
    const c = synthetic({
      role: kind === 'power' ? 'power' : 'instant', baseStrike: 0,
      token: kind === 'token', keywords: {exhaust: kind === 'exhaust' || kind === 'token'},
      acts: [{k: 'draw', n: 2, on: 'play'}],
      powerFx: kind === 'power' ? {k: 'draw', n: 1} : null,
    });
    const f = fixture(c);
    f.hand = [c]; f.drawPile = []; f.discardPile = [];
    const out = previewAndPlay(f, 'subject', 'play');
    assert(!out.events.some(ev => ev.t === 'draw'));
    assert.equal(f.hand.length, 0);
    assert.equal(f.discardPile.includes(c), kind === 'discard');
    assert.equal(f.exhaustPile.includes(c), kind === 'exhaust');
    assert.equal(f.powers.includes(c), kind === 'power');
    assert.equal(allCards(f).includes(c), kind !== 'token');
  });
}

test('1: card remains outside drawable piles through onPlayed hooks and still receives self Growth', () => {
  const c = synthetic({acts: [{k: 'growth', n: 2, target: 'self', on: 'play'}]});
  const j = {id: 'draw-hook', onPlayed(card, mode, res, f) {
    assert(!allCards(f).includes(card), 'Resolving card must not be in any pile during onPlayed');
    e.drawCards(f, 2, []);
  }};
  const f = fixture(c, {jokers: [j]});
  f.hand = [c]; f.drawPile = []; f.discardPile = [];
  previewAndPlay(f, 'subject', 'strike');
  assert.equal(c.growth, 2);
  assert.equal(f.hand.length, 0);
  assert.equal(f.discardPile[0], c);
});

test('1 control: draw respects hand capacity and Wan Shi Tong extra-draw HP costs', () => {
  const c = rc('True Ancestry', 'subject', true), f = fixture(c, {rule: {id: 'draw_hp'}});
  f.hand = [c, ...filler(9, 'held')];
  f.drawPile = filler(3, 'draw'); f.discardPile = [];
  const out = previewAndPlay(f, 'subject', 'play');
  assert.equal(f.hand.length, 10);
  assert.equal(out.events.find(ev => ev.t === 'draw').n, 1);
  assert.equal(f.player.hp, 58);
  assert.equal(f.discardPile[0], c);
});

// Finding 3: pending mirror value must be shared, pure, and independent of stale copyBonus.
test('3: generated Azula boss forecasts the lethal 22-vs-21 attack before endTurn', () => {
  const deck = [...Array.from({length: 4}, (_, i) => e.basicCard('strike', 's' + i)),
    ...Array.from({length: 4}, (_, i) => e.basicCard('defend', 'd' + i))];
  const enemy = e.enemyForNode({book: 2}, {type: 'boss', floor: 15}, e.createRng(0));
  const f = fight(deck, enemy, {rule: enemy.rule, player: {hp: 1, maxHp: 60}, rng: e.createRng(10)});
  for (let k = 0; k < 4; k++) {
    const i = f.hand.findIndex(c => e.modesFor(c).includes('guard'));
    assert(i >= 0); e.playCard(f, i, 'guard');
  }
  assert.equal(f.player.block, 21);
  assert.equal(f.peakFlow, 5);
  assert.equal(f.enemy.copyBonus, 0);
  assert.equal(incoming(f), 1);
  assert.equal(e.intentHit(f), 22);
  assert.equal(f.enemy.copyBonus, 0, 'Forecast must not commit the mirror bonus');
  const events = e.endTurn(f);
  assert.equal(events.find(ev => ev.t === 'enemyHit').dmg, 22);
  assert.equal(events.find(ev => ev.t === 'playerHit').dmg, 1);
  assert.equal(f.enemy.copyBonus, 2);
  assert.equal(f.player.hp, 0);
  assert.equal(f.result, 'lost');
});

for (const spec of [
  {name: 'ordinary Strike', expected: 5, block: 4},
  {name: 'nonmirror stored bonus control', expected: 12, block: 4, stale: 7},
  {name: 'mirror ignores stale bonus', expected: 6, block: 5, mirror: true, stale: 99},
  {name: 'mirror Lightning pierces half Block', expected: 15, block: 11, mirror: true, pattern: ['lightning']},
  {name: 'mirror Flurry uses Block across hits and Dodge', expected: 5, block: 7, dodge: 1, mirror: true, pattern: ['flurry:3']},
  {name: 'Comet rounds after mirror', expected: 9, block: 4, mirror: true, rule: {id: 'comet'}},
  {name: 'canceled attack', expected: 0, mirror: true, cancel: true},
  {name: 'all hits dodged', expected: 0, mirror: true, dodge: 3, pattern: ['flurry:3']},
  {name: 'Fortify is not an attack', expected: 0, mirror: true, pattern: ['fortify']},
  {name: 'Hex is not an attack', expected: 0, mirror: true, pattern: ['hex']},
  {name: 'countdown has not expired', expected: 0, mirror: true, countdown: 2},
]) {
  test(`3 parity/control: ${spec.name}`, () => {
    const f = fight(filler(8), {copyJoker: !!spec.mirror, pattern: spec.pattern || ['strike']}, {rule: spec.rule || null});
    f.peakFlow = 5; f.enemy.copyBonus = spec.stale || 0;
    f.enemy.countdown = spec.countdown || 1;
    f.enemy.cancelNext = !!spec.cancel;
    f.player.block = spec.block || 0; f.player.dodge = spec.dodge || 0;
    assert.equal(incoming(f), spec.expected);
    const hp = f.player.hp, events = e.endTurn(f);
    assert.equal(hp - f.player.hp, spec.expected);
    assert.equal(events.filter(ev => ev.t === 'playerHit').reduce((n, ev) => n + ev.dmg, 0), spec.expected);
  });
}

test('3 control: completed fights have no incoming damage', () => {
  const f = fight(); f.result = 'won';
  assert.equal(incoming(f), 0);
});

// Finding 7: real card reproductions and shared-rule/rounding controls.
for (const [name, normal, reduced] of [["Iroh's Demonstration", 6, 3], ['The Last Agni Kai', 8, 4]]) {
  test(`7: ${name} effect damage obeys Eclipse, with unrestricted control`, () => {
    for (const [rule, expected] of [[null, normal], [{id: 'fire_half'}, reduced]]) {
      const f = fixture(rc(name), {rule});
      assert.equal(previewAndPlay(f, 'subject', 'play').res.dmg, expected);
      assert.equal(f.enemy.hp, 10000 - expected);
    }
  });
}

test('7: Bumi on-play Stone Block is halved on Strike AND Guard; ordinary control unchanged', () => {
  for (const rule of [null, {id: 'half_fire_block'}]) {
    for (const mode of ['strike', 'guard']) {
      const c = rc('Bumi, Unleashed'), f = fixture(c, {rule});
      const factor = rule ? 0.5 : 1;
      const expected = Math.floor(11 * factor) + (mode === 'guard' ? Math.floor(e.guardValue(c) * e.GUARD_F * factor) : 0);
      const {res} = previewAndPlay(f, 'subject', mode);
      assert.equal(res.block, expected);
      assert.equal(res.stone, expected);
      assert.equal(f.player.block, expected);
      assert.equal(f.player.stone, expected);
      if (mode === 'strike') assert.equal(res.dmg, 13);
    }
  }
});

test('7: per-hit restriction precedes floor, Armor, then Haunt; extra hits and flat Joker damage agree', () => {
  const c = synthetic({baseStrike: 11, elements: ['Fire'], keywords: {firstStrike: true}, acts: [{k: 'hit', n: 7, on: 'play', drain: 0.5}]});
  const j = {id: 'bonuses', onCard: () => ({hits: 1, flat: 5, raw: true})};
  const f = fixture(c, {rule: {id: 'fire_half'}, jokers: [j]}, {armor: 2});
  f.enemy.haunt = 1; f.player.hp = 40;
  const {res} = previewAndPlay(f, 'subject', 'strike');
  // 11/2 floor=5, -2 armor=3, *1.25 floor=3; half-hit=>0; repeat=>3; act=>1. Flat 5/2=>2 bypasses armor.
  assert.deepEqual(plain(res.hits), [3, 0, 3, 1]);
  assert.equal(res.dmg, 9);
  assert.equal(res.heal, 0, 'Drain uses actual restricted, mitigated effect damage');
});

test('7: Flying/Menace and unrestricted multi-hit rounding remain intact', () => {
  for (const [keywords, expected] of [[{}, 3], [{flying: true}, 11], [{menace: true}, 6]]) {
    const c = synthetic({baseStrike: 11, keywords});
    const f = fixture(c, {}, {armor: 8}); f.enemy.fortArmor = 3;
    assert.equal(previewAndPlay(f, 'subject', 'strike').res.dmg, expected);
  }
  const c = synthetic({baseStrike: 11, keywords: {firstStrike: true}}), f = fixture(c);
  assert.deepEqual(plain(previewAndPlay(f, 'subject', 'strike').res.hits), [11, 5]);
});

test('7: sorceries still scale effect damage/Block with Flow before restriction; drain uses reduced damage', () => {
  const c = synthetic({role: 'sorcery', baseStrike: 0, elements: ['Fire'],
    acts: [{k: 'hit', n: 7, on: 'play', drain: 0.5}, {k: 'block', n: 7, on: 'play', stone: true}]});
  const f = fixture(c, {rule: {id: 'fire_half'}}); f.flow = 3; f.player.hp = 40;
  const {res} = previewAndPlay(f, 'subject', 'play');
  assert.equal(res.dmg, 10); assert.equal(res.heal, 5); assert.equal(f.player.hp, 45);
  assert.equal(res.block, 21); assert.equal(res.stone, 21);
  const fb = fixture(c, {rule: {id: 'half_fire_block'}}); fb.flow = 3;
  const rb = previewAndPlay(fb, 'subject', 'play').res;
  assert.equal(rb.dmg, 21); assert.equal(rb.block, 10); assert.equal(rb.stone, 10);
});

test('7: Water restriction gates base, effect AND flat damage; Spirit play or alias lifts it', () => {
  const make = () => synthetic({elements: ['Water'], acts: [{k: 'hit', n: 7, on: 'play', drain: 0.5}]});
  const flat = {id: 'flat', onCard: () => ({flat: 5})};
  for (const how of ['blocked', 'played Spirit', 'Spirit alias', 'intrinsic Spirit', 'no rule']) {
    const c = make();
    if (how === 'intrinsic Spirit') c.elements.push('Spirit');
    const f = fixture(c, {rule: how === 'no rule' ? null : {id: 'water_needs_spirit'},
      jokers: how === 'Spirit alias' ? [flat, e.jokerById('yue')] : [flat]});
    if (how === 'played Spirit') f.spiritPlayed = true;
    const {res} = previewAndPlay(f, 'subject', 'strike');
    assert.equal(res.dmg, how === 'blocked' ? 0 : 18, how);
    assert.equal(res.heal, how === 'blocked' ? 0 : 3, how);
  }
});

test('7: shared Block helper covers Guard, acts, Vigilance, direct Joker Block, and Stone retention', () => {
  const c = synthetic({elements: ['Fire'], baseGuard: 11, toughness: 5, keywords: {vigilance: true, stone: true},
    acts: [{k: 'block', n: 7, on: 'play', stone: true}]});
  const j = {id: 'block', onCard: () => ({block: 3})};
  for (const [mode, expected, stone] of [['strike', 6, 3], ['guard', 6, 5]]) {
    const f = fixture(c, {rule: {id: 'half_fire_block'}, jokers: [j]});
    const {res} = previewAndPlay(f, 'subject', mode);
    assert.equal(res.block, expected); assert.equal(res.stone, stone);
    e.endTurn(f);
    assert.equal(f.player.block, Math.floor(stone / 2));
    assert.equal(f.player.stone, Math.floor(stone / 2));
  }
});

test('7: persistent Power Block uses the same reduced amount for Block, Stone and event text', () => {
  const c = synthetic({role: 'power', baseStrike: 0, elements: ['Fire'], powerFx: {k: 'block', n: 7, stone: true}});
  for (const [rule, expected] of [[null, 7], [{id: 'half_fire_block'}, 3]]) {
    const f = fixture(c, {rule}); previewAndPlay(f, 'subject', 'play');
    const events = e.endTurn(f);
    assert.equal(f.player.block, expected); assert.equal(f.player.stone, expected);
    assert.equal(events.find(ev => ev.t === 'power').n, expected);
  }
});

test('7 control: restrictions do not affect unrelated elements, Burn stacks or independent Joker counters', () => {
  const c = synthetic({elements: ['Earth'], baseGuard: 11, acts: [{k: 'hit', n: 7}, {k: 'block', n: 7, stone: true}, {k: 'burn', n: 3}]});
  for (const rule of [null, {id: 'fire_half'}, {id: 'half_fire_block'}]) {
    const f = fixture(c, {rule});
    const {res} = previewAndPlay(f, 'subject', 'strike');
    assert.equal(res.dmg, 13); assert.equal(res.block, 7); assert.equal(res.stone, 7); assert.equal(res.burn, 3);
  }
  const fire = fixture(synthetic({elements: ['Fire'], acts: [{k: 'burn', n: 3}]}), {rule: {id: 'fire_half'}});
  assert.equal(previewAndPlay(fire).res.burn, 3);
  const f = fight(filler(8), {}, {rule: {id: 'fire_half'}, jokers: [e.jokerById('appa')]});
  f.player.dodge = 1;
  assert.equal(e.endTurn(f).find(ev => ev.t === 'counter').dmg, 8);
});

// Finding 8: explicitly suppress all card-triggered hooks; preserve cost/chain mechanics.
test('8: first Watery Grasp is discarded, not installed; following Power installs normally', () => {
  const long = longFeng(), c = rc('Watery Grasp'), f = fixture(c, {rule: long.rule}, long);
  const {res} = previewAndPlay(f, 'subject', 'play');
  assert.equal(res.suppressed, true); assert.equal(res.flowAfter, 2); assert.equal(res.cost, 1);
  assert.equal(f.energy, 3); assert.equal(f.powers.length, 0); assert.equal(f.discardPile[0], c);
  assert.equal(f.chain.length, 1); assert.equal(f.fightCounts.Water, 1);
  const second = rc('Watery Grasp', 'second'); f.hand.push(second);
  assert.equal(previewAndPlay(f, 'second', 'play').res.suppressed, false);
  assert.equal(f.powers.length, 1); assert.equal(f.powers[0], second);
  const events = e.endTurn(f);
  assert.equal(f.player.block, 3, 'Only the second Power grants Block');
  assert.equal(events.filter(ev => ev.t === 'power').length, 1);
  // Suppression resets every turn, not every fight.
  const firstNextTurn = f.hand[0];
  assert.equal(previewAndPlay(f, firstNextTurn.uid).res.suppressed, true);
});

test('8: suppression does not disable a previously installed Power or independent turn hooks', () => {
  const c = rc('Watery Grasp'), f = fixture(c, {jokers: [e.jokerById('momo')]});
  previewAndPlay(f, 'subject', 'play');
  f.rule = longFeng().rule;
  const events = e.endTurn(f);
  assert.equal(f.player.block, 3);
  assert.equal(events.filter(ev => ev.t === 'power').length, 1);
  assert(f.hand.some(c => c.key === 'TOKEN:gust'));
  const first = f.hand.find(c => c.key === 'TOKEN:gust');
  assert.equal(previewAndPlay(f, first.uid).res.suppressed, true);
  assert.equal(f.player.block, 3, 'First-card suppression does not remove existing Block');
  assert.equal(f.powers.length, 1);
});

test('8: suppressed drainAll Power never enables passive healing; ordinary Power still does', () => {
  for (const [rule, expected] of [[longFeng().rule, 0], [null, 10]]) {
    const f = fixture(rc('Northern Air Temple'), {rule});
    previewAndPlay(f, 'subject', 'play');
    assert.equal(f.drainPct, expected);
    assert.equal(f.powers.length, expected ? 1 : 0);
  }
});

test('8: first Gust suppresses Glider, Airstep and scaling progress; second Gust is normal', () => {
  const c = e.tokenCard('gust', 'Air', 'subject');
  const f = fixture(c, {rule: longFeng().rule, jstate: {wl: 11},
    jokers: ['glider_staff', 'airstep', 'wanderers_luck'].map(e.jokerById)});
  const first = previewAndPlay(f, 'subject', 'strike').res;
  assert.equal(first.dmg, 0); assert.equal(first.block, 0); assert.equal(first.flowAct, 0);
  assert.equal(first.gain, 1); assert.equal(f.flow, 2); assert.equal(f.jstate.wl, 11);
  assert(!allCards(f).some(c => c.uid === 'subject'), 'Suppressed token is still consumed');
  f.hand.push(e.tokenCard('gust', 'Air', 'second'));
  const second = previewAndPlay(f, 'second', 'strike').res;
  assert.equal(second.dmg, 4); assert.equal(second.block, 2); assert.equal(second.gain, 4);
  assert.equal(f.jstate.wl, 12);
  e.endTurn(f);
  assert.equal(f.flow, 2, 'Independent onTurnStart scaling effect remains active');
});

test('8: suppression prevents every action effect and onCard/onChain/onPlayed hook, not costs/tracking', () => {
  const calls = [];
  const j = {id: 'all-hooks',
    onCard: () => {calls.push('card'); return {flowNow: 5, base: 3, flat: 9, block: 7};},
    onChain: () => {calls.push('chain'); return {flow: 8};},
    onPlayed: (c, m, r, f, {state}) => {calls.push('played'); state.triggered = true; f.strikeBonus += 4;},
  };
  const c = synthetic({energy: 2, hpCost: 4, elements: ['Spirit'],
    keywords: {vigilance: true, lifelink: true, deathtouch: true},
    acts: ['hit', 'block', 'draw', 'heal', 'burn', 'haunt', 'dodge', 'delay', 'energy', 'gust', 'ally', 'growth', 'rally', 'pump', 'flow'].map(k => ({k, n: 2, on: 'play'}))});
  const f = fixture(c, {rule: longFeng().rule, jokers: [j]}); f.player.hp = 40;
  const {res} = previewAndPlay(f, 'subject', 'strike');
  assert.deepEqual(calls, []);
  for (const k of ['dmg', 'block', 'stone', 'heal', 'burn', 'haunt', 'dodge', 'delay', 'draw', 'energy', 'gust', 'ally', 'rally', 'pump', 'flowAct']) assert.equal(res[k], 0, k);
  assert.deepEqual(plain(res.growth), []); assert.equal(res.execute, false);
  assert.equal(f.player.hp, 36); assert.equal(f.energy, 2); assert.equal(f.spiritPlayed, true);
  assert.equal(f.strikeBonus, 0); assert.equal(c.growth, 0); assert.equal(f.chain.length, 1);
  assert.equal(f.drawPile.length, 3); assert.equal(f.hand.length, 4);
  f.hand.push(synthetic({uid: 'second', energy: 0}));
  play(f, 'second', 'strike');
  assert.deepEqual(calls, ['card', 'chain', 'played']);
  assert.equal(f.jstate.triggered, true); assert.equal(f.strikeBonus, 4);
});

test('8: costs stay validated; HP costs and Flash usage are consumed even when suppressed', () => {
  const c = rc("Iroh's Demonstration"), f = fixture(c, {rule: longFeng().rule});
  f.player.hp = c.hpCost;
  const before = snapshot(f), i = inHand(f, 'subject');
  assert.equal(e.canPlayCard(f, i, 'play').ok, false);
  assert.equal(e.previewCard(f, i, 'play'), null);
  assert.throws(() => e.playCard(f, i, 'play'), /Not enough HP/);
  assert.equal(snapshot(f), before);
  f.player.hp = 20;
  assert.equal(previewAndPlay(f, 'subject', 'play').res.dmg, 0);
  assert.equal(f.player.hp, 16);
  const flash = synthetic({keywords: {flash: true}, energy: 3});
  const ff = fixture(flash, {rule: longFeng().rule});
  assert.equal(previewAndPlay(ff).res.cost, 0); assert.equal(ff.flashUsed, true);
  ff.hand.push(synthetic({uid: 'second', keywords: {flash: true}, energy: 3}));
  assert.equal(previewAndPlay(ff, 'second').res.cost, 3);
});

test('8: suppressed cards still require energy and obey discard/exhaust/token lifecycle', () => {
  for (const kind of ['ordinary', 'exhaust', 'token', 'exhausting Power']) {
    const c = synthetic({energy: 2, token: kind === 'token',
      role: kind === 'exhausting Power' ? 'power' : 'basic',
      keywords: {exhaust: kind !== 'ordinary'}});
    const f = fixture(c, {rule: longFeng().rule}); f.energy = 1;
    const i = inHand(f, 'subject'), before = snapshot(f);
    assert.equal(e.canPlayCard(f, i).ok, false);
    assert.equal(e.previewCard(f, i), null);
    assert.throws(() => e.playCard(f, i), /Not enough energy/);
    assert.equal(snapshot(f), before);
    f.energy = 2;
    assert.equal(previewAndPlay(f).res.suppressed, true);
    assert.equal(f.energy, 0); assert.equal(f.powers.length, 0);
    assert.equal(f.discardPile.includes(c), kind === 'ordinary');
    assert.equal(f.exhaustPile.includes(c), kind === 'exhaust' || kind === 'exhausting Power');
    assert.equal(allCards(f).includes(c), kind !== 'token');
  }
});

test('8: cost-zero passive Joker remains active and the suppressed Guard consumes first-Guard eligibility', () => {
  const c = e.basicCard('defend', 'subject'), f = fixture(c, {rule: longFeng().rule, jokers: [e.jokerById('stone_wall')]});
  const first = previewAndPlay(f, 'subject', 'guard').res;
  assert.equal(first.cost, 0); assert.equal(first.block, 0); assert.equal(f.energy, 4);
  f.hand.push(e.basicCard('defend', 'second'));
  const second = previewAndPlay(f, 'second', 'guard').res;
  assert.equal(second.cost, 1); assert.equal(second.block, 4);
});

test('8: normal Instant/Firebending Flow, chain/element identity, Tide and pump consumption are preserved', () => {
  const c = synthetic({role: 'instant', elements: ['Water'], keywords: {firebending: 2}, acts: [{k: 'flow', n: 7}]});
  const f = fixture(c, {rule: longFeng().rule}); f.tide = true; f.pump = 8;
  const {res} = previewAndPlay(f, 'subject', 'strike');
  assert.equal(res.flowNow, 3); // ordinary Tide +2, no scoring
  assert.equal(res.gain, 4); // play +1, Instant +1, Firebending +2; explicit +7 effect suppressed
  assert.equal(f.flow, 7); assert.equal(f.pump, 0); assert.equal(f.tide, false);
  assert.equal(f.chain[0].uid, 'subject'); assert.deepEqual(plain(f.chain[0].el), ['Water']);
  assert.equal(f.fightCounts.Water, 1);
  const next = synthetic({uid: 'second', elements: ['Water'], rank: 2, energy: 0}); f.hand.push(next);
  assert.equal(previewAndPlay(f, 'second', 'strike').res.gain, 3, 'Normal same-element and Path gains include the suppressed play');
});

test('8: end-turn Joker echoes cannot resurrect a suppressed Strike', () => {
  const c = e.basicCard('strike', 'subject');
  const f = fixture(c, {rule: longFeng().rule, jokers: ['lone_wanderer', 'zuko_exile'].map(e.jokerById)});
  const {res} = previewAndPlay(f, 'subject', 'strike');
  assert.equal(res.dmg, 0); assert.equal(f.chain[0].dmg, 0);
  const hp = f.enemy.hp, events = e.endTurn(f);
  assert.equal(events.find(ev => ev.t === 'strikeAgain').dmg, 0);
  assert.equal(f.enemy.hp, hp);
});

test('8: onPlayed stateful Legends are suppressed, while independent Dodge/turn hooks remain active', () => {
  const c = synthetic({elements: ['Earth'], baseGuard: 5, acts: [{k: 'delay', n: 1}]});
  const f = fixture(c, {rule: longFeng().rule, jokers: ['ty_lee', 'bumi_trials', 'yue', 'appa'].map(e.jokerById)});
  previewAndPlay(f, 'subject', 'guard');
  assert.equal(f.jstate.tyArmed, undefined); assert.equal(f.jstate.bumi, undefined); assert.equal(f.strikeBonus, 0);
  f.player.dodge = 1;
  assert.equal(e.endTurn(f).find(ev => ev.t === 'counter').dmg, 8);
});

// Broad controls: compile actual scripts and check preview purity across actual catalog/rules/Jokers.
test('control: all inline scripts compile', () => {
  const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
  assert(scripts.length >= 2);
  for (const [i, script] of scripts.entries()) new vm.Script(script[1], {filename: `${sourcePath}:inline-${i}`});
});

test('control: ordinary Strike/Guard results and energy/Flow sequencing are unchanged', () => {
  const s = e.basicCard('strike', 'subject'), f = fixture(s);
  const first = previewAndPlay(f, 'subject', 'strike').res;
  assert.equal(first.suppressed, false); assert.equal(first.dmg, 6); assert.equal(first.gain, 1);
  f.hand.push(e.basicCard('defend', 'second'));
  const second = previewAndPlay(f, 'second', 'guard').res;
  assert.equal(second.block, 4); assert.equal(f.energy, 2); assert.equal(f.flow, 3);
});

test('control: actual catalog previews are pure and repeatable for all modes, encounter rules and Jokers', () => {
  const cards = data.base.filter(c => e.isRunCard(c));
  assert(cards.length > 200);
  let count = 0;
  for (const rule of [null, {id: 'fire_half'}, {id: 'half_fire_block'}, {id: 'water_needs_spirit'}, longFeng().rule]) {
    for (const source of cards) {
      const c = e.toRunCard(source, {uid: 'subject', upgraded: true, stars: 3});
      const f = fixture(c, {rule, jokers: e.JOKERS, jstate: {tyArmed: true, wl: 24, bumi: 30}});
      f.energy = 99;
      for (const mode of e.modesFor(c)) {
        assert(preview(f, 'subject', mode)); count++;
      }
      incoming(f);
    }
  }
  console.log(`Pure, repeatable catalog previews checked: ${count}`);
});

test('control: actual catalog preview/execution parity and card ownership under each encounter rule', () => {
  let count = 0;
  for (const rule of [null, {id: 'fire_half'}, {id: 'half_fire_block'}, {id: 'water_needs_spirit'}, longFeng().rule]) {
    for (const source of data.base.filter(c => e.isRunCard(c))) {
      for (const mode of e.modesFor(e.toRunCard(source))) {
        const c = e.toRunCard(source, {uid: 'subject', upgraded: true, stars: 3});
        const f = fixture(c, {rule, jokers: e.JOKERS, jstate: {tyArmed: true, wl: 24, bumi: 30}}, {armor: 3});
        f.energy = 99; f.flow = 4; f.enemy.haunt = 1;
        f.player.block = 7; f.player.hp = 50;
        previewAndPlay(f, 'subject', mode);
        assert.equal(allCards(f).filter(c => c.uid === 'subject').length, 1, `${source.name}: card duplicated or lost`);
        assert.equal(new Set(allCards(f).map(c => c.uid)).size, allCards(f).length);
        count++;
      }
    }
  }
  console.log(`Catalog preview/execution and ownership cases checked: ${count}`);
});
