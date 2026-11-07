/* ================= Save file ================= */
// Export/import of the whole save (wallet, collection, settings, active run) as one JSON file.
document.getElementById('resetTips').onclick=()=>{ BBJ.resetTips(); toast('Tips will show again'); };
document.getElementById('exportSave').onclick=()=>{
  const file=BBJ.exportSave(localStorage);
  const url=URL.createObjectURL(new Blob([JSON.stringify(file)],{type:'application/json'}));
  const a=document.createElement('a');
  a.href=url; a.download=`bending-boosters-save-${BBJ.localDay()}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
};
document.getElementById('importFile').onchange=async e=>{
  const input=e.target, f=input.files&&input.files[0], msg=document.getElementById('importMsg');
  input.value='';
  if(!f) return;
  const parsed=BBJ.parseSaveFile(await f.text());
  if(!parsed.ok){ msg.textContent=parsed.error; return; }
  msg.innerHTML='Replace your current save with this file? A backup of the current one is kept. <button class="btn" id="importYes">Replace</button> <button class="btn" id="importNo">Cancel</button>';
  document.getElementById('importNo').onclick=()=>{ msg.textContent=''; };
  document.getElementById('importYes').onclick=()=>{
    const r=BBJ.importSave(localStorage,parsed.keys);
    if(!r.ok){ msg.textContent=r.error; return; }
    location.reload();
  };
};
