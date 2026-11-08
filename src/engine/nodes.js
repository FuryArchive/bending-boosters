import { toRunCard, upgradeCard } from "./cards.js";
import { cardByKey, catalog, isRunCard, keyOf } from "./catalog.js";
import { withRng } from "./rng.js";
import { jokerById } from "../data/jokers.js";
import { cardOffers, jokerOffers } from "./offers.js";
import { runSets } from "./pools.js";
import { OFFERINGS, OFFERING_SLOTS, itemById } from "../data/items.js";
import { eventById, eventJokerPool } from "./event-kit.js";
import { themeOf } from "./themes.js";

var REMOVAL_BASE = 75;
var REMOVAL_STEP = 25;
var REROLL_BASE = 12;
var REROLL_STEP = 4;
var INTEREST_CAP = 5;
var REST_HEAL = 0.3;
export var MIN_DECK = 3;
var ELITE_MAX_HP = 5;
var BOSS_MAX_HP = 10;
var UPGRADE_PRICE = 50;
var PACK_PRICES = { pack: 20, premium: 35 };
var PACK_SIZE = { pack: 3, premium: 5 };
var fail = (reason) => ({ ok: false, reason });
var OK = { ok: true };
var MAX_JOKERS = 5;
var addCard = (run, card) => {
  run.nextUid = (run.nextUid || run.deck.length) + 1;
  const rc = toRunCard(card, { uid: "d" + run.nextUid });
  run.deck.push(rc);
  return rc;
};
export function makeReward(run, kind, gold, rng) {
  let maxHpUp = 0;
  if (kind === "elite" || kind === "boss") {
    maxHpUp = kind === "elite" ? ELITE_MAX_HP : BOSS_MAX_HP;
    run.maxHp += maxHpUp;
    run.hp += maxHpUp;
  }
  return {
    kind: "reward",
    gold,
    maxHpUp,
    cards: cardOffers(run, 3, rng).map(keyOf),
    cardTaken: false,
    jokers: kind === "elite" || kind === "boss" ? jokerOffers(run, kind, rng).map((j) => j.id) : null,
    jokerTaken: false
  };
}
export function takeCard(run, i) {
  const p = run.pending;
  if (!p || !p.cards || p.cardTaken) throw new Error("no card pick");
  if (i !== null && i !== void 0) addCard(run, cardByKey(p.cards[i]));
  p.cardTaken = true;
  if (p.kind === "pack" || p.back && p.jokerTaken) run.pending = p.back;
}
function gainJoker(run, id) {
  if (run.jokers.length >= MAX_JOKERS) {
    run.pending = { kind: "swap", incoming: id, back: run.pending };
    return false;
  }
  run.jokers.push({ id, stars: 1 });
  return true;
}
export function takeJoker(run, i) {
  const p = run.pending;
  if (!p || !p.jokers || p.jokerTaken) throw new Error("no joker pick");
  p.jokerTaken = true;
  const back = p.back && p.cardTaken ? p.back : null;
  if (back) run.pending = back;
  if (i !== null && i !== void 0) gainJoker(run, p.jokers[i]);
}
export function resolveSwap(run, i) {
  const p = run.pending;
  if (!p || p.kind !== "swap") throw new Error("no swap");
  if (i !== null && i !== void 0) run.jokers[i] = { id: p.incoming, stars: 1 };
  run.pending = p.back;
}
function shopItems(rng) {
  const pool = [...OFFERINGS];
  return rng.shuffle(pool.slice()).slice(0, 2).map((it) => ({ id: it.id, price: it.price, sold: false }));
}
function shopJokers(run, rng) {
  return jokerOffers(run, "shop", rng).map((j) => ({ id: j.id, price: j.price, sold: false }));
}
function openShop(run, rng) {
  const interest = Math.min(INTEREST_CAP, Math.floor(run.gold / 10));
  run.gold += interest;
  return {
    kind: "shop",
    interest,
    jokers: shopJokers(run, rng),
    items: shopItems(rng),
    packs: [{ kind: "pack", price: PACK_PRICES.pack, sold: false }, { kind: "premium", price: PACK_PRICES.premium, sold: false }],
    removalPrice: REMOVAL_BASE + REMOVAL_STEP * run.removals,
    rerollPrice: REROLL_BASE + REROLL_STEP * run.rerolls,
    upgradePrice: UPGRADE_PRICE
  };
}
var shop = (run) => {
  if (!run.pending || run.pending.kind !== "shop") throw new Error("not in a shop");
  return run.pending;
};
export function buy(run, kind, i) {
  const p = shop(run), list = kind === "joker" ? p.jokers : kind === "item" ? p.items : kind === "pack" ? p.packs : null;
  const slot = list && list[i];
  if (!slot) return fail("Nothing there");
  if (slot.sold) return fail("Sold out");
  if (run.gold < slot.price) return fail(`Not enough gold (${slot.price} needed)`);
  if (kind === "item") {
    const it = itemById(slot.id);
    if (run.offerings.length >= OFFERING_SLOTS) return fail("Offering slots are full");
    run.offerings.push(it.id);
  }
  run.gold -= slot.price;
  slot.sold = true;
  if (kind === "joker") gainJoker(run, slot.id);
  if (kind === "pack") withRng(run, (rng) => {
    run.pending = { kind: "pack", cards: cardOffers(run, PACK_SIZE[slot.kind], rng).map(keyOf), cardTaken: false, back: p };
  });
  return OK;
}
export function removeCard(run, deckIdx) {
  const p = shop(run);
  if (run.deck.length <= MIN_DECK) return fail(`Your deck can't go below ${MIN_DECK} cards`);
  if (run.gold < p.removalPrice) return fail(`Not enough gold (${p.removalPrice} needed)`);
  if (!run.deck[deckIdx]) return fail("No such card");
  run.gold -= p.removalPrice;
  run.deck.splice(deckIdx, 1);
  run.removals++;
  p.removalPrice = REMOVAL_BASE + REMOVAL_STEP * run.removals;
  return OK;
}
export function buyUpgrade(run, deckIdx) {
  const p = shop(run), c = run.deck[deckIdx];
  if (!c) return fail("No such card");
  if (c.upgraded) return fail("Already upgraded");
  if (run.gold < p.upgradePrice) return fail(`Not enough gold (${p.upgradePrice} needed)`);
  run.gold -= p.upgradePrice;
  upgradeCard(c);
  return OK;
}
export function reroll(run) {
  const p = shop(run);
  if (run.gold < p.rerollPrice) return fail(`Not enough gold (${p.rerollPrice} needed)`);
  run.gold -= p.rerollPrice;
  run.rerolls++;
  withRng(run, (rng) => {
    p.jokers = shopJokers(run, rng);
    p.items = shopItems(rng);
  });
  p.rerollPrice = REROLL_BASE + REROLL_STEP * run.rerolls;
  return OK;
}
export function sellJoker(run, i) {
  const j = run.jokers[i];
  if (!j) return fail("No such Joker");
  run.jokers.splice(i, 1);
  run.gold += Math.floor(jokerById(j.id).price / 2);
  return OK;
}
var restChoices = () => ["heal", "upgrade", "train"];
export function rest(run, choice, arg) {
  const p = run.pending;
  if (!p || p.kind !== "rest") throw new Error("not at a rest site");
  if (p.done) return fail("You already rested here");
  if (choice === "heal") run.hp = Math.min(run.maxHp, run.hp + Math.floor(run.maxHp * REST_HEAL));
  else if (choice === "train") {
    const c = run.deck[arg];
    if (!c) return fail("Pick a card");
    if (c.stars >= 5) return fail("Already 5\u2605");
    c.stars++;
  } else if (choice === "upgrade") {
    const c = run.deck[arg];
    if (!c) return fail("Pick a card");
    if (c.upgraded) return fail("Already upgraded");
    upgradeCard(c);
  } else return fail("Unknown choice");
  p.done = choice;
  return OK;
}
var randomOfferings = (rng, n) => Array.from({ length: n }, () => rng.pick(OFFERINGS).id);
var H = {
  joker: (id) => jokerById(id),
  isLegend: (id) => jokerById(id)?.kind === "legend",
  addOfferings(run, rng, n) {
    let got = 0;
    for (const id of randomOfferings(rng, n)) if (run.offerings.length < OFFERING_SLOTS) {
      run.offerings.push(id);
      got++;
    }
    return got;
  },
  jokerPick(run, rng, minTier) {
    const pool = eventJokerPool(run, minTier);
    if (!pool.length) return false;
    const ids = rng.shuffle(pool).slice(0, 3).map((j) => j.id);
    run.pending = { kind: "reward", gold: 0, cards: null, cardTaken: true, jokers: ids, jokerTaken: false, back: run.pending };
    return true;
  },
  cardPick(run, rng, n) {
    run.pending = { kind: "reward", gold: 0, cards: cardOffers(run, n, rng).map(keyOf), cardTaken: false, jokers: null, jokerTaken: true, back: run.pending };
  },
  randomCard(run, rng, rarity) {
    const owned = new Set(run.ownedKeys), sets = runSets(run);
    let pool = catalog().filter((c2) => isRunCard(c2) && sets.includes(c2.set) && c2.r === rarity && owned.has(keyOf(c2)));
    if (!pool.length) pool = catalog().filter((c2) => isRunCard(c2) && sets.includes(c2.set) && c2.r === rarity);
    if (!pool.length) return null;
    const c = rng.pick(pool);
    addCard(run, c);
    return c;
  },
  select(run, action, n) {
    run.pending = { kind: "select", action, n, back: run.pending };
  }
};
export function eventChoices(run) {
  const ev = eventById(run, run.pending.id);
  return ev.choices.map((c) => {
    const why = c.req ? c.req(run) : null;
    return { label: c.label, ok: !why, why };
  });
}
export function applyEvent(run, i) {
  const p = run.pending;
  if (!p || p.kind !== "event") throw new Error("no event");
  if (p.result) throw new Error("already chosen");
  const c = eventById(run, p.id).choices[i];
  if (!c) throw new Error("no such choice");
  const why = c.req ? c.req(run) : null;
  if (why) throw new Error(why);
  const text = withRng(run, (rng) => c.apply(run, rng, H));
  p.result = text;
  run.hp = Math.max(1, Math.min(run.maxHp, run.hp));
  run.gold = Math.max(0, run.gold);
  return text;
}
export function resolveSelect(run, arg) {
  const p = run.pending;
  if (!p || p.kind !== "select") throw new Error("nothing to select");
  const idx = Array.isArray(arg) ? [...new Set(arg)].filter((i) => run.deck[i]).slice(0, p.n) : [];
  if (p.action === "train") idx.forEach((i) => {
    run.deck[i].stars = Math.min(5, run.deck[i].stars + 1);
  });
  else if (p.action === "remove") {
    const keep = Math.max(0, run.deck.length - MIN_DECK);
    idx.sort((a, b) => b - a).slice(0, keep).forEach((i) => run.deck.splice(i, 1));
  } else if (p.action === "upgrade") idx.forEach((i) => upgradeCard(run.deck[i]));
  run.pending = p.back;
}
export function useOffering(run, slot, arg = {}) {
  const id = run.offerings[slot];
  if (!id) return fail("No Offering there");
  if (run.status === "won" || run.status === "lost") return fail("The run is over");
  if (run.fight) run.hp = run.fight.player.hp;
  const cards = (arg.cards || []).filter((i) => run.deck[i]);
  if (run.fight && id !== "mend" && id !== "focus") return fail("Use this outside a fight");
  switch (id) {
    case "mend":
      run.hp = Math.min(run.maxHp, run.hp + 12);
      if (run.fight) run.fight.player.hp = run.hp;
      break;
    case "purify":
      if (!cards.length) return fail("Pick a card");
      if (run.deck.length <= MIN_DECK) return fail(`Your deck can't go below ${MIN_DECK} cards`);
      run.deck.splice(cards[0], 1);
      break;
    case "tide_turn":
      if (!cards.length || !arg.element) return fail("Pick cards and an element");
      cards.slice(0, 3).forEach((i) => {
        run.deck[i].elements = [arg.element];
      });
      break;
    case "focus":
      if (!cards.length) return fail("Pick a card");
      run.deck[cards[0]].stars = Math.min(5, run.deck[cards[0]].stars + 1);
      break;
  }
  run.offerings.splice(slot, 1);
  return OK;
}
export function openNode(run, node, rng) {
  if (node.type === "shop") return openShop(run, rng);
  if (node.type === "rest") return { kind: "rest", choices: restChoices(), done: null };
  if (node.type === "treasure") {
    const off = rng.next() < 0.25 ? rng.pick(OFFERINGS).id : null;
    if (off && run.offerings.length < OFFERING_SLOTS) run.offerings.push(off);
    return { kind: "treasure", cards: cardOffers(run, 3, rng).map(keyOf), cardTaken: false, offering: off };
  }
  if (node.type === "event") {
    const seen = new Set(run.seenEvents || []);
    const all = Object.keys(themeOf(run).events);
    let ids = all.filter((id2) => !seen.has(id2));
    if (!ids.length) ids = all;
    const id = rng.pick(ids);
    run.seenEvents = [...seen, id];
    return { kind: "event", id, result: null };
  }
  return { kind: node.type };
}
