---
"@tensor_1/react": patch
---

`CommandPalette`: the open key (`shortcut`) toggles from the dialog's real state. Escape closes the native dialog a task before React renders the `false` its `close` event asks for, and a press of the key in that gap closed the palette again instead of reopening it. Reopening goes through `useDialog` as an ordinary open does, so the scroll lock, the modal layer and the stale-close guard stay in step.
