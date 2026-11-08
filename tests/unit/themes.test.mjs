import '../../src/content.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { bookLabel, registerTheme, themeById, themeOf, themeText } from '../../src/engine/themes.js';
import { registerSet } from '../../src/engine/sets.js';
import { eligible } from '../../src/engine/offers.js';
import { JOKERS } from '../../src/data/jokers.js';
import { cardByName, keyOf, setCatalog } from '../../src/engine/catalog.js';
import { MISSING_EVENT, eventById } from '../../src/engine/event-kit.js';

setCatalog(JSON.parse(fs.readFileSync(new URL('../../src/sets/tla/cards.json', import.meta.url), 'utf8')).base);
const book = () => ({ kicker: 'K', title: 'T', el: 'Neutral', places: '', bossName: 'B', hue: ['#000', '#000', '#000'],
  backdrop: {}, roster: [], elites: [], boss: { id: 'b' } });
const plainTheme = id => ({ id, name: id, colours: {}, books: { 1: book(), 2: book(), 3: book() }, events: {}, enemyArt: {}, text: {}, names: { charm: {}, offering: {}, tag: {} } });
registerTheme(plainTheme('test-plain'));
registerSet({ code: 'TST', name: 'Test', theme: 'test-plain' });

test('a run without a theme is an Avatar run; an unknown theme still resolves', () => {
  assert.equal(themeOf({}).id, 'avatar');
  assert.ok(themeById(themeOf({ theme: 'nope' }).id));
});
test('registerTheme rejects duplicates and themes without three Books', () => {
  assert.throws(() => registerTheme(plainTheme('test-plain')), /already/);
  const broken = plainTheme('test-broken'); delete broken.books[3];
  assert.throws(() => registerTheme(broken), /Book/);
});
test('the Avatar theme holds today\'s enemies and events', () => {
  const t = themeById('avatar');
  assert.deepEqual(t.books[1].roster.map(e => e.id), ['fn_soldier', 'komodo_rider', 'pirate', 'navy_marine', 'hungry_spirit', 'canyon_crawler']);
  for (const b of [1, 2, 3]) assert.deepEqual([t.books[b].roster.length, t.books[b].elites.length, !!t.books[b].boss], [6, 3, true]);
  assert.deepEqual(Object.keys(t.events), ['library', 'cabbage', 'divide', 'fortune', 'dojo', 'swamp', 'jasmine', 'oasis', 'fire_days', 'tunnel']);
});
test('Legends belong to the Avatar theme; Lesson Scroll needs TLA', () => {
  const legendKeys = JOKERS.filter(j => j.kind === 'legend').map(j => keyOf(cardByName(j.cardName)));
  const run = theme => ({ theme, sets: ['TLA'], jokers: [], ownedKeys: legendKeys, book: 3 });
  assert.equal(eligible(run('avatar'), 'shop', []).filter(j => j.kind === 'legend').length, 16);
  assert.equal(eligible(run('test-plain'), 'shop', []).filter(j => j.kind === 'legend').length, 0);
  assert.ok(eligible(run('avatar'), 'shop', []).some(j => j.id === 'lesson_scroll'));
  assert.ok(!eligible({ ...run('avatar'), sets: ['TST'] }, 'shop', []).some(j => j.id === 'lesson_scroll'));
});
test('an event this build does not know offers a safe way on', () => {
  assert.equal(eventById({ theme: 'avatar' }, 'n_nope'), MISSING_EVENT);
  assert.equal(eventById({ theme: 'avatar' }, 'cabbage').name, 'Cabbage Merchant');
});
test('theme text fills colour, element and Book tokens', () => {
  const avatar = themeById('avatar'), neutral = themeById('neutral');
  assert.equal(themeText(avatar, '{Air} Guards +4'), 'Air Guards +4');
  assert.equal(themeText(neutral, '{Air} Guards +4'), 'White Guards +4');
  assert.equal(themeText(avatar, 'Same-{element} chains'), 'Same-element chains');
  assert.equal(themeText(neutral, 'Same-{element} chains'), 'Same-colour chains');
  assert.equal(themeText(neutral, 'The {book}\'s boss of three {books}'), 'The Act\'s boss of three Acts');
  assert.equal(themeText(avatar, '{Foo} stays'), '{Foo} stays');
});
test('bookLabel names the Book from theme data only', () => {
  assert.equal(bookLabel({ theme: 'neutral', book: 2 }), 'Act 2');
  assert.equal(bookLabel({ book: 3 }), 'Book 3');
  assert.equal(bookLabel({ book: '<img>' }), 'Book 1');
  assert.equal(bookLabel({ theme: 'avatar', book: 9 }), 'Book 3');
});
