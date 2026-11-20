---
"@tensor_1/react": minor
"@tensor_1/tokens": minor
---

Experiment (phone-OS motion study, Tier 3 item 12): the way back from a side Peek. `DataWorkspace` takes `peekRowId`, the row whose record the Peek shows (`null` while none is open). When it turns `null`, by any route (Esc, the close button, the backdrop, a swipe), focus goes to that row (its id control without `rowNavigation`) and the row plays the arrival cue once. After ↑ / ↓ in the Peek that is the record shown last, not the row that opened it. A row that left the list while the Peek was open hands focus to the row now in its place, with no cue. Focus moves only when it is in the table or nowhere. Nothing travels and the open stays instant. `.uix-arrival` gains an attribute form, `[data-uix-arrival]`, and a table-row form that tints the row colour (frozen cells included) instead of drawing an outline past the row; under reduced motion and forced colours a row gets a steady outline just inside its edge. Opt-in: without `peekRowId` nothing changes.
