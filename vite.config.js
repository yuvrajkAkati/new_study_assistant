import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // In `npm run dev`, the Vite dev server forwards /api calls to the Express backend.
  server: {
    proxy: { '/api': 'http://localhost:3000' },
  },
});
