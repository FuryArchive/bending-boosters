import { OVERRIDES } from "../data/overrides.js";

var ELEM = { W: "Air", U: "Water", B: "Spirit", R: "Fire", G: "Earth" };
var KW = {
  "Flying": "flying",
  "Lifelink": "lifelink",
  "Vigilance": "vigilance",
  "Trample": "trample",
  "Deathtouch": "deathtouch",
  "Prowess": "prowess",
  "Flash": "flash",
  "Menace": "menace",
  "Haste": "haste",
  "Reach": "reach",
  "First Strike": "firstStrike",
  "Double Strike": "doubleStrike",
  "Defender": "defender"
};
var STAR_BONUS = 0.25;
var UPGRADE_BONUS = 0.3;
export var DECK_TYPES = {
  Water: ["tide", "study", "ebb"],
  Earth: ["stone", "growth", "ramp"],
  Fire: ["burn", "blaze", "inner"],
  Air: ["gust", "team", "evasion"],
  Spirit: ["drain", "bargain", "haunt"]
};
export function starsFromCopies(n) {
  return n >= 12 ? 5 : n >= 7 ? 4 : n >= 4 ? 3 : n >= 2 ? 2 : n >= 1 ? 1 : 0;
}
function manaValue(cost) {
  if (!cost) return 0;
  return cost.split(" ").reduce((s, t) => s + (/^\d+$/.test(t) ? +t : t === "X" ? 0 : 1), 0);
}
var energyOf = (rank) => rank <= 0 ? 0 : rank <= 2 ? 1 : rank <= 4 ? 2 : 3;
function ptVal(v) {
  return /^\d+$/.test(v) ? +v : /^\d+\+\*$/.test(v) ? parseInt(v) + 1 : 2;
}
var ON = { cast: "play", etb: "play", atk: "strike", dies: "guard" };
function actOf(e, on, rc) {
  const n = typeof e[1] === "number" ? e[1] : 1, onlySpirit = rc.elements.length === 1 && rc.elements[0] === "Spirit";
  switch (e[0]) {
    case "draw":
      return { k: "draw", n, on };
    case "life":
      return { k: "heal", n: 2 * n, on };
    case "kill":
      return onlySpirit ? { k: "haunt", n: 2, on } : { k: "dodge", n: 1, on };
    case "bounce":
      return { k: "dodge", n: 1, on };
    case "pump":
      return { k: "pump", n: 2 * n, on };
    case "token":
      return rc.elements.includes("Air") ? { k: "gust", n, on } : { k: "ally", n, on };
    case "counter":
      return { k: "growth", n: 2 * n, on, target: rc.isCreature ? "self" : "hand" };
    case "counterall":
      return { k: "rally", n: 2 * n, on };
    case "anthem":
      return { k: "rally", n: 2, on };
    case "dmg":
      return { k: "burn", n, on };
    case "tap":
      return { k: "delay", n: 1, on };
    case "discard":
      return { k: "haunt", n: 2, on };
    case "wrath":
      return { k: "hit", n: 12, on };
    case "sweep":
      return { k: "hit", n: 3 + 3 * n, on };
    case "fight":
      return { k: "hit", n: 8, on };
    case "drain":
      return { k: "hit", n: 2 * n, on, drain: 0.5 };
    case "ramp":
      return { k: "energy", n: 1, on };
    case "earth":
      return { k: "block", n: 3 + 2 * n, on, stone: true };
    default:
      return null;
  }
}
var VALUE_ACTS = /* @__PURE__ */ new Set(["hit", "block", "burn", "gust", "ally", "haunt", "dodge", "heal", "draw", "delay", "energy", "rally", "pump", "growth"]);
var has = (rc, k) => rc.acts.some((a) => a.k === k);
function tagFor(el, rc) {
  const kw = rc.keywords;
  switch (el) {
    case "Water":
      return has(rc, "draw") || rc.isLesson ? "study" : has(rc, "delay") || has(rc, "dodge") ? "ebb" : "tide";
    case "Earth":
      return rc.acts.some((a) => a.k === "block" && a.stone) || kw.defender || kw.reach ? "stone" : has(rc, "growth") || has(rc, "rally") ? "growth" : has(rc, "energy") || rc.rank >= 5 ? "ramp" : rc.toughness >= rc.power ? "stone" : "growth";
    case "Fire":
      return has(rc, "burn") ? "burn" : kw.firebending || kw.prowess ? "blaze" : "inner";
    case "Air":
      return has(rc, "gust") ? "gust" : kw.flying || has(rc, "dodge") ? "evasion" : "team";
    case "Spirit":
      return has(rc, "heal") || kw.lifelink || rc.acts.some((a) => a.drain) ? "drain" : has(rc, "haunt") ? "haunt" : "bargain";
    default:
      return "any";
  }
}
function powerFxFor(rc) {
  const el = rc.elements[0], t = rc.tags[0], r = rc.rank;
  switch (el) {
    case "Water":
      return t === "study" ? { k: "draw", n: 1 } : { k: "block", n: 2 + r };
    case "Earth":
      return t === "ramp" && r >= 4 ? { k: "energy", n: 1 } : t === "growth" ? { k: "growth", n: 1 } : { k: "block", n: 3 + r, stone: true };
    case "Fire":
      return t === "blaze" ? { k: "flow", n: 1 } : { k: "burn", n: 1 + Math.floor(r / 2) };
    case "Air":
      return { k: "gust", n: 1 };
    case "Spirit":
      return t === "drain" ? { k: "drainAll", n: 10 } : t === "haunt" ? { k: "haunt", n: 1 } : { k: "heal", n: 2 };
    default:
      return { k: "flow", n: 1 };
  }
}
function fallbackAct(rc) {
  const r = rc.rank;
  switch (rc.elements[0]) {
    case "Water":
      return { k: "block", n: 3 + 2 * r, on: "play" };
    case "Earth":
      return { k: "block", n: 3 + 2 * r, on: "play", stone: true };
    case "Fire":
      return { k: "burn", n: 1 + r, on: "play" };
    case "Air":
      return { k: "gust", n: 1, on: "play" };
    case "Spirit":
      return { k: "haunt", n: 2, on: "play" };
    default:
      return { k: "block", n: 4 + r, on: "play" };
  }
}
var UID = 0;
export function toRunCard(card, opts = {}) {
  const type = card.type || "", isCreature = /Creature/.test(type);
  const [p, t] = card.pt ? card.pt.split("/") : ["0", "0"];
  const keywords = {};
  (card.kw || []).forEach((k) => {
    const fb = k.match(/^Firebending (\d+)/);
    if (fb) keywords.firebending = +fb[1];
    else if (k === "Firebending") keywords.firebending = 1;
    else if (KW[k]) keywords[KW[k]] = true;
  });
  const cols = (card.col || "").split("").filter((x) => ELEM[x]);
  const rank = manaValue(card.cost), power = isCreature ? ptVal(p) : 0, toughness = isCreature ? ptVal(t) : 0;
  const rc = {
    uid: opts.uid || "c" + ++UID,
    key: card.set + ":" + card.num,
    name: card.name,
    elements: cols.length ? "WUBRG".split("").filter((x) => cols.includes(x)).map((x) => ELEM[x]) : ["Neutral"],
    rank,
    energy: energyOf(rank),
    role: isCreature ? "creature" : /Instant/.test(type) ? "instant" : /Sorcery/.test(type) ? "sorcery" : "power",
    power,
    toughness,
    isCreature,
    isAlly: isCreature && /\bAlly\b/.test(type),
    isLegendary: /Legendary/.test(type),
    isLesson: /Lesson/.test(type),
    keywords,
    acts: [],
    powerFx: null,
    tags: [],
    stars: opts.stars ?? 1,
    upgraded: false,
    growth: 0,
    hpCost: 0,
    token: false,
    baseStrike: 0,
    baseGuard: 0
  };
  for (const [k, list] of Object.entries(card.fx || {})) for (const e of list) {
    const a = actOf(e, ON[k] || "play", rc);
    if (a) rc.acts.push(a);
  }
  if (isCreature) {
    rc.baseStrike = keywords.defender ? 0 : 3 + 2 * power;
    rc.baseGuard = (3 + 2 * toughness + (keywords.reach ? 3 : 0)) * (keywords.defender ? 2 : 1);
  }
  if (!isCreature && rc.role !== "power" && !rc.acts.some((a) => VALUE_ACTS.has(a.k))) rc.acts.push(fallbackAct(rc));
  rc.tags = [...new Set(rc.elements.map((el) => tagFor(el, rc)))];
  if (rc.role === "power") rc.powerFx = powerFxFor(rc);
  const ov = OVERRIDES[card.name];
  if (ov) Object.assign(rc, structuredClone(ov), { keywords: { ...rc.keywords, ...ov.keywords || {} } });
  applyTagMechanics(rc);
  if (opts.upgraded) upgradeCard(rc);
  return rc;
}
function applyTagMechanics(rc) {
  if (rc.isCreature && rc.elements.includes("Earth") && rc.tags.includes("stone")) rc.keywords.stone = true;
  const solo = rc.elements.length === 1;
  if (solo && (rc.elements[0] === "Fire" && rc.tags.includes("inner") || rc.elements[0] === "Spirit" && rc.tags.includes("bargain")) && rc.hpCost === 0) {
    rc.hpCost = 2 + 2 * energyOf(rc.rank);
    rc.energy = 0;
  }
}
var scale = (rc) => (1 + STAR_BONUS * (Math.max(1, rc.stars) - 1)) * (rc.upgraded ? 1 + UPGRADE_BONUS : 1);
export function strikeValue(rc) {
  return rc.baseStrike > 0 ? Math.floor(rc.baseStrike * scale(rc)) + (rc.growth || 0) : 0;
}
export function guardValue(rc) {
  return rc.baseGuard > 0 ? Math.floor(rc.baseGuard * scale(rc)) + (rc.growth || 0) : 0;
}
export function actValue(rc, a) {
  return ["draw", "dodge", "delay", "energy", "gust", "ally", "flow"].includes(a.k) ? a.n : Math.floor(a.n * scale(rc));
}
export function upgradeCard(rc) {
  if (rc.upgraded) return false;
  rc.upgraded = true;
  if (!rc.baseStrike && !rc.baseGuard && rc.energy > 0 && rc.acts.every((a) => ["draw", "dodge", "delay", "energy", "gust", "flow"].includes(a.k))) rc.energy--;
  return true;
}
var BASIC = {
  strike: { name: "Strike", baseStrike: 6, baseGuard: 0 },
  defend: { name: "Defend", baseStrike: 0, baseGuard: 5 }
};
export function basicCard(kind, uid) {
  const b = BASIC[kind];
  return {
    uid: uid || "c" + ++UID,
    key: "BASIC:" + kind,
    name: b.name,
    elements: ["Neutral"],
    rank: 1,
    energy: 1,
    role: "basic",
    power: 0,
    toughness: 0,
    isCreature: false,
    isAlly: false,
    isLegendary: false,
    isLesson: false,
    keywords: {},
    acts: [],
    powerFx: null,
    tags: ["any"],
    stars: 1,
    upgraded: false,
    growth: 0,
    hpCost: 0,
    token: false,
    baseStrike: b.baseStrike,
    baseGuard: b.baseGuard
  };
}
export function tokenCard(kind, element, uid) {
  const base = {
    uid: uid || "t" + ++UID,
    rank: 0,
    energy: 0,
    role: "token",
    token: true,
    isLegendary: false,
    isLesson: false,
    powerFx: null,
    stars: 1,
    upgraded: false,
    growth: 0,
    hpCost: 0
  };
  if (kind === "gust") return {
    ...base,
    key: "TOKEN:gust",
    name: "Gust",
    elements: ["Air"],
    power: 0,
    toughness: 0,
    isCreature: false,
    isAlly: false,
    keywords: { exhaust: true },
    acts: [{ k: "flow", n: 1, on: "play" }],
    tags: ["gust"],
    baseStrike: 2,
    baseGuard: 0
  };
  return {
    ...base,
    key: "TOKEN:ally",
    name: element + " Ally",
    elements: [element],
    power: 1,
    toughness: 1,
    isCreature: true,
    isAlly: true,
    keywords: { exhaust: true },
    acts: [],
    tags: ["team"],
    baseStrike: 4,
    baseGuard: 4
  };
}
var ACT_TEXT = {
  draw: (n) => `Draw ${n}`,
  heal: (n) => `Heal ${n}`,
  dodge: (n) => `Dodge ${n}`,
  haunt: (n) => `Haunt ${n}`,
  pump: (n) => `Next Strike +${n}`,
  gust: (n) => n > 1 ? `Add ${n} Gusts` : "Add a Gust",
  ally: (n) => n > 1 ? `Add ${n} Allies` : "Add an Ally",
  growth: (n, a) => a.target === "hand" ? `Growth ${n} to a creature in hand` : `Growth ${n}`,
  rally: (n) => `Cards in hand +${n} this turn`,
  burn: (n) => `Burn ${n}`,
  delay: () => "Delay",
  hit: (n, a) => `Deal ${n}${a.drain ? ", Drain 50%" : ""}`,
  energy: (n) => `+${n} energy next turn`,
  block: (n, a) => `${a.stone ? "Stone " : ""}Block ${n}`,
  flow: (n) => `+${n} Flow`
};
var ON_TEXT = { play: "", strike: "On Strike: ", guard: "On Guard: " };
var POWER_TEXT = {
  draw: (n) => `Draw ${n} more`,
  block: (n, f) => `gain ${f.stone ? "Stone " : ""}Block ${n}`,
  energy: (n) => `+${n} energy`,
  growth: (n) => `Growth ${n} to a creature in hand`,
  flow: (n) => `your first card +${n} Flow`,
  burn: (n) => `Burn ${n}`,
  gust: () => "add a Gust",
  drainAll: (n) => `your Strikes Drain ${n}%`,
  haunt: (n) => `Haunt ${n}`,
  heal: (n) => `heal ${n}`
};
var KW_TEXT = {
  flying: "Flying",
  vigilance: "Vigilance",
  lifelink: "Lifelink",
  trample: "Trample",
  deathtouch: "Execute",
  prowess: "Prowess",
  flash: "Flash",
  menace: "Menace",
  haste: "Haste",
  reach: "Reach",
  firstStrike: "First strike",
  doubleStrike: "Double strike",
  defender: "Defender",
  stone: "Stone",
  retain: "Retain",
  exhaust: "Exhaust"
};
export function actLines(rc) {
  const lines = rc.acts.map((a) => ON_TEXT[a.on || "play"] + ACT_TEXT[a.k](actValue(rc, a), a));
  if (rc.powerFx) lines.push("Power: each turn, " + POWER_TEXT[rc.powerFx.k](rc.powerFx.n, rc.powerFx));
  if (rc.keywords.firebending) lines.push(`Firebending ${rc.keywords.firebending}`);
  if (rc.hpCost) lines.push(`Costs ${rc.hpCost} HP`);
  return lines;
}
export function keywordNames(rc) {
  return Object.keys(KW_TEXT).filter((k) => rc.keywords[k]).map((k) => KW_TEXT[k]);
}
