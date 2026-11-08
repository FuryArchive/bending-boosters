import '../../src/content.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { themeById, themeOf } from '../../src/engine/themes.js';

const neutral = () => themeById('neutral'), avatar = () => themeById('avatar');
const slots = t => [1, 2, 3].flatMap(b => [...t.books[b].roster, ...t.books[b].elites, t.books[b].boss]);
const stats = e => ({
  armor: e.armor, trait: e.trait, pattern: e.pattern, copyJoker: !!e.copyJoker, rule: e.rule ? e.rule.id : null,
  phases: (e.phases || []).map(p => ({ atHpPct: p.atHpPct, pattern: p.pattern || null, rule: p.rule ? p.rule.id : null })),
});

test('an unknown theme falls back to neutral', () => {
  assert.equal(themeOf({ theme: 'nope' }).id, 'neutral');
});
test('each Act has 6 enemies, 3 elites and a boss, all with new ids', () => {
  for (const b of [1, 2, 3]) {
    const book = neutral().books[b];
    assert.deepEqual([book.roster.length, book.elites.length, !!book.boss], [6, 3, true]);
  }
  const ids = slots(neutral()).map(e => e.id);
  assert.ok(ids.every(id => id.startsWith('n_')));
  assert.equal(new Set(ids).size, ids.length);
});
test('neutral enemies mirror the Avatar slots exactly, so difficulty is unchanged', () => {
  const n = slots(neutral()), a = slots(avatar());
  assert.equal(n.length, a.length);
  n.forEach((e, i) => assert.deepEqual(stats(e), stats(a[i]), e.id));
});
test('six neutral events, each with a safe way out', () => {
  const ev = neutral().events;
  assert.equal(Object.keys(ev).length, 6);
  for (const [id, e] of Object.entries(ev)) {
    assert.ok(id.startsWith('n_'), id);
    assert.ok(e.choices.some(c => !c.req), id);
  }
});
test('the neutral theme has no franchise words', () => {
  const ART = new Set(['soldier', 'beast', 'spirit', 'machine', 'archer', 'bender', 'boss']);
  const bad = /Avatar|Aang|Zuko|Azula|Ozai|Zhao|Iroh|Katara|Sokka|Toph|Appa|Momo|Nation|Tribe|Kingdom|Nomad|bend|Ba Sing Se|Omashu|Joker|\bBook\b/;
  for (const f of ['enemies.js', 'events.js', 'theme.js']) {
    const src = fs.readFileSync(new URL('../../src/themes/neutral/' + f, import.meta.url), 'utf8');
    for (const [lit] of src.matchAll(/"(?:[^"\\]|\\.)*"|`[^`]*`/g)) {
      const s = lit.slice(1, -1);
      if (!ART.has(s)) assert.doesNotMatch(s, bad, f);
    }
  }
});
