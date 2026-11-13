---
"@tensor_1/react": minor
"@tensor_1/tokens": minor
---

HAR-3096 — `Markdown variant="document"` for the body of a page that is the document, such as a knowledge article whose title is the page `<h1>`. `#` renders as `<h2>` and `##` as `<h3>` (`.uix-prose--document`, 24 px at weight 600), so an article's own sections are at least as prominent as a `SectionHead` after the body ("Related articles", 24 px at weight 400), and each section has `--uix-space-6` above it. Before, `##` rendered as `<h4>` at 15 px and the related-articles head outranked the content. The default `inline` variant (comments, notes, descriptions) is unchanged: `#` is `<h3>`. An explicit `headingOffset` still wins. `.uix-prose h2` has its own rule, the size of the `<h3>` below it.
