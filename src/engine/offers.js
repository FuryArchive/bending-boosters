import { cardByName, keyOf } from "./catalog.js";
import { nationPool, spiritPool } from "./pools.js";
import { JOKERS, TIERS } from "../data/jokers.js";

var JOKER_ODDS = { 1: [60, 30, 9, 1], 2: [40, 35, 20, 5], 3: [25, 35, 28, 12] };
var CARD_ODDS = { 1: [60, 28, 10, 2], 2: [45, 33, 17, 5], 3: [35, 35, 22, 8] };
var CARD_RARITIES = ["C", "U", "R", "M"];
var LEGEND_CARD_W = { C: 3, U: 3, R: 2, M: 1 };
var weighted = (items, wOf, rng) => {
  const tot = items.reduce((s, x) => s + wOf(x), 0);
  if (!tot) return null;
  let r = rng.next() * tot;
  for (const x of items) {
    if ((r -= wOf(x)) < 0) return x;
  }
  return items[items.length - 1];
};
function legendOwned(j, ownedKeys) {
  if (j.kind !== "legend") return true;
  const c = cardByName(j.cardName);
  return !!c && ownedKeys.includes(keyOf(c));
}
export function eligible(run, source, exclude) {
  const held = /* @__PURE__ */ new Set([...(run.jokers || []).map((j) => j.id), ...exclude]);
  return JOKERS.filter((j) => !held.has(j.id) && legendOwned(j, run.ownedKeys || []) && !(j.xmult && run.book <= 1) && !(source !== "shop" && j.tier === "common"));
}
function pickOne(run, source, rng, exclude, legendOnly) {
  let pool = eligible(run, source, exclude);
  if (legendOnly) pool = pool.filter((j) => j.kind === "legend");
  if (!pool.length) return null;
  const odds = JOKER_ODDS[Math.min(3, Math.max(1, run.book))];
  const tiers = TIERS.map((t, i) => ({ t, w: source !== "shop" && t === "common" ? 0 : odds[i] }));
  let tier = weighted(tiers, (x) => x.w, rng).t;
  const order = [TIERS.indexOf(tier)];
  for (let d = 1; d < 4; d++) order.push(TIERS.indexOf(tier) - d, TIERS.indexOf(tier) + d);
  for (const ti of order) {
    const inT = pool.filter((j) => j.tier === TIERS[ti]);
    if (inT.length) return weighted(inT, (j) => j.kind === "legend" ? LEGEND_CARD_W[cardByName(j.cardName)?.r] || 1 : 3, rng);
  }
  return null;
}
export function jokerOffers(run, source, rng) {
  const n = source === "shop" ? 2 : 3, out = [];
  for (let i = 0; i < n; i++) {
    const j = pickOne(run, source, rng, out.map((x) => x.id));
    if (j) out.push(j);
  }
  if (source !== "shop" && out.length && !out.some((j) => j.kind === "legend")) {
    const l = pickOne(run, source, rng, out.map((x) => x.id), true);
    if (l) out[out.length - 1] = l;
  }
  return out;
}
export function startCharms(rng) {
  return rng.shuffle(JOKERS.filter((j) => j.kind === "charm" && j.tier === "common").slice()).slice(0, 3);
}
var OFF_ELEMENT = 0.1;
export function cardOffers(run, n, rng) {
  const owned = new Set(run.ownedKeys || []), stars = run.ownedStars || {};
  const allowed = (c) => c.r === "C" || owned.has(keyOf(c));
  const home = nationPool(run.nation || "water").filter(allowed), homeKeys = new Set(home.map(keyOf));
  const away = spiritPool().filter((c) => allowed(c) && !homeKeys.has(keyOf(c)));
  const w = (c) => 1 + 0.25 * (Math.max(1, stars[keyOf(c)] || 1) - 1);
  const odds = CARD_ODDS[Math.min(3, Math.max(1, run.book))], out = [], taken = /* @__PURE__ */ new Set();
  for (let i = 0; i < n; i++) {
    const src = rng.next() < OFF_ELEMENT && away.length ? away : home;
    const ri = CARD_RARITIES.indexOf(weighted(CARD_RARITIES, (r) => odds[CARD_RARITIES.indexOf(r)], rng));
    let pick = null;
    for (let k = ri; k >= 0 && !pick; k--) {
      const p = src.filter((c) => c.r === CARD_RARITIES[k] && !taken.has(keyOf(c)));
      if (p.length) pick = weighted(p, w, rng);
    }
    if (!pick) {
      const p = [...home, ...away].filter((c) => !taken.has(keyOf(c)));
      if (p.length) pick = weighted(p, w, rng);
    }
    if (pick) {
      out.push(pick);
      taken.add(keyOf(pick));
    }
  }
  return out;
}
