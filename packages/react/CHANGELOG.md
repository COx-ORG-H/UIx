# @tensor_1/react

## 2.8.0

### Minor Changes

- **Editorial-home kit (INTRA-04)** — the intranet "editorial" landing patterns, ported 1:1 from the approved TENSOR intranet prototype (`Docs/prototypes/intranet-reimagined/mockups.css` + `editorial.html`) so the TENSOR Editorial home can be built entirely from UIx components.

  Tokens/CSS — new `styles/components/editorial-home.css` (registered in `components.css` and `main.css`), all `uix-`-prefixed:

  - **Page intro** — `.uix-page-intro` grid, `.uix-page-kicker` / `.uix-page-title` / `.uix-page-lede`, `.uix-intro-search__label`, `.uix-searchbar(__wrap)` with the leading-icon search input, and the full-width `.uix-shortcut-grid`.
  - **Notice queue** — `.uix-notice(__copy/__content/__meta/__actions/__position)` rotating-updates banner, with `.uix-notice__arrow--previous` flipping the previous-arrow icon.
  - **Featured briefing** — `.uix-featured(__stage/__visual/__content/__eyebrow/__title/__description/__meta)`, the `.uix-story-signal(__value/__label)` hero numeral, `.uix-story-diagram(__bar)`, and the `.uix-rundown` story list (`__head/__eyebrow/__title/__items/__item[data-selected]/__number/__topic/__item-title`).
  - **Sections & grids** — `.uix-section-head` / `.uix-section-title` / `.uix-section-link`, `.uix-content-grid(--balanced)`, `.uix-rail` / `.uix-rail-card(__title/__meta)`, `.uix-resource-grid`.
  - **Content** — `.uix-news-lead(__meta/__title/__summary)`, `.uix-list-meta`, `.uix-content-list(__item/__title/__meta)`, `.uix-stat-line(__item/__value/__label)`, `.uix-event-row(__title/__meta)` + `.uix-event-date(__month/__day)`, `.uix-status-row(__name)`.
  - The prototype's **920px / 620px responsive rules** are ported with the components (single-column restacks, rundown re-orientation, stat-line flex rows, search-bar stack, story-signal step-down).

  Porting notes: spacing/type values are snapped to the `--uix-*` scales per the contract gate (check C); the genuinely off-scale editorial display sizes (the two fluid title ramps, the 48px story-signal numeral, 18px editorial card headings, the 20px stat numeral) and the 42px search-icon clearance are justified in `tests/raw-value-allowlist.json`.

  React — new presentational, router-free wrappers in `EditorialHome.tsx`, all exported with prop types: `PageIntro`, `SectionHead`, `NoticeQueue`, `FeaturedStage`, `FeaturedRundown` + `FeaturedRundownItem` (selection via `aria-pressed` + `[data-selected]`), `NewsLead`, `ContentList` + `ContentListItem`, `ResourceGrid`, `StatLine`, `EventRow`, `StatusRow`. Content, navigation, and behaviour stay with the consumer through `ReactNode` slots and standard DOM handlers; the notice copy and featured-stage content are `aria-live="polite"` regions so queue rotation / story swaps are announced.

  Styleguide: new **Editorial home** section demonstrates the whole kit. Coverage: `Docs/component-roadmap.md` gains the EditorialHome row (Beta).

## 2.7.0

### Minor Changes

- a76bdd1: **UIX-FIX-02 — anchored overlays get viewport-collision handling and render in the top layer.**

  Popover, the rich Select/menu, and Tooltip positioned themselves with CSS anchor positioning (`anchor()` / `position-anchor` / `anchor-size()`), which is Chromium-only: off-Chromium the overlay fell back to the UA-centered position and detached from its trigger, and even in Chromium there was no flip/shift so overlays clipped at the viewport edge. The CSS-only Tooltip (`[data-uix-tip]`) was also clipped by any `overflow: hidden/scroll` ancestor.

  New, framework-agnostic positioning:

  - **`computePosition(anchor, floating, viewport, options)`** (exported) — pure, dependency-free flip (opposite side when the preferred one won't fit) + shift (slide along the cross axis to stay on-screen). Unit-tested across every side/align, both flip directions, both shift edges, and oversized/degenerate inputs.
  - **`useAnchoredPosition(anchor, floatingRef, { open, placement, offset, padding })`** (exported hook) — measures both elements with `getBoundingClientRect`, applies `position: fixed` + left/top, and keeps the overlay glued to its anchor on scroll/resize.

  Component changes:

  - **`Popover`** gains optional `anchor`, `placement`, and `offset` props. With `anchor` set it is placed with cross-browser JS positioning while the native Popover API still provides the top layer (escapes `overflow` clipping) and light-dismiss. Without `anchor` it behaves exactly as before.
  - **`Tooltip`** now renders its bubble in the top layer via the Popover API, so it is never clipped by an `overflow` ancestor. Positioned with flip/shift, shown on hover and keyboard focus, dismissed on blur/Escape, and wired with `role="tooltip"` + `aria-describedby`. Its public props (`label`, children) are unchanged; a `placement` prop was added.

  Tokens/CSS: adds `.uix-tooltip` / `.uix-tooltip__bubble` (top-layer bubble); the legacy `[data-uix-tip]` CSS tooltip is retained for back-compat but is superseded. The styleguide (`guide/app.js`) now positions all `.uix-popover` overlays and upgrades `[data-uix-tip]` tooltips through the same engine, so the vanilla and React layers behave identically.

  Migration: `Popover`/`Tooltip` props are additive. If you targeted the old React `Tooltip`'s `[data-uix-tip]` output in your own CSS, switch to the `label` prop (the bubble is now `.uix-tooltip__bubble`).

- aee4265: **UIX-FIX-04 — accessibility wiring for Field, Tree, and Toast.**

  - **Field** — the error/hint/success message is now wired to the control with `aria-describedby` (so assistive tech announces it) and `aria-invalid` on error; the error carries `role="alert"` so it's announced the moment it appears. A `.uix-field__msg` slot with a reserved single-line `min-height` means an appearing error no longer shifts the layout. The React `Field` clones a single child control to attach the wiring, preserving any existing `aria-describedby`.
  - **Tree** — rebuilt on the WAI-ARIA tree pattern. `role="tree"` / `role="treeitem"` / `role="group"`, `aria-level`, and `aria-expanded` / `aria-selected` now live on the treeitem `<li>` — `aria-selected` was previously (invalidly) on a `<button>`. The treeitem is the focusable element with a **roving tabindex** and full keyboard support (Up/Down, Left/Right to collapse/expand or move to parent/child, Home/End, Enter/Space to select). `.uix-tree__row` is now a presentational span.
  - **Toast** — error/destructive toasts announce **assertively** (`role="alert"`, `aria-live="assertive"`); everything else stays polite (`role="status"`). The `Toaster` container is no longer a live region, so toasts are announced once instead of twice (it previously nested a live region inside a live region).

  Verified with the repo's axe-core gate (`tests/a11y`, both themes, no serious/critical violations) plus keyboard-interaction checks.

  Migration: component APIs are unchanged. Two DOM/CSS-contract notes for consumers who hand-author markup rather than using the components — (1) the `Tree`'s expand/select ARIA moved from the row to the treeitem `<li>`, and the child list is now `.uix-tree__group[role="group"]`; (2) the `Field` message now lives in a `.uix-field__msg` wrapper. Consumers using `<Tree>` / `<Field>` need no changes.

- a841ac0: **UIX-FIX-05 — virtualize the Tree for large hierarchies.**

  `Tree` can now render only the rows in view, so a tree with thousands of visible nodes stays fast. It reuses the table engine's `virtualWindow` / `shouldVirtualize` and preserves the WAI-ARIA semantics from UIX-FIX-04.

  - New pure, framework-agnostic model (exported): `flattenTree(nodes, expanded)` → the visible rows with `level` / `setsize` / `posinset` / `hasChildren` / `isExpanded`, and `treeNav(flat, currentId, key)` → the keyboard-navigation decision. Both are unit-tested and drive the plain and virtualized render paths, so keyboard nav works even for rows scrolled out of the window (it scrolls the target into view before moving focus).
  - New `Tree` props: `virtualize` (defaults to auto, on past `shouldVirtualize`'s threshold of visible rows), `rowHeight` (default 32), `maxHeight` (default 384).
  - When virtualized, the nested `role="group"` structure is replaced by a flat list where each treeitem carries `aria-level` / `aria-setsize` / `aria-posinset` — a valid tree representation — keeping roving tabindex, arrow-key navigation, expand/collapse, and selection intact.

  The default (non-virtualized) `Tree` is unchanged. Verified with `flattenTree` / `treeNav` unit tests plus a server-render of the built artifact (a 203-row tree renders ~24 windowed treeitems with correct `aria-level` / `aria-setsize` / `aria-posinset` and scroll spacers).

### Patch Changes

- c083013: **UIX-FIX-01 — table engine: saved views no longer silently match zero rows.**

  `parseView` was lossy: it hard-coded every restored filter to `kind: 'text'`, stringified all values, and inferred array-vs-scalar from whether the serialized text contained a `|` — which collapsed single-value enum arrays (`['open']` → `'open'`). `matchFilter` had no `date` branch, so date ops fell through to the numeric path where `asNum(isoString)` is `NaN` and matched nothing. After a saved-view URL round-trip, every numeric / enum / boolean / date filter silently matched zero rows (booleans were worse — `is: false` restored to the truthy string `'false'` and matched the wrong rows).

  Fixes:

  - `serializeView` now carries each filter's `kind` in the token (`field~kind~op~value`) and escapes field/value so a literal `~`, `|`, or `,` inside a value survives the round-trip.
  - `parseView` restores the `kind` verbatim and re-types values from it (number, boolean, date), deciding array-vs-scalar from the **op** (`isAnyOf` / `isNoneOf` / `between` are arrays) rather than from the text — so single-value enums stay arrays.
  - `matchFilter` gains a `date` branch that compares by instant via a new `asTime` coercion (`Date` | epoch-ms | ISO/date string).
  - Legacy kind-less URLs (`field~op~value`) still parse — the kind is inferred from the op — so existing saved-view links keep working.

  Public component/prop APIs are unchanged. The serialized URL format gained a `kind` segment; the parser reads both the new and the old format.

- 4c1dc72: **UIX-FIX-03 — Modal / Drawer / Peek now lock background scroll.**

  A native `<dialog>` opened with `showModal()` makes the background inert but still lets it scroll behind the overlay. `useDialog` now locks page scroll while any dialog is open:

  - Locks the scrolling root (`document.scrollingElement`, i.e. `<html>` in standards mode — so `body { overflow: hidden }` alone would not stop it) with `overflow: hidden`.
  - Compensates the vanishing scrollbar's width with `padding-right` so the page doesn't shift.
  - Sets `overscroll-behavior: contain` so the scroll doesn't chain to the page.
  - Reference-counted across stacked dialogs, and restored on close (via the effect cleanup, which runs synchronously on the `open` prop flip — independent of the dialog's exit animation).

  No API changes. Applies to `Modal`, `Drawer`, and `Peek` (all built on `useDialog`).

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
