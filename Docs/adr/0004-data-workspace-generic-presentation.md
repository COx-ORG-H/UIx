# ADR-0004: DataWorkspace, the generic presentation half of the products' data tables

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
