/* ================= Settings ================= */
const $=id=>document.getElementById(id);
function renderSettings(){
  const s=S.settings;
  $('sPrice').value=s.price; $('sBox').value=s.boxPrice; $('sBuy').value=s.buy; $('sKeep').value=s.keep; $('sKeepJourney').value=s.keepJourney??12; $('sPity').value=s.pity; $('sHints').checked=s.hints; $('sReal').checked=s.real; $('sSound').checked=s.sound; $('sFast').checked=s.fast; $('sSeed').value=s.seed||''; $('sStart').value=s.start;
  imgStatus();
}
$('saveSettings').onclick=()=>{
  const s=S.settings; const wasReal=s.real;
  s.price=Math.max(.5,+$('sPrice').value||6.99); s.boxPrice=Math.max(1,+$('sBox').value||149.99); s.buy=Math.min(100,Math.max(1,parseInt($('sBuy').value)||60)); s.keep=Math.max(0,parseInt($('sKeep').value)||0); const kj=parseInt($('sKeepJourney').value); s.keepJourney=Number.isFinite(kj)?Math.max(0,kj):12;
  s.pity=Math.max(0,parseInt($('sPity').value)||0); s.hints=$('sHints').checked; s.real=$('sReal').checked; s.sound=$('sSound').checked; s.fast=$('sFast').checked; s.start=Math.max(0,+$('sStart').value||0);
  save(); refreshHeader(); toast('Settings saved');
  if(s.real&&!wasReal) loadImgIndex(); imgStatus(); renderLast();
};
$('sReal').onchange=()=>$('saveSettings').click();
$('refreshImgs').onclick=()=>{ try{localStorage.removeItem('bb.imgidx');}catch(e){} IMG={}; loadImgIndex(true); };
$('applySeed').onclick=()=>{
  const settings=Object.assign({},S.settings,{seed:$('sSeed').value.trim(),start:Math.max(0,parseInt($('sStart').value)||0)});
  if(resetProgress(settings)) toast(settings.seed?`Reset with seed “${settings.seed}”`:'Reset with random seed');
};
let resetArmed=false;
$('resetAll').onclick=()=>{
  const c=$('resetConfirm');
  if(!resetArmed){ resetArmed=true; c.textContent='Click again to confirm.'; setTimeout(()=>{resetArmed=false;c.textContent='';},3000); return; }
  resetArmed=false; c.textContent='';
  if(resetProgress(Object.assign({},S.settings,{seed:''}))) toast('Everything reset');
};
function resetProgress(settings){
  const next=freshState(settings);
  // Commit the reset and its Journey invalidation together. If this write fails,
  // the previous wallet AND Journey save remain intact. A stale second key is
  // harmless after success, even if removal is blocked or the page closes now.
  next.runEpoch=window.crypto?.randomUUID?.() || `reset-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  if(!save(next)){ toast('Reset could not be saved. Free some browser storage and retry.'); return false; }
  // Preserve the shared state object's identity for the mounted Journey.
  Object.keys(S).forEach(k=>delete S[k]); Object.assign(S,next); rngState=S.rng|0;
  try{ localStorage.removeItem('bb.run'); }catch(e){}
  cancelOpening(); stage.classList.remove('on'); document.body.classList.remove('lock');
  stBody.innerHTML=''; stBottom.innerHTML='';
  JOURNEY&&JOURNEY.reset();
  DECK=null; CUR=[]; sellArmed=false;
  refreshHeader(); resetLast(); renderSettings();
  return true;
}
function resetLast(){ LAST=null; $('last').innerHTML='<div class="panel note" style="text-align:center;padding:40px">Fresh start. Click the pack to begin.</div>'; $('lastToggle').style.display='none'; $('lastTitle').textContent='Last opening'; }

