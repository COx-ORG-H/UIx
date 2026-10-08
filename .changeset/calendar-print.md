---
"@tensor_1/tokens": minor
"@tensor_1/react": minor
---

Print styles for `SchedulingCalendar` and `SchedulingTimeline` (HAR-1541). CSS only: the components and their markup are unchanged, and a consumer adds no print CSS of its own.

- **Nothing scrolls on paper.** Under `@media print` the month grid, the time grid, the agenda and the timeline have no scroller and fit the page width (the timeline's axis is fitted to the page and its bars follow); a week row, an agenda row and a lane stay on one page; sticky headings, the timeline's axis and its lane names do not stick.
- **Paper is light.** New theme-invariant tokens `--uix-print-ink`, `--uix-print-ink-quiet`, `--uix-print-paper`, `--uix-print-paper-quiet`, `--uix-print-line` and `--uix-print-danger`; each component's colour map is written again from them inside `@media print`, so a dark screen theme does not reach the page.
- **Nothing depends on a background** (browsers drop them unless the reader asks for background graphics): the `high` band is a heavy edge in the signal colour, never a fill; each window pattern has an edge style of its own (`solid`, `diagonal` dashed, `cross` double, `dotted` dotted); hour lines and the timeline's grid lines are drawn as lines; marker glyphs and the hatch of bars that share time ask to be printed (`print-color-adjust: exact`). A highlighted agenda row underlines its title.
- **Text in full where the layout allows.** Month chips wrap to show the whole title and their day cell grows. A bar and a time-grid item keep their on-screen size.
- **Left out on paper:** the header's buttons and view switch, the "now" line, and a move not yet sent. The period title, the zone label and the legend print.
- A long agenda or timeline prints the rows it has mounted: raise `virtualizeAbove` before printing to print every row.
