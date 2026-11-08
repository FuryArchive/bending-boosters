import { starsFromCopies } from "./cards.js";
import { isRunCard, keyOf } from "./catalog.js";

// What the collection unlocks for a run. A card is unlocked by owning a printing of it from
// its own set; its stars count copies of every printing with that name, in any set.
export function journeyOwnership({ cards, printings, copiesOf, sets }) {
  const bySetName = new Map(), byName = new Map();
  for (const p of printings) {
    const n = copiesOf(p) || 0;
    if (!n) continue;
    const sn = p.set + "\n" + p.name;
    bySetName.set(sn, (bySetName.get(sn) || 0) + n);
    byName.set(p.name, (byName.get(p.name) || 0) + n);
  }
  const ownedKeys = [], ownedStars = {};
  for (const c of cards) {
    if (!isRunCard(c) || !sets.includes(c.set)) continue;
    if (bySetName.get(c.set + "\n" + c.name)) ownedKeys.push(keyOf(c));
    const s = starsFromCopies(byName.get(c.name) || 0);
    if (s >= 2) ownedStars[keyOf(c)] = s;
  }
  return { ownedKeys, ownedStars };
}
// The run-setup set step: the Journey sets the player owns cards from (all of them when none).
export function setupSets({ journey, owned }) {
  const mine = journey.filter((code) => owned.includes(code));
  const choices = mine.length ? mine : journey.slice();
  return { choices, selected: choices.slice(), showStep: choices.length >= 2 };
}
