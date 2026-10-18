---
"@tensor_1/react": minor
"@tensor_1/tokens": minor
---

`DashboardCanvas` (HAR-2441, for TENSOR HAR-1823): a free dashboard layout on twelve columns. Each item has a place and a size in grid units (`{ col, row, w, h }`, optional min/max). In edit mode an item is dragged by its move handle and resized by its corner handle, both snapping to whole cells and pushing what they land on downwards; the arrow keys on a focused handle do the same one step at a time, and a polite live region says where the item went. Below 36rem of its own width the canvas is one column in reading order. The pure model behind it is exported for an item menu: `placeCanvasItem`, `moveCanvasItem`, `resizeCanvasItem`, `normalizeCanvas`, `compactCanvas`, `canvasReadingOrder` and friends. New stylesheet `components/dashboard-canvas.css`.
