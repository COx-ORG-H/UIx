---
"@tensor_1/react": minor
"@tensor_1/tokens": minor
---

HAR-3086 — a Timeline entry has words the kit styles. `TimelineItem` takes `title` (the event, one sentence; wrap the actor in `<strong>`), `detail` (a second line, e.g. the comment or the old and new value) and `badge` (a kit `StatusPill` or `Badge` beside the event). The event is drawn in `--uix-text-hushed` with the actor in `--uix-text`, the detail at the meta size in `--uix-text-muted` (`.uix-timeline__head`, `__title`, `__detail`, `__badge`), so a feed of ten sentences reads as a list of events, not a block of paragraphs; every part is at least 4.5:1 on every feed surface in both themes. Entries without the new props render as before.
