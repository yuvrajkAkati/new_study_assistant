import { useState } from 'react';
import { useRound } from '../hooks/useRound.js';
import RoundSummary from './RoundSummary.jsx';

export default function Flashcards({ set }) {
  const round = useRound(set.items);
  const [flipped, setFlipped] = useState(false);

  if (round.done) return <RoundSummary round={round} noun="cards" />;

  const card = round.current;
  const grade = (knewIt) => {
    setFlipped(false);
    round.answer(knewIt);
  };

  return (
    <div>
      <p className="muted">
        Card {round.position} of {round.total}
        {round.round > 1 && ' · re-testing the ones you missed'}
      </p>

      <button type="button" className="flashcard" onClick={() => setFlipped((f) => !f)}>
        <span className="side">{flipped ? 'Answer' : 'Question'}</span>
        <span className="flashcard-text">{flipped ? card.back : card.front}</span>
        <span className="muted small">Tap to flip</span>
      </button>

      {flipped ? (
        <div className="row">
          <button type="button" onClick={() => grade(false)}>
            Didn't know it
          </button>
          <button type="button" onClick={() => grade(true)}>
            Knew it
          </button>
        </div>
      ) : (
        <p className="muted">Flip the card, then mark whether you knew it.</p>
      )}
    </div>
  );
}
