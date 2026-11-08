'use strict';
// A deterministic, engine-only Journey player. Both the shipped engine and the current one follow
// exactly the same policy, so their runs can be compared step by step.
function act(e, run, forceWin, seen) {
  const p = run.pending;
  if (run.status === 'map') {
    if (p && p.kind === 'start') { seen.charms.push(...p.charms); return e.takeStartCharm(run, 0); }
    const node = e.availableNodes(run)[0];
    e.enterNode(run, node.id);
    if (run.fight) { seen.enemies.push(run.fight.enemy.def.id); if (forceWin) run.fight.enemy.hp = 0; }
    if (run.pending && run.pending.kind === 'event') seen.events.push(run.pending.id);
    return;
  }
  if (run.status === 'fight') {
    const f = run.fight, i = f.hand.findIndex((c, k) => e.canPlayCard(f, k).ok);
    return i >= 0 ? e.runPlayCard(run, i) : e.runEndTurn(run);
  }
  if (!p) return e.leaveNode(run);
  const charmPick = p.kind === 'reward' && p.jokers && !p.jokerTaken;
  if (p.cards && !p.cardTaken) return e.takeCard(run, 0);
  if (charmPick) { seen.charms.push(...p.jokers); return e.takeJoker(run, 0); }
  if (p.kind === 'swap') return e.resolveSwap(run, null);
  if (p.kind === 'select') return e.resolveSelect(run, []);
  if (p.kind === 'event' && !p.result) return e.applyEvent(run, e.eventChoices(run).findIndex(c => c.ok));
  if (p.kind === 'rest' && !p.done) return e.rest(run, 'heal');
  return e.leaveNode(run);
}
// Plays until the run is won or lost (or until `until(run)` is true). With forceWin, every enemy
// starts at 0 HP, so the next play or End turn wins before the enemy acts.
function autoplay(e, run, { maxSteps = 20000, forceWin = false, onStep, until } = {}) {
  const seen = { enemies: [], events: [], charms: [] };
  let steps = 0;
  while (run.status !== 'won' && run.status !== 'lost') {
    if (until && until(run)) break;
    if (steps >= maxSteps) throw new Error('run did not end');
    act(e, run, forceWin, seen);
    steps++;
    if (onStep) onStep(run, steps);
  }
  return { steps, ...seen };
}
module.exports = { autoplay };
