import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

/**
 * Le moteur est du TypeScript pur sans I/O : Vite compile les sources des
 * paquets de l'atelier directement, sans étape de build intermédiaire.
 * Résultat : une application entièrement statique, qui tourne hors-ligne.
 */
export default defineConfig({
  base: './',
  resolve: {
    alias: {
      '@ed/engine': r('../engine/src/index.ts'),
      '@ed/content': r('../content/src/index.ts'),
      '@ed/game': r('../game/src/index.ts'),
    },
  },
  build: { outDir: 'dist', target: 'es2022', sourcemap: false },
});
