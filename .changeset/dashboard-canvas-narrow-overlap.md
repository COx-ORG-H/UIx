---
"@tensor_1/tokens": patch
"@tensor_1/react": patch
---

`DashboardCanvas` below 36rem (TENSOR HAR-2443): an item taller than one row no longer runs over the items below it. The one-column rule set `grid-auto-rows: auto` on the canvas from inside the canvas's own container query, which a container query cannot do, so every item kept one 5rem track and drew its extra rows over the next item. Each item now spans as many fixed rows as it has on the wide canvas, so it is exactly as tall as there and the next item starts below it. The narrow test in `tests/a11y/dashboard-canvas.spec.mjs` now checks every item's height and that each starts below the one before.
