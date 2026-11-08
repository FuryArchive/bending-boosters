// A mechanic is a plain object that a set registers with registerMechanic(). Every hook is optional
// and pure (no DOM, no Math.random). Hooks run in registration order.
//   id, set                       unique id; the set code that owns it
// Card conversion (only for cards whose card.set === m.set):
//   keyword(word, keywords) -> boolean   claim a printed keyword ("Firebending 2"); write keywords.*
//   prepare(card, rc)                    after the base fields, before effects (e.g. rc.isLesson)
//   act(entry, on, rc) -> act | null     translate a catalog fx entry the engine doesn't know (["earth", 2])
//   finish(card, rc)                     after effects and Power (curated overrides)
//   text(rc) -> string[]                 extra card text, after the Power line
// Fights (only when the fight's sets include m.set):
//   keywordFlow(card, ctx) -> number     Flow this card adds; kept even when a rule suppresses the card
//   onCard(card, mode, ctx, f, x) -> patch    same as a charm's onCard; mode is "strike" | "guard" | "play"
//   onTurnStart(f) -> patch, onTurnEnd(f) -> patch   same as the charm hooks
//   surge: { els: [element ids], name }  play all of these in one turn: Flow × opts.avatarMult
var MECHANICS = [];
export function registerMechanic(m) {
  if (MECHANICS.some((x) => x.id === m.id)) throw new Error("Mechanic already registered: " + m.id);
  MECHANICS.push(m);
  return m;
}
export var mechanicsFor = (sets) => sets ? MECHANICS.filter((m) => sets.includes(m.set)) : MECHANICS.slice();
var ownedBy = (card) => MECHANICS.filter((m) => m.set === card.set);
export function mechKeyword(card, word, keywords) {
  for (const m of ownedBy(card)) if (m.keyword && m.keyword(word, keywords)) return true;
  return false;
}
export function mechPrepare(card, rc) {
  for (const m of ownedBy(card)) if (m.prepare) m.prepare(card, rc);
}
export function mechAct(card, entry, on, rc) {
  for (const m of ownedBy(card)) {
    const a = m.act ? m.act(entry, on, rc) : null;
    if (a) return a;
  }
  return null;
}
export function mechFinish(card, rc) {
  for (const m of ownedBy(card)) if (m.finish) m.finish(card, rc);
}
export var mechText = (rc) => MECHANICS.flatMap((m) => m.text ? m.text(rc) : []);
export var mechFlow = (f, card, ctx) => (f.mech || []).reduce((s, m) => s + (m.keywordFlow ? m.keywordFlow(card, ctx) || 0 : 0), 0);
export function surgeOf(f) {
  const m = (f.mech || []).find((x) => x.surge);
  return m ? m.surge : null;
}
