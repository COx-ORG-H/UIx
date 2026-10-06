---
"@tensor_1/tokens": minor
"@tensor_1/react": minor
---

New `EntityPicker`: a form field that holds one record found by an async search (HAR-1366; TENSOR B28/C5 `entity-picker.tsx` and its eight consumers, MOTUS B-P10). It shows the chosen record with a named clear button. Choosing again opens a `SearchSuggest` list with loading, empty and error states, and Retry is a keyboard-reachable list row (the defect in TENSOR HAR-1336). Stale results are ignored and focus is returned. `name` posts the id; `id` and `aria-describedby` work with `Field`.

`SearchSuggest` gains `inputId` and `inputDescribedBy`, which put an id and a description on the input itself.
