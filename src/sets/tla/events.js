import { jokerById } from "../../data/jokers.js";
import { OFFERING_SLOTS } from "../../data/items.js";
import { TIER_RANK, eventJokerPool, needGold, needHp } from "../../engine/event-kit.js";

// The Avatar theme's events.
export var EVENTS = {
  library: {
    name: "Wan Shi Tong's Library",
    text: "The great owl spirit offers knowledge, for a price: something you treasure.",
    choices: [
      {
        label: "Give up your strongest Legend: upgrade 2 cards",
        req: (r) => r.jokers.some((j) => jokerById(j.id)?.kind === "legend") ? null : "Needs a Legend",
        apply(r, rng, h) {
          const legends = r.jokers.map((j, i) => ({ j, i, t: TIER_RANK[h.joker(j.id).tier] })).filter((x) => h.isLegend(x.j.id)).sort((a, b) => b.t - a.t);
          const lost = h.joker(r.jokers[legends[0].i].id).name;
          r.jokers.splice(legends[0].i, 1);
          h.select(r, "upgrade", 2);
          return `${lost} stays in the library. Choose two cards to upgrade.`;
        }
      },
      { label: "Leave quietly", apply: () => "You slip out before the owl notices." }
    ]
  },
  cabbage: {
    name: "Cabbage Merchant",
    text: '"My cabbages!" He is willing to part with a few curios instead.',
    choices: [
      {
        label: "Pay 20 gold for 2 Offerings",
        req: (r) => needGold(20)(r) || (OFFERING_SLOTS - r.offerings.length >= 2 ? null : "Needs 2 free Offering slots"),
        apply(r, rng, h) {
          h.addOfferings(r, rng, 2);
          r.gold -= 20;
          return "You got 2 Offerings.";
        }
      },
      { label: "Leave", apply: () => "The merchant waves goodbye to you and his cabbages." }
    ]
  },
  divide: {
    name: "The Great Divide",
    text: "A canyon guide offers a shortcut down the cliff face.",
    choices: [
      {
        label: "Climb down: lose 6 HP, find a rare-or-better Joker",
        req: (r) => needHp(6)(r) || (eventJokerPool(r, "rare").length ? null : "No eligible rare-or-better Jokers available"),
        apply(r, rng, h) {
          if (!h.jokerPick(r, rng, "rare")) throw new Error("No eligible rare-or-better Jokers available");
          r.hp -= 6;
          return "You scrape your hands on the way down, but find something valuable.";
        }
      },
      { label: "Take the safe path", apply: () => "Slow and steady." }
    ]
  },
  fortune: {
    name: "Fortune Teller",
    text: "Aunt Wu reads the clouds and offers you a gift.",
    choices: [
      { label: "Gain 40 gold", apply(r) {
        r.gold += 40;
        return 'Your fortune says: "Wealth."';
      } },
      { label: "Upgrade a card", apply(r, rng, h) {
        h.select(r, "upgrade", 1);
        return "Choose a card to upgrade.";
      } },
      {
        label: "Take 8 damage for a random rare card",
        req: needHp(8),
        apply(r, rng, h) {
          r.hp -= 8;
          const c = h.randomCard(r, rng, "R");
          return c ? `${c.name} joins your deck.` : "The clouds were silent.";
        }
      }
    ]
  },
  dojo: {
    name: "Kyoshi Warriors' Dojo",
    text: "Suki offers to drill your cards, if you can take the bruises.",
    choices: [
      { label: "Train two cards (+1\u2605 each) for 10 HP", req: needHp(10), apply(r, rng, h) {
        r.hp -= 10;
        h.select(r, "train", 2);
        return "Choose two cards to train.";
      } },
      { label: "Leave", apply: () => "You bow and leave." }
    ]
  },
  swamp: {
    name: "The Swamp",
    text: "Visions of the past rise from the water.",
    choices: [
      { label: "Let go: remove 2 cards", req: (r) => r.deck.length > 4 ? null : "Deck too small", apply(r, rng, h) {
        h.select(r, "remove", 2);
        return "Choose two cards to let go.";
      } },
      { label: "Remember: gain 1 card from your collection", apply(r, rng, h) {
        h.cardPick(r, rng, 3);
        return "Choose a card.";
      } }
    ]
  },
  jasmine: {
    name: "The Jasmine Dragon",
    text: "Uncle Iroh pours you a cup of tea.",
    choices: [
      { label: "Rest: heal 25%", apply(r) {
        const n = Math.floor(r.maxHp * 0.25);
        r.hp = Math.min(r.maxHp, r.hp + n);
        return `Healed ${n}.`;
      } },
      {
        label: "Buy ginseng: +1 max HP per 10 gold (up to 30 gold)",
        req: needGold(10),
        apply(r) {
          const spend = Math.min(30, Math.floor(r.gold / 10) * 10);
          r.gold -= spend;
          r.maxHp += spend / 10;
          r.hp += spend / 10;
          return `+${spend / 10} max HP.`;
        }
      }
    ]
  },
  oasis: {
    name: "Spirit Oasis",
    text: "The Moon and Ocean spirits circle in the pond.",
    choices: [
      { label: "Make an offering: double the next fight's gold", apply(r) {
        r.goldMult = 2;
        return "Your next fight pays double.";
      } },
      { label: "Meditate: upgrade a card", apply(r, rng, h) {
        h.select(r, "upgrade", 1);
        return "Choose a card to upgrade.";
      } }
    ]
  },
  fire_days: {
    name: "Fire Days Festival",
    text: "A street game: guess which cup hides the flame.",
    choices: [
      { label: "Bet 30 gold: 50% to win 70", req: needGold(30), apply(r, rng) {
        r.gold -= 30;
        if (rng.next() < 0.5) {
          r.gold += 70;
          return "You win 70 gold!";
        }
        return "The flame was under the other cup.";
      } },
      { label: "Just watch", apply: () => "The fireworks are nice, at least." }
    ]
  },
  tunnel: {
    name: "Secret Tunnel",
    text: "Two lovers, forbidden from each other... and a tunnel that cuts through the mountain.",
    choices: [
      { label: "Take the tunnel: skip the next floor", req: (r) => r.floor <= 12 ? null : "Too close to the boss", apply(r) {
        r.skip = 1;
        return "You come out two floors further on.";
      } },
      { label: "Stay on the road", apply: () => "Nothing happens." }
    ]
  }
};
export var EVENT_IDS = Object.keys(EVENTS);
