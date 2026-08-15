import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Relative base keeps the build working on GitHub Pages (project sites live under
// /<repo>/), on a custom domain, and when opened straight from the filesystem.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
