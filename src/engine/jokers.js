var legendScale = (j) => j.kind === "legend" ? 1 + 0.2 * (Math.max(1, j.stars || 1) - 1) : 1;
export function jokerPatch(hook, jokers, args, state, events) {
  const out = {};
  for (const j of jokers || []) {
    const fn = j[hook];
    if (!fn) continue;
    const p = fn.call(j, ...args, { state, j });
    if (!p) continue;
    const s = p.raw ? 1 : legendScale(j), ev = { t: "joker", id: j.id, hook };
    for (const [k, v] of Object.entries(p)) {
      if (k === "raw" || k === "note") continue;
      if (typeof v === "boolean") {
        out[k] = out[k] || v;
        ev[k] = v;
        continue;
      }
      if (k === "xdmg") {
        const m = Math.round((1 + (v - 1) * s) * 100) / 100;
        out.xdmg = (out.xdmg || 1) * m;
        ev.xdmg = m;
        continue;
      }
      const n = Math.floor(v * s);
      out[k] = (out[k] || 0) + n;
      ev[k] = n;
    }
    if (events) events.push(ev);
  }
  return out;
}
export function jokerOpts(jokers) {
  const o = { avatarMult: 2, avatarTimes: 1, pathBonus: 1, pathSkip: false, alias: {} };
  for (const j of jokers || []) if (j.opts) j.opts(o);
  return o;
}
