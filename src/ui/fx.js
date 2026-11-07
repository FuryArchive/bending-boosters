export var prefersReduced = (S) => !!(S && S.settings && S.settings.reducedMotion) || typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
export function flyTo(from, to, S) {
  if (!from || !to || prefersReduced(S)) return;
  const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
  const g = from.cloneNode(true);
  g.classList.add("jx-ghost");
  Object.assign(g.style, { left: a.left + "px", top: a.top + "px", width: a.width + "px", height: a.height + "px" });
  document.body.appendChild(g);
  const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
  g.animate(
    [{ transform: "translate(0,0) scale(1)", opacity: 1 }, { transform: `translate(${dx}px,${dy}px) scale(.18) rotate(8deg)`, opacity: 0.15 }],
    { duration: 520, easing: "cubic-bezier(.5,0,.75,0)" }
  ).onfinish = () => g.remove();
}
export function coinBurst(anchor, n, S) {
  if (!anchor || prefersReduced(S)) return;
  const r = anchor.getBoundingClientRect();
  for (let i = 0; i < n; i++) {
    const c = document.createElement("i");
    c.className = "jx-coin";
    c.style.left = r.left + r.width / 2 + "px";
    c.style.top = r.top + r.height / 2 + "px";
    document.body.appendChild(c);
    const ang = -Math.PI / 2 + (Math.random() - 0.5) * 2.2, d = 50 + Math.random() * 90;
    c.animate(
      [
        { transform: "translate(-50%,-50%) scale(.6)", opacity: 1 },
        { transform: `translate(calc(-50% + ${Math.cos(ang) * d}px), calc(-50% + ${Math.sin(ang) * d}px)) scale(1)`, opacity: 1, offset: 0.45 },
        { transform: `translate(calc(-50% + ${Math.cos(ang) * d * 1.2}px), calc(-50% + ${Math.sin(ang) * d + 70}px)) scale(.8)`, opacity: 0 }
      ],
      { duration: 800 + Math.random() * 300, easing: "cubic-bezier(.2,.7,.4,1)", delay: i * 18 }
    ).onfinish = () => c.remove();
  }
}
export function countUp(el, from, to, ms, fmt = (v) => String(v)) {
  if (!el) return;
  const t0 = performance.now();
  const step = (now) => {
    const k = Math.min(1, (now - t0) / ms), v = Math.round(from + (to - from) * (1 - (1 - k) ** 3));
    el.textContent = fmt(v);
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
export function confetti(root, colors, S, n = 90) {
  if (prefersReduced(S)) return;
  const r = root.getBoundingClientRect();
  for (let i = 0; i < n; i++) {
    const c = document.createElement("i");
    c.className = "jx-confetti";
    c.style.background = colors[i % colors.length];
    c.style.left = r.left + Math.random() * r.width + "px";
    c.style.top = r.top - 20 + "px";
    document.body.appendChild(c);
    const fall = 300 + Math.random() * Math.min(700, window.innerHeight), drift = (Math.random() - 0.5) * 160;
    c.animate(
      [{ transform: "translate(0,0) rotate(0deg)", opacity: 1 }, { transform: `translate(${drift}px,${fall}px) rotate(${360 + Math.random() * 540}deg)`, opacity: 0 }],
      { duration: 1600 + Math.random() * 1200, easing: "cubic-bezier(.3,.6,.5,1)", delay: Math.random() * 400 }
    ).onfinish = () => c.remove();
  }
}
export function flash(root, kind, S) {
  if (prefersReduced(S)) return;
  const v = document.createElement("div");
  v.className = "jx-vignette " + kind;
  root.appendChild(v);
  setTimeout(() => v.remove(), 650);
}
export function titleCard(root, { kicker, title, sub, art }, S) {
  const o = document.createElement("div");
  o.className = "jx-titlecard" + (prefersReduced(S) ? " still" : "");
  o.innerHTML = `<div class="tc-art">${art || ""}</div><div class="tc-kicker">${kicker}</div><div class="tc-title">${title}</div><div class="tc-sub">${sub}</div>`;
  root.appendChild(o);
  setTimeout(() => o.classList.add("out"), 1700);
  setTimeout(() => o.remove(), 2300);
}
export function banner(root, text, cls, S) {
  const b = document.createElement("div");
  b.className = "jx-banner " + (cls || "");
  b.textContent = text;
  root.appendChild(b);
  setTimeout(() => b.remove(), prefersReduced(S) ? 500 : 1e3);
}
var center = (el) => {
  const r = el.getBoundingClientRect();
  return [r.left + r.width / 2, r.top + r.height / 2];
};
export function impact(el, color, big, S) {
  if (!el || prefersReduced(S)) return;
  const [x, y] = center(el);
  const ring = document.createElement("i");
  ring.className = "jx-shock" + (big ? " big" : "");
  ring.style.setProperty("--c", color);
  ring.style.left = x + "px";
  ring.style.top = y + "px";
  document.body.appendChild(ring);
  setTimeout(() => ring.remove(), 700);
  const n = big ? 28 : 16;
  for (let i = 0; i < n; i++) {
    const s = document.createElement("i");
    s.className = "jx-spark";
    s.style.setProperty("--c", color);
    s.style.left = x + "px";
    s.style.top = y + "px";
    document.body.appendChild(s);
    const a = Math.random() * 6.283, d = (big ? 120 : 70) + Math.random() * (big ? 160 : 90);
    s.animate(
      [{ transform: "translate(-50%,-50%) rotate(" + a + "rad) scaleX(1.8)", opacity: 1 }, { transform: `translate(calc(-50% + ${Math.cos(a) * d}px), calc(-50% + ${Math.sin(a) * d}px)) rotate(${a}rad) scaleX(.2)`, opacity: 0 }],
      { duration: 420 + Math.random() * 260, easing: "cubic-bezier(.1,.8,.3,1)" }
    ).onfinish = () => s.remove();
  }
}
export function slash(el, S) {
  if (!el || prefersReduced(S)) return;
  const r = el.getBoundingClientRect();
  const s = document.createElement("i");
  s.className = "jx-slash";
  Object.assign(s.style, { left: r.left - 20 + "px", top: r.top + r.height / 2 + "px", width: r.width + 40 + "px" });
  document.body.appendChild(s);
  setTimeout(() => s.remove(), 500);
}
export function shards(el, S) {
  if (!el || prefersReduced(S)) return;
  const [x, y] = center(el);
  for (let i = 0; i < 12; i++) {
    const s = document.createElement("i");
    s.className = "jx-shard";
    s.style.left = x + "px";
    s.style.top = y + "px";
    document.body.appendChild(s);
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.6, d = 40 + Math.random() * 70;
    s.animate(
      [{ transform: "translate(-50%,-50%) rotate(0deg)", opacity: 1 }, { transform: `translate(calc(-50% + ${Math.cos(a) * d}px), calc(-50% + ${Math.sin(a) * d + 40}px)) rotate(${Math.random() * 360}deg)`, opacity: 0 }],
      { duration: 600 + Math.random() * 300, easing: "cubic-bezier(.2,.7,.4,1)" }
    ).onfinish = () => s.remove();
  }
}
export function wipe(root, x, y, S) {
  if (prefersReduced(S)) return;
  const w = document.createElement("div");
  w.className = "jx-wipe";
  w.style.setProperty("--x", x + "px");
  w.style.setProperty("--y", y + "px");
  root.appendChild(w);
  setTimeout(() => w.remove(), 700);
}

// Original procedural ink landscapes. Cached scenery + sparse motes; no persistent trails.
// The public backdrop interface is unchanged and never reads/writes gameplay state.
var THEMES = {
  none: {sky:'#11252c',horizon:'#304a47',far:'#243c3f',near:'#142a31',moon:'#d3bb83',mote:'#ddd6af'},
  1: {sky:'#10202e',horizon:'#2d4d59',far:'#253e4c',near:'#152b38',moon:'#b8d2cf',mote:'#bcd9de'},
  2: {sky:'#172821',horizon:'#425442',far:'#30483a',near:'#1c342b',moon:'#cdd0a1',mote:'#c8d3a6'},
  3: {sky:'#291f25',horizon:'#66473b',far:'#49383a',near:'#302b32',moon:'#e8c291',mote:'#e6a66f'}
};
export function createBackdrop(visible, isReduced) {
  const cv=document.createElement('canvas'), scene=document.createElement('canvas');
  cv.className='jx-backdrop';cv.setAttribute('aria-hidden','true');document.body.prepend(cv);
  const ctx=cv.getContext('2d'), bg=scene.getContext('2d');
  let W=1,H2=1,dpr=1,theme='none',T=THEMES.none,raf=0,timer=0,last=0,time=0,heat=0,rings=[];
  const motes=Array.from({length:26},(_,i)=>({x:((i*37)%101)/101,y:((i*61)%103)/103,phase:i*1.87,r:0.6+(i%3)*0.35}));
  function landscape(){
    bg.setTransform(dpr,0,0,dpr,0,0);
    const sky=bg.createLinearGradient(0,0,0,H2);sky.addColorStop(0,T.sky);sky.addColorStop(1,T.horizon);
    bg.fillStyle=sky;bg.fillRect(0,0,W,H2);
    // The moon and distant ridge deliberately live at the margins of the play surface.
    bg.globalAlpha=.22;bg.fillStyle=T.moon;bg.beginPath();bg.arc(W*.88,H2*.25,Math.min(64,W*.07),0,Math.PI*2);bg.fill();bg.globalAlpha=1;
    function ridge(points,color){bg.fillStyle=color;bg.beginPath();bg.moveTo(0,H2);for(const [x,y] of points)bg.lineTo(x*W,y*H2);bg.lineTo(W,H2);bg.closePath();bg.fill()}
    ridge([[0,.62],[.06,.57],[.15,.66],[.26,.43],[.34,.57],[.42,.51],[.52,.71],[.64,.58],[.7,.65],[.81,.40],[.87,.55],[.94,.47],[1,.62]],T.far);
    ridge([[0,.78],[.07,.70],[.14,.74],[.25,.88],[.37,.73],[.48,.84],[.61,.78],[.7,.88],[.83,.67],[.94,.74],[1,.66]],T.near);
    bg.strokeStyle=T.moon;bg.globalAlpha=.055;bg.lineWidth=1;
    for(let k=0;k<7;k++){const y=H2*(.87+k*.024);bg.beginPath();bg.moveTo(0,y);bg.bezierCurveTo(W*.25,y-12,W*.65,y+12,W,y-3);bg.stroke()}
    bg.globalAlpha=1;
    // A small, original roof silhouette; no downloaded reference art is embedded.
    const x=W*.92,y=H2*.77,s=Math.min(1,W/1100);
    bg.save();bg.translate(x,y);bg.scale(s,s);bg.fillStyle=T.near;
    bg.fillRect(-15,-28,30,40);bg.beginPath();bg.moveTo(-32,-29);bg.quadraticCurveTo(-13,-32,0,-43);bg.quadraticCurveTo(14,-32,32,-29);bg.lineTo(19,-23);bg.lineTo(-19,-23);bg.closePath();bg.fill();bg.restore();
    const veil=bg.createRadialGradient(W*.48,H2*.27,W*.05,W*.5,H2*.45,Math.max(W,H2)*.7);
    veil.addColorStop(0,'#07121977');veil.addColorStop(.65,'#07121940');veil.addColorStop(1,'#07121999');bg.fillStyle=veil;bg.fillRect(0,0,W,H2);
  }
  function resize(){dpr=Math.min(1.5,window.devicePixelRatio||1);W=Math.max(1,innerWidth);H2=Math.max(1,innerHeight);cv.width=scene.width=Math.round(W*dpr);cv.height=scene.height=Math.round(H2*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);landscape();paint(0)}
  function paint(dt){
    time+=dt;ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.clearRect(0,0,W,H2);ctx.drawImage(scene,0,0,W,H2);
    if(!isReduced()){
      for(const p of motes){const x=p.x*W+Math.sin(time*.00012+p.phase)*18,y=((p.y*H2-time*.004*(theme===3?2:1))%H2+H2)%H2;const edge=Math.abs(x/W-.5)*2;ctx.globalAlpha=.06+edge*.17;ctx.fillStyle=T.mote;ctx.beginPath();ctx.arc(x,y,p.r,0,Math.PI*2);ctx.fill()}
      for(const r of rings){r.radius+=dt*.65;r.alpha-=dt*.00065;ctx.globalAlpha=Math.max(0,r.alpha)*.35;ctx.strokeStyle=r.color;ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(r.x,r.y,r.radius,0,Math.PI*2);ctx.stroke()}
      rings=rings.filter(r=>r.alpha>0);
    }
    if(heat){ctx.globalAlpha=heat*.035;ctx.fillStyle='#d07e49';ctx.fillRect(0,0,W,H2)}
    ctx.globalAlpha=1;
  }
  function loop(now){raf=requestAnimationFrame(loop);const on=visible();cv.classList.toggle('on',on);if(document.hidden||!on){last=now;return}if(now-last<33)return;const dt=Math.min(50,now-last);last=now;paint(dt)}
  window.addEventListener('resize',resize);resize();
  if(isReduced()){cv.classList.toggle('on',visible());timer=setInterval(()=>cv.classList.toggle('on',visible()),250)}else raf=requestAnimationFrame(loop);
  return {
    setTheme(key){const k=THEMES[key]?(/^\d$/.test(String(key))?+key:key):'none';if(k===theme)return;theme=k;T=THEMES[k];rings=[];landscape();paint(0)},
    pulse(color='#fff',power=1,x=W/2,y=H2/2){if(isReduced())return;rings.push({x,y,radius:8,alpha:Math.min(.6,.2+power*.2),color});if(rings.length>4)rings.shift()},
    setHeat(v){heat=Math.max(0,Math.min(1,v));if(isReduced())paint(0)},
    destroy(){cancelAnimationFrame(raf);clearInterval(timer);window.removeEventListener('resize',resize);cv.remove()}
  };
}
