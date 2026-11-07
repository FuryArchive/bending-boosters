export function hashStr(s) {
  s = String(s);
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
    h = h << 13 | h >>> 19;
  }
  return h >>> 0;
}
export function createRng(seed) {
  let st = (typeof seed === "number" ? seed : hashStr(seed)) | 0;
  const next = () => {
    st = st + 1831565813 | 0;
    let t = st;
    t = Math.imul(t ^ t >>> 15, 1 | t);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (n) => Math.floor(next() * n),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    },
    getState: () => st,
    setState: (n) => {
      st = n | 0;
    }
  };
}
export function withRng(obj, fn) {
  const rng = createRng(0);
  rng.setState(obj.rngState);
  try {
    return fn(rng);
  } finally {
    obj.rngState = rng.getState();
  }
}
