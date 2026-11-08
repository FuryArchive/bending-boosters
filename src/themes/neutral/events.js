import { OFFERING_SLOTS } from "../../data/items.js";
import { eventJokerPool, needGold, needHp } from "../../engine/event-kit.js";

// The neutral theme's events. Their choices work like six of the Avatar events.
export var NEUTRAL_EVENTS = {
  n_peddler: {
    name: "Travelling Peddler",
    text: "A peddler with a creaking cart offers a bundle of curios.",
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
      { label: "Leave", apply: () => "The peddler rattles off down the road." }
    ]
  },
  n_ravine: {
    name: "The Ravine",
    text: "A rope ladder hangs into a deep ravine. Something glints at the bottom.",
    choices: [
      {
        label: "Climb down: lose 6 HP, find a rare-or-better Charm",
        req: (r) => needHp(6)(r) || (eventJokerPool(r, "rare").length ? null : "No eligible rare-or-better Charms available"),
        apply(r, rng, h) {
          if (!h.jokerPick(r, rng, "rare")) throw new Error("No eligible rare-or-better Charms available");
          r.hp -= 6;
          return "You scrape your hands on the way down, but find something valuable.";
        }
      },
      { label: "Take the long way round", apply: () => "Slow and steady." }
    ]
  },
  n_drill_yard: {
    name: "Drill Yard",
    text: "A veteran sergeant offers to drill your cards, if you can take the bruises.",
    choices: [
      { label: "Train two cards (+1★ each) for 10 HP", req: needHp(10), apply(r, rng, h) {
        r.hp -= 10;
        h.select(r, "train", 2);
        return "Choose two cards to train.";
      } },
      { label: "Leave", apply: () => "You salute and walk on." }
    ]
  },
  n_still_pool: {
    name: "Still Pool",
    text: "Your reflection in the water shows the road behind you.",
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
  n_shrine: {
    name: "Wayside Shrine",
    text: "A quiet shrine stands by the road, with a bowl for offerings.",
    choices: [
      { label: "Rest: heal 25%", apply(r) {
        const n = Math.floor(r.maxHp * 0.25);
        r.hp = Math.min(r.maxHp, r.hp + n);
        return `Healed ${n}.`;
      } },
      {
        label: "Buy a blessing: +1 max HP per 10 gold (up to 30 gold)",
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
  n_card_sharp: {
    name: "Card Sharp",
    text: "A street game: find the queen among three cards.",
    choices: [
      { label: "Bet 30 gold: 50% to win 70", req: needGold(30), apply(r, rng) {
        r.gold -= 30;
        if (rng.next() < 0.5) {
          r.gold += 70;
          return "You win 70 gold!";
        }
        return "The queen was under the other card.";
      } },
      { label: "Just watch", apply: () => "The cards blur. You keep your gold." }
    ]
  }
};
