export default function RoundSummary({ round, noun }) {
  const right = round.total - round.missedCount;

  return (
    <div className="summary">
      <p className="score">
        {right} of {round.total} right{round.round > 1 && ' in this re-test'}
      </p>

      {round.missedCount > 0 ? (
        <button type="button" className="primary wide" onClick={round.retryMissed}>
          Re-test the {round.missedCount} you missed
        </button>
      ) : (
        <p>You got everything right.</p>
      )}

      <button type="button" className="wide" onClick={round.restart}>
        Start over with all {noun}
      </button>
    </div>
  );
}
