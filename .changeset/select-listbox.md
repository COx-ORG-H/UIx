---
"@tensor_1/tokens": minor
"@tensor_1/react": minor
---

`Select` draws its own list instead of opening the browser's dropdown (HAR-1572). It follows the WAI-ARIA select-only combobox pattern, and existing call sites keep working without changes.

- **Same API:** `<option>`/`<optgroup>` children (including fragments and `.map()`), `value`/`defaultValue`, `onChange(e)` with `e.target.value`, `name`, `required`, `form`, `disabled`, `ref` (still the `HTMLSelectElement`), react-hook-form `register` and `Controller`. A visually hidden native `<select data-uix-select-proxy>` holds the value, so `FormData`, `form.reset()`, autofill and `required` work as before. The `id` moves to the trigger, so `<label htmlFor>` and `Field` still name it.
- **Trigger and list:** the trigger is a `<button role="combobox">` with the `.uix-select` look, and long values end in an ellipsis. The list is a top-layer popover placed with `useAnchoredPosition`, so it is never clipped inside a Drawer, a Popover or an `overflow: hidden` cell, and it flips near the edge of the viewport. It is at least as wide as the trigger and at most 320 px tall.
- **Keyboard (APG):** ↑ ↓ Home End PageUp PageDown, Alt+↓ / Alt+↑, Enter, Space, Tab, Escape (keeps the value and focus), and typeahead (type several letters, or repeat one letter to cycle). Disabled options and groups are skipped.
- **New optional props:** `options` (options and groups as data, with `description`, `icon`, `keywords`), `onValueChange`, `placeholder`, `invalid`, `readOnly`, `searchable` (`'auto'` above 12 options), `loadOptions` (loading, empty and error-with-retry states; stale requests are aborted), `renderOption`, `renderValue`, `placement` and `labels` (also `UixLabelsProvider` `select`). `multiple` gives a `string[]` value, a "+N" with a spoken count, and Delete to clear.
- **Phones:** with `(pointer: coarse) and (max-width: 640px)` the list opens as a bottom sheet (`Drawer side="bottom"`) with 44 px rows.
- **CSS:** `select.css` styles the trigger, the popup, the form proxy and the states. `.uix-listbox` options now show hover/keyboard focus and the selected value differently (the selected one has a check mark), and there are classes for groups, icons and descriptions. Where `appearance: base-select` is supported, a plain `<select class="uix-select">` gets the same look for its open list; Firefox still shows the operating-system list.
- New exported types: `SelectOption`, `SelectGroup`, `SelectLabels`.
