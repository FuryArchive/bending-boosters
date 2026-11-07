/* ================= Card pools ================= */
const BASE=DATA.base, ETERN=DATA.eternal, TREAT=DATA.treat;
const byName={}; BASE.forEach(c=>{ if(!byName[c.name]||c.r!=='L') byName[c.name]=c; });
const allied=new Set(TREAT['allied lands'].map(x=>x.name));
const TREAT_INFO={
  'scene cards':{id:'scene',label:'Scene',cls:'bl'},
  'field notes':{id:'field',label:'Field Notes',cls:'field'},
  'battle pose':{id:'pose',label:'Battle Pose',cls:'pose'},
  'elemental frame':{id:'elem',label:'Elemental Frame',cls:'elem'},
  'borderless dfc saga':{id:'saga',label:'Borderless Saga',cls:'bl'},
  'appa basic':{id:'appa',label:'Appa Full Art',cls:'bl'},
  'avatar journey basic':{id:'journey',label:'Journey Full Art',cls:'bl'},
};
function treatCards(sheet){
  const info=TREAT_INFO[sheet]||{};
  return TREAT[sheet].map(t=>{
    const b = (sheet.includes('basic')) ? BASE.find(c=>c.name===t.name&&c.r==='L') : byName[t.name];
    return Object.assign({},b,{num:t.num,artist:t.artist||b.artist,treat:info.id||null,base:b.num});
  });
}
const pools={};
function pool(spec){
  const k=JSON.stringify(spec); if(pools[k]) return pools[k];
  let p;
  if(spec.src==='base'){ p=BASE.filter(c=>c.r===spec.r && !(spec.excl&&allied.has(c.name))); }
  else if(spec.src==='eternal'){ p=ETERN.map(c=>Object.assign({},c,{treat:'etern'})); }
  else if(spec.src==='allied'){ p=TREAT['allied lands'].map(t=>byName[t.name]); }
  else if(spec.src==='basic'){ p=TREAT['default basic'].map(t=>BASE.find(c=>c.num===t.num)); }
  else { p=treatCards(spec.sheet); if(spec.r){ const f=p.filter(c=>c.r===spec.r); if(f.length) p=f; } }
  return pools[k]=p;
}
/* Slot model — mirrors Forge's TLA booster definition */
const T=(sheet,r,p)=>[p,{src:'treat',sheet,r}];
const SPECIALS=(scale=1)=>[T('scene cards','R',.006*scale),T('scene cards','M',.004*scale),T('field notes','R',.006),T('field notes','M',.004),
  T('battle pose','R',.001),T('battle pose','M',.0005),T('elemental frame','R',.001),T('elemental frame','M',.0005),T('borderless dfc saga','M',.0005)];
const SLOTS=[
  {id:'common',n:6,label:'Common',base:{src:'base',r:'C',excl:1},rep:[]},
  {id:'cb',n:1,label:'Common / Eternal',base:{src:'base',r:'C'},rep:[[.0384,{src:'eternal'}]]},
  {id:'unc',n:3,label:'Uncommon',base:{src:'base',r:'U'},rep:[T('scene cards','U',.036)]},
  {id:'land',n:1,label:'Land',base:{src:'allied'},rep:[
    [.20,{src:'basic'}],[.10,{src:'treat',sheet:'avatar journey basic'}],[.10,{src:'treat',sheet:'appa basic'}],
    [.10,{src:'allied'},true],[.05,{src:'basic'},true],[.025,{src:'treat',sheet:'avatar journey basic'},true],[.025,{src:'treat',sheet:'appa basic'},true]]},
  {id:'wild',n:1,label:'Wildcard',base:{src:'base',r:'U'},rep:[[.042,{src:'base',r:'C'}],[.167,{src:'base',r:'R'}],[.0026,{src:'base',r:'M'}],T('scene cards','U',.008),...SPECIALS()]},
  {id:'foil',n:1,label:'Foil wildcard',foil:true,base:{src:'base',r:'C'},rep:[[.367,{src:'base',r:'U'}],[.067,{src:'base',r:'R'}],[.012,{src:'base',r:'M'}],T('scene cards','U',.008),...SPECIALS()]},
  {id:'rare',n:1,label:'Rare / Mythic',base:{src:'base',r:'R'},rep:[[.126,{src:'base',r:'M'}],T('scene cards','R',.016),T('scene cards','M',.004),
    T('field notes','R',.006),T('field notes','M',.004),T('battle pose','R',.001),T('battle pose','M',.0005),T('elemental frame','R',.001),T('elemental frame','M',.0005),T('borderless dfc saga','M',.0005)]},
];

function rollSlot(slot,forceMythic){
  let spec=slot.base, foil=!!slot.foil;
  if(forceMythic){ spec={src:'base',r:'M'}; }
  else {
    const x=rnd(); let acc=0;
    for(const [p,s,f] of slot.rep){ acc+=p; if(x<acc){ spec=s; if(f) foil=true; break; } }
  }
  const c=pick(pool(spec));
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

