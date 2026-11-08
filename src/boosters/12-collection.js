/* ================= Collection ================= */
const F={own:'all',r:'all'};
document.getElementById('colFilters').addEventListener('click',e=>{
  const c=e.target.closest('.chip'); if(!c) return;
  if(c.dataset.own){ F.own=c.dataset.own; document.querySelectorAll('[data-own]').forEach(x=>x.classList.toggle('on',x===c)); }
  if(c.dataset.r){ F.r=c.dataset.r; document.querySelectorAll('[data-r]').forEach(x=>x.classList.toggle('on',x===c)); }
  renderCollection();
});
['fSet','fCol','fq','fSort'].forEach(id=>document.getElementById(id).addEventListener('input',renderCollection));
let SPEC_LIST=null;
function specList(){ return pkgSpecials(MAIN_SET); }
function ownedName(name,set){ // any version; set is a package code or an Eternal set code (TLE)
  const lists = pkgOf(set)?pkgBase(set).concat(pkgSpecials(set)):allEternal().filter(c=>c.set===set);
  return lists.some(c=>c.name===name&&(S.coll[cardKey(c)]||S.foil[cardKey(c)]));
}
function renderCollection(){
  const set=document.getElementById('fSet').value, col=document.getElementById('fCol').value, q=document.getElementById('fq').value.trim().toLowerCase();
  let list = set==='TLA'?BASE : set==='TLE'?ETERN.map(c=>Object.assign({},c,{treat:'etern'})) : specList();
  // summary
  const uniq=new Set(BASE.filter(c=>c.r!=='L').map(c=>c.name));
  let have=0; uniq.forEach(n=>{ if(ownedName(n,'TLA')) have++; });
  const eHave=ETERN.filter(c=>S.coll[cardKey(c)]||S.foil[cardKey(c)]).length;
  const sHave=specList().filter(c=>S.coll[cardKey(c)]||S.foil[cardKey(c)]).length;
  document.getElementById('colSummary').innerHTML=`Main set <b>${have}/${uniq.size}</b> (${(have/uniq.size*100).toFixed(1)}%) · Eternal <b>${eHave}/${ETERN.length}</b> · Specials <b>${sHave}/${specList().length}</b>`;
  document.getElementById('colBar').style.width=(have/uniq.size*100)+'%';
  list=list.filter(c=>{
    const k=cardKey(c), own=(S.coll[k]||0)+(S.foil[k]||0);
    if(F.own==='have'&&!own) return false; if(F.own==='miss'&&own) return false;
    if(F.r!=='all'&&c.r!==F.r) return false;
    if(col){ const cc=c.col||''; if(col==='M'){ if(cc.length<2) return false; } else if(col==='X'){ if(cc.length) return false; } else if(cc!==col) return false; }
    if(q && !(c.name.toLowerCase().includes(q)||(c.flavor||'').toLowerCase().includes(q))) return false;
    return true;
  });
  const so=document.getElementById('fSort').value;
  if(so==='price') list=list.slice().sort((a,b)=>priceOf(b,false)-priceOf(a,false));
  if(so==='count') list=list.slice().sort((a,b)=>((S.coll[cardKey(b)]||0)+(S.foil[cardKey(b)]||0))-((S.coll[cardKey(a)]||0)+(S.foil[cardKey(a)]||0)));
  const dv=dupesIn(null).reduce((s,x)=>s+x.n*sellPrice(x.c,x.foil),0);
  document.getElementById('sellAll').textContent=`Sell all extras (keep ${S.settings.keep}, Journey cards ${S.settings.keepJourney??12}) · ${$$(dv)}`;
  document.getElementById('sellWarn').textContent='';
  document.getElementById('sellAll').disabled=dv<=0;
  current=list.map(c=>({c,foil:false}));
  document.getElementById('colGrid').innerHTML=list.map((c,i)=>{
    const k=cardKey(c), n=S.coll[k]||0, nf=S.foil[k]||0;
    return `<div class="owned${n+nf?'':' no'}" data-i="${i}" style="cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:5px">${n?`<span class="cnt">×${n}</span>`:''}${nf?`<span class="cnt f">★${nf}</span>`:''}${cardHTML(c,nf>0&&!n)}<div class="cap" style="font-size:13px">${ptag(priceOf(c,false))}${nf?` · ★ ${ptag(priceOf(c,true))}`:''}</div></div>`;
  }).join('') || '<p class="muted">Nothing matches.</p>';
  document.querySelectorAll('#colGrid .owned').forEach(el=>el.onclick=()=>{const c=current[+el.dataset.i].c; openZoom(c,false);});
}

let sellArmed=false;
document.getElementById('sellAll').onclick=()=>{
  const b=document.getElementById('sellAll');
  if(!sellArmed){
    const {entries,plan}=sellExtrasPlan(null), drops=BBJ.starDrops(entries,plan);
    sellArmed=true; b.textContent='Click again to confirm';
    document.getElementById('sellWarn').textContent=drops.length?'Journey stars drop: '+drops.map(d=>`${d.name} ★${d.from} → ★${d.to}`).join(', '):'';
    setTimeout(()=>{ if(sellArmed){sellArmed=false; renderCollection();} },3000); return; }
  sellArmed=false; const r=sellList(dupesIn(null)); toast(`Sold ${r.n.toLocaleString()} cards for ${$$(r.v)}`); renderCollection();
};
