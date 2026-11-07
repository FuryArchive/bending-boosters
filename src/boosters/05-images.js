/* ================= Images: Scryfall index → direct CDN URLs ================= */
let IMG={}; let imgIndexState='none';
function imgStatus(){
  const el=document.getElementById('imgStatus'), info=document.getElementById('imgInfo');
  const n=Object.keys(IMG).length;
  const txt=!S.settings.real?'Real card images are off (Settings).':
    imgIndexState==='loading'?'Loading the card image index from Scryfall…':
    n?`Real card images ready (${n} prints indexed). Images preload while each pack opens.`:
    imgIndexState==='failed'?'Couldn\'t reach Scryfall, so cards use generated art.':'';
  if(el) el.textContent=txt; if(info) info.textContent=n?`${n} prints cached`:'not cached';
}
async function loadImgIndex(force){
  if(!S.settings.real) { imgStatus(); return; }
  if(!force){ try{ const c=JSON.parse(localStorage.getItem('bb.imgidx')||'null'); if(c&&c.v===2&&Date.now()-c.t<14*864e5&&LIVEP){ IMG=c.m; imgIndexState='ready'; imgStatus(); return; } }catch(e){} }
  imgIndexState='loading'; imgStatus();
  let url='https://api.scryfall.com/cards/search?q='+encodeURIComponent('(set:tla or set:tle)')+'&unique=prints&order=set&include_extras=true';
  const m={}, pm={};
  try{
    while(url){
      const r=await fetch(url,{headers:{Accept:'application/json'}}); if(!r.ok) throw new Error('HTTP '+r.status);
      const j=await r.json();
      for(const c of j.data){
        const u=c.image_uris?c.image_uris.normal:(c.card_faces&&c.card_faces[0].image_uris?c.card_faces[0].image_uris.normal:null);
        if(!u) continue;
        const p=u.split('/normal/front/')[1]; if(!p) continue;
        m[c.set.toUpperCase()+':'+c.collector_number]=[p, c.card_faces&&c.card_faces[1]&&c.card_faces[1].image_uris?1:0];
        pm[c.set.toUpperCase()+':'+c.collector_number]=[c.prices.usd?+c.prices.usd:null,c.prices.usd_foil?+c.prices.usd_foil:null];
      }
      url=j.has_more?j.next_page:null; if(url) await new Promise(res=>setTimeout(res,120));
    }
    IMG=m; imgIndexState='ready'; LIVEP={t:Date.now(),m:pm};
    try{ localStorage.setItem('bb.prices',JSON.stringify(LIVEP)); }catch(e){}
    try{ localStorage.setItem('bb.imgidx',JSON.stringify({v:2,t:Date.now(),m})); }catch(e){}
    refreshVisibleImages();
  }catch(e){ console.warn('Scryfall index failed',e); imgIndexState='failed'; }
  imgStatus();
}
function imgSrc(c,size,face){
  size=size||'normal';
  const k=c.set+':'+c.num, e=IMG[k];
  if(e) return `https://cards.scryfall.io/${size}/${face==='back'&&e[1]?'back':'front'}/${e[0]}`;
  if(imgIndexState==='ready'||imgIndexState==='loading') return null; // not a known print → generated art
  return `https://api.scryfall.com/cards/${c.set.toLowerCase()}/${encodeURIComponent(c.num)}?format=image&version=${size}${face==='back'?'&face=back':''}`;
}
const preloaded=[];
function preload(list,size){ if(!S.settings.real) return; list.forEach(c=>{ const s=imgSrc(c,size); if(s){ const i=new Image(); i.decoding='async'; i.src=s; preloaded.push(i); if(preloaded.length>400) preloaded.shift(); } }); }
function refreshVisibleImages(){ // after the index arrives, swap fallback renders
  document.querySelectorAll('.card[data-k]').forEach(el=>{ if(el.querySelector('img.real')) return; const c=findCard(el.dataset.k); if(!c) return; const s=imgSrc(c,el.dataset.sz||'normal',el.dataset.face); if(s) el.insertAdjacentHTML('beforeend',imgTag(s,el.dataset.name||'')); });
}
function imgTag(src,alt,eager){ return `<img class="real" alt="${esc(alt)}" src="${src}" ${eager?'':'loading="lazy"'} decoding="async" referrerpolicy="no-referrer" onload="this.classList.add('ok');this.parentNode.classList.add('hasimg')" onerror="this.remove()">`; }

