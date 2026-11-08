var OFFERING_PRICE = 12;
export var OFFERING_SLOTS = 2;
export var OFFERINGS = [
  { id: "mend", kind: "offering", name: "Healing Water", text: "Heal 12", price: OFFERING_PRICE, needs: null },
  { id: "purify", kind: "offering", name: "Purifying Flame", text: "Remove a card from your deck", price: OFFERING_PRICE, needs: { cards: 1 } },
  { id: "tide_turn", kind: "offering", name: "Tide Turn", text: "Convert up to 3 cards to one {element}", price: OFFERING_PRICE, needs: { cards: 3, element: true } },
  { id: "focus", kind: "offering", name: "Spirit Focus", text: "+1\u2605 to a card for this run", price: OFFERING_PRICE, needs: { cards: 1 } }
];
export var itemById = (id) => OFFERINGS.find((o) => o.id === id) || null;
