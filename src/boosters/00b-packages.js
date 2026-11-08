/* ================= Set packages ================= */
// Every card set the build ships, from src/sets/<code>/: set.json plus its cards and prices.
const PKG={}; SET_PACKAGES.forEach(p=>{ PKG[p.code]=p; });
const MAIN_SET=SET_PACKAGES[0].code; // the set the pack shop opens unless the player picks another
const PRICES={date:PKG[MAIN_SET].prices.date,m:Object.assign({},...SET_PACKAGES.map(p=>p.prices.m))};
// TLA's data under its older names, for the screens that don't read per-set data yet.
const DATA=PKG.TLA.cards, DECKS={arch:PKG.TLA.archetypes,std:PKG.TLA.decks};
