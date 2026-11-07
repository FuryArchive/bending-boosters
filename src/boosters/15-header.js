/* ================= Header / misc ================= */
function refreshHeader(){
  document.getElementById('gems').textContent=$$(S.money);
  document.getElementById('spent').textContent=$$(collectionValue());
  document.getElementById('p1cost').textContent=(S.freePacks||0)>0?`free · ${S.freePacks} waiting`:$$(cost(1));
  document.getElementById('p10cost').textContent=$$(cost(10));
  const save30=cost(1)*30-cost(30);
  document.getElementById('p30cost').textContent=$$(cost(30))+(save30>0?` · save ${$$(save30)}`:'');
  document.getElementById('soundBtn').textContent=S.settings.sound?'🔊':'🔇';
  const pi=document.getElementById('pityInfo');
  pi.innerHTML = S.settings.pity>0 ? `Mythic pity: <b>${S.since}</b> / ${S.settings.pity} packs` : `Packs since your last mythic: <b>${S.since}</b> <span class="dim">· pity off, faithful paper odds</span>`;
}
let tt; function toast(m){const t=document.getElementById('toast');t.textContent=m;t.classList.add('on');clearTimeout(tt);tt=setTimeout(()=>t.classList.remove('on'),1900);}
document.getElementById('soundBtn').onclick=()=>{ S.settings.sound=!S.settings.sound; save(); refreshHeader(); if(S.settings.sound) SFX.U(); };

document.getElementById('tabs').addEventListener('click',e=>{ const b=e.target.closest('button'); if(b) showView(b.dataset.v); });
function showView(v){
  document.querySelectorAll('#tabs button').forEach(x=>x.classList.toggle('on',x.dataset.v===v));
  document.querySelectorAll('section.view').forEach(x=>x.classList.toggle('on',x.id==='v-'+v));
  if(v==='open'){ renderResumeCard(); BBJ.showTip('packs'); }
  if(v==='collection'){ renderCollection(); BBJ.showTip('collection'); }
  if(v==='decks') renderDecks();
  if(v==='journey') mountJourneyOnce();
  if(v==='stats') renderStats();
  if(v==='odds') renderOdds();
  if(v==='settings') renderSettings();
  try{ history.replaceState(null,'','#'+v); }catch(e){}
}

