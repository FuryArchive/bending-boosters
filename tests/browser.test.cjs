// Correct-behavior regression tests. Fresh profiles only; never uses player saves.
const assert = require('node:assert/strict');
const {pathToFileURL} = require('node:url');
const env = require('./harness/env.cjs');
const {chromium} = env.playwright();
const source=process.argv[2] || env.GAME;
const url=pathToFileURL(source).href;
(async()=>{
 const browser=await chromium.launch(env.launchOptions({args:['--mute-audio','--disable-dev-shm-usage']}));
 const errors=[];
 async function fresh(target=url){
  const ctx=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  await ctx.route('https://**/*',r=>r.abort());
  const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.stack));
  await page.goto(target+'#debug');
  // Pin the pre-M1 $50 wallet: these checks test payout arithmetic; daily gifts are covered by friends-beta.test.cjs.
  await page.evaluate(()=>{S.settings.sound=false;S.settings.real=false;S.settings.fast=true;S.money=50;S.freePacks=0;save()});
  return {page,ctx};
 }
 async function doomed(page){
  await page.evaluate(()=>{
   showView('journey');BBJ._newRun('REGRESSION-DEFEAT','water');BBJ._debugGoto('fight');
   const r=BBJ._state.run,f=r.fight;r.stats.fights=3;r.hp=f.player.hp=1;
   f.player.block=0;f.player.dodge=0;f.enemy.countdown=1;f.enemy.intent={kind:'strike',dmg:100,hits:1};
  });
  await page.locator('#jxEnd').click();
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('bb.run'))?.status==='lost');
 }
 try{
  {
   const {page,ctx}=await fresh();
   for(const tab of ['open','collection','decks','stats','odds','settings','journey']){
    await page.locator(`#tabs [data-v="${tab}"]`).click();
    assert(await page.locator(`#v-${tab}`).isVisible());
   }
   const pack=await page.evaluate(()=>{showView('open');const before=S.money;tryOpen(1);return {spent:Math.round((before-S.money)*100),cards:S.cards,packs:S.packs};});
   assert.deepEqual(pack,{spent:699,cards:14,packs:1});
   await page.evaluate(()=>stageClose());
   const odds=await page.evaluate(()=>pool({src:'base',r:'M'}).map(printingChance));
   assert(odds.every(p=>Math.abs(p-0.0070253234913999485)<1e-12));
   await page.evaluate(()=>showView('odds'));
   assert.match(await page.locator('#oddsTable').innerText(),/0\.70%/);
   assert.match(await page.locator('#oddsTable').innerText(),/excludes special prints and pity/);
   const baseline=await fresh(pathToFileURL(env.HISTORY.original).href);
   const seededPulls=()=>{
    showView('settings');document.getElementById('sSeed').value='UNCHANGED-BOOSTER-SEQUENCE';document.getElementById('applySeed').click();
    return Array.from({length:75},()=>openPack().map(p=>[cardKey(p.c),p.foil,p.slot]));
   };
   assert.deepEqual(await page.evaluate(seededPulls),await baseline.page.evaluate(seededPulls));
   await baseline.ctx.close();
   console.log('PASS startup/views, normal pack debit/count, exact printing odds, 75 seeded packs match original');
   await ctx.close();
  }
  {
   const {page,ctx}=await fresh();
   await page.evaluate(()=>{S.money=10000;S.settings.fast=false;tryOpen(30);document.getElementById('bigPack').click();stageClose();tryOpen(1)});
   await page.waitForTimeout(1300);
   assert.deepEqual(await page.evaluate(()=>({last:LAST.packs.length,st:ST,big:!!document.getElementById('bigPack')})),{last:1,st:null,big:true});
   await page.locator('#bigPack').click();await page.waitForTimeout(1200);
   assert.equal(await page.evaluate(()=>ST.packs.length),1);
   await page.evaluate(()=>{stageClose();S.settings.fast=true;tryOpen(30);revealAll();const count=openingTimers.size;revealAll();window.doubleRevealTimers=[count,openingTimers.size];stageClose();tryOpen(1)});
   const counts=await page.evaluate(()=>window.doubleRevealTimers);assert.equal(counts[0],counts[1]);
   await page.waitForTimeout(6500);
   assert.equal(await page.evaluate(()=>ST.packs.length),1);
   // A normal reveal finishes and allows another pack.
   await page.locator('#stSkip').click();
   await page.waitForFunction(()=>spotReady || !!document.getElementById('again1'));
   if(await page.locator('#spot').isVisible()) await page.locator('#spot').click({position:{x:20,y:20}});
   await page.waitForFunction(()=>!!document.getElementById('again1'));
   assert.equal(await page.evaluate(()=>ST.hidden.size),0);
   await page.locator('#again1').click();assert.equal(await page.evaluate(()=>ST.packs.length),1);
   await page.evaluate(()=>stageClose());
   assert.equal(await page.evaluate(()=>openingTimers.size),0);
   console.log('PASS tear/reveal cancellation, double-reveal guard, normal reveal/again');
   await ctx.close();
  }
  {
   const {page,ctx}=await fresh();await doomed(page);
   const stale=await page.evaluate(()=>localStorage.getItem('bb.run'));
   await page.evaluate(()=>history.replaceState(null,'','#stats'));
   await page.reload();
   assert.deepEqual(await page.evaluate(()=>({money:S.money,income:S.runIncome,runs:S.journey.runs,saved:localStorage.getItem('bb.run')})),{money:53,income:3,runs:1,saved:null});
   assert.deepEqual(await page.evaluate(()=>{
    const tile=(root,label)=>[...document.querySelectorAll(root+' .stat')].find(el=>el.querySelector('.k').textContent===label).querySelector('.v').textContent;
    return {runs:tile('#statTiles','Journey runs'),winnings:tile('#moneyTiles','Journey winnings')};
   }),{runs:'1',winnings:'$3.00'});
   await page.evaluate(s=>localStorage.setItem('bb.run',s),stale);
   await page.goto(url+'#open');await page.reload();
   assert.deepEqual(await page.evaluate(()=>({money:S.money,runs:S.journey.runs,screen:BBJ._state.screen})),{money:53,runs:1,screen:'end'});
   console.log('PASS interrupted defeat recovery, visible Stats refresh, stale-save replay dedupe, recovery off Journey tab');
   await ctx.close();
  }
  {
   const {page,ctx}=await fresh();
   await page.evaluate(()=>{
    window.originalSetItem=Storage.prototype.setItem;
    Storage.prototype.setItem=function(k,v){if(k==='bendingBoosters.v1')throw new DOMException('test quota','QuotaExceededError');return window.originalSetItem.call(this,k,v)};
   });
   await doomed(page);await page.waitForSelector('#jxRetryPayout');
   assert.deepEqual(await page.evaluate(()=>({money:S.money,runs:S.journey?.runs||0,status:JSON.parse(localStorage.getItem('bb.run')).status,disabled:document.getElementById('jxAgain').disabled})),{money:50,runs:0,status:'lost',disabled:true});
   await page.evaluate(()=>{Storage.prototype.setItem=window.originalSetItem});
   await page.locator('#jxRetryPayout').click();
   assert.deepEqual(await page.evaluate(()=>({money:S.money,runs:S.journey.runs,saved:localStorage.getItem('bb.run')})),{money:53,runs:1,saved:null});
   console.log('PASS storage failure does not pay/clear; retry commits wallet+stats+receipt');
   await ctx.close();
  }
  {
   const {page,ctx}=await fresh();
   await page.evaluate(()=>{showView('journey');BBJ._newRun('LEGACY','water');const r=BBJ._state.run;r.status='lost';r.stats.fights=3;delete r.id;localStorage.setItem('bb.run',JSON.stringify(r))});
   await page.reload();assert.equal(await page.evaluate(()=>S.money),53);assert.equal(await page.evaluate(()=>S.journey.runs),1);
   console.log('PASS terminal-save migration without run ID');await ctx.close();
  }
  {
   const {page,ctx}=await fresh();
   await page.evaluate(()=>{showView('journey');BBJ._newRun('RESET','water');BBJ._debugGoto('fight');window.originalS=S;document.getElementById('jxEnd').click();showView('settings');document.getElementById('resetAll').click();document.getElementById('resetAll').click()});
   await page.waitForTimeout(1700);
   assert.deepEqual(await page.evaluate(()=>({same:S===window.originalS,run:BBJ._state.run,saved:localStorage.getItem('bb.run'),screen:BBJ._state.screen,busy:BBJ._state.busy,money:S.money})),{same:true,run:null,saved:null,screen:'start',busy:false,money:50});
   await page.evaluate(()=>{showView('journey');BBJ._newRun('RESET-MAP','water');document.querySelector('#journeyRoot [data-go]').click();resetProgress({...S.settings,seed:'new-seed'})});
   await page.waitForTimeout(500);
   assert.equal(await page.evaluate(()=>BBJ._state.run),null);
   // Reset with seed uses the same lifecycle and preserves deterministic pack RNG.
   await page.evaluate(()=>{BBJ._newRun('RESET-SEED','water');showView('settings');document.getElementById('sSeed').value='PACK-SEED';document.getElementById('applySeed').click()});
   assert.equal(await page.evaluate(()=>localStorage.getItem('bb.run')),null);
   const sequence1=await page.evaluate(()=>{const p=openPack().map(p=>[cardKey(p.c),p.foil]);resetProgress({...S.settings,seed:'PACK-SEED'});return p});
   const sequence2=await page.evaluate(()=>openPack().map(p=>[cardKey(p.c),p.foil]));
   assert.deepEqual(sequence1,sequence2);
   await page.reload();await page.evaluate(()=>showView('journey'));assert.equal(await page.locator('#jxResume').count(),0);
   console.log('PASS resets during combat/map animations, shared-state identity, seeded reset and reload');
   await ctx.close();
  }
  {
   const {page,ctx}=await fresh();
   await page.evaluate(()=>{showView('journey');BBJ._newRun('ROUNDTRIP','water');BBJ._debugGoto('fight');document.querySelector('.jx-hcard:not(.cant) [data-mode]').click()});
   await page.waitForFunction(()=>!BBJ._state.busy);
   const snapshot=()=>{const r=BBJ._state.run,f=r.fight;return {id:r.id,hp:r.hp,stats:r.stats,hand:f.hand.map(c=>c.uid),draw:f.drawPile.map(c=>c.uid),discard:f.discardPile.map(c=>c.uid),flow:f.flow,energy:f.energy,rng:f.rng.getState()}};
   const before=await page.evaluate(snapshot);
   await page.reload();await page.locator('#jxResume').click();
   assert.deepEqual(await page.evaluate(snapshot),before);
   console.log('PASS active combat save/load preserves card piles, stats, RNG and run identity');await ctx.close();
  }
  {
   const {page,ctx}=await fresh();
   await page.evaluate(()=>{showView('journey');BBJ._newRun('RESET-PLAY','water');BBJ._debugGoto('fight');document.querySelector('.jx-hcard:not(.cant) [data-mode]').click();resetProgress({...S.settings})});
   await page.waitForTimeout(2000);
   assert.equal(await page.evaluate(()=>BBJ._state.run),null);
   assert.equal(await page.evaluate(()=>localStorage.getItem('bb.run')),null);
   // Cancel after the terminal run has been persisted but before settlement.
   await doomed(page);
   await page.evaluate(()=>resetProgress({...S.settings}));
   await page.waitForTimeout(2000);
   assert.deepEqual(await page.evaluate(()=>({money:S.money,runs:S.journey?.runs||0,run:BBJ._state.run})),{money:50,runs:0,run:null});
   console.log('PASS resets cancel in-flight card effects and defeat/settlement animations');await ctx.close();
  }
  {
   const {page,ctx}=await fresh();
   await page.evaluate(()=>{
    showView('journey');BBJ._newRun('AZULA-UI','water');BBJ._state.run.jokers=[];BBJ._debugGoto('boss',2);
    const r=BBJ._state.run,f=r.fight;
    f.hand=r.deck.filter(c=>c.role==='basic'&&c.baseGuard>0);
    f.drawPile=r.deck.filter(c=>!f.hand.includes(c));f.discardPile=[];
    f.energy=4;r.hp=f.player.hp=1;f.player.block=0;f.player.dodge=0;
    f.enemy.intent={kind:'strike',dmg:20,hits:1};f.enemy.countdown=1;
   });
   await page.locator('#jxFightBoss').click();
   for(let i=0;i<4;i++){
    await page.locator('.jx-hcard [data-mode="guard"]').first().click({force:true});
    await page.waitForFunction(()=>!BBJ._state.busy);
   }
   assert.equal(await page.locator('#jxEndSub').innerText(),'Take 1');
   assert.match(await page.locator('#jxIntent').innerText(),/22/);
   assert.match(await page.locator('#jxIntent').innerText(),/\+2 mirrored/);
   await page.locator('#jxEnd').click();
   await page.waitForFunction(()=>BBJ._state.screen==='end');
   assert.equal(await page.evaluate(()=>BBJ._state.run.status),'lost');
   assert.equal(await page.evaluate(()=>BBJ._state.run.hp),0);
   console.log('PASS Azula actual card buttons, intent text, damage warning and lethal result agree');await ctx.close();
  }
  {
   const {page,ctx}=await fresh();
   await page.evaluate(()=>{showView('journey');BBJ._newRun('WON-RECOVERY','water');const r=BBJ._state.run;r.status='won';r.book=3;r.floor=15;r.stats.bosses=3;r.stats.fights=3;localStorage.setItem('bb.run',JSON.stringify(r))});
   await page.reload();
   assert.deepEqual(await page.evaluate(()=>({money:S.money,income:S.runIncome,runs:S.journey.runs,wins:S.journey.wins,best:S.journey.bestFloor})),{money:93,income:43,runs:1,wins:1,best:45});
   console.log('PASS won terminal-save recovery includes boss/win payout and records win once');await ctx.close();
  }
  {
   const {page,ctx}=await fresh();
   const before=await page.evaluate(()=>{
    showView('journey');BBJ._newRun('RESET-FAILURE','water');
    window.originalSetItem=Storage.prototype.setItem;
    Storage.prototype.setItem=function(k,v){if(k==='bendingBoosters.v1')throw new DOMException('test quota','QuotaExceededError');return window.originalSetItem.call(this,k,v)};
    return {run:localStorage.getItem('bb.run'),main:localStorage.getItem('bendingBoosters.v1'),seed:BBJ._state.run.seed};
   });
   assert.equal(await page.evaluate(()=>resetProgress({...S.settings})),false);
   assert.deepEqual(await page.evaluate(()=>({run:localStorage.getItem('bb.run'),main:localStorage.getItem('bendingBoosters.v1'),seed:BBJ._state.run.seed})),before);
   await page.reload();await page.locator('#jxResume').click();
   assert.equal(await page.evaluate(()=>BBJ._state.run.seed),'RESET-FAILURE');
   console.log('PASS failed reset preserves both saves and active run across reload');await ctx.close();
  }
  {
   const {page,ctx}=await fresh();
   const old=await page.evaluate(()=>{
    showView('journey');BBJ._newRun('RESET-REMOVE-FAILURE','water');
    const old=localStorage.getItem('bb.run');
    window.originalRemoveItem=Storage.prototype.removeItem;
    Storage.prototype.removeItem=function(k){if(k==='bb.run')throw new Error('test blocked remove');return window.originalRemoveItem.call(this,k)};
    if(!resetProgress({...S.settings}))throw new Error('reset did not commit');
    return old;
   });
   assert.equal(await page.evaluate(()=>BBJ._state.run),null);
   await page.reload();await page.evaluate(()=>showView('journey'));
   assert.equal(await page.locator('#jxResume').count(),0);
   // Even a stale terminal run from before that reset must not pay into the new wallet.
   await page.evaluate(old=>{const r=JSON.parse(old);r.status='lost';r.stats.fights=3;localStorage.setItem('bb.run',JSON.stringify(r))},old);
   await page.reload();
   // $55 = fresh $50 + the daily gift that a post-reset first launch receives; a leaked stale payout would make it $58.
   assert.deepEqual(await page.evaluate(()=>({money:S.money,runs:S.journey?.runs||0,run:BBJ._state.run})),{money:55,runs:0,run:null});
   assert.equal(await page.locator('#jxResume').count(),0);
   console.log('PASS committed reset invalidates stale active/terminal saves when second-key removal fails');await ctx.close();
  }
  assert.deepEqual(errors,[],'No uncaught browser exceptions');
  console.log('ALL BROWSER REGRESSIONS PASSED');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
