var AC = null;
var enabled = () => true;
export function setSoundGate(fn) {
  enabled = fn;
}
function ac() {
  if (!enabled()) return null;
  if (!AC) {
    try {
      AC = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      return null;
    }
  }
  if (AC.state === "suspended") AC.resume();
  return AC;
}
function tone(freq, t0, dur, type = "sine", gain = 0.08, glideTo) {
  const a = ac();
  if (!a) return;
  const t = a.currentTime + t0, o = a.createOscillator(), g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t + dur);
  g.gain.setValueAtTime(1e-4, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
  g.gain.exponentialRampToValueAtTime(1e-4, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}
function noise(dur, gain, f0, f1, t0 = 0, type = "bandpass") {
  const a = ac();
  if (!a) return;
  const t = a.currentTime + t0, b = a.createBuffer(1, Math.ceil(a.sampleRate * dur), a.sampleRate), ch = b.getChannelData(0);
  for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
  const s = a.createBufferSource();
  s.buffer = b;
  const f = a.createBiquadFilter();
  f.type = type;
  f.Q.value = 1.1;
  f.frequency.setValueAtTime(f0, t);
  f.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = a.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(1e-4, t + dur);
  s.connect(f).connect(g).connect(a.destination);
  s.start(t);
}
export var sfx = {
  // Balatro-style ladder: each scoring step climbs a semitone.
  // One rising note per card in the chain, voiced by element (spec rev 4 §8).
  elem(el, step) {
    const f = 392 * 2 ** (Math.min(step, 24) / 12);
    if (el === "Water") {
      tone(f * 2, 0, 0.35, "sine", 0.05);
      tone(f * 3, 0.03, 0.25, "sine", 0.02);
    } else if (el === "Earth") {
      tone(f / 2, 0, 0.25, "triangle", 0.08, f / 3);
      noise(0.18, 0.08, 500, 200, 0, "lowpass");
    } else if (el === "Fire") {
      tone(f, 0, 0.22, "sawtooth", 0.035);
      noise(0.25, 0.06, 1800, 5e3);
    } else if (el === "Air") {
      tone(f * 1.5, 0, 0.2, "triangle", 0.045);
      noise(0.22, 0.05, 1200, 6e3);
    } else if (el === "Spirit") {
      tone(f, 0, 0.4, "sine", 0.05, f * 1.06);
      tone(f * 1.5, 0.05, 0.3, "sine", 0.025, f * 1.4);
    } else tone(f, 0, 0.18, "triangle", 0.05);
  },
  chime(step) {
    const f = 440 * 2 ** (Math.min(step, 30) / 12);
    tone(f, 0, 0.22, "triangle", 0.06);
    tone(f * 2, 0.01, 0.12, "sine", 0.025);
  },
  mult(step) {
    const f = 330 * 2 ** (Math.min(step, 30) / 12);
    tone(f, 0, 0.25, "sawtooth", 0.035);
    noise(0.12, 0.04, 1500, 4e3);
  },
  xmult(step) {
    const f = 220 * 2 ** (Math.min(step, 30) / 12);
    tone(f, 0, 0.45, "square", 0.05, f * 2);
    noise(0.3, 0.07, 800, 6e3);
  },
  select() {
    tone(880, 0, 0.05, "triangle", 0.035);
  },
  deselect() {
    tone(600, 0, 0.05, "triangle", 0.03);
  },
  deal() {
    noise(0.05, 0.04, 2500, 3500);
  },
  whoosh() {
    noise(0.25, 0.08, 400, 3e3);
  },
  bell() {
    tone(1320, 0, 0.5, "sine", 0.05);
    tone(1980, 0.02, 0.4, "sine", 0.025);
  },
  hit(big) {
    tone(big ? 70 : 110, 0, big ? 0.6 : 0.3, "sine", big ? 0.25 : 0.15, 40);
    noise(big ? 0.5 : 0.25, big ? 0.2 : 0.12, 2e3, 200, 0, "lowpass");
  },
  hurt() {
    tone(160, 0, 0.3, "sawtooth", 0.08, 80);
    noise(0.2, 0.08, 800, 300);
  },
  block() {
    tone(300, 0, 0.12, "square", 0.04);
    noise(0.1, 0.06, 3e3, 1500);
  },
  shatter() {
    noise(0.7, 0.18, 6e3, 800);
    [1760, 2093, 2637].forEach((f, i) => tone(f, i * 0.04, 0.3, "triangle", 0.03));
  },
  avatar() {
    tone(65, 0, 2.2, "sine", 0.22);
    [262, 330, 392, 523, 659, 784].forEach((f, i) => tone(f, 0.15 + i * 0.12, 1.6, "triangle", 0.06));
    noise(2, 0.07, 300, 9e3, 0.1);
  },
  stinger() {
    [196, 185, 175].forEach((f, i) => tone(f, i * 0.18, 0.5, "sawtooth", 0.05));
    tone(98, 0, 1.2, "sine", 0.15);
  },
  fanfare() {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.6, "triangle", 0.07));
    tone(1047, 0.5, 1, "triangle", 0.06);
  },
  coin(n = 5) {
    for (let i = 0; i < Math.min(n, 8); i++) tone(1568 + i % 3 * 210, i * 0.045, 0.12, "triangle", 0.03);
  },
  step() {
    noise(0.12, 0.05, 900, 500, 0, "lowpass");
    tone(196, 0, 0.12, "sine", 0.04);
  },
  buy() {
    tone(988, 0, 0.08, "triangle", 0.05);
    tone(1319, 0.07, 0.16, "triangle", 0.05);
  },
  page() {
    noise(0.18, 0.05, 2500, 900);
  },
  lose() {
    [392, 349, 311, 262].forEach((f, i) => tone(f, i * 0.2, 0.6, "triangle", 0.06));
  }
};
