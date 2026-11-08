import '../../src/content.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { migrateMain, freshMainFields, MAIN_SAVE_SCHEMA, migrateRun, RUN_SAVE_VERSION } from '../../src/save/migrate.js';
const v2 = () => ({ v: 2, money: 12.5, coll: { 'TLA:1': 3 }, settings: { keep: 4 } });
test('v2 save gains the schema-3 fields without a starter gift', () => {
  const s = migrateMain(v2());
  assert.equal(s.schema, MAIN_SAVE_SCHEMA);
  assert.equal(s.starterGiven, true);
  assert.deepEqual(s.daily, { last: null, streak: 0 });
  assert.equal(s.freePacks, 0); assert.equal(s.settings.keepJourney, 12);
  assert.equal(s.money, 12.5); assert.deepEqual(s.coll, { 'TLA:1': 3 });
});
test('the stored version stays 2 so the old Desktop build never takes its wipe branch', () => {
  assert.equal(migrateMain(v2()).v, 2);
  assert.equal(freshMainFields().schema, MAIN_SAVE_SCHEMA);
});
test('existing keepJourney is preserved', () => {
  const s = v2(); s.settings.keepJourney = 7;
  assert.equal(migrateMain(s).settings.keepJourney, 7);
});
test('schema-3 save is unchanged', () => {
  const s = { v: 2, ...freshMainFields(), money: 1, settings: { keepJourney: 12 } };
  assert.deepEqual(migrateMain(structuredClone(s)), s);
});
test('fresh fields mean a first launch', () => {
  assert.equal(freshMainFields().starterGiven, false);
});

const v2run = () => ({ v: 2, seed: 'S', nation: 'fire', book: 2, floor: 3, hp: 40, deck: [{ uid: 'd1' }], stats: { fights: 1 } });
const without = (r, keys) => { const o = { ...r }; for (const k of keys) delete o[k]; return o; };
test('a v2 Journey run migrates to v3 colours, sets and theme, keeping everything else', () => {
  const r = migrateRun(v2run());
  assert.equal(r.v, RUN_SAVE_VERSION); assert.equal(r.v, 3);
  assert.deepEqual(r.colours, ['R']); assert.deepEqual(r.sets, ['TLA']); assert.equal(r.theme, 'avatar');
  assert.equal(r.nation, 'fire');
  assert.deepEqual(without(r, ['v', 'colours', 'sets', 'theme']), without(v2run(), ['v']));
});
test('migrateRun is idempotent', () => {
  assert.deepEqual(migrateRun(migrateRun(v2run())), migrateRun(v2run()));
});
test('bad colours fall back to the nation, then to blue', () => {
  assert.deepEqual(migrateRun({ v: 3, colours: ['X', 'Q'], nation: 'earth', sets: ['TLA'], theme: 'avatar' }).colours, ['G']);
  assert.deepEqual(migrateRun({ v: 3, colours: ['X', 'Q'], sets: ['TLA'], theme: 'avatar' }).colours, ['U']);
  assert.deepEqual(migrateRun({ v: 3, colours: ['W', 'U', 'B'], sets: ['TLA'], theme: 'avatar' }).colours, ['U']);
});
test('unknown sets are dropped; none left means every Journey set', () => {
  assert.deepEqual(migrateRun({ v: 3, colours: ['U'], sets: ['TMT', 'TLA'], theme: 'avatar' }).sets, ['TLA']);
  assert.deepEqual(migrateRun({ v: 3, colours: ['U'], sets: ['NOPE'], theme: 'avatar' }).sets, ['TLA']);
});
test('an unknown theme and a newer version are kept as they are', () => {
  const r = migrateRun({ v: 4, colours: ['U', 'R'], sets: ['TLA'], theme: 'tmt' });
  assert.equal(r.theme, 'tmt'); assert.equal(r.v, 4);
  assert.equal(migrateRun({ v: 3, colours: ['U'], sets: ['TLA'] }).theme, 'avatar');
});
