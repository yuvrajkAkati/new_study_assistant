import { useEffect, useState } from 'react';

const SLOW_AFTER_MS = 10_000;

export default function Loading({ onCancel }) {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="status result" role="status">
      <p>Generating…</p>
      {slow && <p className="muted">This is taking longer than usual. You can keep waiting or cancel.</p>}
      <button type="button" onClick={onCancel}>
        Cancel
      </button>
    </div>
  );
}
