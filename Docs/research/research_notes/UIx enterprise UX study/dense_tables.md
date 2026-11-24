# Dense data tables and data grids for enterprise web apps (UIx / TENSOR), as of 2026-11-20

Scope: React + CSS design system (UIx); main consumer TENSOR (desktop ITSM/CMDB: ticket queues, asset lists, bulk operations, sometimes GPU-less VDI).
Method: 17 tool calls (primary docs fetched where possible). Items under "Gaps" marked "unverified (training knowledge)" were NOT re-checked this session and must be verified before they become specs.

---

## 1. Keyboard model: ARIA grid vs table, roving focus, cell vs row navigation, editing in place

### Takeaway
Use a native `<table>` (not ARIA `grid`) for read-mostly queues where a row's only interactions are "open" and "select"; reserve the APG data-grid contract (one tab stop, arrow keys, Enter/F2/Escape edit modes) for genuinely spreadsheet-like surfaces (inline edit, cell ranges). Every serious grid library (AG Grid, MUI X, React Aria) implements the APG cell-focus model, but they differ on Tab behaviour and header focus, so UIx must pick and document one contract.

### Cited Findings
**APG grid pattern (W3C)**
- Grid is a composite widget that "Always contains multiple focusable elements" and needs author-managed focus; a table's focusables all sit in the page tab sequence. Use `grid` for tabular content that is editable or interactive, giving arrow-key navigation and a shorter tab sequence. — [W3C APG Grid](https://www.w3.org/WAI/ARIA/apg/patterns/grid/)
- Data-grid keys: arrows move one cell and stop at edges (no wrap: wrapping "would be disorienting in a data grid"); Page Up/Down move an author-defined number of rows; Home/End = first/last cell in row; Ctrl+Home/End = first cell of first row / last cell of last row. — [W3C APG Grid](https://www.w3.org/WAI/ARIA/apg/patterns/grid/)
- Selection keys (if supported): Ctrl+Space selects column, Shift+Space selects row, Ctrl+A selects all, Shift+arrows extend by one cell. — [W3C APG Grid](https://www.w3.org/WAI/ARIA/apg/patterns/grid/)
- Editing: Enter disables grid navigation and puts focus in the input (or first widget in the cell); F2 does the same and a second F2 "restores grid navigation functions"; typing alphanumerics in an editable cell starts editing; Escape restores grid navigation and may undo edits; Tab/Shift+Tab move between widgets inside the grid. — [W3C APG Grid](https://www.w3.org/WAI/ARIA/apg/patterns/grid/)
- Focus rule: every cell must be focusable or contain a focusable element (except header cells with no sort/filter). Best practice: a cell with one widget that doesn't need arrows puts focus on the widget; a text-only cell takes focus itself. Only one grid element is in the tab sequence; APG does not mandate roving tabindex vs `aria-activedescendant`. — [W3C APG Grid](https://www.w3.org/WAI/ARIA/apg/patterns/grid/)
- Roles/states: `grid` > `row` > `columnheader`/`rowheader`/`gridcell`; `aria-sort` on sorted header; `aria-selected` on selected rows/cells; `aria-readonly="true"` on non-editable cells (omit entirely if the grid has no editing); `aria-rowcount`/`aria-colcount` + `aria-rowindex`/`aria-colindex` when rows/columns are virtualised or hidden. On native `<table>`, ARIA row/cell roles are unnecessary; spans must use HTML `rowspan`/`colspan`. — [W3C APG Grid](https://www.w3.org/WAI/ARIA/apg/patterns/grid/)

**Adrian Roselli: do not make a table a grid for clickable rows**
- Argues against both `role=grid` and `<tr>` click handlers just to make rows clickable; tables should stay tables; grid brings complex keyboard expectations. Recommends a labelled checkbox per row, and a stretched `<label>`/link pseudo-element (`::after`, absolute) to make the whole row clickable without JS or ARIA; `position: relative` must be on the `<tr>` (Oct 2026 update: needed in all three engines; WebKit bug on `tr{position:relative}` marked resolved April 2026, fix reported in Safari Technology Preview 243). Rows with two controls should not be wholly clickable. JAWS+Chrome announced row-header cells containing labels as blank (workaround `<wbr>`, issue filed). Article published 2023-11-02, updated 2026-10-07. — [Roselli, "Don't Turn a Table into an ARIA Grid Just for a Clickable Row"](https://adrianroselli.com/2023/11/dont-turn-a-table-into-an-aria-grid-just-for-a-clickable-row.html)

**AG Grid (React)**
- Cell focus by default, row-based selection. Arrows move one cell (no-op at boundary); Ctrl+Left/Right = row start/end; Page Up/Down scroll one page; Home/End = first/last ROW (differs from APG, where Home/End are row-internal); Up from the first row moves focus into the header. — [AG Grid keyboard navigation](https://www.ag-grid.com/react-data-grid/keyboard-navigation/)
- Header focus: Enter sorts, Shift+Enter multi-sort, Ctrl+Enter opens filter; Shift+Left/Right moves the column; Alt+Left/Right resizes the column; Alt+Down opens the column menu, Esc returns to header; Space toggles header checkbox. Tabbing into the grid lands on the first column header by default; `tabToNextCell`/`tabToNextHeader`/`tabToNextGridContainer` customise Tab. — [AG Grid keyboard navigation](https://www.ag-grid.com/react-data-grid/keyboard-navigation/)
- Editing: F2 or Enter starts editing; Ctrl+Enter while editing in a range applies the value to all editable cells in the range; Escape cancels (implied). Space selects/deselects the focused row. — [AG Grid keyboard navigation](https://www.ag-grid.com/react-data-grid/keyboard-navigation/)

**MUI X DataGrid**
- Arrows between cells; Home/End first/last cell in row; Ctrl+Home/End first/last cell in grid; Page Up/Down by scrollable page. Shift+Space toggles row selection; Shift+Up/Down extends; Shift+click range; Ctrl+A all rows (or all cells with `cellSelection`); Ctrl+C copies rows; Ctrl+click multi-select. Header: Enter sorts, Shift+Enter multi-sort, Ctrl+Enter opens column menu. — [MUI X accessibility](https://mui.com/x/react-data-grid/accessibility/)
- Tab: default `tabNavigation="none"` leaves Tab to browser order (focus may leave the grid); `"content"`, `"header"`, `"all"` modes change this. Only one focusable element per cell should be in the tab sequence; custom `renderCell` must pass the provided `tabIndex` to inner focusables. — [MUI X accessibility](https://mui.com/x/react-data-grid/accessibility/)
- Row header cells (`rowHeader: true`) stay mounted when column virtualisation scrolls them away, so screen readers can announce the row's identity from anywhere in the row. — [MUI X accessibility](https://mui.com/x/react-data-grid/accessibility/)

**React Aria Table (docs moved to react-aria.adobe.com)**
- Arrow keys move focus into cells by default; `keyboardNavigationBehavior="tab"` lets Tab move in/out of cells for interactive content (text fields); `focusMode` per Cell/Column chooses whether the cell or its first focusable child gets focus (default: child in arrow mode, cell in tab mode). — [React Aria Table](https://react-aria.adobe.com/Table)
- Selection: `selectionMode` single/multiple; multiple adds checkbox column + select-all header checkbox; `selectionBehavior` default `'toggle'`; `escapeKeyBehavior` default clears selection (docs advise not changing it). Rows can be links via `href` (rows cannot be `<a>` per HTML), `onRowAction` for row actions; a column can be marked row header and is announced during row navigation; row `textValue` drives typeahead. — [React Aria Table](https://react-aria.adobe.com/Table)
- Resizing via `ResizableTableContainer` + `ColumnResizer`, widths in px/%/`fr` with `minWidth`/`maxWidth`; drag-and-drop reorder with keyboard and screen reader support; `renderEmptyState`; `TableLoadMoreItem` with `onLoadMore`/`isLoading` for infinite loading; sticky header via CSS `position: sticky`. — [React Aria Table](https://react-aria.adobe.com/Table)

**Linear (operator-queue precedent)**
- J/K moves the highlight through issues; X adds the highlighted issue to the selection; after the first selection, Shift+Up/Down extends the range; Cmd/Ctrl+A selects all in the filtered list; bulk actions appear at the bottom; `?` opens a searchable shortcut sheet. — [Linear docs: Select issues](https://linear.app/docs/select-issues); [Linear changelog: issue selection](https://linear.app/changelog/issue-selection)

### Inferences
- Two UIx tiers are justified: (a) `Table` = semantic `<table>` with row-level focus/highlight, row link via stretched-link technique, checkbox selection, Linear-style J/K/X/Shift shortcuts as an app-level layer; (b) `DataGrid` = APG grid (cell focus, Enter/F2/Escape modes, `aria-rowindex`) only where inline editing or cell ranges exist. TENSOR ticket queues and asset lists are tier (a); bulk-edit sheets or CMDB attribute matrices are tier (b).
- Libraries disagree on Home/End (APG/MUI: row-internal; AG Grid: first/last row). UIx should follow APG and document it.
- Escape-clears-selection (React Aria default) conflicts with Escape-cancels-edit; precedence must be specified: Escape cancels edit first, then closes popover, then clears selection.
- Keep one focusable per cell (MUI rule) to avoid tab-sequence explosion; secondary row actions belong in a single overflow button at the row end (Roselli).

### Gaps
- Airtable and Carbon keyboard models not fetched (time budget). Unverified (training knowledge): Airtable uses spreadsheet-like cell focus with Enter to edit, Shift+Space expand record; Carbon DataTable is a semantic table with no cell-level arrow navigation.
- TanStack Table is headless and ships no keyboard model; any grid keyboard behaviour on top of it is the consumer's to build (consistent with its headless positioning, not re-verified this session).
- No source compared screen-reader verbosity of `grid` vs `table` empirically; Roselli's piece is expert opinion plus bug reports.

---

## 2. Density: row heights, density modes, typography, zebra vs dividers, numbers, truncation, min widths

### Takeaway
Carbon publishes the most concrete scale (24/32/40/48/64 px rows, header matches row size, toolbar/batch bar/pagination match row height); AG Grid derives row height from font/icon size plus a spacing multiple (Quartz default 42 px). For TENSOR the defensible defaults are a 32 px "compact" and 40 px "standard" row with a user toggle, tabular numerals, right-aligned numbers, and dividers plus hover rather than zebra by default.

### Cited Findings
- Carbon row/header sizes: xs 24 px (1.5rem), sm 32 px (2rem), md 40 px (2.5rem, default), lg 48 px (3rem), xl 64 px (4rem, only for two-line rows). Header row matches table row size; toolbar height matches row height (small toolbar with xs/sm, tall with lg/xl). — [Carbon Data table usage](https://carbondesignsystem.com/components/data-table/usage/)
- Carbon: zebra-stripe modifier exists "to make horizontal scanning easier" (optional). Column titles one or two words; long titles wrap to two lines, then truncate with full text in a hover tooltip. Use skeleton states rather than spinners for longer loads. — [Carbon Data table usage](https://carbondesignsystem.com/components/data-table/usage/)
- AG Grid: all padding is a multiple of the `spacing` param (runtime-changeable via `--ag-spacing`); row height = max(iconSize, cellFontSize) + spacing-based padding; overrides `rowHeight`/`--ag-row-height`, `headerHeight`, `rowVerticalPaddingScale`. Text and icons do not scale with spacing. — [AG Grid compactness](https://www.ag-grid.com/react-data-grid/theming-compactness/)
- AG Grid Quartz theme default row height is 42 px (stated in the row-buffer explanation). — [AG Grid DOM virtualisation](https://www.ag-grid.com/react-data-grid/dom-virtualisation/)
- MUI X DataGrid supports three densities: `standard` (default), `compact`, `comfortable`, scaling the `rowHeight`/`columnHeaderHeight` props. — [MUI X accessibility](https://mui.com/x/react-data-grid/accessibility/)
- NN/g: use borders, zebra striping and hover highlight together to help users keep their place; put a human-readable identifier in the first column; default column order by importance with related columns adjacent. (Article 2022-04-03.) — [NN/g Data Tables: Four Major User Tasks](https://www.nngroup.com/articles/data-tables/)
- Atlassian: spacing system on an 8 px base unit, described as intended to support customisable UI density in future; no dynamic-table row heights found. — [Atlassian spacing](https://atlassian.design/foundations/spacing) (via search summary; [Dynamic table](https://atlassian.design/components/dynamic-table) page did not expose row-height specs)

### Inferences
- Map UIx density tokens onto Carbon's scale: `--uix-table-row-h` 32 (compact) / 40 (standard) / 48 (comfortable); header, toolbar, batch bar and pagination bar inherit the same token so the whole table changes density together (Carbon rule).
- Follow AG Grid's model of density = padding only; keep body font size constant across densities so data does not become illegible at compact.
- 24 px (Carbon xs) is below the WCAG 2.2 2.5.8 24x24 target minimum once a checkbox or icon button sits in the row; treat xs as read-only/log density.
- Zebra on by default is not supported by evidence; NN/g recommends combining aids. For VDI (low-contrast thin-client displays), hover + 1 px dividers + optional zebra toggle is a reasonable default.

### Gaps
- Unverified (training knowledge): SAP Fiori cozy controls 3rem (48 px) vs compact 2rem (32 px), with a "condensed" table density ~1.5rem (24 px) rows only allowed in compact mode on desktop; cozy for touch, compact for mouse. The SAP page returned HTTP 403.
- Unverified (training knowledge): MUI X default `rowHeight` 52 px, density factors compact 0.7 (≈36 px) and comfortable 1.3 (≈68 px).
- Number alignment (right-align, tabular-nums `font-variant-numeric`), decimal alignment and min column widths were not documented on any fetched page (Carbon page explicitly lacked numeric alignment). Treat right-aligned tabular numerals as conventional practice, not source-backed here.

---

## 3. Column operations: resize, reorder, pin, hide, saved views, sort/filter, grouping, aggregation

### Takeaway
Freeze the header and the identifier column, make hide/reorder possible without drag-and-drop, show active-filter and hidden-column indicators, and make every header operation keyboard-reachable (AG Grid's Shift+arrow move / Alt+arrow resize is a concrete precedent).

### Cited Findings
- NN/g: freeze header rows and header columns when the table exceeds the screen; make hiding and reordering columns easy with low interaction cost "without requiring drag and drop"; show a clear indicator when columns are hidden (e.g. count); show a clear indicator when filters are active; filters "discoverable, quick, and powerful". A subtle drop shadow on the frozen header aids orientation. — [NN/g Data Tables](https://www.nngroup.com/articles/data-tables/)
- Carbon sorting: three states (unsorted, ascending, descending); only the sorted column shows an icon, unsorted icons appear on hover. Toolbar holds global actions (settings, filters, export) up to five, rest in overflow. Expand-all not shown by default because it negates performance benefit. — [Carbon Data table usage](https://carbondesignsystem.com/components/data-table/usage/)
- AG Grid keyboard header operations: Shift+Left/Right moves a column, Alt+Left/Right resizes, Enter sort / Shift+Enter multi-sort, Ctrl+Enter filter, Alt+Down column menu; Enter toggles group rows. — [AG Grid keyboard navigation](https://www.ag-grid.com/react-data-grid/keyboard-navigation/)
- MUI X: Enter sort, Shift+Enter multi-sort, Ctrl+Enter column menu; Space toggles group children. — [MUI X accessibility](https://mui.com/x/react-data-grid/accessibility/)
- React Aria: resizable columns with `minWidth`/`maxWidth` and `fr` units, `onResizeEnd` emits a width Map (persistable); sort indicators are `aria-hidden` (state conveyed by `aria-sort`). — [React Aria Table](https://react-aria.adobe.com/Table)
- APG: `aria-sort` on the sorted header only. — [W3C APG Grid](https://www.w3.org/WAI/ARIA/apg/patterns/grid/)

### Inferences
- UIx already has SavedViewMenu / ViewMenu column rows (per project memory); the evidence supports keeping a non-drag reorder path (move up/down buttons or keyboard) alongside drag.
- Persist resize widths on `resizeEnd`, not on every pointer move (React Aria API shape), to keep saved-view writes cheap.
- Multi-sort should be an explicit modifier (Shift+Enter / Shift+click), consistent across AG Grid and MUI.

### Gaps
- Grouping and aggregation-row UX specs (where totals sit, sticky footers) were not fetched; no source here. Pinned-column shadow/elevation specs not found.

---

## 4. Selection and bulk actions

### Takeaway
Tri-state header checkbox selects the page; a separate, explicit "Select all N matching" step extends to the whole result set; the count always states scope; the batch bar replaces the toolbar and disables per-row actions while active.

### Cited Findings
- Carbon: batch action bar appears at the top once an item is selected, height = row height (xl tables use lg); single-row action icons and overflow menus are disabled while batch mode is active; exit via Cancel at far right or by deselecting all. Header checkbox has checked/unchecked/indeterminate; radio variant for single select; expand icon precedes the checkbox. — [Carbon Data table usage](https://carbondesignsystem.com/components/data-table/usage/)
- PatternFly bulk selector: split button (checkbox + dropdown) with Select none (disabled when empty) / Select page / Select all (across pages; may be omitted if unsupported) / optional predefined filters; checkbox click when empty selects all in view, when partial/full deselects all; selected-count label covers all pages; selection persists after a global action completes until the user changes it; bulk selector is first item in the toolbar; use the table's integrated header checkbox only when there is no toolbar. — [PatternFly Bulk selection](https://www.patternfly.org/patterns/bulk-selection/)
- NN/g: checkbox per record, batch action buttons above/below the table; add Select All when the same action is often applied to the full dataset; keep inline single-record actions to one or two. — [NN/g Data Tables](https://www.nngroup.com/articles/data-tables/)
- Scope banner pattern ("All 50 on this page are selected. Select all 4,000 matching records."), and the action must state whether it runs on the page or the full matching set with the number. — [SaaSUI bulk actions patterns](https://www.saasui.design/blog/saas-bulk-actions-ux-patterns) (secondary source); EUI recommends showing page count and total count when nothing is selected — [Elastic EUI table selection](https://eui.elastic.co/docs/patterns/tables/table-selection/) (search-summary only, page not fetched)
- APG: Shift+Space selects row, Ctrl+A all, Shift+arrows extend. MUI: Shift+Space, Shift+Up/Down, Shift+click, Ctrl+A, Ctrl+click. Linear: X select, Shift+Up/Down extend, Ctrl+A select all filtered, bulk actions at bottom. — [APG](https://www.w3.org/WAI/ARIA/apg/patterns/grid/); [MUI X](https://mui.com/x/react-data-grid/accessibility/); [Linear](https://linear.app/docs/select-issues)
- React Aria: Escape clears selection by default. — [React Aria Table](https://react-aria.adobe.com/Table)

### Inferences
- For TENSOR, "select all matching" must be a server-side predicate (filter snapshot), not an ID list, and the confirmation should restate the count and filter; if the filter changes, selection should either clear or warn. (No source fetched on filter-change semantics: PatternFly explicitly does not address it.)
- Undo: prefer a toast with Undo for reversible bulk updates (status, assignee) and a confirm dialog with typed count only for destructive ones. No primary source fetched for bulk undo; treat as inference.
- Position: Carbon (top, replaces toolbar) vs Linear (bottom floating bar). For tall virtualised queues a bottom-floating bar avoids scrolling back up; either is defensible, pick one kit-wide.

### Gaps
- No primary Gmail documentation; Gmail's banner behaviour is only described second-hand.
- No measured data on undo vs confirm error rates for bulk ops.

---

## 5. Performance: virtualisation, 10k–100k rows, sticky headers, INP, containment

### Takeaway
Row + column virtualisation with an overscan buffer is standard (AG Grid: 10 rows each side, columns within 200 px); `content-visibility: auto` is now Baseline (Sept 2025) and is a cheaper alternative for a few hundred to low-thousands of fixed-height rows where full virtualisation would break find-in-page. No credible public INP-per-interaction numbers for React grids at 100k rows were found; TENSOR must measure its own.

### Cited Findings
- AG Grid renders only viewport rows/columns; default `rowBuffer` = 10 rows above and below; buffer is pixel-based (rowBuffer x default row height, 42 px Quartz); max 500 rendered rows by default as a crash safeguard; columns rendered within 200 px either side of viewport; suppressing both virtualisations in a 9x100 example renders all 900 cells and runs the value formatter 900 times. — [AG Grid DOM virtualisation](https://www.ag-grid.com/react-data-grid/dom-virtualisation/)
- TanStack Virtual is headless (no markup/styles); `useVirtualizer({count, getScrollElement, estimateSize})`; inner element sized by `getTotalSize()`, absolutely positioned items; vertical/horizontal axes combine for grid virtualisation. — [TanStack Virtual intro](https://tanstack.com/virtual/latest/docs/introduction)
- `content-visibility: auto` applies layout/style/paint containment and skips off-screen rendering; needs `contain-intrinsic-size` (use `auto` keyword to remember last size) or elements collapse and scrollbars jump; example cut rendering 232 ms to 30 ms (7x); off-screen content stays in DOM and accessibility tree, so find-in-page works; Baseline newly available 2025-09-15. Article 2020-08-05 (updated). — [web.dev content-visibility](https://web.dev/articles/content-visibility)
- MUI X keeps row-header cells mounted under column virtualisation for screen-reader row identity. — [MUI X accessibility](https://mui.com/x/react-data-grid/accessibility/)
- APG: virtualised grids must expose `aria-rowcount`/`aria-rowindex` (and col equivalents). — [W3C APG Grid](https://www.w3.org/WAI/ARIA/apg/patterns/grid/)
- Benchmarks: vendor claims dominate. Telerik claims KendoReact renders 1M rows under 1 s while MUI and AG Grid need >5 s; Infragistics reports noticeable but tolerable lag at 100k and multi-second main-thread freezes at 1M. These are vendor marketing, not independent. A community benchmark of 6 React grids on 50k rows measured bundle size, ready time, scroll, memory, long tasks and FPS (page returned 403; numbers not retrieved). — [Telerik blog](https://www.telerik.com/blogs/great-react-grid-off-kendoreact-vs-mui-vs-ag-grid); [Infragistics](https://www.infragistics.com/blogs/best-react-data-grid-for-large-datasets-performance-guide); [itnext 50k benchmark](https://itnext.io/i-benchmarked-6-react-data-grids-on-50-000-rows-the-real-winner-was-the-tradeoff-d447fbf5ecde) (unread)
- Carbon: expand-all is not offered because it negates performance benefits. — [Carbon Data table usage](https://carbondesignsystem.com/components/data-table/usage/)

### Inferences
- For GPU-less VDI: virtualised scroll repaints are CPU-rasterised, so keep row DOM shallow, avoid per-row box-shadows/blur/backdrop-filter, avoid animating anything during scroll, and use fixed row heights (makes `estimateSize` exact and avoids measurement thrash). Project memory already records "never CSS-animate filter".
- Threshold heuristic (inference): <~200 rows plain table; ~200–2,000 rows `content-visibility: auto` on row groups (`tbody` chunks) to keep find-in-page and native semantics; >2,000 or unbounded queues row virtualisation with `aria-rowcount`/`aria-rowindex`. Column virtualisation only when >~30 columns.
- Sticky header with virtualisation: keep the header outside the virtualised body (or `position: sticky` inside the same scroller) so the header is never unmounted; pair with `scroll-padding-top` = header height (see section 9).
- Interaction cost hotspots to measure for INP: select-all on 10k rows (avoid re-rendering every row: store selection as a Set + "all-except" mode), sort/filter (server-side for 100k), column resize (rAF-throttled, CSS variable widths rather than per-cell style updates).

### Gaps
- No independent, current (2025–2026) INP measurements per interaction (sort, filter, select-all, resize) for React grids at 10k–100k rows were found. Recommend an in-repo Playwright + web-vitals harness.
- `content-visibility` on `<tbody>`/`<tr>` (table layout) specifically: no source fetched confirming behaviour/perf inside table layout; must be tested per engine.
- TanStack Virtual overscan default, `measureElement`, sticky item support not on the fetched page. Unverified (training knowledge): default overscan 1; supports `rangeExtractor` for sticky items.

---

## 6. Inline editing, validation, conflicts, optimistic save

### Takeaway
Use the APG edit-mode contract (Enter/F2 enter, Escape cancels, typing starts edit) for in-cell edits, keep inline editing to narrow tables with a visually distinct edit state, and push deep edits to a non-modal side panel. Conflict and optimistic-save specs had no primary design-system source found.

### Cited Findings
- APG editing keys and modes (Enter/F2/alphanumeric/Escape, `aria-readonly`). — [W3C APG Grid](https://www.w3.org/WAI/ARIA/apg/patterns/grid/)
- AG Grid: F2/Enter start edit; Ctrl+Enter fills the value across a selected range. — [AG Grid keyboard navigation](https://www.ag-grid.com/react-data-grid/keyboard-navigation/)
- NN/g: inline editing works only when the table is narrow; make edit state visually distinct to prevent accidental edits; avoid modals for deep editing (they cover adjacent rows users reference); prefer a non-modal side panel; use expandable rows with caution (users leave them open). — [NN/g Data Tables](https://www.nngroup.com/articles/data-tables/)
- React Aria: `keyboardNavigationBehavior="tab"` for cells containing text fields. — [React Aria Table](https://react-aria.adobe.com/Table)

### Inferences
- Optimistic cell save pattern (inference): commit on Enter/blur, show per-cell pending indicator (not a row spinner), on server rejection restore old value + inline error + keep focus in cell; on version conflict (ETag/updatedAt mismatch) show the server value and offer "keep mine / take theirs". UIx SaveStatus could be reused at row level.
- TENSOR's existing DataWorkspace peek panel aligns with NN/g's side-panel recommendation for multi-field edits.

### Gaps
- No primary source found for cell-level conflict resolution UI or validation-error placement specs in Carbon/Fiori/Atlassian (not fetched).

---

## 7. Empty, loading, error, partial-data states; pagination vs infinite scroll vs load more

### Takeaway
Skeletons for first load, keep previous rows visible (dimmed / with a progress hairline) during refetch, distinct empty vs no-results states, and pagination at the bottom with row-height-matched bar; for operator queues infinite scroll is riskier than pagination or explicit "load more" because of position loss and footer reachability.

### Cited Findings
- Carbon: skeleton states instead of spinners when extra load time is expected; pagination always at the bottom, simple vs advanced (items per page, jump to page), bar height matches row height. — [Carbon Data table usage](https://carbondesignsystem.com/components/data-table/usage/)
- React Aria: `renderEmptyState` used for both loading spinner and "no results"; `TableLoadMoreItem` + `onLoadMore` + `isLoading` for infinite loading at end of body. — [React Aria Table](https://react-aria.adobe.com/Table)
- EUI: when nothing is selected, show count of items on page and total across pages. — [Elastic EUI table selection](https://eui.elastic.co/docs/patterns/tables/table-selection/) (search summary)

### Inferences
- For ITSM queues where operators triage top-down and return to a position, prefer pagination or cursor "load more" with a stable sort key and a visible total; infinite scroll only for logs/feeds. Persist page/scroll position across peek-and-return (UIx peek return cue PR #295 is relevant).
- "Keep previous rows" on refetch prevents layout jump and lost focus; announce completion via a polite live region ("42 tickets, updated").
- Partial data (some columns failed): show cell-level placeholder with tooltip rather than failing the whole table.

### Gaps
- NN/g and Baymard pagination vs infinite-scroll articles were not fetched this session; no cited evidence on operator queues specifically.

---

## 8. Responsive / phone fallback for wide tables

### Takeaway
Wrap wide tables in a focusable, labelled scroll region rather than converting to ARIA grid; for phone, either horizontal scroll with frozen identifier column or a stacked card list driven by column priority.

### Cited Findings
- Roselli "Under-Engineered Responsive Tables" (2020): scrollable wrapper as a focusable region (`role="region"`, `aria-labelledby`, `tabindex="0"`), avoid ARIA grid roles. — [Roselli, Under-Engineered Responsive Tables](https://adrianroselli.com/2020/11/under-engineered-responsive-tables.html) (via search summary)
- Stanford: visible focus style on the scrollable table so keyboard users see where they are. — [Stanford UIT sticky headers](https://uit.stanford.edu/accessibility/concepts/tables/sticky-headers) (search summary)
- Chrome modern web guidance covers sticky headers and a stacked mobile layout for responsive tables. — [Chrome: Responsive tables](https://developer.chrome.com/docs/modern-web-guidance/guides/ui-atoms/responsive-table) (search summary, not fetched)
- NN/g: card layouts make comparison effortful (users must re-orient per card). — cited second-hand via [NN/g topic: tables](https://www.nngroup.com/topic/tables/) search summary; treat as secondary.

### Inferences
- TENSOR is desktop-first; a column `priority` prop (1 = always, 3 = hide first) driving container-query hiding plus a "N columns hidden" indicator (NN/g) is the cheap fallback; card view only for phone triage.

### Gaps
- Column-priority patterns from Fiori responsive table ("pop-in") not verified (403). Unverified (training knowledge): Fiori responsive table moves low-priority columns into a pop-in area under the row at narrow widths.

---

## 9. Accessibility pitfalls specific to grids

### Takeaway
The main grid-specific failures are: over-using ARIA grid, sticky headers/footers/batch bars hiding the focused row (WCAG 2.2 2.4.11), virtualised rows lacking `aria-rowindex`, multiple focusables per cell, and row-click handlers without a real link/button.

### Cited Findings
- WCAG 2.2 SC 2.4.11 (AA): focused component must not be "entirely hidden due to author-created content"; partial obscuring passes AA (AAA 2.4.12 requires none). Sticky headers/footers and non-modal dialogs named as typical causes; Technique C43 = CSS `scroll-padding` to un-obscure; Failure F110 = sticky header/footer completely hiding focused elements. — [W3C Understanding 2.4.11](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html)
- Roselli: grid role for clickable rows creates more problems than it solves; `<tr>` click handlers are inaccessible; JAWS+Chrome blank row-header announcement bug. — [Roselli 2023/2026](https://adrianroselli.com/2023/11/dont-turn-a-table-into-an-aria-grid-just-for-a-clickable-row.html)
- Roselli fixed-headers (2020): sticky on `<th>` with z-index layering so column headers sit above row headers. — [Roselli, Fixed Table Headers](https://adrianroselli.com/2020/01/fixed-table-headers.html) (search summary)
- APG: `aria-rowcount`/`aria-rowindex` for virtualised content; `aria-readonly` only when editing exists. MUI: one tab stop per cell; keep row headers mounted under column virtualisation. React Aria: sort icons `aria-hidden`. — [APG](https://www.w3.org/WAI/ARIA/apg/patterns/grid/); [MUI X](https://mui.com/x/react-data-grid/accessibility/); [React Aria](https://react-aria.adobe.com/Table)

### Inferences
- In a scrolling table with a sticky header (40 px) and a bottom batch bar, set `scroll-padding-top`/`scroll-padding-bottom` on the scroll container to those heights; for virtualised scrollers that call `scrollToIndex`, apply the same offsets programmatically because `scroll-padding` only affects native focus scroll.
- Frozen first column also needs `scroll-padding-inline-start` for horizontal focus moves.
- Virtualisation breaks browser find-in-page and screen-reader "table navigation" beyond the rendered window; offer an in-table search/filter and expose total count.

### Gaps
- No empirical screen-reader verbosity comparison (NVDA/JAWS/VoiceOver) of grid vs table in 2026 found. Roselli's 2025 "Talkin' Tables" slides were not read.
