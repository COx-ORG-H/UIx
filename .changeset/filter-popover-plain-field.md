---
"@tensor_1/tokens": patch
"@tensor_1/react": patch
---

`FilterPopover` renders a plain UIx field: the label sits above the control, tied to it with `for`/`id`, 8 px apart, with 16 px before Clear/Apply and 16 px padding all round. It used to wrap the control in `<label class="uix-label">`, the Label tag pill, which drew an accent-tinted band around the field with 1 px under the select. The `.uix-filter-popover .uix-label` rule is gone, and the tag pill rule is now `.uix-label:not(label)`, so a `<label class="uix-label">` left in consumer markup no longer paints the band (use `.uix-field__label` for form labels). A new test fails on any `<label>` with `uix-label` in the React sources, docs, guide and `tables.html` (HAR-1573).
