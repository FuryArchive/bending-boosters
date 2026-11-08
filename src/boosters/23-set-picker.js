/* ================= Set picker ================= */
// The pack shop opens the set picked here (S.settings.packSet), free packs too. Hidden with one set.
function appSubtitle(){
  const p=SET_PACKAGES;
  return p.length===1?`${p[0].name} (${p[0].code}) play booster simulator`:`Magic: The Gathering play booster simulator · ${p.map(x=>x.code).join(', ')}`;
}
function renderPackHero(){
  const pk=PKG[packSet()], pl=pk.products.play;
  document.getElementById('appSub').textContent=appSubtitle();
  document.getElementById('packTitle').innerHTML=`<small>PLAY BOOSTER · ${cardsPerPack(pk.code)} CARDS</small>${esc(pl.title)}`;
  document.getElementById('packSym').textContent=pk.symbol||pk.code;
  document.getElementById('pack').style.setProperty('--set-accent',pk.accent||'#e8c25a');
  document.getElementById('packEyebrow').textContent=`${pl.title} · Play boosters`;
  const tag=document.getElementById('packTagline'), blurb=document.getElementById('packBlurb');
  tag.textContent=pl.tagline||''; tag.hidden=!pl.tagline;
  blurb.textContent=pl.blurb||''; blurb.hidden=!pl.blurb;
  const pick=document.getElementById('setPick');
  pick.hidden=SET_PACKAGES.length<2;
  pick.innerHTML=pick.hidden?'':SET_PACKAGES.map(p=>`<button class="chip${p.code===pk.code?' on':''}" data-pick-set="${esc(p.code)}" style="--set-accent:${esc(p.accent||'#e8c25a')}">${esc(p.name)}</button>`).join('');
  pick.querySelectorAll('[data-pick-set]').forEach(b=>b.onclick=()=>{ S.settings.packSet=b.dataset.pickSet; save(); renderPackHero(); });
}
