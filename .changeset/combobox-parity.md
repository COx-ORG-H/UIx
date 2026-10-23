---
"@tensor_1/react": minor
"@tensor_1/tokens": minor
---

**`Combobox` at keyboard and placement parity with `Select`** (HAR-1588). The list is a top-layer popover placed with `useAnchoredPosition`, so it is no longer clipped inside a Drawer, a Popover or an `overflow: hidden` cell. ↑ ↓ PageUp PageDown move (Home End too while an option is active), disabled options are skipped and the list does not wrap; Escape closes it and puts the chosen option's text back; reopening from the keys no longer filters the list by the chosen label. `options` also take groups (`ComboboxGroup`: `{ label, options, disabled }`, rendered as `role="group"`); the no-match row is outside the listbox; the chosen option has a check mark. New props `aria-labelledby` (replaces `label` as the input's name), `aria-describedby`, `aria-invalid`, `inputId`, `placement`; new export `filterComboboxItems`. CSS: `.uix-combobox__popup`; the static `.uix-combobox__listbox` rule now applies to a list that is a direct child of `.uix-combobox` only.
