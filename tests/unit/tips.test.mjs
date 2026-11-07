import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TIPS } from '../../src/meta/tips.js';

test('tips cover exactly the spec screens, in order', () => {
  assert.deepEqual(TIPS.map((t) => t.id), ['packs', 'reveal', 'collection', 'journey-start', 'map', 'fight', 'flow', 'shop', 'rest', 'event']);
});
test('tip ids are unique', () => {
  assert.equal(new Set(TIPS.map((t) => t.id)).size, TIPS.length);
});
test('every tip has a title and 1-220 characters of text', () => {
  for (const t of TIPS) {
    assert.ok(t.title && t.title.length > 0, t.id);
    assert.ok(t.text.length >= 1 && t.text.length <= 220, `${t.id}: ${t.text.length}`);
  }
});
