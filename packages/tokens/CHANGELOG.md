# @tensor_1/tokens

## 2.6.0

### Minor Changes

- d289d0f: Table system v2 + width/focus app-shell.

  **Tokens & CSS (`@tensor_1/tokens`)**

  - **app-shell**: three-tier nav — `data-nav="full | rail | hidden"` — plus an immersive **focus mode** (`data-focus` hides the sidebar _and_ the topbar so a wide grid uses the whole frame) and an opt-in **full-bleed** main (`.uix-shell__main--bleed`). `data-collapsed` is kept as a back-compat alias for the rail. New `--uix-sidebar-w-rail` token so the rail width is contractual (was hard-coded 56px).
  - **table**: the full interaction layer, promoted from the styleguide into the shipped contract and fully tokenized — selection column + contextual **bulk-action bar** (`.uix-bulkbar`), row hover **actions/kebab** (`.uix-rowact`), **expandable** inline rows (`.uix-table__expand` + detail row), **inline cell edit** (`.uix-cell-edit`), column **resize** grip (`.uix-table__resize`), multi-sort ordinals, **search** match highlight (`.uix-mark`), the **cell vocabulary** (`.uix-cell-strong` / `-sub` / `-mono`), the **responsive ladder** (priority-column drop + card transform) and the **compare** view.

  **React (`@tensor_1/react`)**

  - **AppShell**: `nav` / `focus` / `onExitFocus` / `mainBleed` props (with Esc-to-exit for focus mode). `collapsed` still works.
  - **Table**: new subcomponents `BulkBar`, `RowActions`, `RowAction`, `ExpandToggle`, `CellStrong`, `CellSub`, `Mark`, `Highlighted`; `Table` gains `fixed`; `Th` gains `sortOrder`.
  - **Table engine**: a new framework-agnostic, dependency-free module exported from the package root — `multiSort`, `toggleSort`, `applyFilters`, `searchRows`, `highlightSegments`, `serializeView` / `parseView`, `virtualWindow`, `reorder`, and selection helpers (`toggleId`, `selectAllState`, `togglePage`, `mergePinned`). Unit-tested.
  - **useTable**: a hook composing the engine into React sort / filter / search / selection / pinning / saved-view state.

## 2.5.0

### Minor Changes

- Add a reusable **table column-sizing + cell-behaviour** system so consumers (Tensor, POSx, SHOPx) size and truncate table columns by applying a class keyed to a column — never by hand-coding per-app pixel widths or `:nth-child` hacks.

  New `--uix-col-*` width scale in `tokens/base/size.json`: `--uix-col-w-xs` 92 / `-sm` 112 / `-md` 132 / `-lg` 176 / `-xl` 240, plus `--uix-col-title-min` 340 (the floor for the primary/title column).

  New classes in `styles/components/table.css`: `.uix-table--fixed` (opt into fixed layout so widths are authoritative and truncation is reliable); `.uix-col--w-xs … --w-xl` (width tiers — apply to `<col>`, `<th>`, or `<td>`); `.uix-col--flex` / `.uix-col--primary` (fills remaining space with a `--uix-col-title-min` floor); `.uix-col--truncate` / `.uix-col--wrap` (one-line-with-ellipsis vs multi-line); and `.uix-col--num` (tabular figures + right-align).

  The `.uix-id-cell__btn` / `.uix-id-cell__arrow` row click-through pattern moved from `peek.css` into `table.css` so table cells are one story. This generalises and removes the `[data-uix-table-v2] .uix-table td:nth-child(2)` 280px title cap.

## 2.3.0

### Minor Changes

- Add `--uix-amber` / `--uix-amber-text` — the SEV-3 (medium) severity tone that completes the ramp (danger = SEV-1, warning = SEV-2, amber = SEV-3). Light `#C98A1E` / `#795006`, dark `#E6B25C`. A muted ochre kept distinct from the brighter `--uix-warning` so the three severity tiers read apart.

## 2.2.0

### Minor Changes

- Add `DescriptionList` / `DescriptionItem` — a controlled key-value body primitive (the `uix-dl` grid) for detail surfaces like the side-peek drawer. UIx owns the layout; consumers supply the formatted values.

  Add typography utility classes (`.uix-text-display` / `-h1` / `-h2` / `-h3` / `-body` / `-body-hushed` / `-meta` / `-eyebrow` / `-data-hero`) and elevation utilities (`.uix-elevated` / `-popover` / `-pill`). These let consumers apply the `--uix-text-*` scale and `--uix-shadow-*` elevation by class instead of re-deriving them inline — the migration target for house products replacing bespoke `type-*` / `surface-*` classes.

  Scope the `uix.base` margin reset to typographic/form elements instead of a bare `* { margin: 0 }`. The universal form sits above a Tailwind consumer's `utilities` layer and silently zeroed every margin utility (`mb-2`, `mt-4`, `space-y-*`) on layout elements. Dialogs (`uix-dialog`/`uix-drawer`/`uix-peek`/`uix-lightbox`) already set their own margins, so centering is unaffected.
