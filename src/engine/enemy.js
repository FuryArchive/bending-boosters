var HEAL_TRAIT = 0.06;
var CHARGE_MULT = 2;
var CHARGE_CD = 3;
var ESCALATE = 0.15;
var FLURRY_MULT = 0.45;
var FORTIFY_ARMOR = 4;
var COMET_MULT = 1.25;
var HEXES = [
  { id: "cost_up_water", text: "Water cards cost +1 this turn" },
  { id: "cost_up_fire", text: "Fire cards cost +1 this turn" },
  { id: "draw_less", text: "Draw 1 fewer card this turn" }
];
var DAMAGING = /* @__PURE__ */ new Set(["strike", "charge", "lightning", "flurry"]);
export function makeEnemyState(def) {
  const e = {
    def,
    hp: def.hp,
    maxHp: def.hp,
    armor: def.armor || 0,
    countdown: def.countdown ?? 1,
    atk: def.atk,
    cancelNext: false,
    intentIdx: 0,
    intent: null,
    pattern: def.pattern,
    phase: 0,
    fortArmor: 0,
    hexIdx: 0,
    copyBonus: 0,
    burn: 0,
    haunt: 0
  };
  setIntent(e, 0, true);
  return e;
}
function setIntent(e, idx, initial) {
  const pattern = e.pattern && e.pattern.length ? e.pattern : ["strike"];
  e.intentIdx = idx % pattern.length;
  e.delayed = false;
  const [kind, k] = String(pattern[e.intentIdx]).split(":");
  const cd = (c) => {
    if (!initial) e.countdown = c;
  };
  const base = e.def.countdown ?? 1;
  if (kind === "charge" || kind === "lightning") {
    e.intent = { kind, dmg: Math.floor(e.atk * CHARGE_MULT), hits: 1, pierce: kind === "lightning" ? 0.5 : 0 };
    e.countdown = CHARGE_CD;
  } else if (kind === "flurry") {
    e.intent = { kind, dmg: Math.floor(e.atk * FLURRY_MULT), hits: +k || 2 };
    cd(base);
  } else if (kind === "fortify") {
    e.intent = { kind, dmg: 0, hits: 0, armor: FORTIFY_ARMOR };
    cd(base);
  } else if (kind === "hex") {
    e.intent = { kind, dmg: 0, hits: 0, hex: HEXES[e.hexIdx % HEXES.length] };
    cd(base);
  } else {
    e.intent = { kind: "strike", dmg: e.atk, hits: 1 };
    cd(base);
  }
}
export function pendingCopyBonus(f) {
  return f.enemy.def.copyJoker ? Math.floor(f.peakFlow / 2) : f.enemy.copyBonus || 0;
}
export function intentHit(f) {
  const e = f.enemy;
  if (!DAMAGING.has(e.intent.kind)) return 0;
  return Math.floor((e.intent.dmg + pendingCopyBonus(f)) * (f.rule && f.rule.id === "comet" ? COMET_MULT : 1));
}
export function intentDamage(f, block, dodge = 0) {
  const e = f.enemy;
  if (!DAMAGING.has(e.intent.kind) || e.cancelNext) return 0;
  let b = e.intent.pierce ? Math.floor(block * (1 - e.intent.pierce)) : block, total = 0;
  for (let h = 0; h < e.intent.hits; h++) {
    if (dodge > 0) {
      dodge--;
      continue;
    }
    const d = intentHit(f);
    const a = Math.min(b, d);
    b -= a;
    total += d - a;
  }
  return total;
}
function mostPlayed(f) {
  const c = { ...f.elementCounts };
  for (const k in f.fightCounts) c[k] = (c[k] || 0) + f.fightCounts[k];
  let best = null;
  for (const k in c) if (k !== "Neutral" && (!best || c[k] > c[best])) best = k;
  return best;
}
export function checkPhase(f, events) {
  const e = f.enemy, ph = (e.def.phases || [])[e.phase];
  if (!ph || e.hp <= 0 || e.hp > e.maxHp * ph.atHpPct) return;
  e.phase++;
  if (ph.rule) f.rule = ph.rule;
  if (ph.rule && ph.rule.id === "comet") f.taxed = mostPlayed(f);
  if (ph.pattern) {
    e.pattern = ph.pattern;
    setIntent(e, 0, false);
  }
  events.push({ t: "phase", n: e.phase, rule: ph.rule || null, taxed: f.taxed || null });
}
export function enemyAct(f, events, onDodge2) {
  const e = f.enemy, p = f.player;
  if (e.fortArmor) {
    e.armor -= e.fortArmor;
    e.fortArmor = 0;
  }
  if (e.def.trait === "heal") {
    const h = Math.floor(e.maxHp * HEAL_TRAIT);
    e.hp = Math.min(e.maxHp, e.hp + h);
    events.push({ t: "enemyHeal", n: h });
  }
  const it = e.intent;
  if (it.kind === "fortify") {
    e.armor += it.armor;
    e.fortArmor = it.armor;
    if (e.burn) {
      e.burn = Math.floor(e.burn / 2);
    }
    events.push({ t: "enemyFortify", armor: it.armor });
  } else if (it.kind === "hex") {
    f.hex = it.hex;
    e.hexIdx++;
    events.push({ t: "enemyHex", hex: it.hex });
  } else if (e.cancelNext) {
    e.cancelNext = false;
    events.push({ t: "enemyCanceled" });
    afterAttack(p);
  } else {
    let block = it.pierce ? Math.floor(p.block * (1 - it.pierce)) : p.block;
    for (let h = 0; h < it.hits; h++) {
      const hit = intentHit(f);
      if (p.dodge > 0) {
        p.dodge--;
        events.push({ t: "dodge", dmg: hit, n: h });
        if (onDodge2) onDodge2(events);
        if (e.hp <= 0) break;
        continue;
      }
      const blocked = Math.min(hit, block), dmg = hit - blocked;
      block -= blocked;
      p.hp = Math.max(0, p.hp - dmg);
      events.push({ t: "enemyHit", dmg: hit, blocked, kind: it.kind, n: h }, { t: "playerHit", dmg });
      if (p.hp <= 0) break;
    }
    if (e.def.trait === "enrage") e.atk += 2;
    e.atk = Math.ceil(e.atk * (1 + ESCALATE));
    afterAttack(p);
  }
  setIntent(e, e.intentIdx + 1, false);
}
function afterAttack(p) {
  const keep = Math.floor((p.stone || 0) / 2);
  p.block = keep;
  p.stone = keep;
}
