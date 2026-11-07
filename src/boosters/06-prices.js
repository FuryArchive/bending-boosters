/* ================= Prices ================= */
let LIVEP=null; try{ const lp=JSON.parse(localStorage.getItem('bb.prices')||'null'); if(lp&&Date.now()-lp.t<3*864e5) LIVEP=lp; }catch(e){}
function priceRaw(c){ const k=c.set+':'+c.num; return (LIVEP&&LIVEP.m[k])||PRICES.m[k]||null; }
function priceOf(c,foil){ const p=priceRaw(c); if(!p) return 0.05; const v=foil?(p[1]??p[0]):(p[0]??p[1]); return v==null?0.05:v; }
function sellPrice(c,foil){ return Math.max(0.01,Math.floor(priceOf(c,foil)*S.settings.buy)/100); }
const $$=x=>(x<0?'−$':'$')+Math.abs(x).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
function priceDate(){ return LIVEP?'live ('+new Date(LIVEP.t).toISOString().slice(0,10)+')':'snapshot '+PRICES.date; }
function collectionValue(){ let v=0; for(const k in S.coll){ const c=findCard(k); if(c) v+=priceOf(c,false)*S.coll[k]; } for(const k in S.foil){ const c=findCard(k); if(c) v+=priceOf(c,true)*S.foil[k]; } return v; }
function priceTagColor(v){ return v>=20?'#f07a3a':v>=5?'#e8c25a':v>=1?'#d9d2c4':'#8a7d6c'; }
function ptag(v){ return `<span style="color:${priceTagColor(v)};font-weight:900">${$$(v)}</span>`; }

