---
"@tensor_1/tokens": patch
---

PageHeader help (HAR-2538): the title and its `?` share one inline text flow instead of a flex row, so on a narrow screen the `?` follows the title's last word (or starts the next line) instead of sitting alone at the top right of a three-line German title. The row reserves the 9 px overhang of the `?`'s 25 px hit area, so its `scrollWidth` no longer exceeds its width when the `?` ends a full line. `tests/a11y/page-header.spec.mjs` measures both at 320 and 1280 px on a new word-wrapping German title.
