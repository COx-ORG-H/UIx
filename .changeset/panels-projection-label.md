---
'@tensor_1/react': patch
'@tensor_1/tokens': patch
---

ChartPanels no longer writes "Projection" inside the plot: its legend already names the dashed line, and in a narrow panel the in-plot label collided with a threshold's gutter label. `forecastSeries` takes `regionLabel: false` for the same choice; a standalone chart keeps the label by default.
