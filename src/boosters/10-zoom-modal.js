/* ================= Zoom modal ================= */
function openZoom(c,foil){
  const k=cardKey(c);
  const n=S.coll[k]||0, nf=S.foil[k]||0;
  const ti=Object.values(TREAT_INFO).find(t=>t.id===c.treat);
  const extras=dupesIn([{c}]), extrasVal=extras.reduce((s,x)=>s+x.n*sellPrice(x.c,x.foil),0), keepN=BBJ.isRunCard(c)?(S.settings.keepJourney??BBJ.ECONOMY.keepJourneyDefault):S.settings.keep;
  document.getElementById('mbody').innerHTML=`<div class="zoom"><div id="zc">${cardHTML(c,foil,'front','large',true)}</div>
    <dl><dt>Name</dt><dd>${esc(c.flavor?c.flavor+' ('+c.name+')':c.name)}</dd>
    <dt>Set / #</dt><dd>${c.set} #${c.num}${c.base&&c.base!==c.num?` (base #${c.base})`:''}</dd>
    <dt>Rarity</dt><dd><span class="rdot" style="background:${RC[c.r]};box-shadow:0 0 0 1px #fff4"></span>${({C:'Common',U:'Uncommon',R:'Rare',M:'Mythic rare',L:'Basic land'})[c.r]}</dd>
    <dt>Version</dt><dd>${ti?ti.label:(c.treat==='etern'?'Eternal (TLE)':'Regular')}</dd>
    <dt>Type</dt><dd>${esc(c.type)}</dd>
    ${c.cost?`<dt>Cost</dt><dd>${esc(c.cost)}</dd>`:''}
    ${c.pt?`<dt>P/T</dt><dd>${esc(c.pt)}</dd>`:''}
    <dt>Artist</dt><dd>${esc(c.artist||'—')}</dd>
    <dt>Market price</dt><dd>${ptag(priceOf(c,false))} regular · ${ptag(priceOf(c,true))} foil <span class="dim">(${priceDate()})</span></dd>
    <dt>You own</dt><dd>${n} regular · ${nf} foil</dd>
    <dt>Sell</dt><dd class="row" style="gap:6px">${n?`<button class="btn" id="sell1" style="padding:6px 10px">Sell 1 · ${$$(sellPrice(c,false))}</button>`:''}${nf?`<button class="btn" id="sell1f" style="padding:6px 10px">Sell 1 foil · ${$$(sellPrice(c,true))}</button>`:''}${extras.length?`<button class="btn" id="sellx" style="padding:6px 10px">Sell extras (keep ${keepN}) · ${$$(extrasVal)}</button>`:''}${!(n+nf)?'<span class="dim">You don\'t own this one.</span>':''}</dd>
    <dt></dt><dd>${c.back?`<button class="btn" id="tf">⟲ Transform</button> `:''}<a href="https://scryfall.com/search?q=${encodeURIComponent('!"'+c.name+'" (set:tla or set:tle)')}" target="_blank" rel="noopener">See the real card on Scryfall ↗</a></dd></dl></div>`;
  const after=(r)=>{ toast(`Sold ${r.n} for ${$$(r.v)}`); openZoom(c,foil); if(document.getElementById('v-collection').classList.contains('on')) renderCollection(); };
  const b1=document.getElementById('sell1'); if(b1) b1.onclick=()=>after(sellList([{c,k,foil:false,n:1}]));
  const b2=document.getElementById('sell1f'); if(b2) b2.onclick=()=>after(sellList([{c,k,foil:true,n:1}]));
  const b3=document.getElementById('sellx'); if(b3) b3.onclick=()=>after(sellList(extras));
  if(c.back){ let face='front'; document.getElementById('tf').onclick=()=>{face=face==='front'?'back':'front'; document.getElementById('zc').innerHTML=cardHTML(c,foil,face,'large',true);}; }
  document.getElementById('modal').classList.add('on');
}
document.getElementById('mx').onclick=()=>document.getElementById('modal').classList.remove('on');
document.getElementById('modal').addEventListener('click',e=>{ if(e.target.id==='modal') e.currentTarget.classList.remove('on'); });
document.addEventListener('keydown',e=>{ if(e.key==='Escape') document.getElementById('modal').classList.remove('on'); });

