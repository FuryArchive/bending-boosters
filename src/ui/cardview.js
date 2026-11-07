import { actLines, guardValue, keywordNames, strikeValue } from "../engine/cards.js";

var cardStats = (rc) => ({ strike: strikeValue(rc), guard: guardValue(rc) });
export var effectLines = (rc) => [...keywordNames(rc), ...actLines(rc)];
var ELEM_FRAME = {
  Air: ["#e9d7a8", "#fff6dc", "#6b5320"],
  Water: ["#4f8fc4", "#e2f0fb", "#0d2f52"],
  Fire: ["#c9553a", "#fbe3da", "#5a1408"],
  Earth: ["#5f8d4c", "#e6f1dc", "#1f3a12"],
  Spirit: ["#6f5c8c", "#ece5f6", "#2a1f3d"],
  Neutral: ["#9c958c", "#efece6", "#3a342c"]
};
var TAG_NAME = {
  tide: "Tide",
  study: "Study",
  ebb: "Ebb",
  stone: "Stone Wall",
  growth: "Growth",
  ramp: "Ramp",
  burn: "Burn",
  blaze: "Blaze",
  inner: "Inner Fire",
  gust: "Gust",
  team: "Team Avatar",
  evasion: "Evasion",
  drain: "Drain",
  bargain: "Bargain",
  haunt: "Haunt",
  any: ""
};
export var tagName = (t) => TAG_NAME[t] ?? t;
export function journeyCardHTML(rc, opts) {
  const els = rc.elements, multi = els.length > 1;
  const [fr, light, ink] = ELEM_FRAME[multi ? "Air" : els[0]] || ELEM_FRAME.Neutral;
  const frame = multi ? `linear-gradient(135deg,${els.map((e) => (ELEM_FRAME[e] || ELEM_FRAME.Neutral)[0]).join(",")})` : fr;
  const lines = effectLines(rc), base = cardStats(rc), live = opts.live || {};
  const s = live.strike ?? base.strike, g = live.guard ?? base.guard;
  const tags = rc.tags.map(tagName).filter(Boolean).join(" \xB7 ");
  const gem = rc.hpCost ? `<span class="jc-cost hp" title="Costs ${rc.hpCost} HP instead of energy">\u2665${rc.hpCost}</span>` : `<span class="jc-cost" title="Energy cost">${rc.energy}</span>`;
  const stats = s || g ? `${s ? `<span class="jc-strike${live.strike != null ? " live" : ""}" title="Damage when played as a Strike, before Flow"><b>${s}</b>Strike</span>` : ""}${g ? `<span class="jc-guard${live.guard != null ? " live" : ""}" title="Block when played as a Guard, before Flow"><b>${g}</b>Guard</span>` : ""}` : `<span class="jc-play" title="Play it for its effect">${rc.role === "power" ? "Power" : "Play"}</span>`;
  return `<div class="jc${multi ? " multi" : ""} rar-${opts.rarity || "C"}${rc.upgraded ? " up" : ""}" style="--jf:${frame};--jl:${light};--ji:${ink};--jr:${opts.rarityColor || "#1b1b1b"}">
  <div class="jc-name">${gem}<span class="jc-nm" title="${opts.name}${rc.upgraded ? "+" : ""}">${opts.name}${rc.upgraded ? "+" : ""}</span><span class="jc-rank" title="Rank (printed mana value): play ranks in a row for a Path">${rc.rank}</span></div>
  <div class="jc-art">${opts.art}<i class="jc-sheen"></i><span class="jc-els">${els.map((e) => opts.glyph(e, 15)).join("")}</span></div>
  <div class="jc-type"><span>${opts.typeLine}${tags ? ` \xB7 <em>${tags}</em>` : ""}</span><span class="jc-stars" title="Star level">${"\u2605".repeat(Math.max(1, rc.stars))}</span><i class="jc-rar" style="background:${opts.rarityColor || "#1b1b1b"}"></i></div>
  <div class="jc-text${lines.length > 2 ? " dense" : ""}" title="${lines.join("\n")}">${lines.length ? lines.map((l) => `<div>${l}</div>`).join("") : '<div class="jc-vanilla">No special effect</div>'}</div>
  <div class="jc-stats">${stats}</div>
</div>`;
}
