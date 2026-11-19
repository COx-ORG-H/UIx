---
"@tensor_1/react": minor
"@tensor_1/tokens": minor
---

HAR-2880 — `Sparkline` becomes the one inline trend line products put beside a number, so TENSOR can replace its two hand-built copies.

- `values` accepts `null`: a missing value breaks the line and is never drawn as zero (`NaN` counts as missing too). A lone value between two gaps is a small dot (`.uix-sparkline__point`).
- `target` draws a thinner dashed reference line under the data (`.uix-sparkline__target`), and the scale always includes it.
- `threshold={{ value, direction: 'above' | 'below' }}`: when the latest value is past it, the last dot becomes an amber diamond (`.uix-sparkline__end--crossed`, `--uix-warning-text`). The shape changes along with the colour, so colour is never the only cue.
- `highlightLast` (default `true`) marks the latest known value. Turn it off for a bare line.
- `valueText` keeps the value in text: the accessible name is "label: valueText". With `showValue` the value is also written beside the line, and the pair becomes one image (`.uix-sparkline-group`, `.uix-sparkline__value`). The value wraps between words, never inside one. When line and value don't fit side by side, the value moves under the line.
- A constant series is a flat line through the middle, not along the bottom. An all-null series draws no line and keeps its value text.

Nothing changes for existing calls: the root is still `svg.uix-sparkline`, and it is decoration without `label` or `valueText`. Only `showValue` wraps it in a `span`, and then `className` goes on that span. Every new mark is drawn in CanvasText under forced colours. Line, marks and target clear 3:1 and the written value clears 4.5:1 in every theme, light and dark (`sparkline-contrast.test.mjs`). Nothing animates outside a playing `Arrive` stage, and nothing animates under reduced motion.
