# @tensor_1/react

## 2.6.0

### Minor Changes

- Add worklog/activity-feed primitives so heterogeneous discussion + activity streams render on one refined timeline rail:

  - `Segmented` + `SegmentedOption` — compact single-select toggle over `.uix-segmented` (density / audience / view-mode switches).
  - `Composer` + `ComposerBar` — single `:focus-within`-ring composer surface over `.uix-composer`, replacing hand-rolled box-in-a-box editors.
  - `TimelineItem` gains an optional `node` prop so a row's rail marker can be an avatar or tinted icon puck instead of the default dot — enabling a merged comments + audit feed on a single connected rail.

  All are thin, presentational `cx()` wrappers over already-shipped `.uix-*` component CSS; no token changes.

- d289d0f: Table system v2 + width/focus app-shell.

  **Tokens & CSS (`@tensor_1/tokens`)**

  - **app-shell**: three-tier nav — `data-nav="full | rail | hidden"` — plus an immersive **focus mode** (`data-focus` hides the sidebar _and_ the topbar so a wide grid uses the whole frame) and an opt-in **full-bleed** main (`.uix-shell__main--bleed`). `data-collapsed` is kept as a back-compat alias for the rail. New `--uix-sidebar-w-rail` token so the rail width is contractual (was hard-coded 56px).
  - **table**: the full interaction layer, promoted from the styleguide into the shipped contract and fully tokenized — selection column + contextual **bulk-action bar** (`.uix-bulkbar`), row hover **actions/kebab** (`.uix-rowact`), **expandable** inline rows (`.uix-table__expand` + detail row), **inline cell edit** (`.uix-cell-edit`), column **resize** grip (`.uix-table__resize`), multi-sort ordinals, **search** match highlight (`.uix-mark`), the **cell vocabulary** (`.uix-cell-strong` / `-sub` / `-mono`), the **responsive ladder** (priority-column drop + card transform) and the **compare** view.

  **React (`@tensor_1/react`)**

  - **AppShell**: `nav` / `focus` / `onExitFocus` / `mainBleed` props (with Esc-to-exit for focus mode). `collapsed` still works.
  - **Table**: new subcomponents `BulkBar`, `RowActions`, `RowAction`, `ExpandToggle`, `CellStrong`, `CellSub`, `Mark`, `Highlighted`; `Table` gains `fixed`; `Th` gains `sortOrder`.
  - **Table engine**: a new framework-agnostic, dependency-free module exported from the package root — `multiSort`, `toggleSort`, `applyFilters`, `searchRows`, `highlightSegments`, `serializeView` / `parseView`, `virtualWindow`, `reorder`, and selection helpers (`toggleId`, `selectAllState`, `togglePage`, `mergePinned`). Unit-tested.
  - **useTable**: a hook composing the engine into React sort / filter / search / selection / pinning / saved-view state.

## 2.4.0

### Minor Changes

- Add `StarButton` and `NavFavourites` — controlled sidebar favourites primitives.

  `StarButton` is the pin/unpin control over the existing `.uix-navitem__star` CSS contract: a STATIC accessible name (`Add {label} to favourites`) plus `aria-pressed` for the pinned state, warning-toned filled glyph when pinned, reveal-on-hover inside a `.uix-navitem`.

  `NavFavourites` is the Favourites disclosure: a header + region (`aria-expanded` / `aria-controls`, focus pulled to the header before collapse) over a controlled, already-resolved item list, each row carrying a consumer-rendered link plus an APG menu-button overflow menu (Move up / Move down / Remove) and Alt+ArrowUp/Down keyboard reorder. UIx owns the look + the controlled contract; consumers keep the favourites list and its persistence.

## 2.3.0

### Minor Changes

- Add `--uix-amber` / `--uix-amber-text` — the SEV-3 (medium) severity tone that completes the ramp (danger = SEV-1, warning = SEV-2, amber = SEV-3). Light `#C98A1E` / `#795006`, dark `#E6B25C`. A muted ochre kept distinct from the brighter `--uix-warning` so the three severity tiers read apart.

## 2.2.0

### Minor Changes

- Add `DescriptionList` / `DescriptionItem` — a controlled key-value body primitive (the `uix-dl` grid) for detail surfaces like the side-peek drawer. UIx owns the layout; consumers supply the formatted values.

  Add typography utility classes (`.uix-text-display` / `-h1` / `-h2` / `-h3` / `-body` / `-body-hushed` / `-meta` / `-eyebrow` / `-data-hero`) and elevation utilities (`.uix-elevated` / `-popover` / `-pill`). These let consumers apply the `--uix-text-*` scale and `--uix-shadow-*` elevation by class instead of re-deriving them inline — the migration target for house products replacing bespoke `type-*` / `surface-*` classes.

  Scope the `uix.base` margin reset to typographic/form elements instead of a bare `* { margin: 0 }`. The universal form sits above a Tailwind consumer's `utilities` layer and silently zeroed every margin utility (`mb-2`, `mt-4`, `space-y-*`) on layout elements. Dialogs (`uix-dialog`/`uix-drawer`/`uix-peek`/`uix-lightbox`) already set their own margins, so centering is unaffected.
