/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['extension/**/*', 'node_modules/**/*'],
  },
  resolve: {
    alias: {
      'monaco-editor': 'monaco-editor/esm/vs/editor/editor.api.js',
    },
  },
  define: {
    global: 'globalThis',
    'process.env.NODE_ENV': '"test"',
    'import.meta.vitest': 'true'
  },
});