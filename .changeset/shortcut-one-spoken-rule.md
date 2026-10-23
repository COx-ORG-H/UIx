---
"@tensor_1/react": minor
"@tensor_1/tokens": minor
---

**Keyboard shortcuts: `ButtonLink shortcut`, and one screen-reader rule for Button and Tooltip** (HAR-2416).

- `ButtonLink` takes `shortcut`, like `Button`: hover or keyboard focus shows the keys in a hint above the link (an icon link's `aria-label` before them), so an action that navigates can show its key too. No hint while `disabled`.
- Screen readers now hear a shortcut once, the same way on every control: as the control's description ("Control+K"; "Command+K" on Apple). A `Button` or `ButtonLink` is described by the hint's spoken keys, after any `aria-describedby` of its own; a `Tooltip` describes its trigger with its text and the spoken keys (a closed Tooltip used to read the glyphs too: "Shift+? Shift ?").
- **Behaviour change:** the kit no longer sets `aria-keyshortcuts` on a `Button`, `ButtonLink` or `Tooltip` trigger with `shortcut`. Before, a Button exposed its key only there (not announced by every screen reader), and a Tooltip set it beside the description (said twice by those that announce both). An `aria-keyshortcuts` you pass yourself is kept. Menu rows are unchanged (keys in the row's text and `aria-keyshortcuts`).
