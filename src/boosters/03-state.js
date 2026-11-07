/* ================= State ================= */
const DEFAULTS={real:true,sound:true,fast:false,price:6.99,boxPrice:149.99,buy:60,keep:4,keepJourney:12,pity:0,hints:true,auto:false,start:50,seed:''};
let S;
function freshState(settings){
  const st={v:3,...BBJ.freshMainFields(),money:+(settings||DEFAULTS).start,deposited:+(settings||DEFAULTS).start,packSpend:0,valuePulled:0,soldIncome:0,sold:0,best:null,valHist:[],bt:{w:0,l:0,earned:0},spent:0,coll:{},foil:{},packs:0,cards:0,since:0,maxDry:0,drySpans:[],
    rc:{C:0,U:0,R:0,M:0,L:0},special:0,eternal:0,foils:0,mythicPacks:0,pityHits:0,hist:[],settings:Object.assign({},DEFAULTS,settings||{}),rng:0};
  const seed=st.settings.seed;
  st.rng = seed ? hashStr(seed) : (Math.random()*4294967296)>>>0;
  return st;
}
function load(){
  try{ const raw=localStorage.getItem('bendingBoosters.v1'); if(raw){ S=JSON.parse(raw); S.settings=Object.assign({},DEFAULTS,S.settings); } }catch(e){}
  if(!S) S=freshState();
  if(!(S.v>=2)){ // migrate from the gem version
    S.v=2; if(S.settings.price>=20) S.settings.price=6.99; if(S.settings.start>=500) S.settings.start=50;
    S.money=50; S.deposited=50; S.packSpend=0; S.valuePulled=0; S.soldIncome=0; S.sold=0; S.best=null; S.valHist=[]; S.bt={w:0,l:0,earned:0};
  }
  S.bt=S.bt||{w:0,l:0,earned:0};
  BBJ.migrateMain(S);
  rngState=S.rng|0;
}
function save(state=S){
  if(state===S) state.rng=rngState;
  try{ localStorage.setItem('bendingBoosters.v1',JSON.stringify(state)); return true; }catch(e){ return false; }
}

