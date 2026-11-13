---
"@tensor_1/tokens": minor
---

Form control edges on dark (TENSOR HAR-2974): two new tokens, `--uix-control-border` and `--uix-control-border-hover`, draw the edge of `.uix-input`, `.uix-textarea`, `.uix-select`, `.uix-select-trigger`, `.uix-taginput` and the code-input cells. On dark the edge is `rgba(255,255,255,.36)` (hover `.48`), at least 3:1 on every dark surface from `--uix-bg-app` to `--uix-surface-3`, in the default palette and every product theme (WCAG 1.4.11; `tests/control-border-contrast.test.mjs`). The hairline it replaces measured 1.2:1 in a TENSOR drawer, where an empty field is the colour of its surface and only the edge shows where to type. Light keeps its hairline (`var(--uix-border)`, hover `var(--uix-border-strong)`), so nothing changes there; the high-contrast display preference still re-points it.
