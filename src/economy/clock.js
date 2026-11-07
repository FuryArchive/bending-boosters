// The only place per-day rules read the date. Pure helpers take the time as a parameter;
// browser tests fake Date itself.
var pad2 = (n) => String(n).padStart(2, "0");
export function localDay(ms = Date.now()) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
export function utcDay(ms = Date.now()) {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}
var dayNumber = (day) => {
  const [y, m, d] = day.split("-").map(Number);
  return Date.UTC(y, m - 1, d) / 864e5;
};
export function daysBetween(fromDay, toDay) {
  return Math.round(dayNumber(toDay) - dayNumber(fromDay));
}
