import { ECONOMY } from "../economy/config.js";

// Main save (localStorage "bendingBoosters.v1") versioning. Each step upgrades one version;
// load() runs them in order. Never drops data the player already has.
export var MAIN_SAVE_VERSION = 3;
export function freshMainFields() {
  return { freePacks: 0, freeOpened: 0, daily: { last: null, streak: 0 }, dailyIncome: 0, tips: {}, starterGiven: false };
}
export function migrateMain(state) {
  if (state.v === 2) {
    // Existing players already had their first launch: no starter gift.
    Object.assign(state, freshMainFields(), { starterGiven: true });
    state.settings = state.settings || {};
    state.settings.keepJourney = state.settings.keepJourney ?? ECONOMY.keepJourneyDefault;
    state.v = 3;
  }
  return state;
}
