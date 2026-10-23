---
"@tensor_1/react": patch
"@tensor_1/tokens": patch
---

Review fixes for the overlays-and-keyboard batch:

- **Tabs**: a pill row with one long unbroken word no longer widens the page (`.uix-tab` breaks it with `overflow-wrap: anywhere`; the pill row is `inline-flex`, sized by its min-content). In forced colors a focused, selected pill shows its focus ring rather than the selected outline.
- **Popconfirm**: the step takes Escape on its own React `onKeyDown`, after the controls inside it, so an expanded disclosure inside the step no longer lets Escape reach (close, or ask "Discard changes?" in) the Drawer or Modal around it. An Escape that ends an IME composition is left alone, so a typed reason is not lost. With `closeWhenAnchorHidden`, focus that was in the step goes back to the anchor without scrolling, and a step whose field holds text stays open when its anchor scrolls away.
- **ConfirmDialog type-to-confirm**: the field has `autocapitalize="none"` and `autocorrect="off"`, so a phone keyboard does not turn the first letter into a mismatch; the mismatch message reserves its own wrapped height, so the footer stays put also when it wraps (a long value, German).
- **Tooltip**: documented that an open bubble takes the first Escape, also on a combobox-style trigger.
