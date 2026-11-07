/* ================= Art (procedural, abstract) ================= */
const ELEM={W:'air',U:'water',B:'spirit',R:'fire',G:'earth'};
const PAL={
  air:['#fbe7b5','#f2c46d','#e7954a','#fff7e3'],
  water:['#cfe9fb','#5aa7e0','#1d4f8a','#eaf6ff'],
  spirit:['#d9cdf0','#8a6cc4','#2f2148','#f1ebff'],
  fire:['#ffd0a8','#e8543a','#7a1d16','#fff0d0'],
  earth:['#dbe8c8','#6fa356','#4b3a24','#f1ead6'],
  metal:['#e7e2da','#a99c8a','#4a4239','#fbf8f2'],
};
const artCache={};
function artSVG(c){
  const key=c.set+c.num+(c.treat||''); if(artCache[key]) return artCache[key];
  const r=mulberry32(hashStr(c.name+'|'+c.num)); const R=(a,b)=>a+r()*(b-a);
  const cols=(c.col||'').split('').filter(Boolean);
  const isLand=/Land/.test(c.type||'');
  const els=cols.length?cols.map(x=>ELEM[x]):['metal'];
  const e1=els[0], e2=els[1]||els[0]; const p=PAL[e1], q=PAL[e2];
  const id='g'+hashStr(key);
  let s=`<svg viewBox="0 0 100 75" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg"><defs>
  <linearGradient id="${id}a" x1="0" y1="0" x2="${R(.2,1).toFixed(2)}" y2="1"><stop offset="0" stop-color="${p[3]}"/><stop offset=".55" stop-color="${p[0]}"/><stop offset="1" stop-color="${q[1]}"/></linearGradient>
  <radialGradient id="${id}b" cx="${R(.2,.8).toFixed(2)}" cy="${R(.15,.45).toFixed(2)}" r=".6"><stop offset="0" stop-color="#fff" stop-opacity=".85"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
  </defs><rect width="100" height="75" fill="url(#${id}a)"/><rect width="100" height="75" fill="url(#${id}b)"/>`;
  if(isLand){
    const sky=cols.length?PAL[ELEM[cols[0]]]:PAL.metal;
    s+=`<circle cx="${R(15,85)}" cy="${R(10,25)}" r="${R(5,9)}" fill="${sky[3]}" opacity=".9"/>`;
    for(let L=0;L<4;L++){
      const y=30+L*11, pal=cols.length?PAL[ELEM[cols[L%cols.length]]]:PAL.metal;
      let d=`M0 ${y+R(-4,4)}`; for(let x=0;x<=100;x+=10) d+=` L${x} ${y+R(-9,6)}`; d+=' L100 75 L0 75Z';
      s+=`<path d="${d}" fill="${pal[L<2?1:2]}" opacity="${(.45+L*.17).toFixed(2)}"/>`;
    }
  } else {
    const layers=cols.length>1?els.slice(0,3):[e1];
    layers.forEach((el,li)=>{ s+=motif(el,r,R,li,layers.length); });
  }
  // subtle focal sigil based on type
  const t=c.type||'';
  const cx=R(35,65), cy=R(30,45);
  if(/Creature/.test(t)){ s+=`<g opacity=".55" fill="none" stroke="${p[2]}" stroke-width="1.2"><circle cx="${cx}" cy="${cy}" r="${R(7,11)}"/><circle cx="${cx}" cy="${cy}" r="${R(2,4)}" fill="${p[3]}"/></g>`; }
  else if(/Instant|Sorcery/.test(t)){ s+=`<g opacity=".6" stroke="${p[3]}" stroke-width="1.4" stroke-linecap="round">`; for(let i=0;i<7;i++){const a=i/7*6.283+R(0,.4),l=R(8,20);s+=`<line x1="${cx}" y1="${cy}" x2="${(cx+Math.cos(a)*l).toFixed(1)}" y2="${(cy+Math.sin(a)*l).toFixed(1)}"/>`;} s+='</g>'; }
  else if(/Artifact/.test(t)){ s+=`<g opacity=".7" fill="${p[3]}" stroke="${p[2]}" stroke-width="1"><polygon points="${poly(cx,cy,R(8,12),8)}"/><polygon points="${poly(cx,cy,R(3,5),4)}" fill="${p[2]}"/></g>`; }
  else if(/Enchantment|Saga/.test(t)){ s+=`<g opacity=".55" fill="none" stroke="${p[3]}" stroke-width="1"><circle cx="${cx}" cy="${cy}" r="12"/><circle cx="${cx}" cy="${cy}" r="8" stroke-dasharray="2 2"/></g>`; }
  s+='</svg>';
  return artCache[key]=s;
}
function poly(cx,cy,rad,n){let o=[];for(let i=0;i<n;i++){const a=i/n*6.283+Math.PI/n;o.push((cx+Math.cos(a)*rad).toFixed(1)+','+(cy+Math.sin(a)*rad).toFixed(1))}return o.join(' ')}
function motif(el,r,R,li,n){
  const p=PAL[el]; let s=''; const x0=n>1?li*100/n:0, w=n>1?100/n:100;
  const op=n>1?.75:.9;
  if(el==='air'){
    for(let i=0;i<4;i++){const cx=x0+R(0,w),cy=R(10,65),rad=R(5,16);
      s+=`<path d="M${cx} ${cy} m${-rad} 0 a${rad} ${rad} 0 1 1 ${rad*1.6} ${rad*.4} a${rad*.6} ${rad*.6} 0 1 1 ${-rad*.5} ${-rad*.6}" fill="none" stroke="${i%2?p[3]:p[2]}" stroke-width="${R(1,2.4).toFixed(1)}" stroke-linecap="round" opacity="${op}"/>`;}
    for(let i=0;i<3;i++){const cx=x0+R(0,w),cy=R(45,70);s+=`<g fill="${p[3]}" opacity=".7"><circle cx="${cx}" cy="${cy}" r="${R(4,7)}"/><circle cx="${cx+6}" cy="${cy-2}" r="${R(4,8)}"/><circle cx="${cx+12}" cy="${cy}" r="${R(3,6)}"/></g>`;}
  } else if(el==='water'){
    s+=`<circle cx="${x0+R(w*.2,w*.8)}" cy="${R(10,22)}" r="${R(5,9)}" fill="${p[3]}" opacity=".85"/>`;
    for(let i=0;i<5;i++){const y=35+i*8+R(-2,2),a=R(2,5),f=R(10,18);let d=`M${x0} ${y}`;for(let x=x0;x<=x0+w;x+=2)d+=` L${x.toFixed(1)} ${(y+Math.sin((x+i*7)/f*6.283/2)*a).toFixed(1)}`;d+=` L${x0+w} 75 L${x0} 75Z`;
      s+=`<path d="${d}" fill="${i%2?p[1]:p[2]}" opacity="${(.25+i*.12).toFixed(2)}"/>`;}
  } else if(el==='fire'){
    for(let i=0;i<6;i++){const cx=x0+R(0,w),b=75,h=R(25,55),wd=R(6,14);
      s+=`<path d="M${cx-wd} ${b} C${cx-wd} ${b-h*.5} ${cx-wd*.2} ${b-h*.6} ${cx} ${b-h} C${cx+wd*.3} ${b-h*.6} ${cx+wd} ${b-h*.4} ${cx+wd} ${b}Z" fill="${[p[1],p[2],p[0]][i%3]}" opacity="${op*.85}"/>`;}
    for(let i=0;i<8;i++) s+=`<circle cx="${x0+R(0,w)}" cy="${R(5,45)}" r="${R(.5,1.4)}" fill="${p[3]}"/>`;
  } else if(el==='earth'){
    for(let L=0;L<4;L++){const y=30+L*11;let d=`M${x0} ${y+R(-3,3)}`;for(let x=x0;x<=x0+w;x+=w/5)d+=` L${x.toFixed(1)} ${(y+R(-5,5)).toFixed(1)}`;d+=` L${x0+w} 75 L${x0} 75Z`;
      s+=`<path d="${d}" fill="${L%2?p[1]:p[2]}" opacity="${(.4+L*.15).toFixed(2)}"/>`;}
    for(let i=0;i<3;i++){const cx=x0+R(5,w-5),cy=R(15,40);s+=`<polygon points="${poly(cx,cy,R(3,7),Math.floor(R(5,7)))}" fill="${p[2]}" opacity=".8"/>`;}
  } else if(el==='spirit'){
    const cx=x0+R(w*.3,w*.7),cy=R(18,32),rad=R(9,14);
    s+=`<circle cx="${cx}" cy="${cy}" r="${rad+3}" fill="${p[3]}" opacity=".5"/><circle cx="${cx}" cy="${cy}" r="${rad}" fill="${p[2]}"/>`;
    for(let i=0;i<4;i++){const y=R(40,70);s+=`<path d="M${x0} ${y} C${x0+w*.3} ${y-R(4,10)} ${x0+w*.6} ${y+R(4,10)} ${x0+w} ${y-R(0,6)}" fill="none" stroke="${i%2?p[1]:p[3]}" stroke-width="${R(1.5,4).toFixed(1)}" opacity=".6"/>`;}
  } else {
    for(let i=0;i<6;i++){const cx=x0+R(0,w),cy=R(0,75);s+=`<polygon points="${poly(cx,cy,R(5,14),8)}" fill="none" stroke="${p[2]}" stroke-width=".8" opacity=".5"/>`;}
  }
  return s;
}
const backSVG=`<svg viewBox="0 0 100 100"><g fill="none" stroke="#e8b85a" stroke-opacity=".75"><circle cx="50" cy="50" r="44" stroke-width="1.5"/><circle cx="50" cy="50" r="30" stroke-width=".8"/></g>
<circle cx="50" cy="20" r="7" fill="#f2c46d"/><circle cx="80" cy="50" r="7" fill="#e8543a"/><circle cx="50" cy="80" r="7" fill="#6fa356"/><circle cx="20" cy="50" r="7" fill="#5aa7e0"/>
<path d="M50 34 C60 42 60 58 50 66 C40 58 40 42 50 34Z" fill="#f3ead9" opacity=".85"/></svg>`;


