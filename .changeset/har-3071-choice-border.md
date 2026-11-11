---
"@tensor_1/tokens": minor
"@tensor_1/react": minor
---

Unchecked checkboxes and radios at 3:1 (HAR-3071): an unchecked `Checkbox`, `Radio` and the check circle of a `RadioCard` are drawn only by their 1 px edge, and that edge was `--uix-border-strong`, 1.2–1.5:1 against the rows and surfaces they sit on in both themes (WCAG 2.2 SC 1.4.11 asks 3:1). A council judge on TENSOR's vulnerabilities list could not tell the dark row checkboxes from the rows.

- New token `--uix-choice-border`: light `#808080`, dark white at 45 % (about `#7C7C7C` over the box's surface). At least 3.4:1 on the surfaces, the plain, zebra and hovered row, the subtle band and the app background in light, 3.6:1 in dark, and 3.3:1 in mission-control, the weakest product theme. More contrast re-points it to the strong hairline, print to the quiet ink.
- Checkbox and radio boxes use it while unchecked. Checked, indeterminate, invalid, focus and disabled states are unchanged, and so is the checkbox's growing fill.
- `--uix-border-strong` is unchanged: outline buttons, cards, dashed upload areas and the radio card's own outline keep it.
- `packages/tokens/tests/choice-border-contrast.test.mjs` fails when the edge drops under 3:1 on any of those layers, in any theme, light or dark, including more contrast and print.
