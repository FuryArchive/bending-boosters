import { eligible } from "./offers.js";
import { themeById, themeIds, themeOf } from "./themes.js";

// Shared helpers for theme events, and the lookup that finds a run's event by id.
export var TIER_RANK = { common: 0, uncommon: 1, rare: 2, mythic: 3 };
export var eventJokerPool = (run, minTier) => eligible(run, "elite", []).filter((j) => TIER_RANK[j.tier] >= TIER_RANK[minTier]);
export var needGold = (n) => (r) => r.gold >= n ? null : `Needs ${n} gold`;
export var needHp = (n) => (r) => r.hp > n ? null : `Needs more than ${n} HP`;
// Shown for an event id that no theme in this build knows (a save from a newer build).
export var MISSING_EVENT = { name: "A quiet road", text: "Nothing happens here.", choices: [{ label: "Continue", apply: () => "You move on." }] };
var ownEvent = (t, id) => t && Object.prototype.hasOwnProperty.call(t.events, id) ? t.events[id] : null;
export function eventById(run, id) {
  const own = ownEvent(themeOf(run), id);
  if (own) return own;
  for (const t of themeIds()) {
    const ev = ownEvent(themeById(t), id);
    if (ev) return ev;
  }
  return MISSING_EVENT;
}
