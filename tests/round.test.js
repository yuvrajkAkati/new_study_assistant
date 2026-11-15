import { test } from 'node:test';
import assert from 'node:assert/strict';
import { roundReducer, startRound } from '../src/lib/round.js';

function play(state, answers) {
  return answers.reduce((s, correct) => roundReducer(s, { type: 'answer', correct }), state);
}

test('records misses and moves through the queue', () => {
  const state = play(startRound([0, 1, 2]), [true, false, false]);
  assert.equal(state.pos, 3);
  assert.deepEqual(state.missed, [1, 2]);
});

test('re-test only contains the missed items', () => {
  let state = play(startRound([0, 1, 2]), [true, false, false]);
  state = roundReducer(state, { type: 'retryMissed' });
  assert.deepEqual(state, { queue: [1, 2], pos: 0, missed: [], round: 2 });

  state = play(state, [true, false]);
  state = roundReducer(state, { type: 'retryMissed' });
  assert.deepEqual(state.queue, [2]);
  assert.equal(state.round, 3);
});

test('extra answers after the round ends are ignored', () => {
  const state = play(startRound([0]), [false, true, true]);
  assert.equal(state.pos, 1);
  assert.deepEqual(state.missed, [0]);
});

test('retry with nothing missed does nothing', () => {
  const state = play(startRound([0, 1]), [true, true]);
  assert.equal(roundReducer(state, { type: 'retryMissed' }), state);
});

test('restart goes back to the full set', () => {
  let state = play(startRound([0, 1, 2]), [false, false, false]);
  state = roundReducer(state, { type: 'retryMissed' });
  state = roundReducer(state, { type: 'restart', ids: [0, 1, 2] });
  assert.deepEqual(state, startRound([0, 1, 2]));
});
