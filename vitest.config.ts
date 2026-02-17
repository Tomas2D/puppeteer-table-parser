import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    passWithNoTests: true,
    testTimeout: 120 * 1000,
    printConsoleTrace: true,
    deps: {
      interopDefault: false,
    },
  },
});
