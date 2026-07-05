/* PERF-1 — published-bundle budgets for @tensor_1/react.
 *
 * These budgets guard the SHIPPED code size. The `esbuild` checker (via
 * @size-limit/preset-small-lib) bundles each entry following its internal imports, with
 * `react`, `react-dom`, and `echarts` marked EXTERNAL — mirroring `tsup.config.ts`, which
 * externalises the same three — so the numbers measure only UIx's own code, never the peer/runtime
 * deps a consumer already has. Sizes are brotli (what a CDN/really serves).
 *
 * The two entries also *prove echarts is not in the main bundle*: `dist/index.js` measures a few KB
 * while the chart entry pulls the ECharts-facing Chart component. `check-no-echarts.mjs` asserts the
 * same invariant directly. Re-measure with `npm run size`; update the limits here when a deliberate
 * growth lands (record the new baseline in Docs/performance-budgets.md — PERF-4).
 */
module.exports = [
  {
    name: 'main entry — dist/index.js (brotli, react/react-dom/echarts external)',
    path: 'dist/index.js',
    limit: '12 KB',
    brotli: true,
    ignore: ['react', 'react-dom', 'echarts'],
    // baseline 2026-07-04 (after BREADTH-2): 9.8 kB. Headroom covers BREADTH-3/4 wrappers.
  },
  {
    name: 'chart entry — dist/chart.js (brotli, echarts external)',
    path: 'dist/chart.js',
    limit: '2 KB',
    brotli: true,
    ignore: ['react', 'react-dom', 'echarts'],
    // baseline 2026-07-04: 1.04 kB. echarts stays external, so this entry does not carry the lib.
  },
];
