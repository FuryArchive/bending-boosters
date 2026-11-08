/* ================= Journey mount ================= */
let JOURNEY=null;
function settleJourney(id,amount,r){
  if(!id) return false;
  if(Object.prototype.hasOwnProperty.call(S.runSettlements||{},id)) return true;
  const J=Object.assign({runs:0,wins:0,bestFloor:0,bestHit:0,avatar:0},S.journey);
  J.runs++; if(r.won) J.wins++;
  J.bestFloor=Math.max(J.bestFloor,r.floor); J.bestHit=Math.max(J.bestHit,r.bestHit); J.avatar+=r.avatar;
  // Money, stats and the receipt commit in ONE storage write. A stale run save
  // can safely retry after a reload, even if removing bb.run was interrupted.
  const next=Object.assign({},S,{rng:rngState,money:Math.round((S.money+amount)*100)/100,
    runIncome:(S.runIncome||0)+amount,journey:J,runSettlements:{...S.runSettlements,[id]:true}});
  if(!save(next)) return false;
  Object.assign(S,next);
  refreshHeader();
  if(document.getElementById('v-stats').classList.contains('on')) renderStats();
  toast(`+$${amount.toFixed(2)} from your journey`);
  renderResumeCard();
  return true;
}
function mountJourneyOnce(){
  if(JOURNEY||!window.BBJ) return;
  JOURNEY=BBJ.mountJourney(document.getElementById('journeyRoot'),{cardHTML,BASE,S,esc,save,toast,owned,debug:BB_DEBUG,artSVG,
    settleRun:settleJourney,
    ownership:sets=>BBJ.journeyOwnership({cards:BASE,printings:BASE.concat(specList(),ETERN),copiesOf:c=>(S.coll[cardKey(c)]||0)+(S.foil[cardKey(c)]||0),sets}),
    ownedSets:()=>[...new Set(Object.keys(S.coll).concat(Object.keys(S.foil)).filter(k=>(S.coll[k]||0)+(S.foil[k]||0)>0).map(k=>k.split(':')[0]))],
    pairNames:Object.fromEntries(DECKS.arch.map(a=>[BBJ.PAIRS.find(p=>[...p].sort().join('')===[...a.id].sort().join('')),a.name])),
    artCrop:c=>{ if(!S.settings.real) return null; const e=IMG[c.set+':'+c.num]; return e?'https://cards.scryfall.io/art_crop/front/'+e[0]:null; },
    starsOf:j=>j.cardName?starsFromCount(owned(j.cardName)):1});
  BBJ._state=JOURNEY._state; BBJ._debugForce=JOURNEY._debugForce; BBJ._newRun=JOURNEY._newRun; BBJ._debugGoto=JOURNEY._debugGoto; BBJ._debugFight=JOURNEY._debugFight;
}
function starsFromCount(n){ return n>=12?5:n>=7?4:n>=4?3:n>=2?2:n>=1?1:0; }

