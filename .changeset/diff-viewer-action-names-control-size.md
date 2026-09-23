---
"@tensor_1/tokens": minor
"@tensor_1/react": minor
---

DiffViewer: each action is named for the entry it resolves, and a `controlSize` option (for the MOTUS programme conflict comparison, EPE-07).

- **Each action is named for its entry.** New `DiffViewerLabels` templates `acceptIncomingFor`, `keepCurrentFor` and `markPendingFor` (English defaults "Accept incoming for {path}", "Keep current for {path}", "Mark pending for {path}") become the buttons' accessible names. Before, every entry's buttons were all called "Accept incoming", so a screen reader could not tell which entry a button resolved. The visible words still come from `acceptIncoming` / `keepCurrent` / `markPending`. When you translate a name, keep the visible word inside it (WCAG 2.5.3).
- **The action row and the summary are real groups.** They now have `role="group"`, so their existing `resolve` / `summary` labels are announced. Before, the `aria-label` sat on a plain `div`, where it is not allowed.
- **`controlSize`** (`sm` default · `md` · `lg`) sets the height of the action buttons and the entry disclosure rows. `md` follows `--uix-control-h`, so a theme with 60px controls gets 60px actions. `lg` is 44px. The root carries `data-control-size`, and `diff-viewer.css` sizes the rows from it.
- **Migration:** the buttons' accessible names now end with the entry path, so a test that finds them by their exact old name ("Accept incoming") must match "Accept incoming for $.path" instead, or match as a substring. The visible text has not changed.
