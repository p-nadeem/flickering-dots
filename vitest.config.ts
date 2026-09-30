import { defineConfig } from 'vitest/config';

// Some recipe tests sweep every grid size; CI runners are slower than a laptop.
const TEST_TIMEOUT_MS = 30_000;

export default defineConfig({
  test: {
    environment: 'node',
    testTimeout: TEST_TIMEOUT_MS,
    include: ['test/**/*.test.ts', 'test/**/*.test.tsx'],
  },
});
