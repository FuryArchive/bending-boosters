// Startup. Runs after both scripts are parsed, so the pack simulator can use BBJ modules.
Object.assign(DEFAULTS, {
  start: BBJ.ECONOMY.startingBankroll, price: BBJ.ECONOMY.packPrice, boxPrice: BBJ.ECONOMY.boxPrice,
  buy: BBJ.ECONOMY.sellRatePercent, keep: BBJ.ECONOMY.keepDefault, keepJourney: BBJ.ECONOMY.keepJourneyDefault
});
load(); initNameKeys(); refreshHeader(); imgStatus(); loadImgIndex();
applyDebugVisibility(); renderGiftPanel(applyGifts());
const h0=(location.hash||'').slice(1); if(['collection','decks','journey','stats','odds','settings'].includes(h0)) showView(h0);
