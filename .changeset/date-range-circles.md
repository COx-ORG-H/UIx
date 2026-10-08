---
"@tensor_1/tokens": minor
"@tensor_1/react": minor
---

DateRangePicker and the Calendar day cells now use one shape for every state: hover, range start and end, today and keyboard focus are the same circle, concentric with the cell, and the in-range band is the circle's height and meets the start and end circles with no notches (no band while only a start is picked; RTL mirrors). Focus is a round ring with a surface gap so it stays visible on the accent circle, and forced-colours mode keeps the range (Highlight start/end, underlined in-range days). `DateRangePicker` gains a `today` prop (defaults to the viewer's local date, `null` for none) and marks that day with `aria-current="date"`. The Calendar grid drops its column gap so its range band joins (HAR-1570).
