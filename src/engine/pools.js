import { basicCard, toRunCard } from "./cards.js";
import { catalog, isRunCard } from "./catalog.js";

export var NATIONS = [
  { id: "water", name: "Water Tribe", element: "Water", col: "U" },
  { id: "earth", name: "Earth Kingdom", element: "Earth", col: "G" },
  { id: "fire", name: "Fire Nation", element: "Fire", col: "R" },
  { id: "air", name: "Air Nomads", element: "Air", col: "W" }
];
var nationById = (id) => NATIONS.find((n) => n.id === id) || NATIONS[0];
export function nationPool(id, col = nationById(id).col) {
  return catalog().filter((c) => isRunCard(c) && (!c.col || c.col.includes(col)));
}
export var spiritPool = () => nationPool(null, "B");
function signatureCommons(id) {
  const n = nationById(id);
  const commons = catalog().filter((c) => isRunCard(c) && c.r === "C" && c.col === n.col).sort((a, b) => +a.num - +b.num);
  const first = commons[0], tag0 = toRunCard(first).tags[0];
  const second = commons.find((c) => toRunCard(c).tags[0] !== tag0) || commons[1];
  return [first, second];
}
export function starterDeck(id) {
  let uid = 0;
  const u = () => "d" + ++uid;
  return [
    ...Array.from({ length: 4 }, () => basicCard("strike", u())),
    ...Array.from({ length: 4 }, () => basicCard("defend", u())),
    ...signatureCommons(id).map((c) => toRunCard(c, { uid: u() }))
  ];
}
