import { ECONOMY } from "../economy/config.js";
import { normColours } from "../engine/colours.js";
import { NATION_COLOUR } from "../engine/pools.js";
import { isJourneySet, journeySets, themeForSets } from "../engine/sets.js";

// Main save (localStorage "bendingBoosters.v1") versioning. The stored `v` stays 2 forever:
// the shipped Desktop build treats any other `v` as an ancient format and wipes the wallet,
// and players may still open that file in the same browser. Newer shapes are tracked in
// `schema` instead; each step upgrades one schema and never drops data the player has.
export var MAIN_SAVE_SCHEMA = 3;
export function freshMainFields() {
  return { schema: MAIN_SAVE_SCHEMA, freePacks: 0, freeOpened: 0, daily: { last: null, streak: 0 }, dailyIncome: 0, tips: {}, starterGiven: false };
}
export function migrateMain(state) {
  if ((state.schema || 2) < 3) {
    // Existing players already had their first launch: no starter gift.
    Object.assign(state, freshMainFields(), { starterGiven: true });
    state.settings = state.settings || {};
    state.settings.keepJourney = state.settings.keepJourney ?? ECONOMY.keepJourneyDefault;
  }
  return state;
}

// Journey save (localStorage "bb.run"). v2 runs had a `nation`; v3 runs have `colours`, `sets`
// and a `theme`. Single-colour runs keep `nation`, so older builds still play them correctly.
// Every v2 run was a TLA run under the Avatar theme. Unknown values are repaired, never dropped.
export var RUN_SAVE_VERSION = 3;
export function migrateRun(run) {
  const legacy = [NATION_COLOUR[run.nation] || "U"];
  if ((run.v || 1) < 3) {
    Object.assign(run, { v: RUN_SAVE_VERSION, colours: legacy, sets: ["TLA"], theme: "avatar" });
    return run;
  }
  const cols = normColours(run.colours);
  run.colours = cols.length >= 1 && cols.length <= 2 ? cols : legacy;
  const sets = [...new Set(Array.isArray(run.sets) ? run.sets : [])].filter(isJourneySet);
  run.sets = sets.length ? sets : journeySets().map((s) => s.code);
  if (!run.theme) run.theme = themeForSets(run.sets);
  return run;
}
