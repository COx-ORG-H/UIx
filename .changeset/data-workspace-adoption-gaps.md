---
"@tensor_1/react": minor
"@tensor_1/tokens": minor
---

DataWorkspace closes the gaps that held back the MOTUS and TENSOR adoptions (HAR-2622..2626, ADR-0005 addendum). Every prop is additive: a workspace that sets none of them renders the same markup as in 2.49.

- **Responsive ladder (HAR-2622):** `mobile: 'priority' | 'cards'` with `column.priority` (`low` goes below 900 px of workspace width, `mid` below 600 px) and `column.label`; `cards` turns rows into labelled cards below 768 px, with the checkbox and the row's actions on the card. The step follows the workspace's own width (a ResizeObserver), measured before the first paint.
- **Rich id cell (HAR-2622):** `idColumn.render` puts a title over a muted line (or a search match) in the same button or link; `idColumn.linkId` makes the whole id the record's link, with the ↗ inside it, for a row without a peek.
- **States and slots (HAR-2622, HAR-2624):** `empty`, `filteredEmpty` and `error` bodies; `emptyAction` and `filteredEmptyAction`; `stateOverride` for a product state such as a page past the end (the toolbar stays); `loadingRows`; `beforeBody` between the toolbar and the rows; `savedViews.note`.
- **Toolbar (HAR-2622):** `search.onSubmit`, `search.onClear` and `search.maxLength` (SearchBar gains `maxLength`); `saveViewAs: 'always'`; `filters.onClearAll(scope)`, so a product whose state is the URL clears every filter in one change.
- **Selection (HAR-2622):** `maxSelection` disables the unchecked boxes at the cap; ranges and select-all stop there.
- **Multi-column sort (HAR-2623):** `sort` takes an ordered list; Shift + click, Shift + Enter or Shift + Space adds, turns or removes a key; each sorted header shows its priority (`labels.sortPriority`) once two keys are set; `aria-sort` stays. `onSortChange` gets the shape `sort` holds.
- **Table (HAR-2624):** `zebra`, `freezeFirstColumn` (with selection, the checkbox and the first column), `column.className`, `column.minWidth`.
- **Row groups (HAR-2625):** `groups` with `collapsedGroups` / `onCollapsedGroupsChange`: a header row per group with a toggle, its count (`labels.groupCount`) and aggregates under their columns, a tri-state group checkbox; Shift ranges run across groups in visual order; collapsing keeps the header where it was.
- **Windowing and the keyboard row model (HAR-2626):** `virtualize` over `useVirtualRows` (off with `pagination`, `groups` or cards) with `aria-rowcount` / `aria-rowindex` and `aria-hidden` spacers; `onRowActivate` turns on a roving tab stop (↑ ↓ Home End, Enter, a click on the row), with `activeRowId` / `onActiveRowChange` for the product's own shortcuts; focus stays on its row across a refetch and moves to the first row of a new page.
- Rows are memoised: a selection change re-renders only the rows it changed, when `columns`, `idColumn`, `rowActions` and `getRowProps` are stable.
- New labels in the `dataWorkspace` group: `sortPriority`, `groupCount`, `groupCountOne`, `collapseGroup`, `expandGroup`, `selectGroup`.
