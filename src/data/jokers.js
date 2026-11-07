var has2 = (c, e, x) => (x && x.els ? x.els : c.elements).includes(e);
var scaleBase = (j) => Math.floor((Math.max(1, j.stars || 1) - 1) / 2);
function scalingValue(j, state) {
  const sc = j.scaling;
  if (!sc) return 0;
  return scaleBase(j) + sc.step * Math.floor((state[sc.key] || 0) / sc.every);
}
export function jokerProgress(j, state = {}) {
  if (!j.scaling) return null;
  return { value: scalingValue(j, state), progress: (state[j.scaling.key] || 0) % j.scaling.every, every: j.scaling.every };
}
var grow = (j, state, by = 1) => {
  state[j.scaling.key] = (state[j.scaling.key] || 0) + by;
};
var isGust = (c) => c.key === "TOKEN:gust";
var sv = (mode, v) => !v ? null : mode === "strike" ? { base: v } : mode === "guard" ? { guard: v } : null;
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
  // ---- Legends (card must be owned)
  {
    id: "momo",
    kind: "legend",
    tier: "common",
    price: 13,
    cardName: "Momo, Friendly Flier",
    name: "Momo, Friendly Flier",
    text: "At the start of each turn, add a Gust to your hand",
    onTurnStart: () => ({ gust: 1, raw: true })
  },
  {
    id: "the_boulder",
    kind: "legend",
    tier: "common",
    price: 14,
    cardName: "The Boulder, Ready to Rumble",
    name: "The Boulder, Ready to Rumble",
    text: "Creatures with power 4+ Strike +5",
    onCard: (c, m) => m === "strike" && c.isCreature && c.power >= 4 ? { base: 5 } : null
  },
  {
    id: "katara_prodigy",
    kind: "legend",
    tier: "uncommon",
    price: 20,
    cardName: "Katara, Bending Prodigy",
    name: "Katara, Bending Prodigy",
    text: "Tide gives +2 more Flow",
    onCard: (c, m, ctx, f, x) => ctx.tide && m === "strike" && has2(c, "Water", x) ? { flowNow: 2 } : null
  },
  {
    id: "iroh_tea",
    kind: "legend",
    tier: "uncommon",
    price: 19,
    cardName: "Iroh, Tea Master",
    name: "Iroh, Tea Master",
    text: "Your Burn effects apply +2 more Burn",
    onCard: (c) => c.acts.some((a) => a.k === "burn") ? { burn: 2 } : null
  },
  {
    id: "aang_last",
    kind: "legend",
    tier: "uncommon",
    price: 20,
    cardName: "Aang, the Last Airbender",
    name: "Aang, the Last Airbender",
    text: "Allies give +1 Flow",
    onChain: (c) => c.isAlly ? { flow: 1 } : null
  },
  {
    id: "suki_kyoshi",
    kind: "legend",
    tier: "uncommon",
    price: 19,
    cardName: "Suki, Kyoshi Warrior",
    name: "Suki, Kyoshi Warrior",
    text: "Allies Strike +2 per Ally played this turn",
    onCard: (c, m, ctx) => c.isAlly && m === "strike" && ctx.allies ? { base: 2 * ctx.allies } : null
  },
  {
    id: "appa",
    kind: "legend",
    tier: "uncommon",
    price: 19,
    cardName: "Appa, Steadfast Guardian",
    name: "Appa, Steadfast Guardian",
    text: "When you Dodge a hit, deal 8 damage back",
    onDodge: () => ({ dmg: 8 })
  },
  {
    id: "ty_lee",
    kind: "legend",
    tier: "uncommon",
    price: 19,
    cardName: "Ty Lee, Chi Blocker",
    name: "Ty Lee, Chi Blocker",
    text: "After a Guard, your next Strike resolves at +3 Flow",
    onCard: (c, m, ctx, f, x, { state }) => m === "strike" && state.tyArmed ? { flowNow: 3 } : null,
    onPlayed(c, m, res, f, { state }) {
      if (m === "guard") state.tyArmed = true;
      else if (m === "strike") state.tyArmed = false;
    }
  },
  {
    id: "jet",
    kind: "legend",
    tier: "uncommon",
    price: 18,
    cardName: "Jet, Freedom Fighter",
    name: "Jet, Freedom Fighter",
    text: "Your 4th and later cards each turn give +1 Flow",
    onChain: (c, m, ctx) => ctx.count >= 3 ? { flow: 1 } : null
  },
  {
    id: "sokka_boomer",
    kind: "legend",
    tier: "rare",
    price: 25,
    cardName: "Sokka, Bold Boomeranger",
    name: "Sokka, Bold Boomeranger",
    text: "Paths may skip one rank; Paths +1 Flow",
    opts: (o) => {
      o.pathSkip = true;
    },
    onChain: (c, m, ctx, f, x) => x.path ? { flow: 1 } : null
  },
  {
    id: "toph_metal",
    kind: "legend",
    tier: "rare",
    price: 28,
    cardName: "Toph, the First Metalbender",
    name: "Toph, the First Metalbender",
    text: "Strikes deal + half your current Block, after Flow",
    onCard: (c, m, ctx) => m === "strike" && ctx.block >= 2 ? { flat: Math.floor(ctx.block / 2) } : null
  },
  {
    id: "bumi_trials",
    kind: "legend",
    tier: "rare",
    price: 27,
    cardName: "Bumi, King of Three Trials",
    name: "Bumi, King of Three Trials",
    text: "Earth cards Strike and Guard +1 per 10 Earth cards played this run",
    scaling: { key: "bumi", every: 10, step: 1 },
    onPlayed(c, m, res, f, { state }) {
      if (c.elements.includes("Earth")) grow(this, state);
    },
    onCard(c, m, ctx, f, x, { state, j }) {
      if (!has2(c, "Earth", x)) return null;
      const v = scalingValue(j, state);
      const p = sv(m, v);
      return p && { ...p, raw: true };
    }
  },
  {
    id: "azula_cunning",
    kind: "legend",
    tier: "rare",
    price: 26,
    cardName: "Azula, Cunning Usurper",
    name: "Azula, Cunning Usurper",
    text: "Fire Strikes deal +2% per HP you're missing",
    onCard: (c, m, ctx, f, x) => m === "strike" && has2(c, "Fire", x) && ctx.hp < f.player.maxHp ? { xdmg: 1 + 0.02 * (f.player.maxHp - ctx.hp) } : null
  },
  {
    id: "yue",
    kind: "legend",
    tier: "rare",
    price: 24,
    cardName: "Yue, the Moon Spirit",
    name: "Yue, the Moon Spirit",
    text: "Water cards also count as Spirit; each Delay gives your Strikes +2 for this fight",
    opts: (o) => {
      o.alias = { ...o.alias || {}, Water: "Spirit" };
    },
    onPlayed(c, m, res, f) {
      if (res.delay) f.strikeBonus += 2 * res.delay;
    }
  },
  {
    id: "zuko_exile",
    kind: "legend",
    tier: "mythic",
    price: 38,
    xmult: true,
    cardName: "Zuko, Exiled Prince",
    name: "Zuko, Exiled Prince",
    text: "If you play exactly 1 card in a turn, it strikes 3 more times at end of turn",
    onTurnEnd: (f) => f.chain.length === 1 ? { strikeAgain: 3, raw: true } : null
  },
  {
    id: "avatar_aang",
    kind: "legend",
    tier: "mythic",
    price: 40,
    xmult: true,
    cardName: "Avatar Aang",
    name: "Avatar Aang",
    text: "Avatar State is \xD73 and can trigger twice per turn",
    opts: (o) => {
      o.avatarMult = 3;
      o.avatarTimes = 2;
    }
  }
];
export var jokerById = (id) => JOKERS.find((j) => j.id === id);
export var TIERS = ["common", "uncommon", "rare", "mythic"];
