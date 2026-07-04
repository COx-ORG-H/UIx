import { defineConfig } from 'vitest/config';

// A11Y-3 — jsdom React-component a11y harness. Scoped to TSX tests ONLY so the existing
// `table-engine.test.mjs` keeps running under `node --test` (react package `test` script) and is
// not double-run here. axe over jsdom covers ARIA/name/role/keyboard — the ~45-wrapper surface the
// styleguide-only axe gate misses (the audit's A11y-automated dimension).
export default defineConfig({
  // Dedupe react/react-dom to this workspace's copy. The monorepo root may hoist a different
  // react major; without this, components (react 18 here) and @testing-library/react's renderer
  // can resolve to two copies → "A React Element from an older version of React was rendered".
  resolve: {
    dedupe: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
  },
  test: {
    include: ['src/**/*.test.tsx'],
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/a11y/setup.ts'],
  },
});
