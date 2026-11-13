---
"@tensor_1/tokens": minor
---

HAR-3104 — a form control's edge is at least 3:1 in the light theme too (WCAG 1.4.11). An empty input, textarea, select, tag input or code cell is the colour of the surface it sits on, so its edge alone shows where to type; the light hairline measured 1.2:1. `--uix-control-border` is now `rgba(0,0,0,.44)` in light (3.2:1 on every light surface, in every theme) and `--uix-control-border-hover` `rgba(0,0,0,.56)`: the lightest edge that clears 3:1, chosen by the operator from a picture of three. Dark (2.63.0) already cleared 3:1; the token test now holds both themes. Unchecked checkboxes and radios keep `--uix-choice-border`; more contrast and print keep their own edges.
