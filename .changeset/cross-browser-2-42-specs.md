---
"@tensor_1/react": patch
"@tensor_1/tokens": patch
---

**Safari: an Escape that closes a popover inside a Drawer or Modal no longer closes the dialog too** (HAR-2417). WebKit hands one Escape both to an open light-dismiss popover and to the dialog around it (a `cancel` after the popover closed), where Chromium and Firefox give it to the popover only: in Safari a clean drawer closed together with its help popover, and a dirty one asked "Discard changes?". The dialog now treats a `cancel` that arrives in the same task as a popover's light dismiss as the popover's. Found by running the 2.42.0 browser specs (description list, discard step, search bar, shortcuts) in Firefox and WebKit, which CI's cross-browser job now does.
