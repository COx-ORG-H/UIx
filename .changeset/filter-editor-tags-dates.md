---
"@tensor_1/react": minor
"@tensor_1/tokens": patch
---

**`FilterEditor`: tags, dates with a condition, labels for restored ids** (HAR-1832, TENSOR HAR-1484):

- **`tags` kind** (`{ kind: 'tags'; values: string[] }`): free-text values typed in the kit tag input. Enter or a comma adds one, a pasted "a, b" adds both, each tag has a remove button, Backspace on an empty field takes the last back; Apply takes a tag still being typed along. New labels `addTag`, `addTagHint`.
- **`date` kind** (`{ kind: 'date'; operator: 'on' | 'before' | 'after' | 'between'; from?; to? }`, `field.dateOperators`): the condition is kept, so a saved one-day `between` comes back as `between`, not `on`. `summarizeFilter` says "before 05.10.2026" (`on` / `before` / `after` summary labels), and `dateFilterBounds(value)` gives the half-open range a query needs ("before" is `< day`, "after" is `>= the next day`). New labels `date`, `dateOperators`. `date-range` is unchanged.
- **`field.resolveLabels(ids)`**: chosen reference ids restored from a saved view (no label, or the id as label) are named in the editor, once per set of ids (StrictMode included); `resolveFilterLabels(field, value)` does the same for the chip outside the editor. `isUnresolvedChoice` tells such a choice.
- **Enter applies in every kind** (a checkbox, a number, a date, a search field), not only the text field; a button, an open list, a tag being added or an IME commit keep their Enter. `onApply` now receives the value to apply (read it rather than your state, which has not caught up when Enter applies in the same event).
- The reference search runs once per query, retry or field: it no longer searches again on every render when the `field` object is not memoized. Results on show stay while the next ones load, and "Searching…" appears only after 300 ms.

`.uix-filter-editor[data-kind="date"]` puts the condition on its own row, like a number filter.
