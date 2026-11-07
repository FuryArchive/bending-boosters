import { test } from 'node:test';
import assert from 'node:assert/strict';
import { payout } from '../../src/engine/run.js';
test('engine modules import natively', () => {
  assert.equal(typeof payout, 'function');
});
