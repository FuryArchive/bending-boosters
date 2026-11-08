// The five MTG colours are the Journey's factions. The engine and saves name each colour by an
// element id ("Water" is blue); themes decide what the player sees.
export var COLOURS = ["W", "U", "B", "R", "G"];
export var COLOUR_ELEMENT = { W: "Air", U: "Water", B: "Spirit", R: "Fire", G: "Earth" };
export var ELEMENT_COLOUR = { Air: "W", Water: "U", Spirit: "B", Fire: "R", Earth: "G" };
export var PAIRS = ["WU", "WB", "WR", "WG", "UB", "UR", "UG", "BR", "BG", "RG"];
export function normColours(list) {
  const have = new Set(Array.isArray(list) ? list : []);
  return COLOURS.filter((c) => have.has(c));
}
export var pairId = (colours) => normColours(colours).join("");
export var cardColours = (card) => normColours((card.col || "").split(""));
