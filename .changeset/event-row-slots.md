---
"@tensor_1/react": minor
"@tensor_1/tokens": minor
---

**`EventRow`** (HAR-1370; MOTUS B-P8 programme, TENSOR portal events): new optional slots. `weekday`, `year` and `time` are drawn in the date tile (weekday above the month, year under the day, the start time at the foot), and the tile widens to its longest line (never under 42 px), so titles in one list still start at one x. `dateTime` makes the tile a `<time>` element with that machine-readable value. `media` puts a thumbnail at the row's end, drawn 4:3 and cropped to fill (`object-fit: cover`); below 620 px it moves under the text, so the title keeps the row's width. Titles and meta now break long words instead of overflowing. A row without the new props renders exactly as before.

`editorial-home.css` gains `.uix-event-row--media`, `__media`, `.uix-event-date__weekday`, `__year`, `__time`. (Splitting `editorial-home.css` per pattern, which the issue suggested considering, is not part of this change.)
