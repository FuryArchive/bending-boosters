import { jokerOpts } from "./jokers.js";
import { createFight, endTurn, playCard } from "./flow.js";
import { createRng, hashStr, withRng } from "./rng.js";
import { generateBook, nodeById, startNodes } from "./map.js";
import { starterDeck } from "./pools.js";
import { enemyForNode } from "../data/enemies.js";
import { jokerById } from "../data/jokers.js";
import { startCharms } from "./offers.js";
import { makeReward, openNode } from "./nodes.js";
import { ECONOMY } from "../economy/config.js";

var START_HP = 60;
var START_GOLD = 20;
var SAVE_VERSION = 2;
var GOLD = { fight: [12, 18], elite: [30, 40], boss: [60, 60] };
var PAYOUT = ECONOMY.journeyPayout;
var liveJokers = (run) => run.jokers.map((j) => ({ ...jokerById(j.id), stars: j.stars || 1 }));
export function createRun({ seed, nation = "water", ownedKeys = [], ownedStars = {}, startCharmId }) {
  const run = {
    v: SAVE_VERSION,
    seed: String(seed),
    rngState: hashStr(String(seed)) | 0,
    book: 1,
    floor: 0,
    nodeId: null,
    maps: {},
    path: [],
    hp: START_HP,
    maxHp: START_HP,
    gold: START_GOLD,
    deck: [],
    jokers: [],
    jstate: {},
    ownedKeys: [...ownedKeys],
    ownedStars: { ...ownedStars },
    nation,
    stats: { fights: 0, elites: 0, bosses: 0, bestHit: 0, avatar: 0, plays: 0, turns: 0, peakFlow: 0, elementCounts: {} },
    removals: 0,
    rerolls: 0,
    offerings: [],
    pending: null,
    fight: null,
    status: "map",
    goldMult: 1,
    skip: 0,
    trample: 0
  };
  withRng(run, (rng) => {
    run.maps[1] = generateBook(1, rng);
    run.deck = starterDeck(nation);
    run.nextUid = run.deck.length;
    if (startCharmId) run.jokers.push({ id: startCharmId, stars: 1 });
    else run.pending = { kind: "start", charms: startCharms(rng).map((j) => j.id) };
  });
  return run;
}
export function takeStartCharm(run, i) {
  if (!run.pending || run.pending.kind !== "start") throw new Error("no start pick");
  run.jokers.push({ id: run.pending.charms[i], stars: 1 });
  run.pending = null;
}
export function currentMap(run) {
  return run.maps[run.book];
}
export function availableNodes(run) {
  if (run.status !== "map" || run.pending && run.pending.kind === "start") return [];
  const map = currentMap(run);
  let ids = run.nodeId ? nodeById(map, run.nodeId).next : startNodes(map);
  for (let s = 0; s < run.skip; s++) ids = [...new Set(ids.flatMap((id) => nodeById(map, id).next))];
  return ids.map((id) => nodeById(map, id)).filter(Boolean);
}
export function enterNode(run, id) {
  if (!availableNodes(run).some((n) => n.id === id)) throw new Error("not reachable");
  const node = nodeById(currentMap(run), id);
  run.nodeId = id;
  run.floor = node.floor;
  run.path.push(id);
  run.skip = 0;
  withRng(run, (rng) => {
    if (node.type === "fight" || node.type === "elite" || node.type === "boss") {
      const enemy = enemyForNode(run, node, rng);
      if (run.trample) {
        enemy.hp = Math.max(1, enemy.hp - run.trample);
        run.trample = 0;
      }
      run.fight = createFight({
        deck: run.deck,
        player: { hp: run.hp, maxHp: run.maxHp },
        enemy,
        jokers: liveJokers(run),
        jstate: run.jstate,
        rng: createRng(rng.int(2 ** 31)),
        rule: enemy.rule || null,
        elementCounts: run.stats.elementCounts
      });
      run.fight.enemy.maxHp = Math.max(run.fight.enemy.maxHp, run.fight.enemy.hp);
      run.status = "fight";
    } else {
      run.pending = openNode(run, node, rng);
      run.status = "node";
    }
  });
  return node;
}
export function runPlayCard(run, i, mode) {
  const f = run.fight;
  if (!f) throw new Error("no fight");
  const c = f.hand[i];
  const out = playCard(f, i, mode), st = run.stats;
  st.plays++;
  st.bestHit = Math.max(st.bestHit, out.res.dmg);
  st.peakFlow = Math.max(st.peakFlow, f.flow);
  if (out.res.avatar) st.avatar++;
  for (const e of c.elements) st.elementCounts[e] = (st.elementCounts[e] || 0) + 1;
  run.hp = f.player.hp;
  if (f.result !== "ongoing") finishFight(run);
  return out;
}
export function runEndTurn(run) {
  const f = run.fight;
  if (!f) throw new Error("no fight");
  const events = endTurn(f);
  run.stats.turns++;
  run.hp = f.player.hp;
  if (f.result !== "ongoing") finishFight(run);
  return { events };
}
function finishFight(run) {
  const f = run.fight;
  if (!f) return;
  const node = nodeById(currentMap(run), run.nodeId);
  if (f.result === "lost") {
    run.hp = 0;
    run.status = "lost";
    run.fight = null;
    return;
  }
  run.hp = f.player.hp;
  run.trample = f.trample || 0;
  const kind = node.type === "fight" ? "fight" : node.type;
  if (kind === "fight") run.stats.fights++;
  else if (kind === "elite") run.stats.elites++;
  else run.stats.bosses++;
  withRng(run, (rng) => {
    const [lo, hi] = GOLD[kind];
    let gold = (lo + rng.int(hi - lo + 1)) * run.goldMult;
    run.goldMult = 1;
    for (const j of liveJokers(run)) {
      if (j.fightGold) gold += j.fightGold;
      if (j.fightHeal) run.hp = Math.min(run.maxHp, run.hp + j.fightHeal);
      if (j.onFightWon) j.onFightWon(run.jstate, j);
    }
    run.gold += gold;
    run.pending = makeReward(run, kind, gold, rng);
  });
  run.fight = null;
  run.status = "node";
}
export function leaveNode(run) {
  if (run.status !== "node") throw new Error("not at a node");
  if (run.pending && run.pending.kind === "swap") throw new Error("choose a Joker to replace first");
  const node = nodeById(currentMap(run), run.nodeId);
  run.pending = null;
  if (node.type === "boss") {
    if (run.book < 3) nextBook(run);
    else run.status = "won";
  } else run.status = "map";
}
function nextBook(run) {
  run.book++;
  run.floor = 0;
  run.nodeId = null;
  run.hp = run.maxHp;
  run.status = "map";
  withRng(run, (rng) => {
    run.maps[run.book] = generateBook(run.book, rng);
  });
}
export function payout(run) {
  const s = run.stats;
  let d = s.fights * PAYOUT.fight + s.elites * PAYOUT.elite;
  for (let b = 0; b < Math.min(3, s.bosses); b++) d += PAYOUT.boss[b];
  if (run.status === "won") d += PAYOUT.win;
  return Math.round(d * 100) / 100;
}
export function serialize(run) {
  const out = { ...run };
  if (run.fight) {
    const f = run.fight;
    out.fight = { ...f, rng: void 0, rngState: f.rng.getState(), jokers: void 0, jstate: void 0, opts: void 0, log: [] };
  }
  return JSON.stringify(out);
}
export function deserialize(str) {
  const run = JSON.parse(str);
  if (!run || (run.v || 1) < SAVE_VERSION) return null;
  if (run.fight) {
    const f = run.fight, byUid = new Map(run.deck.map((c) => [c.uid, c]));
    const remap = (arr) => (arr || []).map((c) => byUid.get(c.uid) || c);
    for (const k of ["hand", "drawPile", "discardPile", "exhaustPile", "powers"]) f[k] = remap(f[k]);
    const rng = createRng(0);
    rng.setState(f.rngState);
    delete f.rngState;
    f.rng = rng;
    f.jokers = liveJokers(run);
    f.jstate = run.jstate;
    f.opts = jokerOpts(f.jokers);
    f.log = [];
  }
  return run;
}
