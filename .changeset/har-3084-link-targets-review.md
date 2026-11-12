---
"@tensor_1/tokens": patch
---

HAR-3084 follow-up (review of #236) — a data cell's link is a 24 px target at any text size (the padding is half of what 1em leaves of 24 px, at least 4 px; the small text scale and a meta-size link were 23 px), and an equal negative margin keeps a link that a flex or grid parent blockifies (a card-mode row, a stacked cell) from growing its row. The sort button keeps its label inline again (a 24 px min-height on the button, which centres its own content), so a space between a word and an `<abbr>` is no longer dropped.
