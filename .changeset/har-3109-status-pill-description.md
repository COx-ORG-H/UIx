---
"@tensor_1/react": minor
"@tensor_1/tokens": minor
---

HAR-3109 — a `StatusPill` that explains itself. `description` (and `descriptionPlacement`, default `'top'`) shows what the pill means in the kit `Tooltip`, on hover and on keyboard focus: the pill becomes a focus stop (`.uix-pill--described`, `tabIndex` 0, the kit focus ring and the help cursor) but no button, since pressing it does nothing, and screen readers hear the label and then the description once. A product no longer wraps a pill in its own `<button>` to explain it. Without `description` the pill renders exactly as before.
