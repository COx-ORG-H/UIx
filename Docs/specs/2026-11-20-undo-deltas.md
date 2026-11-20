# Undo deltas: countdown, Ctrl/⌘+Z, merged repeats, rate limit, quiet mode

Enterprise UX study, roadmap #23 (`Docs/research/reports/UIx enterprise UX study.md`, §6 and the roadmap table). WCAG 2.2.1 Timing Adjustable, 2.2.4 Interruptions. Builds on the shortcut registry (#1, PR #303).

## What already existed

`toast.undoable` (HAR-1363, HAR-1831): an optimistic action with Undo, `onCommit` when the toast closes without it, `toast.undo(id)`, and a Toaster timer that pauses on hover, focus and a hidden tab (`pauseOnHover: false` for a fixed timer).

## What this adds

| Delta | Behaviour |
| --- | --- |
| Undo window | `--uix-hold-undo`, 8000 ms. No source gives a length, so it is the kit's read-and-decide tier: a warning toast already stays 8 s. It was 6 s with no stated reason. `duration` per call still wins. |
| Countdown | Undoable toasts draw `.uix-toast__countdown`: 2 px, `--uix-text-muted`, `transform: scaleX(1 → 0)` linear over the toast's own duration (`--uix-toast-countdown`). The Toaster sets `data-paused` on a toast from the same hover, focus and hidden-tab state that pauses its timer, so the bar and the timer stop together. A fixed timer (`pauseOnHover: false`) never pauses. Under reduced motion (OS or `data-motion="reduce"`), the bar is not drawn and the seconds left are written beside Undo ("6 s"). That text is not live and not part of the announcement. `countdown: true` is available on any timed toast. |
| Ctrl/⌘+Z | The Toaster registers `TOAST_UNDO_SHORTCUT_ID` (`toast.undo`, `Mod+Z`) in the registry's global scope. It never fires in a text field or contenteditable (the registry's default), so the browser's own undo applies there. It is allowed under a modal, because the toaster moves into the top modal. It undoes the newest open undoable toast and announces "Undone: <message>" in the Toaster's polite region. With nothing to undo, the handler declines and the key goes to the page. The sheet lists it as "Undo the last action". The newest Undo button carries `aria-keyshortcuts`. Use `undoShortcut={false}` for a second Toaster, and `toast.undoLatest()` to do it from code. |
| Merged repeats | `group` merges a toast into the open toast with the same key: the count goes up, the message changes (`groupMessage(count)` when given, else the latest message plus "×N"), and the timer restarts. The window is therefore the open toast's lifetime. A merge is announced again, replacing that toast's earlier words in the polite region. On undoable groups, `undoGroup: 'all'` (default) reverts every merged action newest first and closes. `'each'` reverts the newest one, and the toast stays with the rest. Closing commits whatever is left. |
| Rate limit | `DEFAULT_TOAST_RATE_LIMIT` = 5 normal toasts per 10 s per store. This is above the 3 a Toaster shows at once, so an ordinary burst still queues as before. The excess is held, and one persistent "N notifications waiting" toast offers Show (release) or × (drop, reason `dropped`). Configure with `createToastStore({ rateLimit })` / `toast.configure`, or turn it off with `false`. |
| Quiet mode | `toast.setQuiet(true)` holds normal toasts with no summary. `setQuiet(false)` summarises them in the same waiting toast. `useToastQuiet()` reads it for a switch. |
| Priority | `priority: 'high'` toasts are never held. This is the default for errors, loading toasts and undoable toasts: an undo window belongs to the person who just acted. A held toast updated to an error is shown at once. |

## Plural labels

Count words are functions (`labels.toast.held: (n) => …`), the shape TaskTray already uses and that #309's `UixCountLabel` accepts. When #309 lands, add the `toast` keys to every locale pack. `groupMessage` is the consumer's: pass a plural label through `countLabel`.

## Tests

- `packages/react/src/toast-undo-deltas-dom.test.mjs`: jsdom with the mock clock.
- `tests/a11y/toast-undo.spec.mjs`: Playwright on the docs demo, with axe in both themes.
