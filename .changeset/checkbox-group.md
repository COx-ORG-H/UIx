---
"@tensor_1/react": minor
"@tensor_1/tokens": minor
---

**`CheckboxGroup`** (HAR-1799, MOTUS UXR-05): checkboxes under one name, the counterpart of `<RadioGroup label>`. It renders a `<fieldset>` whose `<legend>` (`label`) names the group, so a screen reader announces it with each box, and the field's message slot below: `hint`, or `error` (announced, `role="alert"`), tied to the group with `aria-describedby`. `required` draws the marker after the legend, `disabled` disables every box, and `columns` sets the most columns the boxes form (a column is never narrower than 10rem, so a phone gets one). New classes `.uix-checkbox-group`, `__legend`, `__options`; a box stays on the first line of a label that wraps.
