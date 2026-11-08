import { actValue, guardValue, strikeValue, tokenCard } from "./cards.js";
import { checkPhase, enemyAct, intentDamage, makeEnemyState, pendingCopyBonus } from "./enemy.js";
import { jokerOpts, jokerPatch, mergePatch } from "./jokers.js";
import { mechFlow, mechanicsFor, surgeOf } from "./mechanics.js";

var ENERGY = 4;
var CARRY_MAX = 2;
var DRAW = 5;
var HAND_MAX = 10;
var GUARD_F = 0.45;
var HASTE_BONUS = 4;
var HAUNT_MULT = 1.25;
var EXECUTE_PCT = 0.15;
var TIDE_BONUS = 2;
export function modesFor(c) {
  const s = c.baseStrike > 0, g = c.baseGuard > 0;
  return s && g ? ["strike", "guard"] : s ? ["strike"] : g ? ["guard"] : ["play"];
}
var normMode = (c, mode) => {
  const m = modesFor(c);
  return m[0] === "play" ? "play" : mode || m[0];
};
function elementsOf(f, c) {
  const alias = f.opts && f.opts.alias || {}, out = [...c.elements];
  for (const e of c.elements) if (alias[e] && !out.includes(alias[e])) out.push(alias[e]);
  return out;
}
export function createFight({ deck, player, enemy, jokers = [], jstate = {}, rng, rule = null, elementCounts = {}, sets }) {
  const f = {
    turn: 0,
    energy: 0,
    carry: 0,
    nextEnergy: 0,
    flow: 1,
    chain: [],
    avatarCount: 0,
    turnElements: [],
    tide: false,
    pump: 0,
    rally: 0,
    peakFlow: 1,
    peakFlowLast: 0,
    drawnTurn: 0,
    strikeBonus: 0,
    tokenSeq: 0,
    drainPct: 0,
    hand: [],
    drawPile: rng.shuffle(deck.slice()),
    discardPile: [],
    exhaustPile: [],
    powers: [],
    flashUsed: false,
    hex: null,
    banned: null,
    spiritPlayed: false,
    elementCounts: { ...elementCounts },
    fightCounts: {},
    player: { hp: player.hp, maxHp: player.maxHp, block: 0, stone: 0, dodge: 0 },
    enemy: makeEnemyState({ ...enemy }),
    jokers,
    jstate,
    opts: jokerOpts(jokers),
    mech: mechanicsFor(sets),
    rng,
    rule,
    result: "ongoing",
    log: [],
    trample: 0
  };
  startTurn(f, []);
  return f;
}
function drawCards(f, n, events) {
  let drawn = 0;
  for (let k = 0; k < n; k++) {
    if (f.hand.length >= HAND_MAX) break;
    if (!f.drawPile.length) {
      if (!f.discardPile.length) break;
      f.drawPile = f.rng.shuffle(f.discardPile);
      f.discardPile = [];
    }
    f.hand.push(f.drawPile.pop());
    drawn++;
    f.drawnTurn++;
    if (f.rule && f.rule.id === "draw_hp" && f.drawnTurn > DRAW) f.player.hp = Math.max(1, f.player.hp - 2);
  }
  if (events && drawn) events.push({ t: "draw", n: drawn });
  return drawn;
}
function addToHand(f, card, events) {
  if (f.hand.length >= HAND_MAX) return false;
  f.hand.push(card);
  if (events) events.push({ t: "add", uid: card.uid, name: card.name });
  return true;
}
function turnCtx(f) {
  return {
    flow: f.flow,
    prev: f.chain[f.chain.length - 1] || null,
    tide: f.tide,
    pump: f.pump,
    rally: f.rally,
    avatarCount: f.avatarCount,
    elements: f.turnElements.slice(),
    energy: f.energy,
    count: f.chain.length,
    enemyHp: f.enemy.hp,
    haunt: f.enemy.haunt,
    block: f.player.block,
    hp: f.player.hp,
    spiritPlayed: f.spiritPlayed,
    flashUsed: f.flashUsed,
    lastWasNoncreature: false,
    allies: f.chain.filter((x) => x.ally).length,
    guards: f.chain.filter((x) => x.mode === "guard").length,
    strikeBonus: f.strikeBonus,
    ...f.chain.length ? { lastWasNoncreature: !f.chain[f.chain.length - 1].creature } : {}
  };
}
function cardCost(f, c, mode, ctx = turnCtx(f)) {
  if (c.keywords.flash && !ctx.flashUsed) return 0;
  let v = c.energy;
  const up = { cost_up_water: "Water", cost_up_fire: "Fire" }[f.hex && f.hex.id];
  if (up && c.elements.includes(up)) v++;
  if (f.rule && f.rule.id === "earth_cost_up" && c.elements.includes("Earth")) v++;
  if (f.taxed && c.elements.includes(f.taxed)) v++;
  if (v > 0 && jokerPatch("costZero", f.jokers, [c, normMode(c, mode), ctx, f], f.jstate).zero) v = 0;
  return v;
}
function check(f, c, mode, ctx) {
  if (!c) return { ok: false, reason: "No such card" };
  const modes = modesFor(c), m = normMode(c, mode);
  if (m !== "play" && !modes.includes(m)) return { ok: false, reason: m === "strike" ? "This card can't Strike" : "This card can't Guard" };
  if (f.banned && c.elements.includes(f.banned)) return { ok: false, reason: f.banned + " is banned" };
  const cost = cardCost(f, c, m, ctx);
  if (cost > ctx.energy) return { ok: false, reason: "Not enough energy", cost };
  if (c.hpCost && ctx.hp <= c.hpCost) return { ok: false, reason: "Not enough HP", cost };
  return { ok: true, cost, hp: c.hpCost || 0, mode: m };
}
export function canPlayCard(f, i, mode) {
  if (f.result !== "ongoing") return { ok: false, reason: "Fight over" };
  return check(f, f.hand[i], mode, turnCtx(f));
}
function resolve(ctx, f, c, mode) {
  mode = normMode(c, mode);
  const o = f.opts, els = elementsOf(f, c), kw = c.keywords;
  const suppressed = !!(f.rule && f.rule.id === "first_card_no_score" && ctx.count === 0);
  const prev = ctx.prev, same = !!prev && els.some((e) => e !== "Neutral" && prev.el.includes(e));
  const diff = prev ? c.rank - prev.rank : null, path = !!prev && (diff === 1 || o.pathSkip && diff === 2);
  const x = { same, path, els };
  const jc = suppressed ? {} : mergePatch(jokerPatch("onCard", f.jokers, [c, mode, ctx, f, x], f.jstate), jokerPatch("onCard", f.mech, [c, mode, ctx, f, x], f.jstate));
  const tideHit = ctx.tide && mode === "strike" && els.includes("Water");
  const flowNow = ctx.flow + (tideHit ? TIDE_BONUS : 0) + (jc.flowNow || 0);
  const res = {
    mode,
    suppressed,
    uid: c.uid,
    flowBefore: ctx.flow,
    flowNow,
    flowAfter: 0,
    gain: 0,
    dmg: 0,
    hits: [],
    block: 0,
    stone: 0,
    heal: 0,
    burn: 0,
    haunt: 0,
    dodge: 0,
    delay: 0,
    draw: 0,
    energy: 0,
    gust: 0,
    ally: 0,
    growth: [],
    rally: 0,
    pump: 0,
    kills: false,
    avatar: false,
    execute: false
  };
  if (mode === "strike" && !suppressed) {
    const base = strikeValue(c) + ctx.pump + ctx.rally + ctx.strikeBonus + (kw.haste && f.turn === 1 ? HASTE_BONUS : 0) + (jc.base || 0);
    const raw = base * flowNow * (jc.xdmg || 1);
    res.hits = [raw];
    for (const h of hitsAfter(raw, f, c, mode, ctx, res)) res.hits.push(h);
    for (let k = 0; k < (jc.hits || 0); k++) res.hits.push(raw);
    res.hits = res.hits.map((h) => landHit(cardDamage(h, f, c, ctx), f, kw, ctx));
    res.dmg = res.hits.reduce((s, h) => s + h, 0) + cardDamage(jc.flat || 0, f, c, ctx);
  }
  if (mode === "guard" && !suppressed) {
    const b = (guardValue(c) + ctx.rally + (jc.guard || 0)) * flowNow * GUARD_F;
    res.block = cardBlock(b, f, c);
    if (kw.stone) res.stone = res.block;
  }
  if (jc.block) res.block += cardBlock(jc.block, f, c);
  if (!suppressed) resolveActs(res, ctx, f, c, mode, flowNow, jc);
  else res.flowAct = 0;
  // Suppression keeps play/chain/keyword Flow and tracking, not effect Flow or Joker triggers.
  const jg = suppressed ? {} : jokerPatch("onChain", f.jokers, [c, mode, ctx, f, x], f.jstate);
  res.gain = 1 + (same ? 1 : 0) + (path ? o.pathBonus : 0) + (c.role === "instant" ? 1 : 0) + mechFlow(f, c, ctx) + (kw.prowess && ctx.lastWasNoncreature ? 1 : 0) + res.flowAct + (jg.flow || 0);
  let flowAfter = flowNow + res.gain;
  const surge = surgeOf(f);
  let elements = surge ? [.../* @__PURE__ */ new Set([...ctx.elements, ...els.filter((e) => surge.els.includes(e))])] : ctx.elements.slice(), avatarCount = ctx.avatarCount;
  if (surge && surge.els.every((e) => elements.includes(e)) && avatarCount < o.avatarTimes) {
    flowAfter *= o.avatarMult;
    avatarCount++;
    res.avatar = true;
    elements = [];
  }
  res.flowAfter = flowAfter;
  const enemyHp = ctx.enemyHp - res.dmg;
  res.kills = enemyHp <= 0 || res.execute;
  res.cost = cardCost(f, c, mode, ctx);
  res.next = {
    ...ctx,
    flow: flowAfter,
    prev: { uid: c.uid, el: els, rank: c.rank, role: c.role, mode, creature: c.isCreature, ally: c.isAlly, dmg: res.dmg },
    tide: mode === "guard" && els.includes("Water") ? true : tideHit ? false : ctx.tide,
    pump: (mode === "strike" ? 0 : ctx.pump) + res.pump,
    rally: ctx.rally + res.rally,
    avatarCount,
    elements,
    energy: ctx.energy - res.cost,
    count: ctx.count + 1,
    enemyHp,
    haunt: ctx.haunt + res.haunt,
    block: ctx.block + res.block,
    hp: Math.min(f.player.maxHp, ctx.hp - (c.hpCost || 0) + res.heal),
    spiritPlayed: ctx.spiritPlayed || els.includes("Spirit"),
    flashUsed: ctx.flashUsed || !!kw.flash,
    lastWasNoncreature: !c.isCreature,
    allies: ctx.allies + (c.isAlly ? 1 : 0),
    guards: ctx.guards + (mode === "guard" ? 1 : 0),
    strikeBonus: ctx.strikeBonus
  };
  return res;
}
// Restrict each direct damage/Block contribution before rounding and hit mitigation.
// Burn/Haunt are status stacks, not direct damage; independent Joker counters are unchanged.
function cardDamage(raw, f, c, ctx) {
  const rule = f.rule && f.rule.id, els = elementsOf(f, c);
  if (rule === "water_needs_spirit" && els.includes("Water") && !els.includes("Spirit") && !ctx.spiritPlayed) raw = 0;
  if (rule === "fire_half" && els.includes("Fire")) raw *= 0.5;
  return Math.floor(raw);
}
function cardBlock(raw, f, c) {
  if (f.rule && f.rule.id === "half_fire_block" && elementsOf(f, c).includes("Fire")) raw *= 0.5;
  return Math.floor(raw);
}
function hitsAfter(raw, f, c) {
  return c.keywords.doubleStrike ? [raw] : c.keywords.firstStrike ? [raw * 0.5] : [];
}
function landHit(h, f, kw, ctx) {
  const e = f.enemy, armor = kw.flying ? 0 : kw.menace ? Math.max(0, e.armor - e.fortArmor) : e.armor;
  h = Math.max(0, h - armor);
  if (ctx.haunt > 0) h = Math.floor(h * HAUNT_MULT);
  return h;
}
function resolveActs(res, ctx, f, c, mode, flowNow, jc) {
  res.flowAct = 0;
  const scaleFlow = c.role === "sorcery", kw = c.keywords;
  for (const a of c.acts) {
    if (a.on === "strike" && mode !== "strike" || a.on === "guard" && mode !== "guard") continue;
    const n = actValue(c, a);
    switch (a.k) {
      case "hit": {
        const h = landHit(cardDamage(scaleFlow ? n * flowNow : n, f, c, ctx), f, kw, ctx);
        res.hits.push(h);
        res.dmg += h;
        if (a.drain) res.heal += Math.floor(h * a.drain);
        break;
      }
      case "block": {
        const b = cardBlock(scaleFlow ? n * flowNow : n, f, c);
        res.block += b;
        if (a.stone) res.stone += b;
        break;
      }
      case "burn":
        res.burn += n + (jc.burn || 0);
        break;
      case "flow":
        res.flowAct += n;
        break;
      case "growth":
        res.growth.push({ n, target: a.target || "self" });
        break;
      case "energy":
        res.energy += n;
        break;
      default:
        res[a.k] += n;
    }
  }
  if (mode === "strike") {
    if (kw.vigilance) res.block += cardBlock(c.toughness * flowNow, f, c);
    if (kw.lifelink) res.heal += Math.floor(res.dmg * 0.25);
    if (f.drainPct) res.heal += Math.floor(res.dmg * f.drainPct / 100);
    const left = ctx.enemyHp - res.dmg;
    if (kw.deathtouch && left > 0 && left < f.enemy.maxHp * EXECUTE_PCT) res.execute = true;
  }
}
export function previewCard(f, i, mode) {
  if (!canPlayCard(f, i, mode).ok) return null;
  return resolve(turnCtx(f), f, f.hand[i], mode);
}
export function incomingDamage(f) {
  if (f.result !== "ongoing" || f.enemy.countdown - 1 > 0) return 0;
  return intentDamage(f, f.player.block, f.player.dodge);
}
export function playCard(f, i, mode) {
  if (f.result !== "ongoing") throw new Error("fight over");
  const ctx = turnCtx(f), c = f.hand[i], chk = check(f, c, mode, ctx);
  if (!chk.ok) throw new Error(chk.reason);
  const res = resolve(ctx, f, c, chk.mode), events = [{ t: "play", uid: c.uid, name: c.name, mode: res.mode, res }];
  f.energy -= res.cost;
  if (c.hpCost) f.player.hp -= c.hpCost;
  if (c.keywords.flash) f.flashUsed = true;
  // The resolving card is in no pile until all effects and play triggers finish.
  f.hand.splice(i, 1);
  const n = res.next;
  f.flow = n.flow;
  f.tide = n.tide;
  f.pump = n.pump;
  f.rally = n.rally;
  f.avatarCount = n.avatarCount;
  f.turnElements = n.elements;
  f.chain.push(n.prev);
  f.peakFlow = Math.max(f.peakFlow, n.flow);
  if (res.avatar) events.push({ t: "avatar" });
  if (n.spiritPlayed) f.spiritPlayed = true;
  for (const e of c.elements) f.fightCounts[e] = (f.fightCounts[e] || 0) + 1;
  applyResult(f, c, res, events);
  if (!res.suppressed) jokerPatch("onPlayed", f.jokers, [c, res.mode, res, f], f.jstate);
  if (c.role === "power" && !res.suppressed) f.powers.push(c);
  else if (c.token) {
    // Tokens are consumed, never shuffled back in.
  } else if (c.keywords.exhaust) f.exhaustPile.push(c);
  else f.discardPile.push(c);
  if (f.enemy.hp <= 0 || res.execute) {
    f.trample = c.keywords.trample ? Math.max(0, -f.enemy.hp) : 0;
    f.enemy.hp = 0;
    f.result = "won";
    events.push({ t: "win" });
  } else checkPhase(f, events);
  f.log.push(events);
  return { events, res };
}
function applyResult(f, c, res, events) {
  if (res.suppressed) return;
  const p = f.player, e = f.enemy;
  e.hp -= res.dmg;
  e.burn += res.burn;
  e.haunt += res.haunt;
  if (res.delay && !e.delayed) {
    e.countdown += 1;
    e.delayed = true;
  }
  p.block += res.block;
  p.stone += res.stone;
  p.dodge += res.dodge;
  if (res.heal) p.hp = Math.min(p.maxHp, p.hp + res.heal);
  f.nextEnergy += res.energy;
  if (res.draw) drawCards(f, res.draw, events);
  const el = c.elements.find((x) => x !== "Neutral") || "Earth";
  for (let k = 0; k < res.gust; k++) addToHand(f, tokenCard("gust", "Air", "tk" + ++f.tokenSeq), events);
  for (let k = 0; k < res.ally; k++) addToHand(f, tokenCard("ally", el, "tk" + ++f.tokenSeq), events);
  for (const g of res.growth) {
    const target = g.target === "self" ? c : f.hand.filter((x) => x.isCreature && !x.token).sort((a, b) => b.rank - a.rank)[0];
    if (target) target.growth = (target.growth || 0) + g.n;
  }
  if (c.role === "power" && c.powerFx && c.powerFx.k === "drainAll") f.drainPct += actValue(c, c.powerFx);
}
export function endTurn(f) {
  if (f.result !== "ongoing") throw new Error("fight over");
  const events = [{ t: "endTurn" }];
  const je = mergePatch(jokerPatch("onTurnEnd", f.jokers, [f], f.jstate, events), jokerPatch("onTurnEnd", f.mech, [f], f.jstate));
  if (je.strikeAgain && f.chain.length === 1 && f.chain[0].mode === "strike") {
    const d = f.chain[0].dmg * je.strikeAgain;
    f.enemy.hp -= d;
    events.push({ t: "strikeAgain", dmg: d, n: je.strikeAgain });
  }
  f.carry = Math.min(CARRY_MAX, f.energy);
  for (const c of f.hand.splice(0)) {
    if (c.keywords.retain) f.hand.push(c);
    else if (!c.token) f.discardPile.push(c);
  }
  if (won(f, events)) return done(f, events);
  f.hex = null;
  if (f.enemy.burn > 0) {
    f.enemy.hp -= f.enemy.burn;
    events.push({ t: "burnTick", n: f.enemy.burn });
    f.enemy.burn--;
  }
  if (won(f, events)) return done(f, events);
  checkPhase(f, events);
  if (f.enemy.def.copyJoker) f.enemy.copyBonus = pendingCopyBonus(f);
  f.peakFlowLast = f.peakFlow;
  f.enemy.countdown -= 1;
  if (f.enemy.countdown <= 0) enemyAct(f, events, (ev) => onDodge(f, ev));
  if (f.enemy.haunt > 0) f.enemy.haunt--;
  if (won(f, events)) return done(f, events);
  if (f.player.hp <= 0) {
    f.result = "lost";
    events.push({ t: "lose" });
    return done(f, events);
  }
  startTurn(f, events);
  return done(f, events);
}
function onDodge(f, events) {
  const p = jokerPatch("onDodge", f.jokers, [f], f.jstate, events);
  if (p.dmg) {
    f.enemy.hp -= p.dmg;
    events.push({ t: "counter", dmg: p.dmg });
  }
}
function won(f, events) {
  if (f.enemy.hp > 0) return false;
  f.trample = 0;
  f.enemy.hp = 0;
  f.result = "won";
  events.push({ t: "win" });
  return true;
}
function done(f, events) {
  f.log.push(events);
  return events;
}
function startTurn(f, events) {
  f.turn++;
  f.energy = ENERGY + f.carry + f.nextEnergy;
  f.carry = 0;
  f.nextEnergy = 0;
  f.flow = 1;
  f.chain = [];
  f.tide = false;
  f.pump = 0;
  f.rally = 0;
  f.avatarCount = 0;
  f.turnElements = [];
  f.peakFlow = 1;
  f.drawnTurn = 0;
  events.push({ t: "turn", n: f.turn });
  drawCards(f, DRAW - (f.hex && f.hex.id === "draw_less" ? 1 : 0), events);
  turnStartEffects(f, events);
}
function turnStartEffects(f, events) {
  for (const pw of f.powers) {
    const fx = pw.powerFx;
    if (!fx) continue;
    const n = fx.k === "block" ? cardBlock(actValue(pw, fx), f, pw) : actValue(pw, fx);
    switch (fx.k) {
      case "draw":
        drawCards(f, n, events);
        break;
      case "block":
        f.player.block += n;
        if (fx.stone) f.player.stone += n;
        break;
      case "energy":
        f.energy += n;
        break;
      case "growth": {
        const t = f.hand.filter((x) => x.isCreature && !x.token).sort((a, b) => b.rank - a.rank)[0];
        if (t) t.growth = (t.growth || 0) + n;
        break;
      }
      case "flow":
        f.flow += n;
        break;
      case "burn":
        f.enemy.burn += n;
        break;
      case "gust":
        for (let k = 0; k < n; k++) addToHand(f, tokenCard("gust", "Air", "tk" + ++f.tokenSeq), events);
        break;
      case "haunt":
        f.enemy.haunt += n;
        break;
      case "heal":
        f.player.hp = Math.min(f.player.maxHp, f.player.hp + n);
        break;
    }
    events.push({ t: "power", uid: pw.uid, k: fx.k, n });
  }
  const p = mergePatch(jokerPatch("onTurnStart", f.jokers, [f], f.jstate, events), jokerPatch("onTurnStart", f.mech, [f], f.jstate));
  if (p.block) f.player.block += p.block;
  if (p.flow) f.flow += p.flow;
  if (p.energy) f.energy += p.energy;
  if (p.draw) drawCards(f, p.draw, events);
  for (let k = 0; k < (p.gust || 0); k++) addToHand(f, tokenCard("gust", "Air", "tk" + ++f.tokenSeq), events);
}
