import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/unit/**/*.spec.ts', 'src/**/*.spec.ts'],
    alias: {
      '@story-generator/shared': new URL('../../packages/shared/src/index.ts', import.meta.url)
        .pathname,
    },
  },
});
