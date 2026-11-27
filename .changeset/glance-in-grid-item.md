---
"@tensor_1/react": minor
"@tensor_1/tokens": minor
---

A glance chart sits in a dashboard widget as cleanly as in a `ChartCard`, and a long bar-list label keeps its bar (TENSOR HAR-4808, Home canvas v50).

- **No box in a box.** `GlanceLineChart` and `PairedBarChart` render with the new `uix-chart--glance` class. Inside a `DashboardGridItem` such a chart draws no frame, padding or shadow of its own, as it already did inside a `ChartCard`: the grid item is the card it answers in. Analysis charts (`Chart`) keep their frame.
- **`BarList` rows line up.** The rows share one set of columns (CSS subgrid), so every bar starts at the same place, and the label column fits the longest label up to 40 % of the list. An 80-character label now wraps inside that column instead of pushing its bar out of the row.
