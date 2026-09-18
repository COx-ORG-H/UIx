---
"@tensor_1/tokens": minor
"@tensor_1/react": minor
---

Operator primitives: tabs that scroll, toned and interactive stat tiles, and a copy button.

- **`Tabs overflow="scroll"`** keeps one row that scrolls sideways, keeps the selected tab in view, and shows pointer-only edge buttons only on the side with hidden tabs. Works together with `TabPanel keepMounted`. Long or translated tab labels now wrap to two lines at a 16rem cap instead of stretching the row (all tab variants).
- **`Stat`** gains `tone` (`neutral` | `warning` | `danger`: a toned outline and value, never a toned label), `size="compact"` for dense fact bands, and `onActivate` / `activateLabel` / `expanded`, which make the whole tile a button that opens an editor, named "label: value, action". `Stat` now forwards its ref.
- **`CopyButton`** copies a value, confirms with a check and a polite "copied" announcement, and announces `failedLabel` when the copy is refused. `copyText` is the clipboard helper behind it; it never throws.
- New tokens `--uix-warning-border` and `--uix-danger-border` for outlined toned containers (3:1 non-text contrast on surfaces in both themes).
