// State for going through a set one item at a time, and re-testing the misses.
// Shared by flashcards and the quiz. Kept as a pure reducer so it's easy to test.
//
// queue:  ids of the items in this round, in order
// pos:    index into queue of the current item
// missed: ids answered wrong in this round
// round:  1 for the first pass, 2+ for re-tests

export function startRound(ids) {
  return { queue: ids, pos: 0, missed: [], round: 1 };
}

export function roundReducer(state, action) {
  switch (action.type) {
    case 'answer': {
      if (state.pos >= state.queue.length) return state; // round already over
      const id = state.queue[state.pos];
      return {
        ...state,
        pos: state.pos + 1,
        missed: action.correct ? state.missed : [...state.missed, id],
      };
    }
    case 'retryMissed':
      if (state.missed.length === 0) return state;
      return { queue: state.missed, pos: 0, missed: [], round: state.round + 1 };
    case 'restart':
      return startRound(action.ids);
    default:
      return state;
  }
}
