import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/integration/**/*.spec.ts'],
    testTimeout: 60_000,
    hookTimeout: 60_000,
    alias: {
      '@story-generator/shared': new URL('../../packages/shared/src/index.ts', import.meta.url)
        .pathname,
    },
  },
});
