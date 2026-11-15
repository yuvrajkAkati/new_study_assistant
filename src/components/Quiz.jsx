import { useState } from 'react';
import { useRound } from '../hooks/useRound.js';
import RoundSummary from './RoundSummary.jsx';

export default function Quiz({ set }) {
  const round = useRound(set.items);
  const [selected, setSelected] = useState(null);

  if (round.done) return <RoundSummary round={round} noun="questions" />;

  const question = round.current;
  const answered = selected !== null;
  const correct = selected === question.answerIndex;

  const next = () => {
    round.answer(correct);
    setSelected(null);
  };

  const optionClass = (index) => {
    if (!answered) return 'option';
    if (index === question.answerIndex) return 'option correct';
    if (index === selected) return 'option wrong';
    return 'option';
  };

  return (
    <div>
      <p className="muted">
        Question {round.position} of {round.total}
        {round.round > 1 && ' · re-testing the ones you missed'}
      </p>
      <p className="question">{question.question}</p>

      <div className="options">
        {question.options.map((option, index) => (
          <button
            key={index}
            type="button"
            className={optionClass(index)}
            disabled={answered}
            onClick={() => setSelected(index)}
          >
            {option}
          </button>
        ))}
      </div>

      {answered && (
        <div className="feedback">
          <p>
            <strong>{correct ? 'Correct!' : `Not quite. The answer is "${question.options[question.answerIndex]}".`}</strong>{' '}
            {question.explanation}
          </p>
          <button type="button" className="primary wide" onClick={next}>
            {round.position === round.total ? 'See results' : 'Next question'}
          </button>
        </div>
      )}
    </div>
  );
}
