---
"@tensor_1/tokens": minor
"@tensor_1/react": minor
---

Table system v2 + width/focus app-shell.

**Tokens & CSS (`@tensor_1/tokens`)**

- **app-shell**: three-tier nav — `data-nav="full | rail | hidden"` — plus an immersive **focus mode** (`data-focus` hides the sidebar *and* the topbar so a wide grid uses the whole frame) and an opt-in **full-bleed** main (`.uix-shell__main--bleed`). `data-collapsed` is kept as a back-compat alias for the rail. New `--uix-sidebar-w-rail` token so the rail width is contractual (was hard-coded 56px).
- **table**: the full interaction layer, promoted from the styleguide into the shipped contract and fully tokenized — selection column + contextual **bulk-action bar** (`.uix-bulkbar`), row hover **actions/kebab** (`.uix-rowact`), **expandable** inline rows (`.uix-table__expand` + detail row), **inline cell edit** (`.uix-cell-edit`), column **resize** grip (`.uix-table__resize`), multi-sort ordinals, **search** match highlight (`.uix-mark`), the **cell vocabulary** (`.uix-cell-strong` / `-sub` / `-mono`), the **responsive ladder** (priority-column drop + card transform) and the **compare** view.

**React (`@tensor_1/react`)**

- **AppShell**: `nav` / `focus` / `onExitFocus` / `mainBleed` props (with Esc-to-exit for focus mode). `collapsed` still works.
- **Table**: new subcomponents `BulkBar`, `RowActions`, `RowAction`, `ExpandToggle`, `CellStrong`, `CellSub`, `Mark`, `Highlighted`; `Table` gains `fixed`; `Th` gains `sortOrder`.
- **Table engine**: a new framework-agnostic, dependency-free module exported from the package root — `multiSort`, `toggleSort`, `applyFilters`, `searchRows`, `highlightSegments`, `serializeView` / `parseView`, `virtualWindow`, `reorder`, and selection helpers (`toggleId`, `selectAllState`, `togglePage`, `mergePinned`). Unit-tested.
- **useTable**: a hook composing the engine into React sort / filter / search / selection / pinning / saved-view state.
