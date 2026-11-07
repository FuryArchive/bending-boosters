/* ================= Shop ================= */
const OFFERS=[10,25,50,100,250];
function openShop(msg){
  document.getElementById('mbody').innerHTML=`<h2>Add funds</h2><p class="muted">${msg||'Simulated deposits. No real money moves. Deposits are tracked so Stats can show your true profit or loss.'}</p>
   <div class="shopGrid">${OFFERS.map(o=>`<div class="offer"><div class="g">$${o}</div><div class="muted" style="font-size:12.5px">≈${Math.floor(o/S.settings.price)} packs</div><button class="btn primary" data-o="${o}" style="width:100%;margin-top:8px">Deposit</button></div>`).join('')}</div>
   <p class="note" style="margin-top:12px">Other ways to earn: sell extra cards (Collection tab). Journey runs pay out when the run ends.</p>`;
  document.querySelectorAll('[data-o]').forEach(b=>b.onclick=()=>{const o=+b.dataset.o; S.money+=o; S.deposited+=o; save(); refreshHeader(); toast(`+$${o} added`); document.getElementById('modal').classList.remove('on');});
  document.getElementById('modal').classList.add('on');
}
/* ---------- selling ---------- */
function dupesIn(list){ // extra copies beyond the keep setting, for cards appearing in list (or whole collection if list null)
  const keep=S.settings.keep; const keys=new Set(); const out=[];
  (list||[]).forEach(p=>keys.add(cardKey(p.c)));
  if(!list){ Object.keys(S.coll).forEach(k=>keys.add(k)); Object.keys(S.foil).forEach(k=>keys.add(k)); }
  keys.forEach(k=>{ const c=findCard(k); if(!c) return; let reg=S.coll[k]||0, fo=S.foil[k]||0; let extra=reg+fo-keep; if(extra<=0) return;
    const sr=Math.min(extra,reg); if(sr) out.push({c,k,foil:false,n:sr}); extra-=sr; if(extra>0) out.push({c,k,foil:true,n:extra}); });
  return out;
}
function sellList(items){
  let n=0,v=0;
  items.forEach(x=>{ const bag=x.foil?S.foil:S.coll; const have=bag[x.k]||0; const q=Math.min(have,x.n); if(!q) return;
    bag[x.k]=have-q; if(!bag[x.k]) delete bag[x.k]; const pr=sellPrice(x.c,x.foil)*q; n+=q; v+=pr; });
  v=Math.round(v*100)/100; S.money=Math.round((S.money+v)*100)/100; S.soldIncome+=v; S.sold+=n; save(); refreshHeader(); return {n,v};
}
document.getElementById('shopBtn').onclick=()=>openShop();

