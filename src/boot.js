// Startup. Runs after both scripts are parsed, so the pack simulator can use BBJ modules.
Object.assign(DEFAULTS, {
  start: BBJ.ECONOMY.startingBankroll, price: BBJ.ECONOMY.packPrice, boxPrice: BBJ.ECONOMY.boxPrice,
  buy: BBJ.ECONOMY.sellRatePercent, keep: BBJ.ECONOMY.keepDefault, keepJourney: BBJ.ECONOMY.keepJourneyDefault
});
load(); initNameKeys(); refreshHeader(); imgStatus(); loadImgIndex();
BBJ.initTips({isSeen:id=>!!(S.tips&&S.tips[id]), markSeen:id=>{ S.tips=Object.assign({},S.tips,{[id]:true}); save(); },
  reset:()=>{ S.tips={}; save(); }, enabled:()=>!BB_DEBUG||!!S.settings.debugTips});
applyDebugVisibility(); renderGiftPanel(applyGifts()); renderResumeCard();
const h0=(location.hash||'').slice(1); if(['collection','decks','journey','stats','odds','settings'].includes(h0)) showView(h0);
if(document.getElementById('v-open').classList.contains('on')) BBJ.showTip('packs');
