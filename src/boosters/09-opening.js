/* ================= Opening ================= */
function openPack(code=MAIN_SET){
  const forceM = S.settings.pity>0 && S.since>=S.settings.pity-1;
  const out=[];
  for(const slot of slotsOf(code)) for(let i=0;i<slot.n;i++) out.push(rollSlot(slot, slot.id==='rare' && forceM, code));
  if(forceM) S.pityHits++;
  S.packs++; let gotM=false; const log=[]; let pv=0;
  for(const p of out){
    const k=cardKey(p.c); p.isNew=!S.coll[k] && !S.foil[k] && !ownedAnyName(p.c);
    if(p.foil) S.foil[k]=(S.foil[k]||0)+1; else S.coll[k]=(S.coll[k]||0)+1;
    S.cards++; S.rc[p.c.r]=(S.rc[p.c.r]||0)+1;
    if(p.c.r==='M') gotM=true;
    if(isSpecial(p.c)) S.special++;
    if(p.c.treat==='etern') S.eternal++;
    if(p.foil) S.foils++;
    p.v=priceOf(p.c,p.foil); pv+=p.v;
    if(!S.best||p.v>S.best.v) S.best={k,foil:p.foil,v:p.v,pack:S.packs};
    log.push(k+(p.foil?'*':'')+'@'+p.slot);
  }
  S.valuePulled+=pv; S.valHist.push(Math.round(pv*100)/100); if(S.valHist.length>3000) S.valHist.shift();
  out.value=pv;
  if(gotM){ S.mythicPacks++; S.drySpans.push(S.since+1); if(S.drySpans.length>500) S.drySpans.shift(); S.since=0; }
  else { S.since++; S.maxDry=Math.max(S.maxDry,S.since); }
  S.hist.push(log); if(S.hist.length>3000) S.hist.shift();
  return out;
}
function ownedAnyName(c){ // owned any printing of this card name before this pull
  if(c.set==='TLE') return false;
  return (NAME_KEYS[c.name]||[]).some(k=>S.coll[k]||S.foil[k]);
}
const ORDER={common:0,cb:1,unc:2,land:3,wild:4,foil:5,rare:6};
function cost(n){ return n===30 ? +S.settings.boxPrice : Math.round(S.settings.price*n*100)/100; }
function tier(p){ if(isSpecial(p.c)) return 'S'; if(p.c.treat==='etern') return 'E'; if(p.c.r==='M') return 'M'; if(p.c.r==='R') return 'R'; return ''; }
function score(p){ return (isSpecial(p.c)?100:0)+(p.c.treat==='etern'?60:0)+({M:40,R:20,U:5,C:1,L:0}[p.c.r])+(p.foil?3:0); }
function tile(k,v,s){ return `<div class="stat"><div class="k">${k}</div><div class="v">${v}</div><div class="s">${s||''}</div></div>`; }
function slotLabel(id){ return (SLOTS.find(s=>s.id===id)||{}).label||''; }

let LAST=null; // {packs, showAll}
function tryOpen(n,free=false){
  if(!free&&n===1&&(S.freePacks||0)>0) free=true; // single opens use waiting free packs first
  if(free&&(S.freePacks||0)<n) return;
  const c=free?0:cost(n);
  if(S.money<c-1e-9){ if(BB_DEBUG) openShop(`You need ${$$(c)} but have ${$$(S.money)}. Sell some cards, earn money on the Journey, or add funds.`); else showBroke(c); return; }
  if(free){ S.freePacks-=n; S.freeOpened=(S.freeOpened||0)+n; }
  S.money=Math.round((S.money-c)*100)/100; S.packSpend+=c;
  const packs=[]; for(let i=0;i<n;i++) packs.push(openPack());
  save(); refreshHeader(); renderFreeButton();
  // start downloading images right away, while the tear animation plays
  const flat=packs.flat();
  if(n===1){ preload(flat.map(p=>p.c),'normal'); preload(flat.filter(p=>tier(p)||p.foil).map(p=>p.c),'large'); }
  else preload(flat.filter(p=>tier(p)).map(p=>p.c),'normal');
  LAST={packs,showAll:false,cost:c};
  stageOpen(packs);
}

/* ---------- Stage ---------- */
const stage=document.getElementById('stage'), stBody=document.getElementById('stBody'), stBottom=document.getElementById('stBottom');
let ST=null; // {packs, cards:[p], hidden:Set(index), multi, revealing}
let openingId=0;
const openingTimers=new Set();
function openingLater(fn,ms){
  const id=openingId;
  const timer=setTimeout(()=>{ openingTimers.delete(timer); if(id===openingId) fn(); },ms);
  openingTimers.add(timer);
}
function cancelOpening(){
  openingId++;
  openingTimers.forEach(clearTimeout); openingTimers.clear();
  ST=null; spotDone=null; spotReady=false;
  spot.classList.remove('on','lit','shakeit');
  spot.querySelectorAll('.part').forEach(el=>el.remove());
  document.getElementById('flash').classList.remove('go');
}
function stageOpen(packs){
  BBJ.showTip('reveal');
  cancelOpening();
  document.getElementById('stSkip').disabled=false;
  document.body.classList.add('lock'); stage.classList.add('on');
  const multi=packs.length>1;
  document.getElementById('stTitle').textContent = multi?`${packs.length} packs`:`Pack #${S.packs.toLocaleString()}`;
  document.getElementById('stSkip').style.display='none';
  const best=packs.flat().reduce((m,p)=>Math.max(m,score(p)),0);
  const g=best>=100?'gS':best>=60?'gS':best>=40?'gM':best>=20?'gR':'';
  if(S.settings.fast){ dealCards(packs); return; }
  stBody.innerHTML=`<div class="bigPackWrap"><div class="pack ${S.settings.hints?g:''}" id="bigPack"><div class="shine"></div>
    <div class="seal"><svg viewBox="0 0 100 100"><g fill="none" stroke="#fff" stroke-opacity=".85" stroke-width="2"><path d="M50 12 C70 22 70 40 50 50 C30 60 30 78 50 88"/><path d="M12 50 C22 30 40 30 50 50 C60 70 78 70 88 50"/></g><circle cx="50" cy="50" r="7" fill="#fff" fill-opacity=".9"/></svg></div>
    <div class="ptitle"><small>${multi?packs.length+' PACKS':'PLAY BOOSTER · 14 CARDS'}</small>The Last Airbender</div></div>
    <div class="tapHint">${multi?'Click to rip them all open':'Click the pack to tear it open'}</div></div>`;
  stBottom.innerHTML='';
  const bp=document.getElementById('bigPack');
  bp.onclick=()=>{ bp.onclick=null; SFX.tear(); bp.classList.add('shake'); openingLater(()=>{bp.classList.remove('shake');bp.classList.add('tear');},520); openingLater(()=>dealCards(packs),1000); };
}
function gridCols(n,multi){
  const W=Math.min(window.innerWidth-48,1700), H=window.innerHeight;
  let cols, cw;
  if(!multi){
    cols = W>1300?7: W>900?5: W>560?4:3;
    cw = Math.floor((W-(cols-1)*14)/cols);
    const rows=Math.ceil(n/cols); const maxByH=Math.floor(((H-230)/rows-40)*0.716);
    cw=Math.max(100,Math.min(cw,maxByH>140?maxByH:cw,260));
  } else { cw = W>900?185: W>560?150:120; cols=Math.max(1,Math.floor((W+14)/(cw+14))); }
  return {cols,cw};
}
function dealCards(packs){
  const multi=packs.length>1;
  let cards;
  if(!multi) cards=packs[0].slice().sort((a,b)=>ORDER[a.slot]-ORDER[b.slot]);
  else cards=packs.flat().filter(p=>tier(p)).sort((a,b)=>score(a)-score(b)); // save the best for last
  const hidden=new Set();
  cards.forEach((p,i)=>{ if(multi || ['wild','foil','rare'].includes(p.slot) || tier(p)) hidden.add(i); });
  ST={packs,cards,hidden,multi,revealing:false};
  const {cols,cw}=gridCols(cards.length,multi);
  stBody.innerHTML=`${multi?`<div class="note" style="margin-bottom:12px;font-size:16px">${cards.length} hits across ${packs.length} packs. Click a card to reveal it, or Reveal all.</div>`:''}
    <div class="revealGrid" style="grid-template-columns:repeat(${Math.min(cols,cards.length||1)},${cw}px);--cw:${cw}px">${cards.map((p,i)=>flipHTML(p,i,true)).join('')}</div>
    ${multi&&!cards.length?'<div class="panel note" style="margin-top:30px">No rares at all? The elements were not with you.</div>':''}`;
  stBody.querySelectorAll('.flip').forEach(el=>el.addEventListener('click',()=>onCardClick(+el.dataset.i)));
  cards.forEach((p,i)=>openingLater(()=>SFX.deal(),i*55));
  const t0=cards.length*55+350;
  if(!multi){
    // auto-flip the easy cards in a quick cascade
    let j=0;
    cards.forEach((p,i)=>{ if(!hidden.has(i)){ openingLater(()=>flipCard(i,true),t0+j*110); j++; } });
    openingLater(()=>{ markWaiting(); updateBottom(); },t0+j*110+100);
  } else { openingLater(()=>{ markWaiting(); updateBottom(); },t0); }
  document.getElementById('stSkip').style.display=hidden.size?'':'none';
  stBottom.innerHTML='';
}
function flipHTML(p,i,down){
  const t=tier(p); const hint=S.settings.hints&&down? (t?' hint'+t:(p.foil?' hintF':'')) : '';
  return `<div class="cardWrap" id="cw${i}"><div class="flip deal${down?'':' up'}" style="animation-delay:${i*55}ms" data-i="${i}">
     <div class="inner"><div class="face back${hint}">${backSVG}</div><div class="face front">${cardHTML(p.c,p.foil,'front','normal',true)}</div></div></div>
     <div class="cap"></div></div>`;
}
function capFor(p){ return (ST&&ST.multi? esc(p.c.flavor||p.c.name) : slotLabel(p.slot))+' · '+ptag(p.v||priceOf(p.c,p.foil)); }
function flipCard(i,quiet){
  if(!ST||!ST.cards[i]) return;
  const el=stBody.querySelector(`.flip[data-i="${i}"]`); if(!el||el.classList.contains('up')) return;
  el.classList.remove('wait'); el.classList.add('up'); ST.hidden.delete(i);
  const p=ST.cards[i]; const w=document.getElementById('cw'+i);
  w.querySelector('.cap').innerHTML=capFor(p);
  if(p.isNew) w.insertAdjacentHTML('beforeend','<span class="badge">NEW</span>');
  const t=tier(p); if(t) w.classList.add(t==='M'?'hitM':t==='S'||t==='E'?'hitS':'hit');
  if(!quiet) SFX.flip(); else SFX.deal();
}
function markWaiting(){ if(!ST) return; ST.hidden.forEach(i=>{ const el=stBody.querySelector(`.flip[data-i="${i}"]`); el&&el.classList.add('wait'); }); }
function onCardClick(i){
  if(!ST||ST.revealing||spot.classList.contains('on')||!ST.cards[i]) return;
  const p=ST.cards[i];
  if(ST.hidden.has(i)){ spotlight(p,true,()=>{ flipCard(i,true); updateBottom(); }); }
  else spotlight(p,false);
}
function updateBottom(){
  if(!ST||ST.revealing) return;
  const left=ST.hidden.size;
  document.getElementById('stSkip').style.display=left?'':'none';
  if(left){ stBottom.innerHTML=`<div class="msg">${left} card${left>1?'s':''} left: click the glowing card${left>1?'s':''} to reveal</div>`; return; }
  const all=ST.packs.flat();
  const cnt=f=>all.filter(f).length;
  const nNew=all.filter(p=>p.isNew).length;
  const chips=[['Mythic',cnt(p=>p.c.r==='M'),'#f07a3a'],['Rare',cnt(p=>p.c.r==='R'),'#e8c25a'],['Special',cnt(p=>isSpecial(p.c)),'#c48cff'],['Eternal',cnt(p=>p.c.treat==='etern'),'#e8c46a'],['Foil',cnt(p=>p.foil),'#7af0ff'],['New',nNew,'#2fbf63']]
    .filter(x=>x[1]).map(x=>`<span class="pill" style="border-color:${x[2]}66"><span class="rdot" style="background:${x[2]}"></span>${x[1]} ${x[0]}</span>`).join('');
  const val=ST.packs.reduce((s,pk)=>s+(pk.value||0),0), paid=LAST?LAST.cost:cost(ST.packs.length), pl=val-paid;
  const dupVal=dupesIn(all).reduce((s,x)=>s+x.n*sellPrice(x.c,x.foil),0);
  stBottom.innerHTML=`<span class="pill" style="border-color:${pl>=0?'#2fbf63':'#c0504a'}">Value ${$$(val)} <span class="${pl>=0?'':'dim'}" style="color:${pl>=0?'#7ee08a':'#e8857c'}">${paid?`(${pl>=0?'+':''}${$$(pl)} vs ${$$(paid)})`:'(free pack)'}</span></span>${chips}<span style="width:16px"></span>
    ${dupVal>0?`<button class="btn" id="sellPackDupes">Sell extras · ${$$(dupVal)}</button>`:''}
    <button class="btn primary" id="again1">Open another · ${(S.freePacks||0)>0?'free':$$(cost(1))}</button>${ST.multi?`<button class="btn" id="againN">Again ×${ST.packs.length} · ${$$(cost(ST.packs.length===30?30:ST.packs.length))}</button>`:''}
    <button class="btn" id="stDone">Done</button>`;
  document.getElementById('again1').onclick=()=>{ tryOpen(1); };
  const an=document.getElementById('againN'); if(an) an.onclick=()=>tryOpen(ST.packs.length);
  document.getElementById('stDone').onclick=stageClose;
  const sd=document.getElementById('sellPackDupes'); if(sd) sd.onclick=()=>{ const r=sellList(dupesIn(all)); toast(`Sold ${r.n} cards for ${$$(r.v)}`); sd.remove(); };
}
function revealAll(){
  if(!ST||ST.revealing||!ST.hidden.size||spot.classList.contains('on')) return;
  const current=ST;
  current.revealing=true;
  document.getElementById('stSkip').disabled=true;
  const idx=[...current.hidden].sort((a,b)=>a-b);
  const bestI=idx.reduce((b,i)=>(b<0||score(current.cards[i])>score(current.cards[b]))?i:b,-1);
  const showBest = bestI>=0 && ['M','S','E'].includes(tier(current.cards[bestI]));
  const finish=()=>{ if(ST!==current) return; current.revealing=false; document.getElementById('stSkip').disabled=false; updateBottom(); };
  let j=0;
  idx.forEach(i=>{ if(showBest&&i===bestI) return; openingLater(()=>{ flipCard(i); const t=tier(current.cards[i]); if(t==='R') SFX.R(); },j*(current.multi?110:260)); j++; });
  openingLater(()=>{ if(showBest) spotlight(current.cards[bestI],true,()=>{ flipCard(bestI,true); finish(); }); else finish(); }, j*(current.multi?110:260)+250);
}
function stageClose(){
  cancelOpening();
  stage.classList.remove('on'); document.body.classList.remove('lock');
  stBody.innerHTML=''; stBottom.innerHTML='';
  renderLast();
}
document.getElementById('stSkip').onclick=revealAll;
document.getElementById('stClose').onclick=()=>{ // closing early reveals everything silently
  if(ST) ST.hidden.clear(); stageClose();
};

/* ---------- Spotlight ---------- */
const spot=document.getElementById('spot'), spotHolder=document.getElementById('spotHolder');
let spotDone=null, spotReady=false;
const TIER_COL={'':'#cfc6b8',U:'#a9c2d4',R:'#e8c25a',M:'#f07a3a',S:'#c48cff',E:'#e8c46a'};
function spotlight(p,reveal,after){
  const t=tier(p)|| (p.c.r==='U'?'U':'');
  spot.style.setProperty('--rc',TIER_COL[t]);
  spot.classList.remove('lit','shakeit'); spot.classList.add('on');
  const ti=treatInfo(p.c);
  const title = isSpecial(p.c)?ti.label : p.c.treat==='etern'?'Eternal' : ({M:'Mythic rare',R:'Rare',U:'Uncommon',C:'Common',L:'Land'})[p.c.r];
  const sub = [p.foil?'★ FOIL':'', isSpecial(p.c)?({M:'MYTHIC',R:'RARE',U:'UNCOMMON'})[p.c.r]:'', p.isNew?'NEW':''].filter(Boolean).join(' · ');
  const pv=p.v||priceOf(p.c,p.foil);
  spotHolder.innerHTML=`<div class="flip enter${reveal?'':' up'}"><div class="inner"><div class="face back">${backSVG}</div><div class="face front">${cardHTML(p.c,p.foil,'front','large',true)}</div></div></div>
    <div class="banner">${esc(title)}<small style="font-size:22px;color:${priceTagColor(pv)}">${$$(pv)} market</small>${sub?`<small>${sub}</small>`:''}</div>`;
  spotDone=after||null; spotReady=false;
  const fl=spotHolder.querySelector('.flip');
  const go=()=>{
    fl.classList.add('up'); SFX.flip();
    openingLater(()=>{
      spot.classList.add('lit'); spotReady=true;
      if(t==='S'||t==='E'||t==='M'){ burst(t==='M'?42:70,TIER_COL[t]); spot.classList.add('shakeit'); }
      if(t==='S'||t==='E'){ const f=document.getElementById('flash'); f.classList.remove('go'); void f.offsetWidth; f.classList.add('go'); }
      if(t==='R') burst(18,TIER_COL.R);
      (SFX[t]||(()=>{}))();
    },380);
  };
  if(reveal) openingLater(go, t==='S'||t==='E'?900:t==='M'?750:500); else { spot.classList.add('lit'); spotReady=true; }
}
function burst(n,col){
  for(let i=0;i<n;i++){
    const d=document.createElement('i'); d.className='part';
    const a=Math.random()*6.283, r=200+Math.random()*Math.min(innerWidth,innerHeight)*.55;
    d.style.cssText=`--x:${Math.cos(a)*r}px;--y:${Math.sin(a)*r}px;--s:${4+Math.random()*9}px;--d:${.8+Math.random()*1.1}s;--c:${Math.random()<.35?'#fff':col}`;
    spot.appendChild(d); openingLater(()=>d.remove(),2100);
  }
}
spot.addEventListener('click',()=>{
  if(!spotReady) return; // let the reveal finish
  spot.classList.remove('on','lit'); const cb=spotDone; spotDone=null; cb&&cb();
});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){ document.getElementById('modal').classList.remove('on'); if(spot.classList.contains('on')&&spotReady) spot.click(); }
  if((e.key===' '||e.key==='Enter') && stage.classList.contains('on') && !e.target.closest('input,select,textarea')){
    e.preventDefault();
    if(spot.classList.contains('on')){ if(spotReady) spot.click(); return; }
    const bp=document.getElementById('bigPack'); if(bp&&bp.onclick){ bp.onclick(); return; }
    if(ST&&ST.hidden.size){ const i=Math.min(...ST.hidden); onCardClick(i); }
  }
});

/* ---------- Last opening (main page) ---------- */
function renderLast(){
  if(!LAST) return;
  const multi=LAST.packs.length>1;
  let list = multi&&!LAST.showAll ? LAST.packs.flat().filter(p=>tier(p)).sort((a,b)=>score(b)-score(a))
           : LAST.packs.flatMap(pk=>pk.slice().sort((a,b)=>ORDER[a.slot]-ORDER[b.slot]));
  if(!multi) list=list.slice().sort((a,b)=>score(b)-score(a)||ORDER[a.slot]-ORDER[b.slot]);
  document.getElementById('lastTitle').innerHTML = (multi?(LAST.showAll?`All ${list.length} cards from ${LAST.packs.length} packs`:`Hits from ${LAST.packs.length} packs`):`Last pack (#${S.packs})`)+` <span class="muted" style="font-size:17px">· worth ${$$(LAST.packs.reduce((s,pk)=>s+(pk.value||0),0))} (paid ${$$(LAST.cost||0)})</span>`;
  const tg=document.getElementById('lastToggle'); tg.style.display=multi?'':'none'; tg.textContent=LAST.showAll?'Show hits only':'Show every card';
  const cw = multi&&LAST.showAll?150:190;
  CUR=list;
  document.getElementById('last').innerHTML=`<div class="cards" style="--cw:${cw}px">${list.map((p,i)=>{const t=tier(p);
    return `<div class="cardWrap ${t?(t==='M'?'hitM':t==='S'||t==='E'?'hitS':'hit'):''}" data-i="${i}" style="cursor:pointer">${p.isNew?'<span class="badge">NEW</span>':''}${cardHTML(p.c,p.foil)}<div class="cap">${multi?esc(p.c.flavor||p.c.name):slotLabel(p.slot)} · ${ptag(p.v||priceOf(p.c,p.foil))}</div></div>`;}).join('')}</div>`;
  document.querySelectorAll('#last .cardWrap').forEach(el=>el.onclick=()=>{const p=CUR[+el.dataset.i]; openZoom(p.c,p.foil);});
}
let CUR=[];
document.getElementById('lastToggle').onclick=()=>{ if(LAST){ LAST.showAll=!LAST.showAll; renderLast(); } };

