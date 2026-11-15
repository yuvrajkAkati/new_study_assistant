import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseStudySet } from '../src/lib/parseStudySet.js';

const goodCards = JSON.stringify({
  title: 'Cells',
  cards: [
    { front: 'Powerhouse of the cell?', back: 'The mitochondria.' },
    { front: 'What holds DNA?', back: 'The nucleus.' },
  ],
});

const goodQuiz = JSON.stringify({
  title: 'Planets',
  questions: [
    { question: 'Largest planet?', options: ['Mars', 'Jupiter', 'Venus', 'Earth'], answerIndex: 1, explanation: 'It is a gas giant.' },
  ],
});

test('parses valid flashcards and gives each item an id', () => {
  const result = parseStudySet('flashcards', goodCards);
  assert.equal(result.ok, true);
  assert.equal(result.set.title, 'Cells');
  assert.deepEqual(result.set.items.map((item) => item.id), [0, 1]);
  assert.equal(result.skipped, 0);
});

test('parses a valid quiz', () => {
  const result = parseStudySet('quiz', goodQuiz);
  assert.equal(result.ok, true);
  assert.equal(result.set.items[0].answerIndex, 1);
});

test('accepts JSON wrapped in a code fence or extra text', () => {
  const result = parseStudySet('flashcards', 'Here you go:\n```json\n' + goodCards + '\n```');
  assert.equal(result.ok, true);
});

test('malformed JSON is an error, not a crash', () => {
  const result = parseStudySet('flashcards', '{"title": "Cells", "cards": [ {"front": ');
  assert.equal(result.ok, false);
  assert.equal(result.kind, 'invalid_json');
});

test('cut-off JSON with MAX_TOKENS says it was truncated', () => {
  const result = parseStudySet('flashcards', goodCards.slice(0, 40), 'MAX_TOKENS');
  assert.equal(result.kind, 'truncated');
});

test('empty text is reported as empty', () => {
  assert.equal(parseStudySet('quiz', '').kind, 'empty');
  assert.equal(parseStudySet('quiz', undefined).kind, 'empty');
});

test('empty text with a safety stop is reported as blocked', () => {
  assert.equal(parseStudySet('quiz', '', 'SAFETY').kind, 'blocked');
});

test('an empty list is reported as empty', () => {
  const result = parseStudySet('flashcards', '{"title":"x","cards":[]}');
  assert.equal(result.kind, 'empty');
});

test('wrong top-level shape is an error', () => {
  assert.equal(parseStudySet('quiz', goodCards).kind, 'wrong_shape'); // cards, not questions
  assert.equal(parseStudySet('flashcards', '[1,2,3]').kind, 'wrong_shape');
  assert.equal(parseStudySet('flashcards', '{"cards": "nope"}').kind, 'wrong_shape');
});

test('bad items are dropped and counted, good ones kept', () => {
  const text = JSON.stringify({
    cards: [
      { front: 'Q1', back: 'A1' },
      { front: '', back: 'missing front' },
      { front: 'Q3' },
      'not an object',
      { front: 'Q5', back: 'A5' },
    ],
  });
  const result = parseStudySet('flashcards', text);
  assert.equal(result.ok, true);
  assert.equal(result.set.items.length, 2);
  assert.equal(result.skipped, 3);
  assert.equal(result.set.title, 'Flashcards'); // fallback title
});

test('quiz questions with a bad answer key are dropped', () => {
  const base = { question: 'Q?', options: ['a', 'b', 'c', 'd'], explanation: '' };
  const text = JSON.stringify({
    questions: [
      { ...base, answerIndex: 4 }, // out of range
      { ...base, answerIndex: -1 },
      { ...base, answerIndex: 1.5 },
      { ...base, answerIndex: null },
      { ...base, options: ['a', 'a', 'b', 'c'], answerIndex: 0 }, // duplicate options
      { ...base, options: ['only one'], answerIndex: 0 },
      { ...base, answerIndex: '2' }, // numeric string is fine
    ],
  });
  const result = parseStudySet('quiz', text);
  assert.equal(result.ok, true);
  assert.equal(result.set.items.length, 1);
  assert.equal(result.set.items[0].answerIndex, 2);
  assert.equal(result.skipped, 6);
});

test('if every item is broken, the whole response is an error', () => {
  const result = parseStudySet('quiz', JSON.stringify({ questions: [{ question: 'Q?' }] }));
  assert.equal(result.ok, false);
  assert.equal(result.kind, 'wrong_shape');
});

test('caps the number of items', () => {
  const cards = Array.from({ length: 50 }, (_, i) => ({ front: `Q${i}`, back: `A${i}` }));
  const result = parseStudySet('flashcards', JSON.stringify({ cards }));
  assert.equal(result.set.items.length, 20);
});
