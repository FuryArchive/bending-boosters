var CARDS = [];
var BY_KEY = /* @__PURE__ */ new Map();
var BY_NAME = /* @__PURE__ */ new Map();
export var keyOf = (c) => c.set + ":" + c.num;
export function setCatalog(cards) {
  CARDS = cards;
  BY_KEY = new Map(cards.map((c) => [keyOf(c), c]));
  BY_NAME = /* @__PURE__ */ new Map();
  for (const c of cards) if (!BY_NAME.has(c.name)) BY_NAME.set(c.name, c);
}
export var catalog = () => CARDS;
export var cardByKey = (k) => BY_KEY.get(k) || null;
export var cardByName = (n) => BY_NAME.get(n) || null;
export var isRunCard = (c) => c.set === "TLA" && c.r !== "L" && !/Land/.test(c.type || "");
