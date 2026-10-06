---
"@tensor_1/tokens": minor
"@tensor_1/react": minor
---

New `FilterEditor` and a typed filter model (HAR-1365; TENSOR C6 `table-filter-editor.tsx`, MOTUS C-1 "+ filter"). `FilterPopover`'s value is one string; `FilterEditor` edits a typed `FilterValue`:

- `enum`: multi-select checkboxes, with a diacritic-insensitive option search once the list is long.
- `text`: a condition and text.
- `number`: a condition (incl. `between`) and an optional unit.
- `date-range`: two date fields.
- `boolean`: Any / Yes / No.
- `reference`: records found by an async `onSearch`, with loading, empty and error-with-retry states and removable chips.

`summarizeFilter(field, value, { formatDate })` writes the chip text ("State: Open, Pending", "Age: 3 – 14 days", "Created: 01.10.2026 – 05.10.2026"). `isFilterEmpty` and `emptyFilterValue` complete the model. `FilterPopover` is unchanged. Tokens: `.uix-filter-editor*` rules in `components/table-toolbar`.
