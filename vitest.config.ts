import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@ed/engine': r('./packages/engine/src/index.ts'),
      '@ed/content': r('./packages/content/src/index.ts'),
      '@ed/game': r('./packages/game/src/index.ts'),
    },
  },
  test: {
    include: ['packages/*/test/**/*.test.ts'],
  },
});
