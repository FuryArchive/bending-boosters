/* ================= Odds model (analytic) ================= */
function packEV(){
  const slots=SLOTS.map(s=>{ let v=0; slotDist(s).forEach(o=>{ const pl=pool(o.spec); const avg=pl.reduce((a,c)=>a+priceOf(c,o.foil),0)/pl.length; v+=o.p*avg; }); return {label:s.label,n:s.n,v}; });
  return {slots,total:slots.reduce((a,s)=>a+s.v*s.n,0)};
}
function slotDist(slot){ // returns list of {p, rarity, special, eternal, foil}
  const out=[]; let rest=1;
  for(const [p,s,f] of slot.rep){ rest-=p; out.push({p,spec:s,foil:!!(f||slot.foil)}); }
  out.unshift({p:rest,spec:slot.base,foil:!!slot.foil});
  return out.map(o=>{const pl=pool(o.spec); const r=pl[0].r; const sp=o.spec.src==='treat'&&!/basic/.test(o.spec.sheet); return Object.assign(o,{r,special:sp,eternal:o.spec.src==='eternal'});});
}
function expected(){
  const e={C:0,U:0,R:0,M:0,L:0,special:0,eternal:0,foil:0}; let pNoM=1, pNoSpec=1, pNoEt=1;
  for(const s of SLOTS){ const d=slotDist(s);
    for(let i=0;i<s.n;i++){ let pm=0,ps=0,pe=0;
      d.forEach(o=>{ e[o.r]+=o.p; if(o.special){e.special+=o.p;ps+=o.p;} if(o.eternal){e.eternal+=o.p;pe+=o.p;} if(o.foil) e.foil+=o.p; if(o.r==='M') pm+=o.p; });
      pNoM*=1-pm; pNoSpec*=1-ps; pNoEt*=1-pe; } }
  e.pAnyM=1-pNoM; e.pAnySpec=1-pNoSpec; e.pAnyEt=1-pNoEt; return e;
}
// Probability of at least one copy of this printing, including foil copies.
// This is the unmodified slot model, not a pity-adjusted probability.
function printingChance(c){
  let none=1;
  for(const slot of SLOTS){
    let p=0;
    for(const o of slotDist(slot)){
      const cards=pool(o.spec);
      p+=o.p*cards.filter(x=>cardKey(x)===cardKey(c)).length/cards.length;
    }
    none*=Math.pow(1-p,slot.n);
  }
  return 1-none;
}
const pct=(x,d=1)=>(x*100).toFixed(d)+'%';
function renderOdds(){
  const sp=x=>x.spec.src==='treat'?(TREAT_INFO[x.spec.sheet]?.label||x.spec.sheet):x.spec.src==='eternal'?'Eternal (TLE) reprint':x.spec.src==='allied'?'Common dual land':x.spec.src==='basic'?'Basic land':({C:'Common',U:'Uncommon',R:'Rare',M:'Mythic'})[x.r];
  document.getElementById('slotTable').innerHTML=SLOTS.map(s=>{
    const d=slotDist(s);
    return `<h3>${s.n>1?s.n+'× ':''}${s.label}${s.foil?' (always foil)':''}</h3><table>${d.map(x=>`<tr><td><span class="rdot" style="background:${RC[x.r]};box-shadow:0 0 0 1px #fff4"></span>${sp(x)}${x.spec.r&&x.spec.src==='treat'?' · '+x.spec.r:''}${x.foil&&!s.foil?' · foil':''}</td><td class="n">${pct(x.p,x.p<.01?2:1)}</td></tr>`).join('')}</table>`;
  }).join('');
  const e=expected(), specificM=printingChance(pool({src:'base',r:'M'})[0]);
  document.getElementById('oddsTable').innerHTML=`<table>
    <tr><th>Outcome</th><th class="n">Chance / avg</th><th class="n">≈ 1 in</th></tr>
    <tr><td>At least one mythic</td><td class="n">${pct(e.pAnyM)}</td><td class="n">${(1/e.pAnyM).toFixed(1)} packs</td></tr>
    <tr><td>At least one special treatment</td><td class="n">${pct(e.pAnySpec)}</td><td class="n">${(1/e.pAnySpec).toFixed(1)} packs</td></tr>
    <tr><td>Eternal (TLE) card</td><td class="n">${pct(e.pAnyEt,2)}</td><td class="n">${(1/e.pAnyEt).toFixed(0)} packs</td></tr>
    <tr><td>Avg rares per pack</td><td class="n">${e.R.toFixed(2)}</td><td></td></tr>
    <tr><td>Avg mythics per pack</td><td class="n">${e.M.toFixed(3)}</td><td></td></tr>
    <tr><td>Avg foils per pack</td><td class="n">${e.foil.toFixed(2)}</td><td></td></tr>
    <tr><td>At least one <i>specific</i> regular mythic printing<br><small class="dim">Includes foil copies; excludes special prints and pity</small></td><td class="n">${pct(specificM,2)}</td><td class="n">${(1/specificM).toFixed(0)} packs</td></tr>
    </table>
    <p class="note">Card counts: ${BASE.filter(c=>c.r==='C').length} commons, ${BASE.filter(c=>c.r==='U').length} uncommons, ${BASE.filter(c=>c.r==='R').length} rares, ${BASE.filter(c=>c.r==='M').length} mythics in TLA; ${ETERN.length} Eternal reprints.</p>`;
  document.getElementById('gachaRules').innerHTML=`<ul style="margin:0;padding-left:18px">
    <li>One pack costs <b>${$$(cost(1))}</b>; a 30-pack box costs ${$$(cost(30))}.</li>
    <li>Selling pays <b>${S.settings.buy}%</b> of market price, like a store buylist. "Sell extras" keeps ${S.settings.keep} of each card.</li>
    <li>Mythic pity: ${S.settings.pity>0?`<b>on</b>. After ${S.settings.pity-1} packs in a row with no mythic, the next pack's rare slot is a guaranteed mythic. With pity on, the observed mythic rate will run above the paper rate.`:'<b>off</b>. Odds match the paper booster model exactly.'}</li>
    <li>Journey runs pay cash for defeated enemies when the run ends.</li></ul>`;
  const ev=packEV();
  document.getElementById('oddsTable').insertAdjacentHTML('afterbegin',`<div class="sumTiles" style="grid-template-columns:repeat(3,1fr)">${tile('Expected value',$$(ev.total),'market value per pack')}${tile('Pack price',$$(cost(1)),'')}${tile('Expected return',(ev.total/cost(1)*100).toFixed(0)+'%',ev.total<cost(1)?'you lose on average':'you profit on average')}</div>
    <table style="margin-bottom:14px"><tr><th>Slot</th><th class="n">Avg value</th></tr>${ev.slots.map(s=>`<tr><td>${s.n>1?s.n+'× ':''}${s.label}</td><td class="n">${$$(s.v*s.n)}</td></tr>`).join('')}</table>
    <p class="note">Prices: ${priceDate()}, from Scryfall (TCGplayer market). Sell value at your buylist rate is about ${$$(ev.total*S.settings.buy/100)} per pack.</p>`);
}

