---
"@tensor_1/tokens": minor
"@tensor_1/react": minor
---

`SchedulingCalendar`: an agenda grouped by day with consumer-owned groups, and a counts-only month for narrow screens (HAR-1520).

- **`agendaGroups`** (`{ date, heading?, annotations?, rows, hiddenCount?, continuesCount? }[]`): the consumer decides which entry is listed under which day, in which order, and how many are left out. `view="agenda"` renders exactly these and never sorts, groups or counts. Without it the agenda is the flat list sorted by start, as before.
- **Semantics.** Each day has a heading (`<h3>`; `agendaHeadingLevel` changes the level) with the date through `formatDate`, then its rows in an `<ol>`. Above `virtualizeAbove` rows (default 200) the agenda is one scroller of fixed-height rows and mounts only the rows near the viewport; every row stays reachable with Tab.
- **Rows** use the item API: a swatch for `band` and `status`, the time range in the zone, the title (it takes the row width and wraps), `meta`, markers with their text, and the status as words. A row is a button that calls `onSelectEntry` and carries `data-item-id`.
- **Counts and notes.** `hiddenCount` shows "N not shown — open day" (`labels.hiddenInDay`), which calls `onShowMore(date)`; a day with no rows keeps its heading. `continuesCount` shows "Continues: K listed under an earlier day" (`labels.continuesInDay`). `annotations` are windows: one focusable note per window beside the heading, calling `onSelectOverlay`, never one per row. `notice` renders above the first heading.
- **`monthDensity="counts"`**: each month cell shows the consumer's `days[date].count` and markers only, with no chips and no entry bars, in columns narrow enough for a 375 px screen. Windows keep their bar and name.
- **Tokens:** agenda and counts-density rules in `components/scheduling-calendar`. The flat agenda's rules are scoped to its own list.
- **Docs:** the Agenda view of the SchedulingCalendar page is built from `agendaGroups`; a counts-only month specimen.
