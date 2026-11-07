import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crc32 } from '../../src/save/crc32.js';
import { exportSave, parseSaveFile, importSave } from '../../src/save/savefile.js';

// localStorage-compatible in-memory storage. failOnSet makes one setItem(key) call throw.
function memStorage(init = {}, { failOnSet } = {}) {
  const m = new Map(Object.entries(init));
  let armed = !!failOnSet;
  return {
    get length() { return m.size; },
    key: (i) => [...m.keys()][i] ?? null,
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => {
      if (armed && k === failOnSet) { armed = false; throw new Error('QuotaExceededError'); }
      m.set(k, String(v));
    },
    removeItem: (k) => { m.delete(k); },
  };
}

test('crc32 known vector', () => { assert.equal(crc32('123456789'), 'cbf43926'); });
test('crc32 hashes UTF-8 bytes', () => { assert.equal(crc32('★'), crc32('★')); assert.notEqual(crc32('★'), crc32('*')); });
test('export includes bb.* and bendingBoosters.*, not bb.backup or others', () => {
  const s = memStorage({ 'bendingBoosters.v1': '{"v":3}', 'bb.run': 'R', 'bb.backup': 'X', other: 'Y' });
  assert.deepEqual(Object.keys(exportSave(s, 0).keys), ['bb.run', 'bendingBoosters.v1']);
});
test('round trip export → parse → import into another storage', () => {
  const a = memStorage({ 'bendingBoosters.v1': '{"v":3,"money":9}', 'bb.run': 'R' });
  const b = memStorage({ 'bendingBoosters.v1': '{"v":3,"money":1}', 'bb.prices': 'P' });
  const p = parseSaveFile(JSON.stringify(exportSave(a, 0)));
  assert.equal(p.ok, true); assert.deepEqual(importSave(b, p.keys), { ok: true });
  assert.equal(b.getItem('bendingBoosters.v1'), '{"v":3,"money":9}');
  assert.equal(b.getItem('bb.prices'), null);
  assert.equal(JSON.parse(b.getItem('bb.backup')).keys['bendingBoosters.v1'], '{"v":3,"money":1}');
});
test('rejects bad files with the exact messages', () => {
  const good = exportSave(memStorage({ 'bendingBoosters.v1': '{}' }), 0);
  assert.equal(parseSaveFile('nope').error, "This file isn't a save file.");
  assert.equal(parseSaveFile('{"a":1}').error, "This isn't a Bending Boosters save.");
  assert.equal(parseSaveFile(JSON.stringify({ ...good, version: 2 })).error, 'This save was made by a newer version of the game.');
  assert.equal(parseSaveFile(JSON.stringify({ ...good, keys: { ...good.keys, 'bb.run': 'x' } })).error, 'This save file is damaged or was edited.');
  const empty = exportSave(memStorage({ 'bb.run': 'R' }), 0);
  assert.equal(parseSaveFile(JSON.stringify(empty)).error, 'This save has no wallet or collection in it.');
});
test('rejects saves carrying HTML (an edited file could inject script)', () => {
  const evil = exportSave(memStorage({ 'bendingBoosters.v1': JSON.stringify({ v: 2, since: '<img src=x onerror=alert(1)>' }) }), 0);
  assert.equal(parseSaveFile(JSON.stringify(evil)).error, 'This save file is damaged or was edited.');
  const evilRun = exportSave(memStorage({ 'bendingBoosters.v1': '{"v":2}', 'bb.run': JSON.stringify({ book: '<b>x</b>' }) }), 0);
  assert.equal(parseSaveFile(JSON.stringify(evilRun)).error, 'This save file is damaged or was edited.');
});
test('rejects a main save that is not a JSON object', () => {
  const bad = exportSave(memStorage({ 'bendingBoosters.v1': '42' }), 0);
  assert.equal(parseSaveFile(JSON.stringify(bad)).error, 'This save file is damaged or was edited.');
});
test('failed import restores the previous save', () => {
  const b = memStorage({ 'bendingBoosters.v1': 'OLD', 'bb.run': 'OLDRUN' }, { failOnSet: 'bb.run' });
  const r = importSave(b, { 'bendingBoosters.v1': 'NEW', 'bb.run': 'NEWRUN' });
  assert.equal(r.ok, false);
  assert.equal(b.getItem('bendingBoosters.v1'), 'OLD'); assert.equal(b.getItem('bb.run'), 'OLDRUN');
});
