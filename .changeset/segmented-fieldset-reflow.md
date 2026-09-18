---
"@tensor_1/tokens": patch
"@tensor_1/react": patch
---

`.uix-segmented` fits its container when rendered on a `<fieldset>` (WCAG 1.4.10 reflow; TENSOR worklog composer).

- **`.uix-segmented`** now sets `min-inline-size: 0` and `max-inline-size: 100%`. A fieldset defaults to `min-inline-size: min-content`, so an audience toggle on one could never be narrower than its longest words side by side and ran ~8 px past `.uix-composer` at 320 px (400 % zoom). On a `<div>` nothing changes.
- **`.uix-segmented__option`** may now shrink and wrap: `white-space: normal` and `overflow-wrap: anywhere`. A label breaks onto a second line inside its option instead of clipping. At desktop widths nothing moves.
- Consumers that rendered the toggle on a fieldset can drop any inline `minWidth: 0` or `maxWidth` workaround.
