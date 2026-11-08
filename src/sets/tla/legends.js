import { grow, has2, scalingValue, sv } from "../../data/jokers.js";

// Legend charms: each needs its TLA card, and only Avatar-theme runs offer them.
export var AVATAR_LEGENDS = [
  {
    id: "momo",
    kind: "legend",
    theme: "avatar",
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
    theme: "avatar",
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
    theme: "avatar",
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
    theme: "avatar",
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
    theme: "avatar",
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
    theme: "avatar",
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
    theme: "avatar",
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
    theme: "avatar",
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
    theme: "avatar",
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
    theme: "avatar",
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
    theme: "avatar",
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
    theme: "avatar",
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
    theme: "avatar",
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
    theme: "avatar",
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
    theme: "avatar",
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
    theme: "avatar",
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
