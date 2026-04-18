import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    alias: {
      '@story-generator/shared': new URL('../../packages/shared/src/index.ts', import.meta.url)
        .pathname,
      '@': new URL('./src', import.meta.url).pathname,
    },
  },
});
