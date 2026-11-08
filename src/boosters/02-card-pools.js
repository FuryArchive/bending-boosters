/* ================= Card pools ================= */
const BASE=pkgBase(MAIN_SET), ETERN=PKG[MAIN_SET].cards.eternal||[], TREAT=PKG[MAIN_SET].cards.treat||{};
const TREAT_INFO=PKG[MAIN_SET].sheets; // special-version sheets: name -> {id,label,cls}
// Per set: the base printing for each name (a non-land printing wins over a land).
const NAMED={};
function namedIn(code){
  if(NAMED[code]) return NAMED[code];
  const by={}; PKG[code].cards.base.forEach(c=>{ if(!by[c.name]||c.r!=='L') by[c.name]=c; });
  return NAMED[code]=by;
}
const byName=namedIn(MAIN_SET);
function treatCards(sheet,code=MAIN_SET){
  const pk=PKG[code], info=pk.sheets[sheet]||{}, base=pk.cards.base, by=namedIn(code);
  return pk.cards.treat[sheet].map(t=>{
    const b = (sheet.includes('basic')) ? base.find(c=>c.name===t.name&&c.r==='L') : by[t.name];
    return Object.assign({},b,{num:t.num,artist:t.artist||b.artist,treat:info.id||null,base:b.num});
  });
}
// A pool spec (set.json products) names the cards one booster slot rolls from:
//   {src:"base", r, exclSheet?}  base printings of rarity r, minus the names on exclSheet
//   {src:"eternal"}              the set's Eternal printings
//   {src:"names", sheet}         the base printings named on a sheet
//   {src:"nums", sheet}          the base printings numbered on a sheet
//   {src:"treat", sheet, r?}     a special-version sheet (only rarity r, when it has any)
const pools={};
function pool(spec,code=MAIN_SET){
  const k=code+JSON.stringify(spec); if(pools[k]) return pools[k];
  const cards=PKG[code].cards, base=cards.base, treat=cards.treat||{};
  let p;
  if(spec.src==='base'){ const ex=spec.exclSheet?new Set(treat[spec.exclSheet].map(x=>x.name)):null; p=base.filter(c=>c.r===spec.r && !(ex&&ex.has(c.name))); }
  else if(spec.src==='eternal'){ p=(cards.eternal||[]).map(c=>Object.assign({},c,{treat:'etern'})); }
  else if(spec.src==='names'){ const by=namedIn(code); p=treat[spec.sheet].map(t=>by[t.name]); }
  else if(spec.src==='nums'){ p=treat[spec.sheet].map(t=>base.find(c=>c.num===t.num)); }
  else { p=treatCards(spec.sheet,code); if(spec.r){ const f=p.filter(c=>c.r===spec.r); if(f.length) p=f; } }
  return pools[k]=p;
}
/* Slot model: each set's Play Booster slots live in its set.json (products.play.slots). */
const slotsOf=code=>PKG[code].products.play.slots;
const SLOTS=slotsOf(MAIN_SET);

function rollSlot(slot,forceMythic,code=MAIN_SET){
  let spec=slot.base, foil=!!slot.foil;
  if(forceMythic){ spec={src:'base',r:'M'}; }
  else {
    const x=rnd(); let acc=0;
    for(const [p,s,f] of slot.rep){ acc+=p; if(x<acc){ spec=s; if(f) foil=true; break; } }
  }
  const c=pick(pool(spec,code));
  return {c,foil,slot:slot.id};
}
function cardKey(c){ return c.set+':'+c.num; }
function isSpecial(c){ return !!c.treat && !['appa','journey','etern'].includes(c.treat); }
function tier(p){ // for hint glow
  if(isSpecial(p.c)) return 'S';
  if(p.c.r==='M') return 'M';
  if(p.c.r==='R') return 'R';
  return '';
}

