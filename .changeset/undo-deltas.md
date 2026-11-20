---
"@tensor_1/react": minor
"@tensor_1/tokens": minor
---

Undo deltas (enterprise UX study, roadmap #23). Undoable toasts now draw a countdown bar that shrinks over the undo window on `transform` and stops whenever the timer does (hover, focus, a hidden tab). Under reduced motion they show the seconds left beside Undo instead. The window is the new token `--uix-hold-undo`, 8 s; it was 6 s, and `duration` per call still overrides it. Any timed toast can ask for a countdown with `countdown: true`.

The `Toaster` registers Ctrl/⌘+Z (`TOAST_UNDO_SHORTCUT_ID`) in the shortcut registry's global scope. It undoes the newest undoable toast and announces it, and it is listed in the `?` sheet. It never fires inside a text field, and it leaves the key to the page when nothing is waiting. `undoShortcut={false}` turns it off, and `toast.undoLatest()` does the same from code.

Toasts with the same `group` merge into one ("Resolved 3 tickets", through `groupMessage(count)`, otherwise "×3"). On undoable groups, `undoGroup: 'all' | 'each'` sets whether Undo reverts the whole group or one action at a time.

A per-store rate limit (`DEFAULT_TOAST_RATE_LIMIT`, 5 normal toasts per 10 s; `createToastStore({ rateLimit })`, `toast.configure`) holds the excess in one "N notifications waiting" toast. `toast.setQuiet(true)` (do not disturb, with `useToastQuiet`) holds normal toasts until it ends. Errors, loading and undoable toasts (`priority: 'high'`) always show. A held toast that is closed unseen gets the new dismiss reason `dropped`.

Other changes:
- `ToastAction.onClick` may return `false` to keep the toast open.
- `Toast` takes `countdown` and `announceKey`.
- The `toast` labels namespace gains `undoShortcut`, `undone`, `remaining`, `count`, `held` and `showHeld` (`ToastLabels`).
- `ToastStore` gains `undoable`, `undo`, `latestUndoable`, `undoLatest`, `setQuiet`, `isQuiet`, `getHeld`, `releaseHeld`, `dropHeld` and `configure`.

Spec: `Docs/specs/2026-11-20-undo-deltas.md`.
