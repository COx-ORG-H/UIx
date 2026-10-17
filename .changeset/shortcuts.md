---
"@tensor_1/react": minor
"@tensor_1/tokens": minor
---

**Keyboard shortcuts where people act** (HAR-2031, TENSOR audit UXC-03): a `shortcut` prop in `KbdCombo` key names (`['A']`, `['Mod', 'K']`) on

- **`Button`**: hover or keyboard focus shows the keys in a hint above the button (an icon button's `aria-label` before them), and the button gets `aria-keyshortcuts` unless it has its own. The button holds only an empty hidden marker; the hint is portalled after mount (into the nearest `<dialog>`, else `<body>`), so the button's text, name, layout and selectors are unchanged: a `ButtonGroup`'s corners and a full-width button keep their geometry, and `toHaveText('Save')` still holds. Focus a menu or dialog sends back after a mouse choice opens no hint. `Button` stays server-renderable.
- **`Tooltip`**: the keys follow the text in the bubble, and the trigger gets `aria-keyshortcuts`. Around a `Button` with a `shortcut` it takes that shortcut, so there is one bubble with the label and the keys.
- **`MenuItem`, `MenuItemRadio`, `MenuItemCheckbox`**: key names render with `KbdCombo` at the row's end and set the row's `aria-keyshortcuts`; any other node renders as given, as before. An array of strings now counts as key names (`['⌘', 'K']` passed as a node would render as two keys).

`Mod` is ⌘ / `Meta` on Apple and Ctrl / `Control` elsewhere (the server and the hydrating render use the non-Apple form; a menu row mounted later reads the platform at once). KbdCombo now also names `Esc`, `Del` / `Delete` and `Space`; `+` is spoken and written as `Plus` in `aria-keyshortcuts`. New exports: `ariaKeyShortcuts(keys, platform)` for a control the kit does not render, and the `KeyShortcut` type. The kit only shows a shortcut; the product binds the key. In a tooltip bubble the keys are drawn as outlines in the bubble's own colour.
