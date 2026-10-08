---
"@tensor_1/tokens": minor
"@tensor_1/react": minor
---

`SchedulingCalendar`: a Week/Day time grid with real-instant geometry and proposal-based moves (HAR-1509).

- **Opt-in.** `timeGrid` draws `view="week"` as seven day columns on an hour axis; the new `view="day"` is one column and is always a time grid. Without `timeGrid` the week stays seven day cells. The built-in view switch offers Day only with the time grid, and steps a day at a time (`previousDay` / `nextDay` labels).
- **Geometry from real instants.** A day column is as tall as its day: 23 rows on the day the clocks go forward (no "02"), 25 on the day they go back ("02" twice, each with its UTC offset). An item sits at the hours that really elapsed since the day began. A week that holds such a day labels that column's hours in the column.
- **Midnight and the top lane.** `placesInTopLane(entry, timeZone, { crossMidnightMinutes })` (default `TOP_LANE_CROSS_MIDNIGHT_MINUTES = 360`, prop `topLaneCrossMidnightMinutes`): all-day entries (`entry.allDay`), entries longer than a day and entries running more than the threshold past their first local midnight go to a lane above the hours (`topLaneCap`, default 3 rows). A shorter midnight-crosser stays in the grid as a start part (the one tab stop, with the whole accessible name) and a hidden continuation with a "from HH:MM" cue.
- **Lanes.** Overlapping items share a column in at most `maxLanes` lanes (default 4), and in fewer when a lane would be narrower than an item showing a time and six title characters. What does not fit is hidden, and the column's "+N" is `days[date].overflowCount` when the consumer gives one.
- **Moves are proposals.** With `canMove` and `onProposeMove(id, { start, end, adjusted })`: drag an item (snapped to `step`, default 15 minutes, and to day columns), or press Shift and an arrow key to build a pending move, Enter to send it, Escape to drop it. A press that travels under 4 px is a click. The calendar never moves, refuses or cancels anything: it draws entries where the props say. "+1 day" keeps the wall-clock time (`addZonedDays`); a time that does not exist that day moves forward once and is announced (`adjusted: 'gap_forward'`). Top-lane spans drag by whole days only. `entry.movable: false` pins one entry. Without `canMove` there is no grab cursor, key binding or hint.
- **Windows.** One named, focusable bar per window in a strip above the top lane (`windowLaneCap`, default 2 there), "+N windows" for the rest; a `global` window also shades its hours behind the items.
- **Day heads and now.** Each column head shows the date (`formatDate(date, 'column')`, a new part), the consumer's `days[date].count` and markers with their text, and takes `days[date].label` as its accessible name. `now` (an ISO instant; the component keeps no clock) draws one line in the column of its day.
- **`renderEntry(entry, context)`** gets `context.availableLines` in the time grid (0: markers only).
- **New exports:** `placesInTopLane`, `TOP_LANE_CROSS_MIDNIGHT_MINUTES`, `layoutTimeGridDay`, `layoutDaySpans`, `proposeMove`, and the types `MoveProposal`, `TimeGridEntryContext`, `TimeGridEntryInput`, `TimeGridSegment`, `TimeGridPart`, `TimeGridDayLayout`, `DaySpanLayout`, `PlacedDaySpan`. `SchedulingCalendarView` gains `'day'` and `SchedulingDatePart` gains `'column'`.
- **Tokens:** the time grid rules in `components/scheduling-calendar`; the now-line and the move outline are neutral and read from the colour map.
- **Docs:** the Week and Day views of the SchedulingCalendar page are the time grid, with a 25-hour day specimen.
