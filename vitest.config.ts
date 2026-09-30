import { defineConfig } from 'vitest/config';

const TEST_TIMEOUT_MS = 30_000;
const ALL_TESTS = ['test/**/*.test.ts', 'test/**/*.test.tsx'];
const RENDER_TESTS = ['test/element/**/*.test.ts', 'test/react/**/*.test.ts'];
const LAZY_TESTS = ['test/**/*.lazy.test.ts'];

export default defineConfig({
  test: {
    environment: 'node',
    testTimeout: TEST_TIMEOUT_MS,
    projects: [
      {
        extends: true,
        test: { name: 'core', include: ALL_TESTS, exclude: [...RENDER_TESTS, ...LAZY_TESTS] },
      },
      {
        extends: true,
        test: {
          name: 'render',
          include: RENDER_TESTS,
          exclude: LAZY_TESTS,
          setupFiles: ['test/setup/preload.ts'],
        },
      },
      { extends: true, test: { name: 'lazy', include: LAZY_TESTS } },
    ],
  },
});
