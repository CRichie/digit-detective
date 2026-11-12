import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matches, filter, best } from './dist/core.js';
test('position matches preserve leading zeroes', () => {
  for (const [s, g, n] of [
    ['1234', '1234', 4],
    ['1234', '4321', 0],
    ['1234', '1299', 2],
    ['0000', '0000', 4],
    ['0071', '0011', 3],
    ['0071', '0031', 3],
    ['0071', '0202', 1],
    ['0071', '8901', 1],
  ])
    assert.equal(matches(s, g), n);
});
test('filter enforces all feedback and detects contradictions', () => {
  let h = [
      { guess: '0123', matches: 1 },
      { guess: '4567', matches: 0 },
    ],
    c = filter(h);
  assert.ok(c.length);
  assert.ok(c.every(s => h.every(x => matches(s, x.guess) === x.matches)));
  assert.equal(
    filter([
      { guess: '0000', matches: 4 },
      { guess: '0000', matches: 0 },
    ]).length,
    0,
  );
});
test('minimax selects correct candidate and avoids used guesses', () => {
  assert.equal(best(['0001'], []), '0001');
  assert.notEqual(
    best(['0001', '0002'], [{ guess: '0000', matches: 3 }]),
    '0000',
  );
});
