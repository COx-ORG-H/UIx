---
"@tensor_1/react": minor
"@tensor_1/tokens": minor
---

Two-axis grids, and a save refusal that wraps (HAR-2752, HAR-2753, HAR-2749).

- `MatrixInput` (`rows`, `columns`, `options`, `value`, `onChange`, `rowAxisLabel`, `columnAxisLabel`, `labels`, `getCell`, `disabled`, `readOnly`): a grid of choices filled from the keyboard alone, one tab stop with arrow keys between cells. Each cell is a `Select`. An option can be `unrated`, and a cell can carry `help`, an `error` or a lock.
- `MatrixHeatmap` (`rows`, `columns`, `cells`, `onOpenCell`, `renderLink`, `rowAxisLabel`, `columnAxisLabel`, `labels`): a count and a named band per cell, each cell one control that opens the drill-through. An empty cell stays apart from a zero the caller chose to hide.
- Both are a `role="grid"` table with sticky row and column headers in a scroller of their own, carry no words of their own, and never show colour alone. New stylesheet `components/matrix.css`. `matrixStep` is the shared keyboard model.
- `SaveStatus`: a failed save's text wraps inside its container instead of overflowing it, and the retry stays beside or under the text. `saving` and `saved` stay on one line.
