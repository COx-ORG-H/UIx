---
"@tensor_1/tokens": minor
"@tensor_1/react": minor
---

`Alert` `actions` and `SectionHead` `action` move under the text when the row has no room (HAR-4803). `Alert` with `actions` now renders the text and the actions in one wrapping row, `.uix-alert__main`, between the icon and the ×: the text asks for 14rem before an action sits beside it, so with less room the action moves under the text, lined up with it, and the × keeps the top end. Static markup can opt in with the same wrapper; markup without it keeps the old layout. A fixed-width alert narrower than about 400 px now shows a short message's action under it. Bump `@tensor_1/tokens` together with `@tensor_1/react`: without the new CSS the row is unstyled and the action stacks at every width. A section head's row wraps, so its action moves under the title whole instead of wrapping inside itself. At 320 px an alert's sentence used to break a few letters per line beside a short button.
