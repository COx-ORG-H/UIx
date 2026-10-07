---
"@tensor_1/tokens": minor
"@tensor_1/react": minor
---

Calendar math in one explicit IANA zone (HAR-1504): pure functions for zoned days, real hour slots, "+1 day", end-exclusive day spans, lane packing and a top-N cut. They use only `Intl`, never the process time zone or a fixed day length, so daylight-saving days have 23 or 25 hours.

- **Days and slots:** `zonedDayBounds(dateKey, tz)` (the end of a day is the start of the next; a day whose midnight is skipped starts at its first instant) and `zonedHourSlots(dateKey, tz)` (one `{ instant, label, offsetLabel }` per real hour; a repeated hour appears twice, each with its UTC offset).
- **"+1 day":** `addZonedDays(instant, n, tz)` keeps the wall-clock time and returns `adjusted: 'gap_forward'` when the time does not exist and moves forward, once.
- **Day membership:** `zonedDaySpan(start, end, tz)` is end-exclusive (an entry ending at local 00:00 stays on its last day) and throws a `RangeError` on an inverted or empty interval. `enumerateDateKeys(span, { limit })` returns `{ dates, truncated }` instead of stopping silently.
- **Lanes:** `packLanes(intervals, maxLanes, { order: 'start' | 'given' })` assigns first-fit lanes, `null` for what does not fit, with `laneCount` and `overflow` per overlap cluster.
- **Top-N:** `rankOverflow(items, compare, n)` → `{ visible, hidden }`.
- **Formatters:** `cachedDateTimeFormat(locale, options)` shares one `Intl.DateTimeFormat` per locale and options shape. `zonedDateKey` now goes through it (same signature and result), so a 2,100-entry month builds a few formatters instead of one per call.
- **Deprecated, unchanged:** `zonedDateSpan` (end-inclusive, swaps inverted ends) and `enumerateDateSpan` (stops silently at 370). Use `zonedDaySpan` and `enumerateDateKeys`.
- **Docs:** a "Calendar model" page with a DST example.
