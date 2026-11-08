/* ================= Card render ================= */
const FR={W:['#e9dfc4','#f6efdc'],U:['#7fb3d9','#d6e9f7'],B:['#6b5c7a','#ddd3e6'],R:['#d77556','#f7d9cc'],G:['#6e9a5c','#d9ead0'],M:['#c9a443','#f3e4b4'],X:['#9c958c','#e6e1da'],L:['#9b8566','#ece2d0']};
function frameOf(c){ const cols=c.col||''; if(/Land/.test(c.type)&&cols.length!==1) return FR.L; if(cols.length>1) return FR.M; if(!cols) return FR.X; return FR[cols]; }
const HYB={W:'#f8f0c8',U:'#9fd0f0',B:'#b9a9c4',R:'#f2a183',G:'#9fcf93'};
function pips(cost){
  if(!cost) return '';
  return cost.split(' ').map(t=>{
    if(/^\d+$/.test(t)||t==='X') return `<span class="pip N">${t}</span>`;
    const ls=t.replace(/[PC]/g,'').split('');
    if(ls.length===1) return `<span class="pip ${ls[0]}"></span>`;
    return `<span class="pip" style="background:linear-gradient(135deg,${HYB[ls[0]]} 50%,${HYB[ls[1]]} 50%)"></span>`;
  }).join('');
}
const RC={C:'#1b1b1b',U:'#b8c7d3',R:'#e8c25a',M:'#f07a3a',L:'#1b1b1b'};
const esc=s=>String(s??'').replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
function treatInfo(c){ return c.treat?SHEET_BY_ID[c.treat]:undefined; }
function cardHTML(c,foil,face,size,eager){
  face=face||'front';
  const f=face==='back'&&c.back ? Object.assign({},c,{name:c.back.name,type:c.back.type,pt:c.back.pt,kw:c.back.kw,cost:'',flavor:null}) : c;
  const fr=frameOf(c); const ti=treatInfo(c);
  let cls='card'; if(ti) cls+=' '+ti.cls; if(c.treat==='etern') cls+=' etern'; if(foil) cls+=' foil';
  const shownName=f.flavor||f.name;
  const kw=(f.kw||[]).join(' · ');
  const sub=f.flavor?`<div class="fl">(${esc(f.name)})</div>`:'';
  const tag = ti ? ti.label : (c.treat==='etern'?'Eternal':'');
  const typeLine=(f.type||'').replace(/^((?:Legendary |Snow |Basic )*(?:Artifact |Enchantment |Kindred )*(?:Creature|Instant|Sorcery|Land|Artifact|Enchantment|Planeswalker|Battle))\s+(.+)$/, (m,a,b)=>/^(Creature|Artifact|Enchantment|Land)\b/.test(b)?m:a+' — '+b);
  const src=S.settings.real?imgSrc(c,size||'normal',face):null;
  return `<div class="${cls}" data-k="${c.set}:${c.num}" data-sz="${size||'normal'}" data-face="${face}" data-name="${esc(shownName)}" style="--fr:linear-gradient(170deg,${fr[0]},${fr[0]}cc);--fb:${fr[1]}">
    ${tag?`<div class="tag">${tag}</div>`:''}
    <div class="frame">
      <div class="bar"><span class="name">${esc(shownName)}</span><span class="cost">${pips(f.cost)}</span></div>
      <div class="art">${artSVG(c)}</div>
      ${ti&&ti.cls==='bl'?'<div class="spacer"></div>':''}
      <div class="bar type"><span style="flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(typeLine)}</span><span class="rs" style="background:${RC[c.r]}"></span></div>
      <div class="text">${kw?`<span class="kw">${esc(kw)}</span>`:'<span style="color:#8a7d6c">—</span>'}${sub}${c.back&&face!=='back'?`<div class="fl">⟲ ${esc(c.back.name)}</div>`:''}</div>
    </div>
    ${f.pt?`<div class="pt">${esc(f.pt)}</div>`:''}
    <div class="foot"><span>${c.set} ${String(c.num).padStart(3,'0')} · ${c.r}${foil?' ★':''}</span><span>${c.artist?('✎ '+esc(c.artist)):''}</span></div>
    ${src?imgTag(src,shownName,eager):''}
  </div>`;
}
let CARD_IDX=null;
function findCard(k){ if(!CARD_IDX){ CARD_IDX={}; ALL_BASE.concat(allEternal(),allSpecials()).forEach(c=>CARD_IDX[c.set+':'+c.num]=c); } return CARD_IDX[k]; }

