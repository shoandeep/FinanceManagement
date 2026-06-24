import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      // Coverage is reported for the safety-critical pure modules only.
      include: ['src/money/**', 'src/core/**', 'src/budget/**'],
      exclude: ['src/**/*.test.ts'],
      reporter: ['text-summary', 'text'],
    },
  },
});
