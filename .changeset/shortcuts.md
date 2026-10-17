---
"@tensor_1/react": minor
"@tensor_1/tokens": minor
---

**Keyboard shortcuts where people act** (HAR-2031, TENSOR audit UXC-03): a `shortcut` prop in `KbdCombo` key names (`['A']`, `['Mod', 'K']`) on

- **`Button`**: hover or focus shows the keys in a hint above the button (an icon button's `aria-label` before them), and the button gets `aria-keyshortcuts`. The hint renders inside the button as a top-layer popover, so the button gets no wrapper or sibling: a `ButtonGroup`'s corners and a full-width button keep their layout. `Button` stays server-renderable.
- **`Tooltip`**: the keys follow the text in the bubble, and the trigger gets `aria-keyshortcuts`.
- **`MenuItem`, `MenuItemRadio`, `MenuItemCheckbox`**: key names render with `KbdCombo` at the row's end and set the row's `aria-keyshortcuts`; any other node renders as given, as before.

`Mod` is ⌘ / `Meta` on Apple and Ctrl / `Control` elsewhere, resolved after mount (the server renders the non-Apple form). New exports: `ariaKeyShortcuts(keys, platform)` for a control the kit does not render, and the `KeyShortcut` type. The kit only shows a shortcut; the product binds the key. In a tooltip bubble the keys are drawn as outlines in the bubble's own colour.
