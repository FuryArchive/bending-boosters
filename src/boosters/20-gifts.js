/* ================= Gifts & earned money ================= */
// Starter gift, daily pack + streak cash, free packs, and the "not enough money" dialog.
// Gifts commit to storage first and only then change S, so a failed write pays nothing
// and the gift is simply retried on the next load.
function applyGifts(now=Date.now()){
  const E=BBJ.ECONOMY;
  const r=BBJ.claimDaily(S.daily||{last:null,streak:0},BBJ.localDay(now));
  const starter=S.starterGiven?0:E.starterPacks;
  if(!r.claimed&&!starter) return {starter:0,cash:0,packs:0,streakDay:r.streakDay};
  const next=Object.assign({},S,{rng:rngState,daily:r.daily,starterGiven:true,
    money:Math.round((S.money+r.cash)*100)/100,
    dailyIncome:Math.round(((S.dailyIncome||0)+r.cash)*100)/100,
    freePacks:(S.freePacks||0)+starter+r.packs});
  if(!save(next)) return null;
  Object.assign(S,next);
  refreshHeader();
  return {starter,cash:r.cash,packs:r.packs,streakDay:r.streakDay};
}
function renderFreeButton(){
  const n=S.freePacks||0, b=document.getElementById('openFree');
  b.hidden=!n;
  document.getElementById('freeCount').textContent=`${n} waiting`;
}
function renderGiftPanel(res){
  const el=document.getElementById('giftPanel'), parts=[];
  if(res&&res.starter) parts.push(`<b>Welcome!</b> ${res.starter} free packs to start your collection.`);
  if(res&&(res.cash||res.packs)){
    const t=BBJ.ECONOMY.streakCash, tomorrow=t[Math.min(res.streakDay+1,t.length)-1];
    parts.push(`<b>Daily gift:</b> +${$$(res.cash)} and ${res.packs} free pack${res.packs===1?'':'s'} · streak day ${res.streakDay}`);
    parts.push(`<span class="note">Come back tomorrow for ${$$(tomorrow)}. Missing a day restarts the streak.</span>`);
  }
  el.innerHTML=parts.map(p=>`<div>${p}</div>`).join('');
  el.hidden=!parts.length;
  renderFreeButton();
}
function showBroke(need){
  const free=S.freePacks||0;
  document.getElementById('mbody').innerHTML=`<h2>Not enough money</h2>
    <p class="muted">You need ${$$(need)} but have ${$$(S.money)}.</p>
    <div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn primary" id="goJourney">Play the Journey</button><button class="btn" id="goCollection">Sell extra cards</button>${free?`<button class="btn" id="goFree">Open a free pack (${free})</button>`:''}</div>
    <p class="note" style="margin-top:12px">Journey runs are free to start and pay out when they end. A free pack and streak cash arrive every day you visit.</p>`;
  const close=()=>document.getElementById('modal').classList.remove('on');
  document.getElementById('goJourney').onclick=()=>{ close(); showView('journey'); };
  document.getElementById('goCollection').onclick=()=>{ close(); showView('collection'); };
  const g=document.getElementById('goFree'); if(g) g.onclick=()=>{ close(); tryOpen(1,true); };
  document.getElementById('modal').classList.add('on');
}
function applyDebugVisibility(){
  ['shopBtn','econSettings','econStart'].forEach(id=>{ document.getElementById(id).hidden=!BB_DEBUG; });
}
document.getElementById('openFree').onclick=()=>tryOpen(1,true);
