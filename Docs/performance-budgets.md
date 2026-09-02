# Performance budgets (PERF-4)

UIx ships **measured** size budgets, enforced in CI and — because `release.yml` reuses `ci.yml`
(GOV-6) — a hard precondition for publishing. This doc records the current numbers, the committed
limits, and how to re-measure. All sizes are **brotli** (what a CDN really serves).

## React bundles — hard caps (`packages/react/.size-limit.cjs`, gate: `test:size`)

The `size-limit` checker bundles each entry (following its imports) with `react`, `react-dom`, and
`echarts` marked **external** (mirroring `tsup.config.ts`), so the numbers measure only UIx's own
shipped code.

| Surface | Current (brotli) | Limit | Head-room | Rationale |
|---|--:|--:|--:|---|
| main entry `dist/index.js` | ~10.7 KB | **12 KB** | ~11% | ~100 thin class-wrappers; grows slowly as wrappers land. Bump deliberately when a real feature lands, recording the new baseline here. |
| chart entry `dist/chart.js` | ~1.0 KB | **2 KB** | ~48% | Only the ECharts-facing Chart wrapper; ECharts stays external (proven by `check-no-echarts.mjs`), so this entry never carries the library. |
| lean chart preset `dist/chart-preset.js` | ~155 KB | **170 KB** | ~9% | Common line/bar/pie SVG ECharts modules included; measures the consumer-visible preset payload. |

`check-no-echarts.mjs` additionally asserts, structurally, that ECharts is **not reachable** from
the main entry (importing `@tensor_1/react` never drags in ECharts).

## CSS bundles — growth tolerance (`packages/tokens/tests/css-size.baseline.json`, gate: `test:size:css`)

The CSS gate is a **growth guard**, not a fixed cap: `test:size:css` fails if any tracked file's raw
size grows past `max(2%, 64B)` vs the committed baseline (a deliberate change re-runs `size:css:update`
in the same reviewed commit). Current brotli totals for the shipped bundles:

| Bundle | brotli | What it is |
|---|--:|---|
| `build/css/tokens.css` | ~1.7 KB | the `--uix-*` contract (light + dark) |
| `build/css/components.css` (`./styles`) | ~16.7 KB | all `.uix-*` components |
| `build/css/styles.css` (`./bundle`) | ~19.4 KB | tokens + base + utilities + motion + components, one file |

Per-component CSS sizes are also baselined (each `styles/components/*.css`).

## Re-measure / update

```bash
npm run test:size            # React budgets (size-limit + no-echarts)
npm run test:size:css        # CSS growth guard (--check)
npm run size:css:update      # rewrite css-size.baseline.json after a deliberate change
```

React limits are edited directly in `packages/react/.size-limit.cjs` (with a baseline comment).

## Release lockstep (no hand-mirroring)

The `size` job lives in `ci.yml`. `release.yml` runs the **entire** `ci.yml` as a reusable workflow
(`uses: ./.github/workflows/ci.yml`, GOV-6), so the size budgets gate a tag/publish build
automatically — there are **no** hand-copied size steps in `release.yml` to keep in sync (correction
C3). Adding or tightening a budget in `ci.yml`/`.size-limit.cjs` is enough.

## Out of scope

**Core Web Vitals** (LCP/INP/CLS) remain separate from library microbenchmarks. The release gate now
runs a coarse table sort/search budget; a browser-level CWV harness would be a separate slice.
