import { ECONOMY } from "../economy/config.js";

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
