# Script — Toast and live regions (`toast`)

Harness region: **Toasts and live regions** (h2). Four buttons and a `Toaster` (a region named
"Notifications" holding a persistent polite status region, mounted before any toast):

- "Show success toast": a success toast, spoken through the Toaster's polite region.
- "Show error toast": an error toast that is its own `role="alert"` (assertive) and stays.
- "Start export": a loading toast (`aria-busy`) that becomes "Export ready" after 1.2 s.
- "Close INC-1005": an undoable toast with an Undo button, 10 s, paused while hovered or focused.

Toasts sit bottom-right; the Notifications region is a landmark.

| # | Do | Must convey | Watch for |
|---|----|-------------|-----------|
| 1 | Tab to "Show success toast", Enter, wait 3 s without pressing anything. | "Incident INC-1002 saved", once, after the button. Focus stays on the button. | Spoken twice is a fail (fixed in this PR for the StrictMode case; check it in the product build). Not spoken is a fail. |
| 2 | Enter on "Show error toast". | "Could not save INC-1002. Try again." spoken at once, interrupting if needed. | Some readers prefix "alert". |
| 3 | Press the reader's landmark key (D in NVDA, R in JAWS, VO rotor Landmarks) to "Notifications". | Region "Notifications"; the toasts and their "Dismiss" buttons. | |
| 4 | Tab into the toast stack, Enter on a "Dismiss". | The toast is gone; focus moves to the next toast's Dismiss (or the previous); it does not fall to the page top. | |
| 5 | Enter on "Start export", wait 3 s. | "Exporting 8 incidents…", then "Export ready". | The loading toast is `aria-busy`; record whether a reader skips its text. |
| 6 | Enter on "Close INC-1005", then Tab (or the landmark key) to the toast's "Undo" within 10 s, Enter. | "INC-1005 closed"; button "Undo"; after Enter the toast closes. | Reaching Undo must not race the timer: the toast pauses while it holds focus. Record how long the step took. |
| 7 | Press "Show success toast" three times quickly. | Each announcement is heard, or joined into one; none is lost silently. | The Toaster joins near-simultaneous texts into one announcement. Record what the reader did with it. |
| 8 | Turn on OS reduce motion, reload, repeat 1 and 2. | Same speech; toasts appear without sliding. | |
| 9 | iOS VoiceOver / TalkBack: steps 1, 2 and 6 with double taps. | Same speech; Undo reachable by swiping before the toast leaves. | Mobile readers may not speak a polite update while the user is swiping. |

**Pass** when steps 1, 2, 5 and 6 speak their messages exactly once and every control is reachable.
