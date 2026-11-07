/* ================= Wire up ================= */
$('pack').onclick=()=>tryOpen(1);
$('open1').onclick=()=>tryOpen(1);
$('open10').onclick=()=>tryOpen(10);
$('open30').onclick=()=>tryOpen(30);
window.addEventListener('resize',()=>{ /* keep layout sane if resized mid-reveal */ });
load(); initNameKeys(); refreshHeader(); imgStatus(); loadImgIndex();
const h0=(location.hash||'').slice(1); if(['collection','decks','journey','stats','odds','settings'].includes(h0)) showView(h0);
