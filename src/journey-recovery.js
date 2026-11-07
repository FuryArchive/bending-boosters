// Recover unpaid terminal runs even when reloading onto another tab.
let terminalJourneySave=false;
try{
  const saved=JSON.parse(localStorage.getItem('bb.run')||'null');
  terminalJourneySave=!!saved && (saved.epoch||null)===(S.runEpoch||null) && ['won','lost'].includes(saved.status);
}catch(e){}
if (terminalJourneySave || document.getElementById('v-journey').classList.contains('on')) mountJourneyOnce();
