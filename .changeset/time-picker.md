---
"@tensor_1/react": minor
"@tensor_1/tokens": minor
---

**`TimePicker`** (HAR-1835): a time of day (`HH:mm` or `null`) beside `DatePicker`, so no product renders `<input type="time">`. The field shows the locale's clock (24 h in `de`, 12 h in `en-US`, `hour12` overrides) and reads a typed time on Enter or blur (`1430`, `14.30`, `9`, `2:30 pm`); ArrowUp / ArrowDown step the hour or the minutes under the caret (minutes to the next `minuteStep`), PageUp / PageDown the hour, Alt+ArrowDown opens a list of the times at `minuteStep` between `min` and `max` (a listbox in a top-layer popover; Enter picks, Escape closes it and returns focus). A time that cannot be read, or one before `min` / after `max`, marks the field invalid and says why (`onInputProblem`). `name` submits through a hidden input; `id`, `required`, `invalid`, `disabled`, `readOnly`, `size`, the `aria-*` of a `Field`; words via `labels` or the new `UixLabelsProvider` group `timePicker`. The pure helpers are exported (`parseTimeInput`, `formatTimeKey`, `stepTime`, `timeSlots`, …).

`DateTimePicker` uses it for its time part (it rendered a native time input). Its `minuteStep` now defaults to 15 and steps the arrow keys and the list; any typed minute is still kept. New prop `timeLabels`. CSS: `.uix-time-picker`, `__input`, `__popover`, `__list`; the time part keeps `.uix-date-time-picker__time`.
