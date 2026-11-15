// Turns the model's raw text into data the UI can trust.
//
// Returns either
//   { ok: true, set: { mode, title, items }, skipped }
//   { ok: false, kind, message }
// and never throws, so a bad response can't crash the app.

const MAX_ITEMS = 20;
const BLOCKED_REASONS = new Set(['SAFETY', 'PROHIBITED_CONTENT', 'BLOCKLIST', 'SPII', 'RECITATION', 'OTHER']);

const LABELS = {
  flashcards: { listKey: 'cards', noun: 'flashcards', fallbackTitle: 'Flashcards' },
  quiz: { listKey: 'questions', noun: 'questions', fallbackTitle: 'Quiz' },
};

function fail(kind, message) {
  return { ok: false, kind, message };
}

function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// Strings are trimmed; numbers are allowed (e.g. a card whose answer is 42); anything else is ''.
function cleanText(value) {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}

// Models sometimes wrap JSON in ```json fences or add a sentence before it.
// Keep only the part from the first "{" to the last "}".
function extractJson(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  return start !== -1 && end > start ? text.slice(start, end + 1) : text;
}

function toCard(raw) {
  if (!isObject(raw)) return null;
  const front = cleanText(raw.front);
  const back = cleanText(raw.back);
  return front && back ? { front, back } : null;
}

function toQuestion(raw) {
  if (!isObject(raw)) return null;
  const question = cleanText(raw.question);
  if (!question || !Array.isArray(raw.options)) return null;

  const options = raw.options.map(cleanText);
  if (options.length < 2 || options.length > 6 || options.some((option) => !option)) return null;
  // Two identical options would make the answer ambiguous.
  if (new Set(options.map((option) => option.toLowerCase())).size !== options.length) return null;

  // Accept "2" as well as 2; reject anything that doesn't point at an option.
  const answerIndex = typeof raw.answerIndex === 'string' && raw.answerIndex.trim() !== ''
    ? Number(raw.answerIndex)
    : raw.answerIndex;
  if (!Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex >= options.length) return null;

  return { question, options, answerIndex, explanation: cleanText(raw.explanation) };
}

export function parseStudySet(mode, text, finishReason = null) {
  const labels = LABELS[mode];
  if (!labels) return fail('wrong_shape', `Unknown mode "${mode}".`);

  const blocked = BLOCKED_REASONS.has(finishReason);

  if (typeof text !== 'string' || !text.trim()) {
    return blocked
      ? fail('blocked', 'The AI declined to answer this. Try rewording your input.')
      : fail('empty', 'The AI sent back an empty response.');
  }

  let json;
  try {
    json = JSON.parse(extractJson(text));
  } catch {
    if (finishReason === 'MAX_TOKENS') {
      return fail('truncated', 'The AI response was cut off before it finished. Try shorter notes.');
    }
    if (blocked) return fail('blocked', 'The AI stopped partway through. Try rewording your input.');
    return fail('invalid_json', "The AI response wasn't valid JSON.");
  }

  const list = isObject(json) ? json[labels.listKey] : undefined;
  if (!Array.isArray(list)) {
    return fail('wrong_shape', `The AI response didn't include a list of ${labels.noun}.`);
  }
  if (list.length === 0) {
    return fail('empty', `The AI couldn't make any ${labels.noun} from that. Try adding more detail.`);
  }

  // Check every item on its own: one broken item shouldn't throw away the good ones.
  const valid = list.map(mode === 'quiz' ? toQuestion : toCard).filter(Boolean);
  if (valid.length === 0) {
    return fail('wrong_shape', `None of the ${labels.noun} the AI returned were usable.`);
  }

  const items = valid.slice(0, MAX_ITEMS).map((item, index) => ({ id: index, ...item }));
  const title = cleanText(json.title) || labels.fallbackTitle;

  return { ok: true, set: { mode, title, items }, skipped: list.length - valid.length };
}
