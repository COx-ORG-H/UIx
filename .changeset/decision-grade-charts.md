---
"@tensor_1/tokens": minor
"@tensor_1/react": minor
---

Decision-grade charts (HAR-1553, HAR-1554, HAR-1556; unblocks TENSOR HAR-1559 and HAR-1560).

- **New entry `@tensor_1/react/chart/analytic`**: a tree-shaken ECharts build with line, bar and scatter, mark lines, areas and points, a piecewise visual map, inside zoom and a linked axis pointer, SVG only (≤ 185 kB Brotli; the lean `chart/preset` stays ≤ 170 kB). It exports `Chart`, `ChartPanels`, `CorrelationScatter`, the overlay helpers, the pure models and every type.
- **Overlays from typed data** (`ChartThreshold`, `ChartEvent`, `ChartForecast`, `ChartComparison`): `thresholdMarks` (a solid reference line labelled in the right gutter, the bad side shaded), `eventMarks` (unlabeled lines through the plot plus an event lane of pins that owns the tooltip and the click), `forecastSeries` (a hidden lower bound, a stacked band in `--uix-chart-forecast-band` and the only dashed line), `comparisonSeries` (a thin solid ghost), `partialPeriod`, `crossingPoints` / `findCrossings`, and `combineMarks` to put several on one series.
- **`ChartPanels`**: two or more variables with different units on aligned panels, one x axis and one crosshair (`axisPointer.link`), one tooltip listing every panel at the hovered x, the event lane on top, a legend that names every role by its swatch shape, and one hidden data table per panel with lower, upper, threshold and event columns. A panel has one unit and one y axis: a dual y-axis cannot be expressed.
- **`CorrelationScatter`**: dots with an OLS trend line, r and n with "association, not cause", percentile lines, thresholds on either axis and a breaking point; 26 px hit targets over 9 px dots; below `minPoints` (default 8) it shows "Not enough data (n = k of 8)" instead of a trend.
- **`Chart` (every entry)**: `option` may be a function of the theme's chart tokens (re-run on a light/dark flip), and the new props `group` (one crosshair across cards via `echarts.connect`), `onEvents` (drill-down) and `tables` (further hidden data tables).
- **`InsightCard` and `Bullet`** (root entry, server-renderable): the headline is the answer, a status is a word plus an icon, KPIs carry a comparison and a bullet against target instead of a gauge, an honest coverage note, source, updated and one action; `layout="split"` puts an aside next to the chart from 60rem of card width and stacks below. Every word is replaceable through `labels`.
- **Chart statistics** (root entry, pure, for servers): `linearFit`, `quantiles`, `predictionBand`, `normalQuantile`, `studentTQuantile`.
- **Tokens:** a new `components/insight-card` module (InsightCard + Bullet); `chart` gains `.uix-chart__stats` and `.uix-chart__insufficient`. `uixChartTokens()` also returns `warning` and `danger` for emphasised marks.
- **Docs:** a new "Decision-grade charts" page with the overlays, panels with a scatter, and the level-2 Delivery health. The `#chart` CSS demo now uses only classes that exist, and the level-1 residence example's budget line is solid with its label in the gutter.
