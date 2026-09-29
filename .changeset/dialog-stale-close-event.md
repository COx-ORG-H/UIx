---
"@tensor_1/react": patch
---

`Drawer`, `Modal` and `Peek` no longer close themselves right after mounting open under React StrictMode (TENSOR HAR-882).

- **The bug.** Browsers queue a `<dialog>`'s `close` event and fire it in a later task. StrictMode runs every effect as mount → cleanup → mount, so `useDialog`'s cleanup closed the dialog and the re-run reopened it and added a new `close` listener before the queued event fired. That stale event then reached the new listener, which released the page scroll lock and called `onClose`, so a dialog rendered with `open` closed itself about 25 ms later in `next dev`. The same happened in production whenever `open` went true → false → true before the event fired.
- **The fix.** `useDialog` ignores a `close` event that finds its dialog open again. Escape, a `method="dialog"` form and `close()` on an open dialog still call `onClose` once and release the scroll lock.
- **Migration:** none. A consumer-side guard that stops such stale events (TENSOR's `stale-dialog-close-guard.ts`) is now redundant but harmless.
