---
"@tensor_1/tokens": minor
"@tensor_1/react": minor
---

`Alert` `actions` and `SectionHead` `action` move under the text when the row has no room (HAR-4803). An alert is now its own inline-size container: below 30rem of its own width the actions take a row under the text, lined up with it, and the × keeps the top end. A section head's row wraps, so its action moves under the title whole instead of wrapping inside itself. At 320 px an alert's sentence used to break a few letters per line beside its button.
