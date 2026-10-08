---
"@tensor_1/tokens": minor
"@tensor_1/react": minor
---

`SchedulingCalendar`: a shared item API, consumer-owned counts and a calm Month (HAR-1506).

- **Item API.** An entry takes `band` (`none | low | medium | high`: the only dimension with a hue, and only `high` is filled), `status` (`tentative | committed | live | done | dead`: line style and dimming, never a hue), `markers` (a shape or an icon with text) and `accessibleName`. Every item carries `data-item-id`, `data-band` and `data-status`.
- **Consumer-owned counts.** `days` (`{ count, overflowCount, label, markers }` per date) and `dayEntries` (the chips of each day, already ranked and cut). In this mode the calendar places, ranks, cuts and counts nothing, "+N" is `overflowCount`, and a day never expands in place.
- **Spans drawn once.** An entry or window that covers several days is one bar per week row, in lanes above the chips. `layoutMonthSpans(spans, days, { timeZone, weekStartsOn, laneCap })` packs them in the order given and `schedulingGridDays(anchorDate, view, weekStartsOn)` returns the grid it needs; pass the result as `spanLayout`, or let the calendar lay them out (`windowLaneCap`, `spanLaneCap`). A row with more spans than lanes shows "+N" and calls `onShowMore` with the first day that has a hidden one.
- **Windows.** An overlay takes `pattern` (`diagonal | cross | dotted | solid`), `kindLabel`, `scopeLabel`, `global` and `accessibleName`. Windows are neutral, named in visible text, focusable, and call `onSelectOverlay`.
- **Page-owned chrome.** `legend` and `legendCaption` (the legend is exactly the items given), `showHeader`, `notice`, `emptyNote`, `onSelectDate`, and per-view `previousMonth` / `nextMonth` / `previousWeek` / `nextWeek` labels.
- **Day membership is end-exclusive in `timeZone`** for entries and windows: an entry ending at local midnight stays on its last day, and a window is placed by its zoned days, not its UTC date. `itemDaySpan` and `zonedTimeOfDay` are exported.
- **Fixed month geometry.** With `days` / `dayEntries`, or `maxEntriesPerDay` together with `onShowMore`, every cell keeps one height.
- **Changed defaults (visible).** A chip reads `HH:MM title` (24 h, in the zone), and a long title is cut at the chip edge without an ellipsis. Entries are no longer tinted by `state`: `conflicted` and `blackout-violation` show a marker with the word for that state instead, and "+N more" takes the text colour. The default instant text in accessible names and the agenda is the `day` date text plus the 24-hour time, so a 2,100-entry month builds at most four `Intl.DateTimeFormat` instances.
- **Deprecated, unchanged in 2.x:** `entry.state` and `SchedulingEntryState`, `overlay.kind` and `SchedulingOverlayKind` (`kind` is now optional), and the `previous` / `next` labels.
- **Tokens:** every colour of `components/scheduling-calendar` goes through one block of `--calendar-*` names at the top of the file. Forced-colours repairs for the high band, marker shapes and window hatches.
- **Docs:** the SchedulingCalendar page is rendered from the component by `packages/react/scripts/render-scheduling-calendar-specimen.mjs`; a test fails when the page and the component differ.
