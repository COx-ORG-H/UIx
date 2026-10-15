---
"@tensor_1/tokens": minor
"@tensor_1/react": minor
---

`Table`: a frozen trailing actions column. `.uix-table--pinned-actions` (`<Table pinnedActions>`) keeps the last column sticky at the right edge while the wrap scrolls sideways, so a row's one-click peek or kebab no longer needs a horizontal scroll first on a narrow screen or with extra columns turned on. It mirrors `.uix-table--pinned-col`: the header cell sticks on both axes and sits above the body, the cell draws a hairline on its leading edge, and it repaints the row's zebra, hover, pinned and selected state opaquely. Mark row state with `<Tr selected>` / `<Tr pinned>` (`data-selected` / `data-pinned`); a frozen cell follows those, not a consumer's own row class.

Fixes in the frozen first column (`.uix-table--pinned-col`), shared with the new one: in dark mode the pinned and selected row tints are translucent, so the frozen cell let the cells scrolling under it show through; they are now layered over the surface. On a `--no-zebra` table, every even row's frozen cell ignored hover, pinned and selected (a higher-specificity rule held it at the plain row colour). An expanded detail row keeps its own tint under either pin.
