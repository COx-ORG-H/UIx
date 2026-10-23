---
"@tensor_1/react": minor
"@tensor_1/tokens": minor
---

**Date fields with no call-site workaround** (HAR-2432, found adopting 2.40.2 in TENSOR HAR-1485).

- `UixLabelsProvider` takes `dateFormat` (`UixDateFormat`: `locale`, `formatDate`, `parseDate`, `placeholder`): one provider sets the format of every `DatePicker`, `DateTimePicker`, `DateRangePicker` and the `locale` of `TimePicker`; a prop on one field still wins.
- `FilterPopover type="date"` renders the kit `DatePicker` instead of a native `<input type="date">`; the value stays `YYYY-MM-DD` (`''` for none).
- `DateRangePickerLabels` gains `label` and `invalidMessage` (English defaults unchanged), so a provider-wrapped app gets no English from the range picker; the `label` / `invalidMessage` props still win.
- `DateTimePicker` names its time input from the field label's accessible text: an `aria-hidden` required "*" is left out, and the name follows the label when its text changes after mount (a translation that loads late).
