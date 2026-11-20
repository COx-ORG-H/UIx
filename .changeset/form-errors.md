---
"@tensor_1/react": minor
"@tensor_1/tokens": minor
---

Forms error recovery (UIx enterprise UX study, "First five" #2). `ErrorSummary` over the existing `.uix-validation-summary`: "There is a problem", one linked entry per error in the field's own words, focus on appear and on each failed submit, `role="alert"` inside the focus target, "Error: " page-title prefix (`useErrorTitle`, `errorTitle`). `useFormErrors` drives it and `Field` with "reward early, punish late" timing and server errors (`setServerErrors`). `Field` gains opt-in `errorAnnounce` and `errorPrefix`. `useLeaveGuard`: `beforeunload` plus a router-agnostic `confirm(proceed, stay)`, armed only while dirty, saving or failed, with the "Discard changes?" words. `ConflictNotice` and `mergeRecordConflict`: a 409 / 412 banner that keeps the person's input, names the fields someone else changed, offers Reload latest and a review in `DiffViewer`. Labels: `errorSummary`, `leaveGuard`, `conflictNotice`. Tokens: summary heading, focus ring and scroll margin; conflict-notice layout in `form.css`.
