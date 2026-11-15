import { useState } from 'react';
import { useStudySet } from './hooks/useStudySet.js';
import StudyForm from './components/StudyForm.jsx';
import Loading from './components/Loading.jsx';
import ErrorMessage from './components/ErrorMessage.jsx';
import Flashcards from './components/Flashcards.jsx';
import Quiz from './components/Quiz.jsx';

const MAX_INPUT_LENGTH = 10_000; // keep in sync with server/index.js

export default function App() {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState('flashcards');
  const request = useStudySet();

  const canSubmit = input.trim().length > 0;
  const submit = () => {
    if (canSubmit) request.generate(mode, input.trim());
  };

  return (
    <main className="app">
      <h1>Study Assistant</h1>

      <StudyForm
        input={input}
        onInputChange={setInput}
        mode={mode}
        onModeChange={setMode}
        onSubmit={submit}
        canSubmit={canSubmit}
        maxLength={MAX_INPUT_LENGTH}
      />

      {request.status === 'idle' && (
        <p className="muted result">Your flashcards or quiz will show up here.</p>
      )}

      {/* key={request.id} gives each request a fresh component, so no state leaks between sets. */}
      {request.status === 'loading' && <Loading key={request.id} onCancel={request.cancel} />}

      {request.status === 'error' && (
        <ErrorMessage message={request.message} onRetry={submit} canRetry={canSubmit} />
      )}

      {request.status === 'success' && (
        <section className="result" key={request.id}>
          <h2>{request.set.title}</h2>
          {request.skipped > 0 && (
            <p className="note">
              {request.skipped} {request.skipped === 1 ? 'item' : 'items'} from the AI {request.skipped === 1 ? 'was' : 'were'} incomplete and left out.
            </p>
          )}
          {request.set.mode === 'quiz' ? <Quiz set={request.set} /> : <Flashcards set={request.set} />}
        </section>
      )}
    </main>
  );
}
