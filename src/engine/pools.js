import { basicCard, toRunCard } from "./cards.js";
import { catalog, isRunCard } from "./catalog.js";
import { COLOURS, cardColours, normColours } from "./colours.js";
import { isJourneySet, journeySets } from "./sets.js";

export var NATIONS = [
  { id: "water", name: "Water Tribe", element: "Water", col: "U" },
  { id: "earth", name: "Earth Kingdom", element: "Earth", col: "G" },
  { id: "fire", name: "Fire Nation", element: "Fire", col: "R" },
  { id: "air", name: "Air Nomads", element: "Air", col: "W" }
];
// Legacy nation ids, kept for runs saved before colours and for createRun({ nation }).
export var NATION_COLOUR = { water: "U", earth: "G", fire: "R", air: "W" };
// A run's colours and sets, resolved when read. A save from a newer build may name colours or
// sets this build doesn't know: they stay in the save, and the run plays with what is known.
export function runColours(run) {
  const c = normColours(run.colours);
  return c.length >= 1 && c.length <= 2 ? c : [NATION_COLOUR[run.nation] || "U"];
}
export function runSets(run) {
  const s = [...new Set(Array.isArray(run.sets) ? run.sets : [])].filter(isJourneySet);
  return s.length ? s : journeySets().map((x) => x.code);
}
var inSets = (c, sets) => isRunCard(c) && sets.includes(c.set);
// The run's own cards. A single (legacy) colour keeps the original rule: any card that has
// the colour. A pair takes cards whose colours all lie inside it. Colourless cards count.
export function colourPool(colours, sets) {
  if (colours.length === 1) return catalog().filter((c) => inSets(c, sets) && (!c.col || c.col.includes(colours[0])));
  return catalog().filter((c) => inSets(c, sets) && cardColours(c).every((x) => colours.includes(x)));
}
// The off-colour pool: black ("Spirit") for legacy runs, every other card of the sets for pairs.
export function offColourPool(colours, sets) {
  if (colours.length === 1) return catalog().filter((c) => inSets(c, sets) && (!c.col || c.col.includes("B")));
  const home = new Set(colourPool(colours, sets));
  return catalog().filter((c) => inSets(c, sets) && !home.has(c));
}
function signatureCommons(colour, sets) {
  const commons = catalog().filter((c) => inSets(c, sets) && c.r === "C" && c.col === colour).sort((a, b) => sets.indexOf(a.set) - sets.indexOf(b.set) || +a.num - +b.num);
  if (!commons.length) return [];
  const first = commons[0], tag0 = toRunCard(first).tags[0];
  const second = commons.find((c) => toRunCard(c).tags[0] !== tag0) || commons[1];
  return [first, second].filter(Boolean);
}
export function starterDeck(colours, sets) {
  let uid = 0;
  const u = () => "d" + ++uid;
  const deck = [
    ...Array.from({ length: 4 }, () => basicCard("strike", u())),
    ...Array.from({ length: 4 }, () => basicCard("defend", u()))
  ];
  for (const col of COLOURS.filter((c) => colours.includes(c))) for (const c of signatureCommons(col, sets)) deck.push(toRunCard(c, { uid: u() }));
  return deck;
}
