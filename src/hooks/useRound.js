import { useReducer } from 'react';
import { roundReducer, startRound } from '../lib/round.js';

/** Steps through `items` one at a time and lets the user re-test the ones they missed. */
export function useRound(items) {
  const [state, dispatch] = useReducer(roundReducer, items, (list) => startRound(list.map((item) => item.id)));

  const done = state.pos >= state.queue.length;
  const byId = (id) => items.find((item) => item.id === id);

  return {
    current: done ? null : byId(state.queue[state.pos]),
    position: state.pos + 1,
    total: state.queue.length,
    round: state.round,
    missedCount: state.missed.length,
    done,
    answer: (correct) => dispatch({ type: 'answer', correct }),
    retryMissed: () => dispatch({ type: 'retryMissed' }),
    restart: () => dispatch({ type: 'restart', ids: items.map((item) => item.id) }),
  };
}
