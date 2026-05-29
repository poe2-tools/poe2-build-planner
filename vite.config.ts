/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // '/' for local dev/preview; the Pages workflow sets VITE_BASE to '/<repo>/' so all
  // asset URLs resolve under the GitHub Pages project subpath.
  base: process.env.VITE_BASE || '/',
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test.ts,test.tsx}'],
    passWithNoTests: true,
  },
});
