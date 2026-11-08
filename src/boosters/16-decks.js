/* ================= Decks ================= */
const NAME_KEYS={}; // name → every key with that name (base + special prints, every set)
function initNameKeys(){ ALL_BASE.concat(allSpecials()).forEach(c=>{ (NAME_KEYS[c.name]=NAME_KEYS[c.name]||[]).push(cardKey(c)); }); }
function owned(name){ return (NAME_KEYS[name]||[]).reduce((s,k)=>s+(S.coll[k]||0)+(S.foil[k]||0),0); }
function ownedTLE(c){ const k=cardKey(c); return (S.coll[k]||0)+(S.foil[k]||0); }
function mv(c){ if(!c.cost) return 0; return c.cost.split(' ').reduce((s,t)=>s+(/^\d+$/.test(t)?+t:t==='X'?0:1),0); }
const PAIRS={WU:'Azorius',WB:'Orzhov',RW:'Boros',GW:'Selesnya',UB:'Dimir',UR:'Izzet',GU:'Simic',BR:'Rakdos',BG:'Golgari',RG:'Gruul'};
const BASIC_NUM={W:['Plains','282'],U:['Island','283'],B:['Swamp','284'],R:['Mountain','285'],G:['Forest','286']};
const deckPkg=()=>PKG[MAIN_SET];
const KEYSET={}; deckPkg().archetypes.forEach(a=>KEYSET[a.id]=new Set(a.key));
function buildDeck(pair,fmt,src){
  const cols=new Set(pair.split(''));
  const keys=KEYSET[pair]||new Set();
  const cand=[];
  const seen=new Set();
  BASE.forEach(c=>{ if(c.r==='L'||seen.has(c.name)) return; seen.add(c.name); const n=src?src(c):owned(c.name); if(n) cand.push({c,n}); });
  if(!src) ETERN.forEach(c=>{ const n=ownedTLE(c); if(n) cand.push({c:Object.assign({},c,{treat:'etern'}),n}); });
  const items=[];
  for(const {c,n} of cand){
    const cc=(c.col||'').split('').filter(Boolean);
    if(!cc.every(x=>cols.has(x))) continue;
    const isLand=/Land/.test(c.type);
    if(isLand && !keys.has(c.name)) continue;
    const m=mv(c), cre=/Creature/.test(c.type);
    let sc={M:4.6,R:3.9,U:2.7,C:1.9}[c.r]||1.5;
    if(keys.has(c.name)) sc+=2; if(cc.length===2) sc+=.5; if(cre) sc+=.3; if(!cc.length&&!isLand) sc-=.6;
    if(m>=7) sc-=1.6; else if(m===6) sc-=.6;
    const copies=fmt==='con'?Math.min(n,4):n;
    for(let i=0;i<copies;i++) items.push({c,sc:sc-i*(fmt==='con'?.1:.35),cre,m,isLand});
  }
  items.sort((a,b)=>b.sc-a.sc);
  const target=fmt==='con'?36:23, creT=fmt==='con'?20:15;
  const pick=[]; let nc=0;
  for(const it of items){ if(pick.length>=target) break; if(it.cre){ if(nc<creT){ pick.push(it); nc++; } } }
  for(const it of items){ if(pick.length>=target) break; if(!it.cre && !pick.includes(it)) pick.push(it); }
  for(const it of items){ if(pick.length>=target) break; if(!pick.includes(it)) pick.push(it); }
  // basics by color pips
  const pipc={}; [...cols].forEach(x=>pipc[x]=0);
  pick.forEach(it=>(it.c.cost||'').split(' ').forEach(t=>{ const ls=t.replace(/[PC\d]/g,'').split('').filter(x=>cols.has(x)); ls.forEach(x=>pipc[x]+=1/ls.length); }));
  const landsN=(fmt==='con'?60:40)-pick.length - pick.filter(it=>it.isLand).length*0;
  const nonbasic=pick.filter(it=>it.isLand).length;
  const basicN=Math.max(0,landsN);
  const totP=Object.values(pipc).reduce((a,b)=>a+b,0)||1;
  const basics={}; let given=0; const cl=[...cols];
  cl.forEach((x,i)=>{ basics[x]= i===cl.length-1 ? basicN-given : Math.round(basicN*(pipc[x]||0)/totP); given+=basics[x]; });
  const group={}; pick.forEach(it=>{ const k=it.c.set+':'+it.c.num; group[k]=group[k]||{c:it.c,n:0,cre:it.cre,m:it.m,isLand:it.isLand,sc:it.sc}; group[k].n++; });
  const spells=pick.filter(it=>!it.isLand);
  const power=pick.slice(0,target).reduce((s,it)=>s+it.sc,0)/target;
  return {pair,fmt,groups:Object.values(group),basics,count:pick.length+basicN,nonland:spells.length,creatures:pick.filter(it=>it.cre).length,
    avgMV:spells.length?spells.reduce((s,it)=>s+it.m,0)/spells.length:0, short:pick.length<target, power, nonbasic,
    curve:[0,1,2,3,4,5,6].map(v=>spells.filter(it=>Math.min(it.m,6)===v && !(v===0&&it.isLand)).length)};
}
function fitAll(fmt){ return Object.keys(PAIRS).map(p=>({pair:p,d:buildDeck(p,fmt)})).sort((a,b)=>b.d.power-a.d.power); }
let DECK=null;
function renderDecks(){
  const sel=document.getElementById('dArch');
  if(!sel.options.length){ sel.innerHTML=`<option value="auto">Auto · best fit for my collection</option>`+deckPkg().archetypes.map(a=>`<option value="${a.id}">${PAIRS[a.id]} (${a.id}) · ${a.name.replace(PAIRS[a.id]+' ','')}</option>`).join(''); }
  const fmt=document.getElementById('dFmt').value;
  const fits=fitAll(fmt); const fitMap={}; fits.forEach((f,i)=>fitMap[f.pair]={...f,rank:i});
  const pmax=fits[0].d.power||1;
  document.getElementById('archGrid').innerHTML=deckPkg().archetypes.map(a=>{
    const have=a.key.filter(k=>owned(k)>0).length; const f=fitMap[a.id];
    const pct=Math.max(0,Math.min(100,(f.d.power/5.5)*100));
    return `<div class="arch${f.rank===0&&S.packs?' best':''}"><div class="top"><span class="pp">${a.id.split('').map(x=>`<span class="pip ${x}"></span>`).join('')}</span><b>${esc(a.name)}</b>${f.rank===0&&S.packs?'<span class="pill" style="padding:3px 9px;font-size:12px;border-color:#e8b85a">Best fit</span>':''}</div>
      <div class="note">${esc(a.theme)}</div>
      <div class="row" style="font-size:13px;color:var(--mute);font-weight:700"><span>Your fit</span><div class="meter" style="flex:1"><i style="width:${pct}%"></i></div><span>${have}/${a.key.length} key cards</span></div>
      <div class="kchips">${a.key.map(k=>`<span class="kchip${owned(k)?' have':''}" data-n="${esc(k)}">${esc(k)}${owned(k)>1?' ×'+owned(k):''}</span>`).join('')}</div>
      <div><button class="btn" data-build="${a.id}" style="padding:7px 12px;font-size:14px">Build this deck</button></div></div>`;
  }).join('');
  document.getElementById('stdGrid').innerHTML=deckPkg().decks.map(d=>{
    const tot=d.key.length*4, have=d.key.reduce((s,k)=>s+Math.min(4,owned(k)),0);
    return `<div class="arch"><div class="top"><b>${esc(d.name)}</b><span class="pill" style="padding:3px 9px;font-size:12px">${d.share} of winning decks</span></div>
      <div class="note">${esc(d.note)}</div>
      <div class="row" style="font-size:13px;color:var(--mute);font-weight:700"><span>Avatar playset</span><div class="meter" style="flex:1"><i style="width:${have/tot*100}%"></i></div><span>${have}/${tot}</span></div>
      <div class="kchips">${d.key.map(k=>`<span class="kchip${owned(k)>=4?' have':''}" data-n="${esc(k)}">${esc(k)} · ${Math.min(4,owned(k))}/4</span>`).join('')}</div></div>`;
  }).join('');
  document.querySelectorAll('[data-build]').forEach(b=>b.onclick=()=>{ sel.value=b.dataset.build; buildAndShow(); window.scrollTo({top:0,behavior:'smooth'}); });
  document.querySelectorAll('.kchip').forEach(ch=>ch.onclick=()=>{ const c=BASE.find(x=>x.name===ch.dataset.n); if(c) openZoom(c,false); });
  buildAndShow(fits);
}
function buildAndShow(fits){
  const fmt=document.getElementById('dFmt').value; let pair=document.getElementById('dArch').value;
  if(pair==='auto'){ fits=fits||fitAll(fmt); pair=fits[0].pair; }
  const d=buildDeck(pair,fmt); DECK=d;
  const out=document.getElementById('deckOut');
  if(!S.packs){ out.innerHTML='<div class="note">Open some packs first. The builder only uses cards you own.</div>'; return; }
  const arch=deckPkg().archetypes.find(a=>a.id===pair);
  const sec=(title,list)=>list.length?`<div class="dsec"><h4>${title} (${list.reduce((s,g)=>s+g.n,0)})</h4>${list.sort((a,b)=>a.m-b.m||b.sc-a.sc).map(g=>`<div class="dline" data-k="${g.c.set}:${g.c.num}"><span class="q">${g.n}</span><span class="rdot" style="background:${RC[g.c.r]};box-shadow:0 0 0 1px #fff3"></span><span class="nm">${esc(g.c.flavor||g.c.name)}</span><span class="pips">${pips(g.c.cost)}</span></div>`).join('')}</div>`:'';
  const cre=d.groups.filter(g=>g.cre&&!g.isLand), spl=d.groups.filter(g=>!g.cre&&!g.isLand), lnd=d.groups.filter(g=>g.isLand);
  const basicsHTML=Object.entries(d.basics).filter(([,n])=>n>0).map(([x,n])=>`<div class="dline"><span class="q">${n}</span><span class="pip ${x}" style="font-size:14px"></span><span class="nm">${BASIC_NUM[x][0]}</span></div>`).join('');
  const cmax=Math.max(...d.curve,1);
  const top=d.groups.filter(g=>!g.isLand).sort((a,b)=>b.sc-a.sc).slice(0,4);
  out.innerHTML=`<div class="deckGrid"><div>
      <div class="row" style="margin-bottom:10px"><span class="pp" style="display:flex;gap:3px">${pair.split('').map(x=>`<span class="pip ${x}" style="width:22px;height:22px"></span>`).join('')}</span>
        <h2 style="margin:0">${PAIRS[pair]} · ${esc(arch?arch.name.replace(PAIRS[pair]+' ',''):'')}</h2></div>
      ${d.short?`<div class="note" style="color:#f0a070;margin-bottom:10px">Not enough playables in these colors yet: ${d.nonland} of ${d.fmt==='con'?36:23} spell slots filled. Open more packs!</div>`:''}
      <div class="dlist">${sec('Creatures',cre)}${sec('Spells',spl)}${lnd.length||basicsHTML?`<div class="dsec"><h4>Lands (${lnd.reduce((s,g)=>s+g.n,0)+Object.values(d.basics).reduce((a,b)=>a+b,0)})</h4>${lnd.map(g=>`<div class="dline" data-k="${g.c.set}:${g.c.num}"><span class="q">${g.n}</span><span class="nm">${esc(g.c.name)}</span></div>`).join('')}${basicsHTML}</div>`:''}</div>
    </div><div>
      <div class="sumTiles" style="grid-template-columns:repeat(3,1fr)">${tile('Cards',d.count)}${tile('Creatures',d.creatures)}${tile('Avg mana value',d.avgMV.toFixed(2))}</div>
      <h3 style="margin-top:4px">Mana curve</h3>
      <div class="curve">${d.curve.map((n,i)=>`<div><b style="color:var(--ink)">${n||''}</b><i style="height:${n/cmax*80}%"></i><span>${i===6?'6+':i}</span></div>`).join('')}</div>
      <h3>Top cards</h3>
      <div class="keyRow" style="--cw:118px">${top.map(g=>`<div class="dline" style="padding:0" data-k="${g.c.set}:${g.c.num}">${cardHTML(g.c,false)}</div>`).join('')}</div>
    </div></div>`;
  out.querySelectorAll('[data-k]').forEach(el=>el.onclick=()=>{ const c=findCard(el.dataset.k)||d.groups.find(g=>g.c.set+':'+g.c.num===el.dataset.k)?.c; c&&openZoom(c,false); });
}
document.getElementById('dBuild').onclick=()=>buildAndShow();
document.getElementById('dArch').onchange=()=>buildAndShow();
document.getElementById('dFmt').onchange=()=>renderDecks();
document.getElementById('dCopy').onclick=async()=>{
  if(!DECK) return;
  let txt='Deck\n';
  DECK.groups.forEach(g=>{ txt+=`${g.n} ${g.c.name.split(' // ')[0]} (${g.c.set}) ${g.c.num}\n`; });
  Object.entries(DECK.basics).forEach(([x,n])=>{ if(n>0) txt+=`${n} ${BASIC_NUM[x][0]} (TLA) ${BASIC_NUM[x][1]}\n`; });
  try{ await navigator.clipboard.writeText(txt); toast('Deck list copied in MTG Arena format'); }
  catch(e){ document.getElementById('mbody').innerHTML=`<h2>Deck list</h2><textarea style="width:100%;height:50vh;background:var(--bg2);color:var(--ink);border:1px solid var(--line);border-radius:8px;font:13px monospace">${esc(txt)}</textarea>`; document.getElementById('modal').classList.add('on'); }
};



