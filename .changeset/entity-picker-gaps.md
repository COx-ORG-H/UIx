---
"@tensor_1/react": minor
"@tensor_1/tokens": minor
---

**`EntityPicker` / `SearchSuggest` gaps for TENSOR's pickers** (HAR-1834).

- **A non-retryable failure.** Reject `onSearch` with `{ retryable: false, message? }` (`EntityPickerSearchError`) or pass `isRetryable(error)`: the list shows the message, or the new `labels.forbidden` ("You do not have access to search these records."), and no Retry row.
- **Disabled and invalid while empty.** `SearchSuggest` gains `disabled` and `invalid`, and `EntityPicker` forwards its own, so an empty disabled picker cannot be typed in and an empty required one with an error is announced invalid.
- **Clear resets the query.** After ×, the old query and its rows are gone and the field has focus.
- **Naming.** With a `<label for>` (a `Field`) or `aria-labelledby` (`EntityPicker`; `inputLabelledBy` on `SearchSuggest`) the input gets no `aria-label`, so the visible label is its name.
- **Async search keeps its rows.** While the next query loads, the last answer stays in view (`aria-busy` at once) and the spinner waits 300 ms (the kit's `useDelayedPending`: shown after 300 ms, then kept at least 500 ms), so a fast answer shows none. In the search mode Enter during a search now picks nothing and does not submit the form (it used to pick the first row, or submit when there was none).
