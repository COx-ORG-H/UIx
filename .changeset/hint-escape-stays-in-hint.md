---
"@tensor_1/react": patch
"@tensor_1/tokens": patch
---

**An Escape that closes a hover hint no longer reaches the Drawer or Modal around it** (HAR-2415). In a Drawer or Modal, one Escape meant to dismiss a `Tooltip`, an `InfoTip` panel, a `Button` shortcut hint or a hover card (`Popover openOnHover`) also acted on the dialog: a clean dialog closed, a `dirty` one opened its "Discard changes?" step. While a hint is open, its Escape is now taken in the capture phase and cancelled, so it closes only the hint; the next Escape is the dialog's. Focus does not move (an InfoTip still returns focus to its ? when focus was in the panel).
