// The prompt and JSON shape for each mode.
// The browser only sends { mode, input }; the prompt is built here so the API
// key can't be used to run arbitrary prompts.

const COMMON = `You are a study assistant. The user gives you either their own notes or just a topic name.
If they gave notes, base everything on those notes. If they only gave a topic, use accurate, well-known facts about it.
If the input is not something a person could study (for example random characters), return an empty list.
Reply with JSON only.`;

const INSTRUCTIONS = {
  flashcards: `${COMMON}
Make about 8 flashcards.
Shape: {"title": string, "cards": [{"front": string, "back": string}]}
- "title": a short name for the set.
- "front": a question or term, short.
- "back": the answer, one or two sentences.`,

  quiz: `${COMMON}
Make about 6 multiple-choice questions.
Shape: {"title": string, "questions": [{"question": string, "options": [string, string, string, string], "answerIndex": number, "explanation": string}]}
- "options": exactly 4 different answers, only one of them correct.
- "answerIndex": the position (0 to 3) of the correct option.
- "explanation": one sentence on why that answer is right.`,
};

// Gemini's structured-output schema. It makes the right shape much more likely,
// but it's not a guarantee, so the frontend still validates everything.
const SCHEMAS = {
  flashcards: {
    type: 'OBJECT',
    properties: {
      title: { type: 'STRING' },
      cards: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: { front: { type: 'STRING' }, back: { type: 'STRING' } },
          required: ['front', 'back'],
        },
      },
    },
    required: ['title', 'cards'],
  },
  quiz: {
    type: 'OBJECT',
    properties: {
      title: { type: 'STRING' },
      questions: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            question: { type: 'STRING' },
            options: { type: 'ARRAY', items: { type: 'STRING' } },
            answerIndex: { type: 'INTEGER' },
            explanation: { type: 'STRING' },
          },
          required: ['question', 'options', 'answerIndex', 'explanation'],
        },
      },
    },
    required: ['title', 'questions'],
  },
};

export const MODES = Object.keys(INSTRUCTIONS);

export function buildGeminiRequest(mode, input) {
  return {
    systemInstruction: { parts: [{ text: INSTRUCTIONS[mode] }] },
    contents: [{ role: 'user', parts: [{ text: `<input>\n${input}\n</input>` }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: SCHEMAS[mode],
      maxOutputTokens: 8192,
    },
  };
}
