---
"@tensor_1/react": minor
"@tensor_1/tokens": minor
---

DataWorkspace follow-ups from the MOTUS and TENSOR adoptions of 2.50 (HAR-2631, HAR-2632, HAR-2634, HAR-2635). This is a minor release, not the planned 2.50.1 patch: it adds a `--uix-*` token (`--uix-row-h-standard`), and the contract's semver table makes an additive token minor.

**What changes with no new prop used.** These defaults change for every consumer:

- **Word-verb row actions unfreeze at any width.** A frozen actions cell wider than a quarter of the table's wrap scrolls with its row, whether or not `mobile` is set. There is no opt-out: a frozen actions cell is for compact controls. A peek and a kebab (a 76 px cell) stay frozen down to a 304 px wrap.
- **Muted text on a selected row is stronger.** It moves 30 % toward the scope's own text colour, so it clears AA on the selection tint.
- **The DataWorkspace pager uses the `UixLabelsProvider` `pagination` words** instead of English.
- **In `mobile="cards"`, a table density no longer sets the card cells' height.**
- **A long id in a fixed-width id column ends in an ellipsis**, not a mid-word clip. Plain id text is now wrapped in `.uix-data-workspace__id-label`.
- **`.uix-table-wrap` is `position: relative`.**
- **A workspace with nothing for its toolbar renders no toolbar band.**
- **`Table density="standard"` writes `data-density="standard"`**, and the table then keeps 56 px rows under a page-wide `--uix-row-h` change.

**Consumer-visible type change:** `rowActions` is now `(row, context) => ReactNode`, and the kit always passes `context`. An implementation that takes only `row` still type-checks. A wrapper that calls `props.rowActions(row)` itself no longer compiles: pass a context (`{ ladder: null, compact: false }` for a full table).

- **The id column as a sort key (HAR-2631):**
  - `idColumn.id` names the key it answers to in `sort` / `onSortChange` (default `'id'`).
  - `idColumn.sortable` makes its header sortable exactly like a data column's: the same cycle, multi-sort with Shift + click / Shift + Enter / Shift + Space, the ordinal (`sortOrder` + `sortOrderLabel`) and `aria-sort`.
  - It works with `multiSort`, the frozen and fixed layouts and `mobile`. Without `sortable` the header is 2.50.0's.
- **"Is none of" enum filters (HAR-2631):**
  - The enum `FilterValue` takes `operator?: 'is-any-of' | 'is-none-of'`; absent means is any of.
  - `FilterField.enumOperators` offers the choice. With both, `FilterEditor` shows a condition control (the kit `Select`) above the options. The condition stays as values change and when a preset is chosen.
  - With a single operator there is no control, and the editor writes that operator, so `['is-none-of']` alone excludes. The summary applies it too, also to a value saved without one.
  - Without `enumOperators`, the editor is 2.50.0's.
  - `summarizeFilter` says "Status: not Open, Closed" (`FilterSummaryLabels.noneOf`). A new `UixLabelsProvider` group, `filterSummary`, words the DataWorkspace chips.
  - A preset never matches an excluding value.
  - `enumColumnFilter(field, value)` maps the value to the table engine's `isAnyOf` / `isNoneOf`.
- **`Table density="standard"` holds (HAR-2631):**
  - A new token, `--uix-row-h-standard` (56px), and `.uix-table[data-density="standard"] td` pins it. A page-wide `--uix-row-h` re-point (the kit's `:root[data-density]`, a product's spacing preference) therefore no longer makes an explicitly standard table comfortable.
  - A table that names no density still follows `--uix-row-h`.
  - The density heights do not reach cards (HAR-2631 item 3) or group header rows.
  - Printed pages keep compact rows.
- **The workspace pager in the provider's words (HAR-2631):**
  - The DataWorkspace footer hands `Pagination` the provider's `pagination` group, and a new `pagination.labels` wins over it.
  - `Pagination` itself stays server-safe and reads no context: a product that renders it directly passes `labels` from its own `useUixLabels().pagination`.
- **A row's name without an id column (HAR-2632):**
  - `rowLabel(row)` names the row checkbox when there is no `idColumn.text`. Precedence: `idColumn.text`, then `rowLabel`, then the row id.
  - Keep the function stable, because rows are memoised.
- **No empty toolbar (HAR-2632):**
  - The `role="toolbar"` band renders only when one of its parts is set: search, filters, saved views, Save changes / Save as, View, maximize or `toolbarEnd`.
- **`.uix-table-wrap` is positioned (HAR-2632):**
  - Absolute content in a cell (a visually hidden label) stays inside the scrolling wrap instead of widening the page.
- **Fix (HAR-2632):** DataWorkspace measures its actions column only where `Range` has layout methods. In jsdom it keeps the fallback width instead of throwing.
- **Row actions at the narrow rung (HAR-2634):**
  - `rowActions(row, { ladder, compact })`: `compact` is true only at the narrowest table step, `mobile="priority"` under 600 px of workspace. With `mobile="cards"` the workspace turns into cards below 768 px instead, so `compact` is never true there; cards keep the full set, on their own line.
  - At the narrow rung, render only your always-on control (a peek or a kebab); the peek or the detail view carries the verbs.
  - The actions are measured with one observer for the table's life. It watches the wrap, the table and every actions cell and its contents, so verbs that arrive later are measured too. Measurement happens at most once per frame, never while scrolling, and not on a plain re-render.
- **Muted text on a selected row (HAR-2635):**
  - In the light theme, `--uix-text-muted` was 4.36:1 on `--uix-row-selected-bg`.
  - The table now keeps its scope's muted colour (`--uix-table-muted`), and a selected row (`[data-selected]` or `aria-selected="true"`) mixes it 30 % toward the scope's text. A theme, more contrast or print, which each set their own muted colour, therefore get a stronger muted colour on their selection, never a weaker one. The selection tint is kept.
