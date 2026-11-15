export default function StudyForm({ input, onInputChange, mode, onModeChange, onSubmit, canSubmit, maxLength }) {
  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="notes">Notes or topic</label>
      <textarea
        id="notes"
        rows={6}
        value={input}
        maxLength={maxLength}
        onChange={(event) => onInputChange(event.target.value)}
        placeholder='Paste your notes, or type a topic like "photosynthesis"'
      />
      <div className="char-count">
        {input.length} / {maxLength}
      </div>

      <fieldset className="modes">
        <legend>Make</legend>
        <label>
          <input type="radio" name="mode" checked={mode === 'flashcards'} onChange={() => onModeChange('flashcards')} />
          Flashcards
        </label>
        <label>
          <input type="radio" name="mode" checked={mode === 'quiz'} onChange={() => onModeChange('quiz')} />
          Quiz
        </label>
      </fieldset>

      <button type="submit" className="primary wide" disabled={!canSubmit}>
        Generate
      </button>
    </form>
  );
}
