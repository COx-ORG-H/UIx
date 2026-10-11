---
"@tensor_1/tokens": patch
---

Native form controls follow the accent. The base layer now sets `accent-color: var(--uix-accent)` on the root, so a native checkbox, radio, range or progress bar that has not been moved to the kit component is drawn in the same blue as a primary button instead of the browser's own (a pale blue under `color-scheme: dark`).

**Visible change:** every such control in a consumer changes colour on upgrade; nothing else about it does. The property is inherited, so a consumer's own `accent-color` on any element still wins, and the kit's `Checkbox`, `Radio` and `Switch` are unaffected (they draw their own box).
