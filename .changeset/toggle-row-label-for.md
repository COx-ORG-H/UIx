---
"@tensor_1/react": minor
---

`ToggleRow`: the visible label is now a real `<label>` for the switch, so clicking the words flips it and the label names it; the description is the switch's `aria-describedby`. `accessibleLabel` is optional and only needed when the label is not text (HAR-1607).
