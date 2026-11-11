---
"@tensor_1/react": minor
"@tensor_1/tokens": minor
---

OverflowRow (HAR-3072): one line of items that never wraps. It shows, in order, the items that fit whole and replaces the rest with one counter ("+3"), so a table row keeps one height and no badge is cut mid-word; the first item always shows. The hidden items stay measurable but out of the layout and the accessibility tree, and the counter's screen-reader text and `title` name them. It re-measures on resize (ResizeObserver) and on every render; before it can, every item shows and the row clips. The fit rule is exported as `overflowRowFit`. CSS: `.uix-overflow-row` in `components/overflow-row.css`.
