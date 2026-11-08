import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from '../../tools/build.mjs';

const packagesOf = html => JSON.parse(html.match(/^const SET_PACKAGES = (.*);$/m)[1]);

test('the build inlines every set package once', () => {
  const { html } = build();
  const line = html.match(/^const SET_PACKAGES = (.*);$/m);
  assert.ok(line);
  const pk = JSON.parse(line[1]);
  assert.deepEqual(pk.map(p => p.code), ['TLA']);
  assert.equal(pk[0].cards.base.length, 286);
  assert.equal(pk[0].archetypes.length, 10);
  assert.equal(pk[0].decks.length, 6);
  assert.ok(pk[0].prices.m['TLA:1']);
  assert.doesNotMatch(html, /^const (DATA|DECKS|PRICES) = \{/m);
});
test('--with-set adds a test package after the shipped ones', () => {
  const { html } = build(undefined, { withSets: ['tests/fixtures/sets/tst'] });
  assert.deepEqual(packagesOf(html).map(p => p.code), ['TLA', 'TST']);
});
test('a package without set.json, or a repeated code, stops the build', () => {
  assert.throws(() => build(undefined, { withSets: ['tests/fixtures'] }), /missing set\.json/);
  assert.throws(() => build(undefined, { withSets: ['src/sets/tla'] }), /duplicate set code TLA/);
});
