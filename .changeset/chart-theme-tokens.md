---
"@tensor_1/tokens": minor
"@tensor_1/react": minor
---

Charts look like UIx with no consumer styling (HAR-1552).

- **`uixChartTheme()`** (from `@tensor_1/react/chart` and `/chart/preset`): token palette, fonts, a solid hairline grid, axes and the UIx tooltip. `Chart` merges it under your option (your option wins) and re-applies it when `<html>`'s `class` / `data-theme` or the OS scheme changes, without a remount. New prop `theme?: 'uix' | 'none'` (default `'uix'`). Also exported: `mergeChartTheme`, `uixChartTokens` (the resolved analytic roles) and `uixChartAreaGradient`.
- **New tokens:** `--uix-chart-grid`, `-axis`, `-reference`, `-zone-warning`, `-zone-danger`, `-forecast-band`, `-event`, `-partial`, `-comparison`, light and dark.
- **Palette re-stepped:** `--uix-chart-1..8` keep their hue order and now pass the dataviz palette checks in both modes (lightness band, chroma ≥ 0.10, adjacent CVD ΔE ≥ 8, normal-vision ΔE ≥ 15, ≥ 3:1 on surface and bg-app). Light failed the normal-vision floor before; dark had 7 of 8 slots outside the band.
- Docs: a "Chart tokens" foundations page; the styleguide charts consume the same theme (no dashed gridlines).
