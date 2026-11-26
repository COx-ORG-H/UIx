---
"@tensor_1/react": minor
"@tensor_1/tokens": minor
---

`CommentComposer` fits a page that already has its one filled action (TENSOR's worklog, canvas v50).

- **`submitVariant`.** `'secondary'` keeps the commit button bordered for both audiences; `'primary'` fills it for both. Omitted, nothing changes: filled for the outside audience, bordered for internal. The button still names the person and carries the audience icon.
- **No box in a box (tokens).** A `RichTextEditor` that is a direct child of the composer draws no border, radius, background or focus shadow of its own, in every state: rest, hover, focus, disabled, read-only, invalid and the loading fallback's textarea. The composer's frame and `:focus-within` ring hold it; an invalid field turns the composer's border to danger; in forced colours the composer draws the one outline.
