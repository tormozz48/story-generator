import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/e2e/**/*.spec.ts'],
    testTimeout: 120_000,
    hookTimeout: 120_000,
    alias: {
      '@story-generator/shared': new URL('../../packages/shared/src/index.ts', import.meta.url)
        .pathname,
    },
  },
});
