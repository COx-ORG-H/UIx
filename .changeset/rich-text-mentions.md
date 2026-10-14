---
"@tensor_1/react": minor
"@tensor_1/tokens": minor
---

`RichTextEditor` mentions (HAR-1599): `onMentionSearch(query)` turns `@` into a "People" list fed by the product (keyboard: arrows, Enter or Tab, Escape; loading, empty and failed states as a status line). A pick is one token drawn with `.uix-mention` and stored as `@[Name](mention:<id>)`, which round-trips byte-exact and is never a link. `Markdown` draws the token and takes `resolveMention` for the shown name; `findMentions`, `formatMention`, `readMention` and `isMentionId` read and write the form. `Comment avatar={false}` drops the avatar column (`.uix-comment--bare`) for a comment on a timeline rail.
