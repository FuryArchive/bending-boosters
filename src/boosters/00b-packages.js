/* ================= Set packages ================= */
// Every card set the build ships, from src/sets/<code>/: set.json plus its cards and prices.
const PKG={}; SET_PACKAGES.forEach(p=>{ PKG[p.code]=p; });
const MAIN_SET=SET_PACKAGES[0].code; // the set the pack shop opens unless the player picks another
const PRICES={date:PKG[MAIN_SET].prices.date,m:Object.assign({},...SET_PACKAGES.map(p=>p.prices.m))};
const pkgOf=code=>PKG[code]||null;
const pkgBase=code=>PKG[code]?PKG[code].cards.base:[];
const pkgEternal=code=>PKG[code]?(PKG[code].cards.eternal||[]).map(c=>Object.assign({},c,{treat:'etern'})):[];
const ALL_BASE=SET_PACKAGES.flatMap(p=>p.cards.base);
// The set the pack shop opens (free packs too): the player's pick, or the first set if it's gone.
function packSet(){ const c=S.settings.packSet; return PKG[c]?c:MAIN_SET; }
const cardsPerPack=code=>PKG[code].products.play.slots.reduce((n,s)=>n+s.n,0);
// A set's special versions (one printing per key, by number), built from its sheets on first use.
const SPECIALS_OF={};
function pkgSpecials(code){
  if(SPECIALS_OF[code]) return SPECIALS_OF[code];
  const seen=new Set(), out=[];
  if(PKG[code]) Object.keys(PKG[code].sheets).forEach(sh=>treatCards(sh,code).forEach(c=>{const k=cardKey(c); if(!seen.has(k)){seen.add(k);out.push(c);}}));
  return SPECIALS_OF[code]=out.sort((a,b)=>+a.num-+b.num);
}
const allSpecials=()=>SET_PACKAGES.flatMap(p=>pkgSpecials(p.code));
const allEternal=()=>SET_PACKAGES.flatMap(p=>pkgEternal(p.code));
