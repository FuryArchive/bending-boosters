export function fmtNum(n) {
  const a = Math.abs(n);
  const f = (v, s) => (Math.round(v * 10) / 10).toString().replace(/\.0$/, "") + s;
  if (a >= 1e9) return f(n / 1e9, "B");
  if (a >= 1e6) return f(n / 1e6, "M");
  if (a >= 1e4) return f(n / 1e3, "K");
  if (Number.isInteger(n)) return n.toLocaleString("en-US");
  return (Math.round(n * 100) / 100).toString();
}
export function shakeFor(damage) {
  return Math.min(18, 2 + 3 * Math.log10(Math.max(0, damage) + 1));
}
