---
"@tensor_1/react": minor
"@tensor_1/tokens": minor
---

TaskTray and `tasks` (the background-task tray from the phone-OS study, Tier 1 item 5): long-running work (an export, a CSV import, a bulk update, a discovery run) stays in view in a pill at the bottom of the window that counts the running tasks and opens into a list with each task's title, current step, determinate or indeterminate progress and Cancel, then its result with an action (open, download, retry). `tasks.start(title, options)` returns a handle with `update`, `complete`, `fail`, `cancel`, `dismiss` and an `AbortSignal`; `tasks.run(title, work, options)` wraps an async function. A region landmark, one polite live region for starts and endings (never percentages), `aria-busy` running rows, Escape to collapse and focus that never drops to the page. New stylesheet `components/task-tray.css`, tokens only, inside the motion contract. Spec: `Docs/specs/2026-11-20-task-tray.md`.
