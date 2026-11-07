import { test } from 'node:test';
import assert from 'node:assert/strict';
import { migrateMain, freshMainFields, MAIN_SAVE_SCHEMA } from '../../src/save/migrate.js';
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
