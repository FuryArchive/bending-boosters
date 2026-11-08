import { themeOf } from "./themes.js";

var HP_BASE = 135;
var ATK_BASE = 9;
var FLOOR_G = 1.05;
var FLOOR_A = 1.0205;
var BOSS_HP_BOOK = { 1: 2.5, 2: 2, 3: 1.8 };
var ELITE_HP = 1.35;
var ELITE_ATK = 1.15;
var BOSS_ATK = 1.25;
var BOSS_CD = 1;
var NORMAL_CD = 1;
export var ruleOf = (id, text) => ({ id, text });
var runFloor = (book, floor) => (book - 1) * 15 + floor;
var normalHp = (n) => Math.round(HP_BASE * FLOOR_G ** (n - 1));
var normalAtk = (n) => Math.round(ATK_BASE * FLOOR_A ** (n - 1));
export function enemyForNode(run, node, rng) {
  const book = Math.min(3, Math.max(1, run.book)), n = runFloor(book, node.floor);
  const hp = normalHp(n), atk = normalAtk(n), b = themeOf(run).books[book];
  if (node.type === "boss") {
    return { ...structuredClone(b.boss), hp: Math.round(hp * BOSS_HP_BOOK[book]), atk: Math.round(atk * BOSS_ATK), countdown: BOSS_CD, boss: true, elite: false, bossName: b.bossName };
  }
  if (node.type === "elite") {
    return { ...structuredClone(rng.pick(b.elites)), hp: Math.round(hp * ELITE_HP), atk: Math.round(atk * ELITE_ATK), countdown: NORMAL_CD, boss: false, elite: true };
  }
  return { ...structuredClone(rng.pick(b.roster)), hp, atk, countdown: NORMAL_CD, boss: false, elite: false };
}
