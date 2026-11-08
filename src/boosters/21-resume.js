/* ================= Resume card ================= */
// Home-screen card for a Journey run in progress (read straight from its save).
function renderResumeCard(){
  const el=document.getElementById('resumeCard');
  const run=BBJ.readSavedRun(S.runEpoch);
  if(!run||!['map','node','fight'].includes(run.status)){ el.hidden=true; el.innerHTML=''; return; }
  const b=BBJ.runBrief(run);
  el.innerHTML=`<div class="grow"><b>Run in progress</b> · ${esc(BBJ.bookLabel(run))}, floor ${b.floor} · ${b.hp}/${b.maxHp} HP · ${b.deck} cards</div><button class="btn primary" id="resumeGo">Resume run</button>`;
  el.hidden=false;
  document.getElementById('resumeGo').onclick=()=>{
    showView('journey');
    const live=JOURNEY&&JOURNEY._state.run;
    if(!(live&&live.id===run.id)) JOURNEY.resume();
  };
}
