# Study Assistant

Paste your notes or type a topic. The AI makes **flashcards** or a **quiz**. Flip through the cards or take the quiz, then re-test only the ones you got wrong.

Built with React (hooks, function components) + Vite, a small Express backend that holds the API key, and Google Gemini (`gemini-flash-lite-latest` by default).

## Setup

You need **Node 22.12 or newer** and a free Gemini API key from <https://aistudio.google.com/apikey>.

```bash
cp .env.example .env      # then put your key in GEMINI_API_KEY
npm install && npm start
```

Open <http://localhost:3000>.

The terminal prints one line per AI call, e.g. `[gemini] gemini-flash-lite-latest: answered in 2.4s (STOP, 1830 chars)`, so a slow or failing model is easy to spot.

`npm start` builds the React app and starts the Express server, which serves both the page and the API on one port.

Other commands:

- `npm run dev`: development with hot reload at <http://localhost:5173> (Vite forwards `/api` to the server).
- `npm test`: unit tests for the parser and the re-test logic (Node's built-in test runner, no extra packages).

### Deploying

`render.yaml` sets this up as a free web service on [Render](https://render.com): **New → Blueprint**, pick the repo, and paste your Gemini key when asked. Use a key from a Google project without billing, so a public link can only use the free quota.

## Usage

1. Type a topic ("photosynthesis") or paste notes.
2. Choose **Flashcards** or **Quiz** and press **Generate**.
3. **Flashcards:** tap the card to flip it, then mark **Knew it** or **Didn't know it**.
   **Quiz:** pick an answer to see if it's right and why, then go to the next question.
4. At the end you see your score. **Re-test the ones you missed** starts a round with only those, and you can keep going until none are left. **Start over** goes back to the full set.

## How it works

```
Browser                                  Server (Express)                Gemini
───────                                  ────────────────                ──────
StudyForm ── mode + input ──▶ useStudySet
                               │ aborts the previous request,
                               │ gives this one an id
                               └─ POST /api/generate ──▶ checks input,
                                                         builds prompt + JSON schema,
                                                         adds the API key ───────────▶ generateContent
                                                         60 s timeout                  (JSON mode)
                               ◀── { text, finishReason } ◀──────────────────────────
parseStudySet: text ─▶ validated items (or a clear error)
only the latest request id may update the screen
App ─▶ <Flashcards> or <Quiz>, both driven by useRound (queue, misses, rounds)
```

- **The API key never reaches the browser.** The browser only sends `{ mode, input }`. The prompt is built on the server, so the endpoint can't be used to run arbitrary prompts.
- **Structured output.** Gemini is asked for JSON (`responseMimeType: application/json`) with a schema for each mode. The schema makes the right shape likely but doesn't guarantee it, so the frontend still validates everything.
- **The frontend owns validation.** The server passes the model's raw text through. `src/lib/parseStudySet.js` is a pure function that turns it into either `{ ok: true, set, skipped }` or `{ ok: false, message }`. It never throws.

## Handling bad AI output

| What goes wrong | What happens |
| --- | --- |
| Not valid JSON | Error: "The AI response wasn't valid JSON", with **Try again**. JSON wrapped in ```` ```json ```` fences or with extra text around it is still accepted. |
| Cut off (Gemini says `MAX_TOKENS`) | Error saying the response was cut off. |
| Empty text | Error: "The AI sent back an empty response." |
| Blocked by Gemini's safety filters | Error saying the AI declined. |
| Wrong shape (no `cards` / `questions` list) | Error saying the list was missing. |
| Empty list (e.g. input was random letters) | Error asking for more detail. |
| Some items broken (missing text, `answerIndex` out of range, duplicate options) | Broken items are dropped, the good ones are shown, and a note says how many were left out. If **none** are usable, it's an error. |
| Slow | "Generating…" with a **Cancel** button. After 10 s a "taking longer than usual" note. The server gives up after 60 s (the browser after 70 s as a backup) and shows an error with **Try again**. |
| Failed (network, rate limit 429, server errors, bad key) | A specific message for each, with **Try again**. Details are logged on the server, not shown to the user. |
| Stale response | Each request gets an id; only the latest one may update the screen. Starting a new request also aborts the old one, and the server then aborts its Gemini call. |

Nothing the model returns is rendered as HTML. All text goes through React, so it's escaped.

## Project structure

```
server/
  index.js        Express: input checks, /api/generate, serves the built app
  gemini.js       the Gemini call, timeout, error messages
  prompt.js       prompt and JSON schema for each mode
src/
  App.jsx         page layout: form + idle / loading / error / result
  hooks/
    useStudySet.js  request lifecycle, cancel, timeout, stale-response guard
    useRound.js     React wrapper around the round reducer
  lib/
    api.js            fetch + error handling, calls the parser
    parseStudySet.js  model text -> validated data
    round.js          pure reducer: current item, misses, re-test rounds
  components/     StudyForm, Loading, ErrorMessage, Flashcards, Quiz, RoundSummary
tests/            parser and reducer tests
```

## AI usage

<!-- Edit this so it's accurate before you submit. -->

I used Claude (Anthropic) as a coding assistant. It wrote most of the code from the assignment brief: the Express proxy, the parsing and validation, the hooks, the components and the tests. I _[what you did yourself: e.g. reviewed and understood every file, ran it with my own Gemini key, tested it on my phone, changed X]_.

## Known limitations

- **Gemini only.** Another provider means rewriting `server/gemini.js` (about 70 lines). The rest of the app wouldn't change.
- **Flash-Lite by default, for speed.** I first used `gemini-flash-latest`, but it "thinks" before answering and often hit the timeout on the free tier. Flash-Lite is much faster; its sets may be a little simpler. Set `GEMINI_MODEL` in `.env` to use another model.
- **No streaming.** The whole set arrives at once, so there's a wait of a few seconds with only a loading message.
- **Checks structure, not facts.** A well-formed card with a wrong fact, or a quiz question whose answer key is wrong, gets through.
- **No automatic retry.** On a failure the user presses **Try again**.
- **Nothing is saved.** Refreshing the page loses the set.
- **No rate limiting on `/api/generate`.** If this were deployed publicly, anyone could use up the key's free quota.
- Free-tier Gemini sometimes returns 429 or 503 when busy. The app shows the error, but can't fix it.

## What I'd do next

The optional stretch items from the brief: streaming, follow-up prompts that edit the current set, saving sessions, keyboard shortcuts. Before deploying: rate limiting on the API route.

## Time spent

_[fill in, e.g. "about X hours"]_
