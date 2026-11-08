/* ================= Stats ================= */
function renderStats(){
  const e=expected(); const P=S.packs||0;
  const comp=SET_PACKAGES.map(p=>{ const uniq=new Set(pkgBase(p.code).filter(c=>c.r!=='L').map(c=>c.name)); let have=0; uniq.forEach(n=>{if(ownedName(n,p.code))have++;}); return {p,have,size:Math.max(1,uniq.size)}; });
  const multi=SET_PACKAGES.length>1;
  const mythics=S.rc.M||0;
  document.getElementById('statTiles').innerHTML=
    tile('Packs opened',P.toLocaleString(),S.cards.toLocaleString()+' cards')+
    tile('Mythics',mythics,P?`1 per ${(P/Math.max(mythics,1)).toFixed(1)} packs`:'')+
    tile('Specials',S.special,P?`expected ${(e.special*P).toFixed(1)}`:'')+
    tile('Eternal',S.eternal,P?`expected ${(e.eternal*P).toFixed(1)}`:'')+
    comp.map(x=>tile(multi?'Completion · '+x.p.code:'Completion',(x.have/x.size*100).toFixed(1)+'%',`${x.have}/${x.size} unique${multi?' · '+esc(x.p.name):''}`)).join('')+
    tile('Pity triggers',S.pityHits,S.settings.pity?`at ${S.settings.pity}`:'pity off')+
    (J=>tile('Journey runs',J.runs,`${J.wins} won`)+tile('Best floor',J.bestFloor?`${J.bestFloor} / 45`:'—',J.bestHit?`best hit ${J.bestHit.toLocaleString()}`:'')+tile('Avatar States',J.avatar,'in Journey runs'))(S.journey||{runs:0,wins:0,bestFloor:0,bestHit:0,avatar:0});
  const cv=collectionValue(), ev=packEV().total, earned=(S.runIncome||0)+(S.soldIncome||0)+(S.dailyIncome||0), bal=earned-S.packSpend;
  document.getElementById('moneyTiles').innerHTML=
    tile('Spent on packs',$$(S.packSpend),P?`${$$(S.packSpend/P)} per pack`:'')+
    tile('Value pulled',$$(S.valuePulled),P?`${$$(S.valuePulled/P)} per pack (EV ${$$(ev)})`:'')+
    tile('Return on packs',S.packSpend?(S.valuePulled/S.packSpend*100).toFixed(0)+'%':'—','market value ÷ spend')+
    tile('Collection value',$$(cv),'at current prices')+
    tile('Sold',$$(S.soldIncome),`${S.sold.toLocaleString()} cards`)+
    tile('Journey winnings',$$(S.runIncome||0),`${(S.journey||{}).runs||0} runs`)+
    tile('Earned',$$(earned),'Journey + sales + daily gifts')+
    tile('Earned vs spent',`<span style="color:${bal>=0?'#7ee08a':'#e8857c'}">${$$(bal)}</span>`,'earned − spent on packs')+
    tile('Best pull',S.best?$$(S.best.v):'—',S.best?esc((findCard(S.best.k)||{}).name||'')+(S.best.foil?' ★':''):'');
  // cumulative chart
  const vh=S.valHist; const pts=vh.length;
  if(pts>1){
    let cs=0,cv2=0; const W=600,H=200; const per=cost(1); const tot=pts*per; let mx=0; const a=[],b=[];
    vh.forEach((v,i)=>{ cs+=per; cv2+=v; a.push(cs); b.push(cv2); mx=Math.max(mx,cs,cv2); });
    const path=arr=>arr.map((y,i)=>`${i?'L':'M'}${(i/(pts-1)*W).toFixed(1)} ${(H-y/mx*H).toFixed(1)}`).join(' ');
    document.getElementById('valChart').innerHTML=`<svg viewBox="0 0 ${W} ${H+20}" style="width:100%;height:auto"><path d="${path(a)}" fill="none" stroke="#e8857c" stroke-width="2.5"/><path d="${path(b)}" fill="none" stroke="#7ee08a" stroke-width="2.5"/>
      <text x="4" y="14" fill="#b9ab95" font-size="12">${$$(mx)}</text><text x="4" y="${H+16}" fill="#b9ab95" font-size="12">0</text><text x="${W-4}" y="${H+16}" fill="#b9ab95" font-size="12" text-anchor="end">${pts} packs (logged)</text></svg>
      <div class="row note"><span><span class="rdot" style="background:#e8857c"></span>Cumulative cost at current pack price</span><span><span class="rdot" style="background:#7ee08a"></span>Cumulative market value pulled</span></div>`;
  } else document.getElementById('valChart').innerHTML='<p class="note">Open a couple of packs to see the chart.</p>';
  const top=[]; for(const k in S.coll){ const c=findCard(k); if(c) top.push({c,foil:false,v:priceOf(c,false),n:S.coll[k]}); } for(const k in S.foil){ const c=findCard(k); if(c) top.push({c,foil:true,v:priceOf(c,true),n:S.foil[k]}); }
  top.sort((a,b)=>b.v-a.v);
  document.getElementById('topVal').innerHTML=top.length?`<table><tr><th>Card</th><th class="n">Qty</th><th class="n">Each</th></tr>${top.slice(0,12).map(x=>`<tr style="cursor:pointer" data-k="${cardKey(x.c)}" data-f="${x.foil?1:0}"><td><span class="rdot" style="background:${RC[x.c.r]}"></span>${esc(x.c.flavor||x.c.name)}${x.foil?' ★':''} <span class="dim">${x.c.treat&&treatInfo(x.c)?treatInfo(x.c).label:x.c.treat==='etern'?'Eternal':''}</span></td><td class="n">${x.n}</td><td class="n">${ptag(x.v)}</td></tr>`).join('')}</table>`:'<p class="note">Nothing yet.</p>';
  document.querySelectorAll('#topVal tr[data-k]').forEach(r=>r.onclick=()=>openZoom(findCard(r.dataset.k),r.dataset.f==='1'));
  const rows=[['Commons','C'],['Uncommons','U'],['Rares','R'],['Mythics','M'],['Basic lands','L'],['Specials','special'],['Eternal','eternal'],['Foils','foil']];
  const obs={...S.rc,special:S.special,eternal:S.eternal,foil:S.foils};
  document.getElementById('rarityBars').innerHTML=rows.map(([lab,k])=>{
    const ex=e[k], ob=P?(obs[k]||0)/P:0; const max=Math.max(ex,ob)*1.25||1;
    const color={C:'#cfc6b8',U:'#a9c2d4',R:'#e8c25a',M:'#f07a3a',L:'#8a7d6c',special:'#b48cff',eternal:'#e8c46a',foil:'#7af0ff'}[k];
    return `<div class="brow"><span>${lab}</span><div class="btrack"><i style="width:${ob/max*100}%;background:${color}"></i><b style="left:${ex/max*100}%"></b></div><span class="n" style="text-align:right;font-variant-numeric:tabular-nums">${ob.toFixed(3)} <span class="dim">/ ${ex.toFixed(3)}</span></span></div>`;
  }).join('');
  const ds=S.drySpans; const avg=ds.length?ds.reduce((a,b)=>a+b,0)/ds.length:0;
  document.getElementById('drought').innerHTML=`Current streak without a mythic: <b>${S.since}</b> packs · longest: <b>${S.maxDry}</b> · average gap: <b>${avg?avg.toFixed(1):'—'}</b> (model: ${(1/e.pAnyM).toFixed(1)})`;
  const idx={}; ALL_BASE.concat(allEternal(),allSpecials()).forEach(c=>idx[cardKey(c)]=c);
  const recent=[]; for(let i=S.hist.length-1;i>=0&&recent.length<80;i--){
    const packNo=S.packs-(S.hist.length-1-i);
    S.hist[i].forEach(ent=>{const [kk,slot]=ent.split('@'); const foil=kk.endsWith('*'); const c=idx[kk.replace('*','')]; if(c&&(c.r==='R'||c.r==='M'||isSpecial(c)||c.treat==='etern')) recent.push({packNo,c,foil});});
  }
  document.getElementById('histList').innerHTML=recent.length?`<table><tr><th>Pack</th><th>Card</th><th>Version</th></tr>${recent.map(r=>`<tr><td class="dim">#${r.packNo}</td><td><span class="rdot" style="background:${RC[r.c.r]}"></span>${esc(r.c.flavor||r.c.name)}</td><td class="muted">${r.c.treat==='etern'?'Eternal':isSpecial(r.c)?(treatInfo(r.c)||{}).label:'Regular'}${r.foil?' ★ foil':''}</td></tr>`).join('')}</table>`:'<p class="muted">Open some packs first.</p>';
}
document.getElementById('copyCsv').onclick=async()=>{
  const idx={}; ALL_BASE.concat(allEternal(),allSpecials()).forEach(c=>idx[cardKey(c)]=c);
  const first=S.packs-S.hist.length+1;
  let csv='pack,slot,set,number,name,rarity,version,foil\n';
  S.hist.forEach((pk,i)=>pk.forEach(ent=>{const [kk,slot]=ent.split('@'); const foil=kk.endsWith('*'); const c=idx[kk.replace('*','')]; if(!c) return;
    const ver=c.treat==='etern'?'Eternal':(treatInfo(c)||{label:'Regular'}).label;
    csv+=`${first+i},${slot},${c.set},${c.num},"${(c.flavor||c.name).replace(/"/g,'""')}",${c.r},${ver},${foil?1:0}\n`;}));
  try{ await navigator.clipboard.writeText(csv); toast(`Copied ${S.hist.length} packs as CSV`); }
  catch(e){ document.getElementById('mbody').innerHTML=`<h2>Pull log CSV</h2><p class="muted">Clipboard is blocked here. Select all and copy:</p><textarea style="width:100%;height:50vh;background:var(--bg2);color:var(--ink);border:1px solid var(--line);border-radius:8px;font:12px monospace">${esc(csv)}</textarea>`; document.getElementById('modal').classList.add('on'); }
};

