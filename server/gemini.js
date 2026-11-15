import { buildGeminiRequest } from './prompt.js';

const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
// Flash-Lite answers in a few seconds and doesn't "think" by default.
// The bigger gemini-flash-latest thinks first and was often too slow.
const DEFAULT_MODEL = 'gemini-flash-lite-latest';
const TIMEOUT_MS = 60_000;

const seconds = (start) => `${((Date.now() - start) / 1000).toFixed(1)}s`;

// An Error with an HTTP status, so the route can pass it straight to the browser.
function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

function messageForStatus(status) {
  if (status === 400 || status === 401 || status === 403) {
    return 'The AI service rejected the request. Check GEMINI_API_KEY and GEMINI_MODEL in .env.';
  }
  if (status === 404) return 'That Gemini model was not found. Check GEMINI_MODEL in .env.';
  if (status === 429) return 'Too many requests to the AI service. Wait a minute and try again.';
  return 'The AI service is having trouble right now. Try again in a moment.';
}

/**
 * Calls Gemini and returns the model's raw text plus its finish reason.
 * Parsing and validating that text is the frontend's job (src/lib/parseStudySet.js).
 *
 * `signal` aborts when the browser goes away, so we stop waiting on Gemini too.
 */
export async function callGemini({ mode, input, signal }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw httpError(500, 'The server has no GEMINI_API_KEY. Add it to .env and restart.');
  }
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const start = Date.now();

  let body;
  try {
    const response = await fetch(`${API_URL}/${model}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(buildGeminiRequest(mode, input)),
      signal: AbortSignal.any([signal, AbortSignal.timeout(TIMEOUT_MS)]),
    });
    body = await response.json().catch((err) => {
      if (err.name === 'TimeoutError' || err.name === 'AbortError') throw err;
      return null; // body wasn't JSON; handled below as an empty response
    });

    if (!response.ok) {
      console.error(`[gemini] ${model}: error ${response.status} after ${seconds(start)}: ${body?.error?.message ?? 'no details'}`);
      throw httpError(response.status === 429 ? 429 : 502, messageForStatus(response.status));
    }
  } catch (err) {
    if (err.status) throw err;
    if (err.name === 'TimeoutError') {
      console.error(`[gemini] ${model}: no answer after ${TIMEOUT_MS / 1000}s, gave up`);
      throw httpError(504, 'The AI took too long to respond. Try again.');
    }
    if (err.name === 'AbortError') {
      console.log(`[gemini] ${model}: cancelled by the browser after ${seconds(start)}`);
      throw err; // nobody is listening any more
    }
    console.error(`[gemini] ${model}: network error after ${seconds(start)}:`, err.cause?.code ?? err.message);
    throw httpError(502, 'Could not reach the AI service.');
  }

  const candidate = body?.candidates?.[0];
  const text = (candidate?.content?.parts ?? [])
    .filter((part) => !part.thought)
    .map((part) => part.text ?? '')
    .join('');
  // finishReason tells the frontend *why* text might be missing or cut off
  // (e.g. MAX_TOKENS, SAFETY). blockReason is set when the input itself was blocked.
  const finishReason = candidate?.finishReason ?? body?.promptFeedback?.blockReason ?? null;

  console.log(`[gemini] ${model}: answered in ${seconds(start)} (${finishReason ?? 'no finish reason'}, ${text.length} chars)`);
  return { text, finishReason };
}
