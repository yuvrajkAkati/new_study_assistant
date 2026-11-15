import { parseStudySet } from './parseStudySet.js';

/**
 * Asks our backend for a study set and returns validated data.
 * Throws an Error with a user-facing message if anything goes wrong.
 * If `signal` aborts, its reason is re-thrown as-is so the caller can tell
 * "cancelled" or "timed out" apart from "failed".
 */
export async function requestStudySet({ mode, input, signal }) {
  let response;
  try {
    response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ mode, input }),
      signal,
    });
  } catch (err) {
    if (signal?.aborted) throw err;
    throw new Error("Couldn't reach the server. Check that it's running and try again.");
  }

  const body = await response.json().catch((err) => {
    if (signal?.aborted) throw err;
    return null;
  });

  if (!response.ok) {
    throw new Error(body?.error ?? `The server returned an error (${response.status}).`);
  }

  const result = parseStudySet(mode, body?.text, body?.finishReason);
  if (!result.ok) {
    // Log the raw text so a bad response can be inspected in DevTools.
    console.warn(`[study-assistant] ${result.kind}:`, body?.text);
    throw new Error(result.message);
  }
  return result;
}
