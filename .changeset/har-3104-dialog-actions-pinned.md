---
"@tensor_1/tokens": patch
---

HAR-3104 (the UI climb rules, HAR-3107) — a Modal's actions stay in view. A dialog with the kit's parts is no taller than the viewport: its header and footer keep their place and only `.uix-dialog__body` scrolls. Before, a long body made the whole dialog scroll and carried the footer's primary action out of view. The Drawer already worked this way; `tests/a11y/dialog-actions.spec.mjs` now holds both, at 1280 × 600 and 320 × 568, after scrolling and by keyboard.
