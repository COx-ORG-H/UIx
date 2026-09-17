import { defineConfig } from 'tsup';

// Optional peers stay external in both formats: Tiptap, marked and the emoji dataset
// belong to the consumer's install (and the emoji JSON is loaded on demand).
const external = ['react', 'react/jsx-runtime', 'react-dom', 'echarts', 'echarts/core', /^@tiptap\//, 'marked', /^emojibase-data\//];

// Dual build (ADR-0016, Decision 5 — "emit use client from the build, per-file").
//
// ESM is emitted per-file (bundle: false) so every module keeps its own directive:
// the interactive components carry "use client" and the pure presentational ones do
// not, leaving them server-renderable in React Server Component graphs. A single
// bundle cannot express this — esbuild hoists the directive to the top and the whole
// library becomes client-only (exactly what the old consumer post-patch did).
//
// CJS is bundled. esbuild does not rewrite relative import extensions in no-bundle
// mode, so a per-file CJS build emits require("./X.js") pointing at the ESM file
// (ERR_REQUIRE_ESM). Bundling sidesteps that, and CJS consumers are not RSC, so the
// per-file directive split is irrelevant for this format.
export default defineConfig([
  {
    entry: ['src/**/*.ts', 'src/**/*.tsx'],
    format: ['esm'],
    dts: true,
    bundle: false,
    external,
    target: 'es2020',
    outDir: 'dist',
    clean: true,
  },
  {
    entry: {
      index: 'src/index.ts',
      chart: 'src/chart.ts',
      'chart-preset': 'src/chart-preset.tsx',
      'rich-text': 'src/rich-text.ts',
      markdown: 'src/markdown.ts',
      emoji: 'src/emoji.ts',
    },
    format: ['cjs'],
    dts: true,
    bundle: true,
    external,
    target: 'es2020',
    outDir: 'dist',
    clean: false,
  },
]);
