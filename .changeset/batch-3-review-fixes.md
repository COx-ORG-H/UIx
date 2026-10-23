---
"@tensor_1/react": patch
"@tensor_1/tokens": patch
---

Review fixes for the data-and-editing batch (PR #168) in components that were already released:

- **Search folding** (`foldForSearch`, SearchSuggest, CommandPalette, Combobox filtering): đ, ø, ł, ı, ħ and ŧ fold to the letter people type (d, o, l, i, h, t), so "Dordevic" finds "Đorđević".
- **CommandPalette**: in forced colours the active option keeps a `Highlight` outline. A pointer press that starts in the panel and is released on the backdrop (selecting text, a drag) no longer closes the palette.
- **ViewMenu, SavedViewMenu** (the shared row drag): the draft order lasts only while a drag does, so an order the consumer refuses does not stay on screen; a cancelled pointer (`pointercancel`) and Escape during a drag put the rows back and report nothing, and that Escape does not also close the menu.
