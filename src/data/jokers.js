export var has2 = (c, e, x) => (x && x.els ? x.els : c.elements).includes(e);
var scaleBase = (j) => Math.floor((Math.max(1, j.stars || 1) - 1) / 2);
export function scalingValue(j, state) {
  const sc = j.scaling;
  if (!sc) return 0;
  return scaleBase(j) + sc.step * Math.floor((state[sc.key] || 0) / sc.every);
}
export function jokerProgress(j, state = {}) {
  if (!j.scaling) return null;
  return { value: scalingValue(j, state), progress: (state[j.scaling.key] || 0) % j.scaling.every, every: j.scaling.every };
}
export var grow = (j, state, by = 1) => {
  state[j.scaling.key] = (state[j.scaling.key] || 0) + by;
};
var isGust = (c) => c.key === "TOKEN:gust";
export var sv = (mode, v) => !v ? null : mode === "strike" ? { base: v } : mode === "guard" ? { guard: v } : null;
export var JOKERS = [
  // ---- Charms
  {
    id: "lone_wanderer",
    kind: "charm",
    tier: "common",
    price: 13,
    name: "Lone Wanderer",
    text: "If you play exactly 1 card in a turn, it strikes again at end of turn",
    onTurnEnd: (f) => f.chain.length === 1 ? { strikeAgain: 1, raw: true } : null
  },
  {
    id: "element_focus",
    kind: "charm",
    tier: "common",
    price: 12,
    name: "Element Focus",
    text: "Same-element chains give +1 more Flow",
    onChain: (c, m, ctx, f, x) => x.same ? { flow: 1 } : null
  },
  {
    id: "ally_banner",
    kind: "charm",
    tier: "common",
    price: 13,
    name: "Ally Banner",
    text: "Allies Strike +3",
    onCard: (c, m) => c.isAlly && m === "strike" ? { base: 3 } : null
  },
  {
    id: "big_hitter",
    kind: "charm",
    tier: "common",
    price: 13,
    name: "Big Hitter",
    text: "Cards of rank 4+ get +4 Strike and Guard",
    onCard: (c, m) => c.rank >= 4 ? sv(m, 4) : null
  },
  {
    id: "pai_sho_pro",
    kind: "charm",
    tier: "common",
    price: 14,
    name: "Pai Sho Pro",
    text: "Every card gets +2 Strike and Guard",
    onCard: (c, m) => sv(m, 2)
  },
  { id: "cabbage_cart", kind: "charm", tier: "common", price: 12, name: "Cabbage Cart", text: "+3 gold after each fight won", fightGold: 3 },
  { id: "tea_break", kind: "charm", tier: "common", price: 12, name: "Tea Break", text: "Heal 3 after each fight won", fightHeal: 3 },
  {
    id: "airstep",
    kind: "charm",
    tier: "uncommon",
    price: 18,
    name: "Airstep",
    text: "Gusts give +1 more Flow",
    onChain: (c) => isGust(c) ? { flow: 1 } : null
  },
  {
    id: "four_step",
    kind: "charm",
    tier: "uncommon",
    price: 19,
    name: "Flowing Path",
    text: "Paths give +2 Flow instead of +1",
    opts: (o) => {
      o.pathBonus = 2;
    }
  },
  {
    id: "stone_wall",
    kind: "charm",
    tier: "uncommon",
    price: 19,
    name: "Stone Wall",
    text: "Your first Guard each turn costs 0",
    costZero: (c, m, ctx) => m === "guard" && ctx.guards === 0 ? { zero: true } : null
  },
  {
    id: "lesson_scroll",
    kind: "charm",
    set: "TLA",
    tier: "uncommon",
    price: 18,
    name: "Lesson Scroll",
    text: "Lessons give +2 Flow",
    onChain: (c) => c.isLesson ? { flow: 2 } : null
  },
  {
    id: "two_elements",
    kind: "charm",
    tier: "uncommon",
    price: 19,
    name: "Two Elements",
    text: "Switching between two different elements gives +1 Flow",
    onChain: (c, m, ctx, f, x) => ctx.prev && !x.same && ctx.prev.el.some((e) => e !== "Neutral") && x.els.some((e) => e !== "Neutral") ? { flow: 1 } : null
  },
  {
    id: "glider_staff",
    kind: "charm",
    tier: "uncommon",
    price: 18,
    name: "Glider Staff",
    text: "Air Guards +4; Gusts also give 2 Block",
    onCard: (c, m, ctx, f, x) => isGust(c) ? { block: 2 } : m === "guard" && has2(c, "Air", x) ? { guard: 4 } : null
  },
  {
    id: "spirit_lens",
    kind: "charm",
    tier: "rare",
    price: 26,
    name: "Spirit Lens",
    text: "Spirit cards resolve at +3 Flow",
    onCard: (c, m, ctx, f, x) => has2(c, "Spirit", x) ? { flowNow: 3 } : null
  },
  {
    id: "wanderers_luck",
    kind: "charm",
    tier: "rare",
    price: 25,
    name: "Wanderer's Luck",
    text: "Your first card each turn +1 Flow per 12 Gusts played this run",
    scaling: { key: "wl", every: 12, step: 1 },
    onPlayed(c, m, res, f, { state }) {
      if (isGust(c)) grow(this, state);
    },
    onTurnStart(f, { state, j }) {
      const v = scalingValue(j, state);
      return v ? { flow: v, raw: true } : null;
    }
  },
  {
    id: "cosmic_fire",
    kind: "charm",
    tier: "mythic",
    price: 36,
    xmult: true,
    name: "Cosmic Fire",
    text: "At Flow 8+, Fire Strikes hit twice",
    onCard: (c, m, ctx, f, x) => m === "strike" && has2(c, "Fire", x) && ctx.flow >= 8 ? { hits: 1, raw: true } : null
  },
];
// Theme and set charms (Legends) join the list at startup; offers filter them per run.
export function registerCharms(list) {
  for (const j of list) {
    if (JOKERS.some((x) => x.id === j.id)) throw new Error("Charm already registered: " + j.id);
    JOKERS.push(j);
  }
}
export var jokerById = (id) => JOKERS.find((j) => j.id === id);
export var TIERS = ["common", "uncommon", "rare", "mythic"];
