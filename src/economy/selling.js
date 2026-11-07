import { starsFromCopies } from "../engine/cards.js";

// "Sell all extras": protection is per card name across all printings, because Journey
// stars count every copy of a name. Journey-eligible names keep `keepJourney` copies;
// everything else keeps `keep`. Cheapest copies are sold first.
var groupByCardName = (entries) => {
  const m = /* @__PURE__ */ new Map();
  for (const e of entries) {
    if (!m.has(e.name)) m.set(e.name, []);
    m.get(e.name).push(e);
  }
  return m;
};
var copiesOf = (group) => group.reduce((s, e) => s + e.reg + e.foil, 0);
export function planSellExtras(entries, { keep, keepJourney }) {
  const plan = [];
  for (const group of groupByCardName(entries).values()) {
    let sell = copiesOf(group) - (group.some((e) => e.journey) ? keepJourney : keep);
    if (sell <= 0) continue;
    const lots = [];
    for (const e of group) {
      if (e.reg) lots.push({ key: e.key, foil: false, n: e.reg, value: e.regValue });
      if (e.foil) lots.push({ key: e.key, foil: true, n: e.foil, value: e.foilValue });
    }
    lots.sort((a, b) => a.value - b.value || a.foil - b.foil || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
    for (const lot of lots) {
      if (sell <= 0) break;
      const n = Math.min(lot.n, sell);
      plan.push({ key: lot.key, foil: lot.foil, n });
      sell -= n;
    }
  }
  return plan;
}
export function starDrops(entries, plan) {
  const nameOf = new Map(entries.map((e) => [e.key, e.name]));
  const sold = /* @__PURE__ */ new Map();
  for (const p of plan) {
    const name = nameOf.get(p.key);
    sold.set(name, (sold.get(name) || 0) + p.n);
  }
  const drops = [];
  for (const [name, group] of groupByCardName(entries)) {
    if (!group.some((e) => e.journey) || !sold.has(name)) continue;
    const before = copiesOf(group);
    const from = starsFromCopies(before), to = starsFromCopies(before - sold.get(name));
    if (to < from) drops.push({ name, from, to });
  }
  return drops;
}
