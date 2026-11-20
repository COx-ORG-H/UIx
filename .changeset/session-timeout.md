---
"@tensor_1/react": minor
"@tensor_1/tokens": patch
---

`SessionTimeout` and `useSessionTimeout` (UIx enterprise UX study, roadmap #24; WCAG 2.2.1 Timing Adjustable, 2.2.6 Timeouts): `warnBefore` (2 minutes) before `expiresAt` or the end of an `idle` timeout, an alert dialog with a countdown, "Stay signed in" (focused; Escape too; `onExtend`, which may return the new expiry) and "Sign out". It is announced once, when it opens; the countdown is a `timer` that is not live and holds the time left in words. At the end `onPersistDrafts('expire')` and `onExpire` run and the dialog says the person was signed out and whether their drafts were kept, with "Sign in again" and "Close". `pauseWhenHidden` is opt-in. Words via `UixLabelsProvider` `sessionTimeout`. `Modal` gains `closeButton={false}`. `OtpInput`: a pasted whole code now replaces a half-typed one wherever the caret is, so pasting the code fills every cell (WCAG 3.3.8). Tokens: the countdown styles in `modal.css`.
