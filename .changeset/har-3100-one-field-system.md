---
"@tensor_1/react": minor
---

HAR-3100 — what a product's own form needs from the kit `Field`, so it can render through `Field` instead of copying its markup.

- `Field` takes `labelId`: the label's id, so a control that is not a labelable element (a rich-text editor, a `role="textbox"` region) can name itself with `aria-labelledby`. Without it the label has no id, as before.
- Every ? help button without its own `helpLabel` takes its name from the new `UixLabelsProvider` `infoTip` labels: `about` (`"About: {title}"`, `{title}` replaced) for a text title, `more` (`"More information"`) for any other. An app localises every ? once. `InfoTip` takes `topic` (the thing it explains) as an alternative to `label`, and `Field`, `PageHeader`, `Card` and `SectionHead` pass their title as the topic. A blank template falls back to the English default.
- New `NumberInput`: `<input type="number">` (`inputMode="decimal"`) whose value is a number. `onValueChange` gets `valueAsNumber` on every change: a number, or `NaN` when the field is empty, never the typed text and never `0` for an emptied field. `NaN` or `null` as `value` shows an empty field; `undefined` leaves it uncontrolled.
