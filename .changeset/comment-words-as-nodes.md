---
"@tensor_1/react": minor
"@tensor_1/tokens": minor
---

Comment audience words may be nodes, so a product can tag the person's name inside them.

- `CommentAudience.label` (the badge on a message) and `CommentComposerAudience` `label`, `hint` and `submitLabel` (the composer's choice, hint line and commit button) now take a `ReactNode`, not only a string. A product that redacts personal data on a page capture can wrap the name it shows ("An <tag>Sophie Wagner</tag> · per E-Mail") and keep the words. Strings still work exactly as before.
