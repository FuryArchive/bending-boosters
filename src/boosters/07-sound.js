/* ================= Sound (WebAudio, synthesized) ================= */
let AC=null;
function ac(){ if(!S.settings.sound) return null; if(!AC){ try{ AC=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){ return null; } } if(AC.state==='suspended') AC.resume(); return AC; }
function tone(f,t0,d,type,g){ const a=ac(); if(!a) return; const o=a.createOscillator(),v=a.createGain(),t=a.currentTime+t0;
  o.type=type||'sine'; o.frequency.setValueAtTime(f,t); v.gain.setValueAtTime(0.0001,t); v.gain.exponentialRampToValueAtTime(g||.08,t+.015); v.gain.exponentialRampToValueAtTime(.0001,t+d);
  o.connect(v).connect(a.destination); o.start(t); o.stop(t+d+.05); }
function noise(d,g,f0,f1,t0){ const a=ac(); if(!a) return; const t=a.currentTime+(t0||0); const b=a.createBuffer(1,Math.ceil(a.sampleRate*d),a.sampleRate); const ch=b.getChannelData(0); for(let i=0;i<ch.length;i++) ch[i]=Math.random()*2-1;
  const s=a.createBufferSource(); s.buffer=b; const f=a.createBiquadFilter(); f.type='bandpass'; f.Q.value=1.2; f.frequency.setValueAtTime(f0,t); f.frequency.exponentialRampToValueAtTime(f1,t+d);
  const v=a.createGain(); v.gain.setValueAtTime(g,t); v.gain.exponentialRampToValueAtTime(.0001,t+d); s.connect(f).connect(v).connect(a.destination); s.start(t); }
const SFX={
  tear(){ noise(.5,.25,300,6000); },
  deal(){ noise(.05,.05,2500,3500); },
  flip(){ noise(.08,.07,1800,4200); },
  U(){ tone(740,0,.25,'triangle',.05); },
  R(){ [660,880,1175].forEach((f,i)=>tone(f,i*.08,.45,'triangle',.07)); },
  M(){ tone(110,0,1.1,'sine',.15); [523,659,784,1047,1319].forEach((f,i)=>tone(f,.05+i*.08,.8,'triangle',.08)); noise(.9,.08,6000,9000,.1); },
  S(){ tone(98,0,1.4,'sine',.16); [587,740,880,1175,1480,1760].forEach((f,i)=>tone(f,i*.07,1,'triangle',.08)); [1760,2349].forEach((f,i)=>tone(f,.5+i*.12,.9,'sine',.05)); noise(1.2,.1,5000,10000,.05); },
  E(){ [392,523,659,784].forEach((f,i)=>tone(f,i*.09,.9,'sawtooth',.035)); tone(196,0,1,'sine',.12); },
};

