/* ================= Shop ================= */
const OFFERS=[10,25,50,100,250];
function openShop(msg){
  if(!BB_DEBUG) return; // deposits bypass the earned-money loop; debug only
  document.getElementById('mbody').innerHTML=`<h2>Add funds</h2><p class="muted">${msg||'Simulated deposits. No real money moves. Deposits are tracked so Stats can show your true profit or loss.'}</p>
   <div class="shopGrid">${OFFERS.map(o=>`<div class="offer"><div class="g">$${o}</div><div class="muted" style="font-size:12.5px">≈${Math.floor(o/S.settings.price)} packs</div><button class="btn primary" data-o="${o}" style="width:100%;margin-top:8px">Deposit</button></div>`).join('')}</div>
   <p class="note" style="margin-top:12px">Other ways to earn: sell extra cards (Collection tab). Journey runs pay out when the run ends.</p>`;
  document.querySelectorAll('[data-o]').forEach(b=>b.onclick=()=>{const o=+b.dataset.o; S.money+=o; S.deposited+=o; save(); refreshHeader(); toast(`+$${o} added`); document.getElementById('modal').classList.remove('on');});
  document.getElementById('modal').classList.add('on');
}
/* ---------- selling ---------- */
function sellExtrasPlan(list){ // extras for the names in list (whole collection if list null); Journey names keep their stars
  const keys=new Set();
  if(list) list.forEach(p=>{ keys.add(cardKey(p.c)); (NAME_KEYS[p.c.name]||[]).forEach(k=>keys.add(k)); });
  else { Object.keys(S.coll).forEach(k=>keys.add(k)); Object.keys(S.foil).forEach(k=>keys.add(k)); }
  const entries=[], cards={};
  keys.forEach(k=>{ const c=findCard(k); if(!c) return; const reg=S.coll[k]||0, fo=S.foil[k]||0; if(!reg&&!fo) return; cards[k]=c;
    entries.push({key:k,name:c.name,journey:BBJ.isRunCard(c),reg,foil:fo,regValue:sellPrice(c,false),foilValue:sellPrice(c,true)}); });
  const plan=BBJ.planSellExtras(entries,{keep:S.settings.keep,keepJourney:S.settings.keepJourney??BBJ.ECONOMY.keepJourneyDefault});
  return {entries,plan,items:plan.map(p=>({c:cards[p.key],k:p.key,foil:p.foil,n:p.n}))};
}
function dupesIn(list){ return sellExtrasPlan(list).items; }
function sellList(items){
  let n=0,v=0;
  items.forEach(x=>{ const bag=x.foil?S.foil:S.coll; const have=bag[x.k]||0; const q=Math.min(have,x.n); if(!q) return;
    bag[x.k]=have-q; if(!bag[x.k]) delete bag[x.k]; const pr=sellPrice(x.c,x.foil)*q; n+=q; v+=pr; });
  v=Math.round(v*100)/100; S.money=Math.round((S.money+v)*100)/100; S.soldIncome+=v; S.sold+=n; save(); refreshHeader(); return {n,v};
}
document.getElementById('shopBtn').onclick=()=>openShop();

