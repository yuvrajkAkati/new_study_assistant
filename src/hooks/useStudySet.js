import { useCallback, useEffect, useRef, useState } from 'react';
import { requestStudySet } from '../lib/api.js';

// A little longer than the server's 60s Gemini timeout, so the server's
// clearer message usually arrives first. This one covers a hung server.
const CLIENT_TIMEOUT_MS = 70_000;

/**
 * Owns the request lifecycle: idle -> loading -> success | error.
 *
 * Stale responses: every request gets an id, and only the latest id may
 * update state. Starting a new request also aborts the previous one.
 */
export function useStudySet() {
  const [state, setState] = useState({ status: 'idle' });
  const latestId = useRef(0);
  const controllerRef = useRef(null);

  const generate = useCallback(async (mode, input) => {
    controllerRef.current?.abort('replaced');
    const controller = new AbortController();
    controllerRef.current = controller;
    const id = ++latestId.current;
    const timer = setTimeout(() => controller.abort('timeout'), CLIENT_TIMEOUT_MS);

    setState({ status: 'loading', id });

    try {
      const result = await requestStudySet({ mode, input, signal: controller.signal });
      if (id !== latestId.current) return; // a newer request owns the screen now
      setState({ status: 'success', id, set: result.set, skipped: result.skipped });
    } catch (err) {
      if (id !== latestId.current) return;
      const abortReason = controller.signal.aborted ? controller.signal.reason : null;

      if (abortReason === 'cancelled') {
        setState({ status: 'idle' });
      } else if (abortReason === 'timeout') {
        setState({ status: 'error', id, message: 'The AI is taking too long to respond. Try again.' });
      } else if (!abortReason) {
        setState({ status: 'error', id, message: err.message });
      }
      // Any other abort reason means we unmounted: nothing to show.
    } finally {
      clearTimeout(timer);
    }
  }, []);

  const cancel = useCallback(() => {
    controllerRef.current?.abort('cancelled');
  }, []);

  // Don't leave a request running if the component goes away.
  useEffect(() => () => controllerRef.current?.abort('unmounted'), []);

  return { ...state, generate, cancel };
}
