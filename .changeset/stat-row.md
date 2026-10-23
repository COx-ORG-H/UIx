---
"@tensor_1/react": minor
"@tensor_1/tokens": minor
---

**`StatRow`** (`.uix-stat-row`, review of HAR-1803): a row of `Stat` tiles that reflows — as many side by side as fit at 8.5rem each (12rem with `.uix-stat-row--hero` or once a hero tile is in the row; `minTileWidth` / `--stat-row-min` to choose), down to one per row on a phone. A fixed six-column row broke labels letter by letter at 320 px. Stat labels now use `overflow-wrap: break-word`, so a word wraps whole and breaks only when it alone is wider than the tile.
