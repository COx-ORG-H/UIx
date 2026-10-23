---
"@tensor_1/react": minor
"@tensor_1/tokens": minor
---

**`InlineEdit` as a record field** (HAR-1833, TENSOR HAR-1490 `EditableRecord`):

- **Any value type**: `InlineEdit<T>` with `equals` (an unchanged draft saves nothing), `isEmpty`, `renderView` and `renderEditor` for options, people and time windows.
- **`commit`**: `explicit` (default, as before), `blur` (also when focus leaves the editor; leaving a field whose last attempt failed with the same draft sends nothing), `change` (a choice saves at once; no Save button). The editor's `save(next)` saves the value just chosen: `onChange(next)` then `save()` used to save the stale draft.
- **`renderError(error, { message, draft, retry, cancel })`** for Try again or Reload latest after a version conflict, and **`onStateChange`** (`idle` / `editing` / `saving` / `saved` / `error`).
- **Controllable** `editing` / `onEditingChange` (one field open at a time) and `draft` / `onDraftChange` (dirty reporting).
- After a save the **accepted value shows** until `value` changes, instead of the old one until the parent refetches.
- **`trigger="icon"`**: the value stays text (a link, a chip) and a pencil button is named only "Edit {label}".
- **`readOnlyReason`**: why the field cannot be edited, shown under the value and wired by `aria-describedby` (new label `readOnly`).
- The pending state (the Save spinner, "Saving…", the read-only field) shows only once a save has run 300 ms, so a fast save never flashes; typing is ignored from the start of the save. The editor is `aria-busy` at once.

**Fix:** `inline-edit.css` was never in the bundle (`component-list.css`), so `InlineEdit` rendered as bare browser buttons since it shipped. It is now, a test fails when any component stylesheet is missing from the list, and a value no longer wraps early ("Amra / Kovač"): the view's negative margin moved from the button to its wrapper. Hover backgrounds apply only on devices that hover.
