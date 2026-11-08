// Screenshot every main screen and Journey encounter for visual review.
//   node tools/capture.cjs [GAME.html] [OUT_DIR]   (defaults: dist build -> test-output/screens)
const env=require('../tests/harness/env.cjs');
const {chromium}=env.playwright();
const fs=require('fs'),path=require('path');const {pathToFileURL}=require('url');
const source=process.argv[2]||env.GAME;
const out=process.argv[3]||path.join(env.OUTPUT,'screens');
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch(env.launchOptions({args:['--mute-audio','--disable-dev-shm-usage']}));
 const ctx=await browser.newContext({viewport:{width:1440,height:1000}});
 const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.stack));
 await page.goto(pathToFileURL(source).href+'#debug');
 await page.evaluate(()=>{S.settings.sound=false;S.settings.seed='VISUAL-PASS';S.settings.fast=true;S.money=500;save()});
 try{await page.waitForFunction(()=>imgIndexState==='ready'||imgIndexState==='failed',{timeout:30000})}catch{}
 await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(1000);
 async function shot(name,delay=500){await page.mouse.move(1430,995);await page.waitForTimeout(delay);await page.screenshot({path:path.join(out,name+'.png'),animations:'disabled'});console.log(name);}
 await shot('01-home');
 await page.evaluate(()=>openShop());await shot('02-deposit');await page.locator('#mx').click();
 await page.evaluate(()=>{for(let i=0;i<40;i++)openPack();save();refreshHeader()});
 for(const [i,v]of ['collection','decks','stats','odds','settings'].entries()){await page.evaluate(v=>showView(v),v);await shot(String(i+3).padStart(2,'0')+'-'+v,800)}
 await page.evaluate(()=>{showView('open');tryOpen(1);ST.cards.forEach((p,i)=>flipCard(i,true));updateBottom()});await shot('08-pack-reveal',3000);
 await page.evaluate(()=>spotlight({c:findCard(S.best.k),foil:S.best.foil,v:S.best.v},false));await shot('09-spotlight');await page.evaluate(()=>spot.click());await page.evaluate(()=>stageClose());
 await page.evaluate(()=>showView('journey'));await shot('10-journey-start',3000);
 await page.locator('[data-pair="UR"]').click();await shot('10b-journey-setup',1500);
 await page.locator('#jxStart').click();await shot('11-charms',3000);
 await page.evaluate(()=>BBJ._newRun('VISUAL-PASS','water'));await shot('12-map',3000);
 for(const [i,n]of ['fight','shop','rest','event','treasure'].entries()){
  await page.evaluate(n=>BBJ._debugGoto(n),n);await shot(String(i+13).padStart(2,'0')+'-'+n,3000);
 }
 await page.evaluate(()=>BBJ._debugGoto('boss',2));await shot('18-boss-intro',3000);
 await page.locator('#jxFightBoss').click();await shot('19-boss-fight',2500);
 await page.evaluate(()=>{const r=BBJ._state.run,f=r.fight;r.stats.fights=3;r.hp=f.player.hp=1;f.player.block=0;f.player.dodge=0;f.enemy.countdown=1;f.enemy.intent={kind:'strike',dmg:100,hits:1};document.getElementById('jxEnd').click()});
 await page.waitForFunction(()=>BBJ._state.screen==='end');await shot('20-summary',1000);
 // More constrained desktop; then phone.
 await page.setViewportSize({width:1280,height:720});await page.evaluate(()=>{BBJ._newRun('VISUAL-PASS','water');BBJ._debugGoto('fight')});await shot('21-fight-720',3000);
 await page.setViewportSize({width:390,height:844});
 await page.evaluate(()=>{showView('open');window.scrollTo(0,0)});await shot('22-mobile-home');
 await page.evaluate(()=>{showView('journey');BBJ._debugGoto('fight');window.scrollTo(0,0)});await shot('23-mobile-fight',2500);
 await page.screenshot({path:path.join(out,'23-mobile-fight-full.png'),fullPage:true,animations:'disabled'});
 await page.evaluate(()=>{BBJ._newRun('VISUAL-PASS','water');window.scrollTo(0,0)});await shot('24-mobile-map',3000);
 await page.evaluate(()=>{showView('settings');window.scrollTo(0,0)});await shot('25-mobile-settings');
 {const c2=await browser.newContext({viewport:{width:390,height:844}}),p2=await c2.newPage();p2.on('pageerror',e=>errors.push(e.stack));
  await p2.goto(pathToFileURL(source).href+'#journey');await p2.evaluate(()=>{S.settings.sound=false});await p2.locator('[data-pair="WB"]').click();
  await p2.waitForTimeout(800);await p2.screenshot({path:path.join(out,'26-mobile-journey-setup.png'),fullPage:true,animations:'disabled'});console.log('26-mobile-journey-setup');
  console.log('PHONE-OVERFLOW',await p2.evaluate(()=>document.documentElement.scrollWidth-innerWidth));await c2.close();}
 await page.setViewportSize({width:1440,height:1000});
 await page.evaluate(()=>{showView('journey');BBJ._newRun('VISUAL-NEUTRAL',{colours:['W','B'],theme:'neutral'});window.scrollTo(0,0)});await shot('27-neutral-map',3000);
 console.log('INDEX',await page.evaluate(()=>({state:imgIndexState,images:Object.keys(IMG).length})));
 fs.writeFileSync(path.join(out,'errors.json'),JSON.stringify(errors,null,2));
 await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1});
