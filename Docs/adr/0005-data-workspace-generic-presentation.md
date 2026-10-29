# ADR-0005: DataWorkspace, the generic presentation half of the products' data tables

**Status:** Accepted

**Date:** 2026-10-23

**Decision owners:** UIx maintainers
**Scope:** `@tensor_1/react` `DataWorkspace`, `data-workspace.css`
**Supersedes:** the non-goal "Do not move TENSOR's complete `DataTable`" of the 2026-09-08 TENSOR/UIx component-convergence plan, for the presentation half only (workspace ADR-0038, decision 1.3, 2026-09-30)

## Context

TENSOR (`packages/shared/ui/src/data-table.tsx` with its toolbar, bulk bar, view and density controls and row virtualizer) and MOTUS (`components/admin/UixDataWorkspace.tsx`, 1,306 lines, and about 25 `workspace-*` rule families in `motus-shell.css`) each built the same thing on top of the kit: a list page with a toolbar of saved views, filter chips, search and view settings; a table with a record-id cell, selection and row actions; a bulk bar; and a footer with a range, rows per page and a pager. Both looked and behaved slightly differently (toolbar order, where Save sits, how a refetch shows, how selection survives a page change), and every fix landed twice.

The convergence plan of 2026-09-08 kept the whole `DataTable` out of UIx, because it is tied to each product's data layer. Workspace ADR-0038 (decision 1.3) changed the rule: a component that two products build is a UIx component.

## Decision

UIx ships `DataWorkspace` (HAR-1388): the **presentation half** of the data table, composed from the kit's existing pieces and driven entirely by props.

- **In UIx (presentation):** the toolbar order (saved view; Save changes / Save as when the view changed; filter chips and "+ Filter"; search with Ctrl/⌘ + /; View; maximize; the product's actions), the record-id cell (id → peek, ↗ → full record), selection kept by id with Shift-click ranges and select-all, a row-actions column frozen at the right edge, the bulk bar, the "x–y of N" footer with rows per page and offset or cursor paging, and the first-load, empty, filtered-empty, error and refetch states. It renders `SavedViewMenu`, `ViewMenu`, `Chip`, `FilterEditor`, `SearchBar`, `Table` / `TableWrap`, `BulkBar`, `Menu`, `Pagination` and the `States` family; it adds no second copy of any of them.
- **In each product (data):** the surface registry (which columns, filters and views a surface has), URL state, data fetching and caching, permissions and the PII contract, sorting and filtering themselves, and the row model (TENSOR keeps `@tanstack/react-table`; an engine swap is a separate, later decision, if at all).
- **Motion and feedback** follow the kit: a refetch keeps the rows under `TableWrap refreshing` (HAR-2582; busy at once, dimmed under a bar after 300 ms), skeletons only on a first load, no row moves on its own. Marking which row changed is the job of `ChangeHighlight` (PR #164): `getRowProps` passes what it needs onto a row, and DataWorkspace does not invent a second marker.
- **Words** come from `labels` or `UixLabelsProvider` `dataWorkspace`.

## Consequences

- Both products can reduce their adapters to the registry and URL-state half: TENSOR's `data-table.tsx` keeps column definitions and the TanStack model and passes rows, columns and handlers; MOTUS's `UixDataWorkspace.tsx` and its `workspace-*` rules shrink to its surface registry.
- The toolbar order is now one decision in one place. A product that needs a different order composes the parts itself; it does not fork the component.
- Virtualization stays out of the first release: both products page their lists. When a product needs an unpaged long list, `useVirtualRows` can be wired in behind a prop.
- Revisit when a third product needs a toolbar part DataWorkspace does not have, or when the data half of both products converges enough to share a row model.

## Addendum (2026-10-29): the adoption gaps (HAR-2622..2626)

MOTUS (HAR-1441) and TENSOR (HAR-1491) compared their adapters with 2.49 line by line and listed what DataWorkspace could not do. The answer stays inside the decision above: the product still computes everything (sorting, groups and their aggregates, the URL), and the workspace only presents it. The props are additive; a workspace without them renders the 2.49 markup.

- **One sort prop.** `sort` takes one key or an ordered list, and `onSortChange` returns the shape it was given (typed by a second type parameter that TypeScript infers from `sort`). A list turns on Shift + click / Shift + Enter / Shift + Space and the priority badge. A second prop (`sorts`) was rejected: two props for one state invite them to disagree.
- **State bodies replace, actions add.** `empty`, `filteredEmpty` and `error` replace the default bodies; `emptyAction` and `filteredEmptyAction` add to them (the filtered-empty action sits beside Clear filters, which stays). `stateOverride` covers a state the kit has no word for (a page past the end) and wins over `status`. The refetch rule (a BusyRegion, the last settled body) applies to all of them.
- **Clear-all is one change.** `filters.onClearAll({ search })` replaces the per-field loop, because a product whose state is the URL turns each `onChange` into a navigation from the same stale state.
- **The ladder reads the workspace, not the window.** `mobile` picks the Table's existing `--priority` / `--priority-mid` / `--cards` classes from the workspace's own width (900 / 600 / 768 px, MOTUS's steps), measured before the first paint and on resize; the ladder attributes (`data-col`, `data-label`, `data-priority`) are written only when `mobile` is set. In cards the checkbox and the row's actions stay on the card (the Table's own cards hide them), so a phone can still select and act. Without layout (server, jsdom) there is no step; a server-rendered page steps on hydration.
- **Groups are a tbody each.** A header row (`th scope="rowgroup"`) carries the toggle, the count and the aggregates under their columns; the zebra restarts under each header by swapping the two row colours on the group, never by a selector that could outrank a row state. Groups are not windowed.
- **Windowing is opt-in and off with paging, groups and cards.** It runs over `useVirtualRows` only when `virtualize` is set, so a workspace without it adds no listener. Spacer rows keep the zebra's parity.
- **The keyboard row model belongs to the kit.** `onRowActivate` turns on one tab stop per table, kept by row id; `activeRowId` lets a product move it from its own chords. Focus that would fall to the page when its row goes (a new page) moves to the first row.
- **Rows are memoised.** A selection change re-renders the rows it changed, provided the product keeps `columns`, `idColumn`, `rowActions` and `getRowProps` stable.
