import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    testTimeout: 10_000,
    globals: false,
    passWithNoTests: false,
  },
  esbuild: {
    target: 'es2022',
  },
});
