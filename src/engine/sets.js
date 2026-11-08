// Card sets that Journey can use. Each registered set names the theme its single-set runs use.
var SETS = [];
export function registerSet(set) {
  if (SETS.some((s) => s.code === set.code)) throw new Error("Set already registered: " + set.code);
  SETS.push(set);
  return set;
}
export var journeySets = () => SETS.slice();
export var setByCode = (code) => SETS.find((s) => s.code === code) || null;
export var isJourneySet = (code) => SETS.some((s) => s.code === code);
// One set: that set's theme. A mix of sets (or none, or an unknown one): the neutral theme.
export function themeForSets(codes) {
  const s = codes && codes.length === 1 ? setByCode(codes[0]) : null;
  return s ? s.theme : "neutral";
}
