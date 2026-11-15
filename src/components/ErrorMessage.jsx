export default function ErrorMessage({ message, onRetry, canRetry }) {
  return (
    <div className="status error result" role="alert">
      <p>{message}</p>
      <button type="button" onClick={onRetry} disabled={!canRetry}>
        Try again
      </button>
    </div>
  );
}
