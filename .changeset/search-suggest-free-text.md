---
"@tensor_1/react": minor
"@tensor_1/tokens": minor
---

**`SearchSuggest freeText`** (HAR-2465, TENSOR DF-06 / DR-7): a text field with suggestions that never replaces what the person typed and never submits the surrounding form by accident. The value is the text; Enter without an active row keeps it and is always prevented (also while `loading`); no row is picked unless the person moves to it (ArrowDown / ArrowUp, then Enter) or clicks it, and then its title replaces the text through `onValueChange` without submitting; blur, Tab and Escape keep the text (a second Escape does not clear it). No magnifier is drawn (`.uix-search-suggest--free-text`). `onSelect` is now optional. The search mode is unchanged, as are `Combobox` and `EntityPicker`. Decision record: `Docs/adr/0004-search-suggest-free-text.md`.
