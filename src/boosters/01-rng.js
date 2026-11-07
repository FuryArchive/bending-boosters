/* ================= RNG ================= */
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function hashStr(s){let h=1779033703^s.length;for(let i=0;i<s.length;i++){h=Math.imul(h^s.charCodeAt(i),3432918353);h=h<<13|h>>>19}return (h>>>0)}
let rngState=0;
function rnd(){ // stateful, persisted
  rngState=(rngState+0x6D2B79F5)|0; let t=rngState;
  t=Math.imul(t^t>>>15,1|t); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296;
}
const pick=a=>a[Math.floor(rnd()*a.length)];

