import express from 'express';
import { fileURLToPath } from 'node:url';
import { callGemini } from './gemini.js';
import { MODES } from './prompt.js';

// Load .env if there is one (built into Node, no dotenv needed).
try {
  process.loadEnvFile();
} catch {
  // No .env file: fall back to real environment variables.
}

const PORT = Number(process.env.PORT) || 3000;
const MAX_INPUT_LENGTH = 10_000; // keep in sync with src/App.jsx

const app = express();
app.use(express.json({ limit: '100kb' }));

app.post('/api/generate', async (req, res) => {
  const mode = req.body?.mode;
  const input = typeof req.body?.input === 'string' ? req.body.input.trim() : '';

  if (!MODES.includes(mode)) {
    return res.status(400).json({ error: 'Choose flashcards or quiz.' });
  }
  if (!input) {
    return res.status(400).json({ error: 'Type a topic or paste some notes first.' });
  }
  if (input.length > MAX_INPUT_LENGTH) {
    return res.status(413).json({ error: `That's too long. Keep it under ${MAX_INPUT_LENGTH} characters.` });
  }

  // If the browser cancels (new request, Cancel button, closed tab), stop the Gemini call too.
  const controller = new AbortController();
  res.on('close', () => {
    if (!res.writableFinished) controller.abort();
  });

  try {
    const result = await callGemini({ mode, input, signal: controller.signal });
    res.json(result);
  } catch (err) {
    if (controller.signal.aborted) return; // browser is gone, nothing to send
    if (!err.status) console.error(err);
    res.status(err.status ?? 500).json({ error: err.status ? err.message : 'Something went wrong on the server.' });
  }
});

// Serve the built React app (created by `vite build` in `npm start`).
app.use(express.static(fileURLToPath(new URL('../dist', import.meta.url))));

// Errors thrown before our route runs (e.g. a request body that isn't JSON)
// get a JSON reply instead of Express's HTML error page.
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  const status = err.status ?? 500;
  res.status(status).json({ error: status < 500 ? 'Bad request.' : 'Something went wrong on the server.' });
});

// Express 5 passes startup errors (like a port already in use) to this callback.
app.listen(PORT, (error) => {
  if (error) {
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use, probably by another copy of this app.`);
      console.error('Stop that one (Ctrl+C in its terminal), or set a different PORT in .env.');
    } else {
      console.error('Could not start the server:', error.message);
    }
    process.exit(1);
  }
  console.log(`Study Assistant running at http://localhost:${PORT}`);
  if (!process.env.GEMINI_API_KEY) {
    console.warn('Warning: GEMINI_API_KEY is not set. Copy .env.example to .env and add your key.');
  }
});
