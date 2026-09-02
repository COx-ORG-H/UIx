# @tensor_1/tokens

## 2.12.0

### Minor Changes

- 0450b44: Improve table and chart runtime performance, add opt-in row virtualization and a lean chart preset, ship minified CSS with selective component exports, and defer styleguide chart loading.

## 2.11.0

### Minor Changes

- Republish of the platform-wide quiet-link registry, which never reached npm under 2.10.0.

  **No source change from what master already carried.** This release exists because `2.10.0` was claimed twice. The a11y remediation branch (`fix/a11y-remediation-2026-07`, gitHead `6dbc192`) published `2.10.0` to npm on 2026-07-30; the quiet-link work landed on master the next day and its release commit stamped `2.10.0` a second time. Tagging `v2.10.0` then ran the Release workflow, which reported success while publishing nothing — `changeset publish` skips a package whose version already exists on the registry:

  ```
  🦋  warn @tensor_1/tokens is not being published because version 2.10.0 is already published on npm
  🦋  warn No unpublished projects to publish
  ```

  So npm's `2.10.0` is the accessibility release, and every consumer that bumped to it got the a11y remediation with the narrow 2.9.0-era link registry. The platform-wide registry — the title/name slots, `.uix-dl dd` data cells, and the container anchors — ships here, in `2.11.0`. Read the `2.10.0` CHANGELOG entry below for the full registry; it describes this code, just under a version number that never carried it.

  Consumers on `2.10.0` need only bump; there is nothing to migrate.

## 2.10.0

> **Never published under this version.** npm's `2.10.0` is the accessibility remediation release, published from `fix/a11y-remediation-2026-07` before this work landed on master. The changes described below shipped in `2.11.0`.

### Minor Changes

- 52cfd0c: Quiet links, platform-wide: the pattern shipped in 2.9.0 for the editorial-home title slots and table cells now covers the rest of the kit's container-affordance contexts. `link.css` grows a documented registry in four forms — **title/name slots** (adds `.uix-featured__title`, `.uix-rail-card__title`, `.uix-status-row__name`, `.uix-card__title`, `.uix-list__title`, `.uix-inbox__subject`, `.uix-kanban__card-title`, `.uix-media__name`, `.uix-attachment__name`, `.uix-contact__name`, `.uix-user-chip__name`, `.uix-audit__actor`, now scoped `a:not(.uix-btn)` so a button-styled anchor in a title keeps its treatment); **data cells** (adds `.uix-dl dd` alongside `.uix-table td`, both `:not([class])`); **container anchors** — when the anchor _is_ the kit block (`<a class="uix-card">`, `.uix-stat`, `.uix-list__item`, `.uix-inbox__item`, `.uix-kanban__card`, `.uix-notif`, `.uix-media`, `.uix-attachment`, `.uix-contact`, `.uix-cmdk__item`, `.uix-content-list__item`, `.uix-event-row`, `.uix-status-row`), which previously let the base `a { color }` tint every word in the block brand-blue; and the unchanged `.uix-link--quiet` opt-in utility. Container anchors take the standard `--uix-bg-hover` row tint on hover/focus rather than an underline, which would strike through the whole block, and the three that declare no display of their own (`.uix-card`, `.uix-stat`, `.uix-kanban__card`) are laid out as blocks. `.uix-comment__author` is deliberately excluded — a byline reads "Author · 22m ago", so the name is a phrase inside a text run rather than the whole block; opt in with `.uix-link--quiet`.

  Prose and message bodies (`.uix-prose`, `.uix-note`, notice copy, `.uix-timeline__body`, `.uix-audit__detail`, notification copy) and `.uix-alert` / `.uix-toast` / `.uix-peek__title` are deliberately excluded and documented as such — links there sit inside sentences (WCAG 1.4.1) or the colour is the only affordance. `.uix-breadcrumbs a` and `.uix-section-link`, already quiet by their own design, gain `:focus-visible` parity with their hover state. React wrappers are unchanged; `quiet-link.test.mjs` locks the registry from both ends — the wrappers must nest the anchor inside the slot-classed element, and every asserted slot must still appear in `link.css`.

## 2.9.0

### Minor Changes

- 00f0720: Quiet links (INTRA-04 follow-up): new `styles/components/link.css` ships the first-class quiet-link pattern for anchors whose container is the affordance. Anchors in the editorial-home title slots (`.uix-content-list__title a`, `.uix-news-lead__title a`, `.uix-rundown__item-title a`, `.uix-event-row__title a`) and classless `.uix-table td` anchors now inherit the surrounding text colour with no underline at rest (underline returns on hover/focus); `.uix-link--quiet` is the opt-in utility for hand-composed block links. In-text links inside prose keep the base `--uix-link` blue + persistent underline (WCAG 1.4.1 / link-in-text-block). Consumers carrying app-level overrides for these slots (e.g. TENSOR's globals.css "Quiet links" block) can delete them and point bespoke `.link-quiet` sites at `.uix-link--quiet`. React wrappers are unchanged (title slots already accept anchors); render tests lock the anchor-inside-title-slot nesting the CSS scoping depends on.

## 2.8.0

### Minor Changes

- **Editorial-home kit (INTRA-04)** — the intranet "editorial" landing patterns, ported 1:1 from the approved TENSOR intranet prototype (`Docs/prototypes/intranet-reimagined/mockups.css` + `editorial.html`) so the TENSOR Editorial home can be built entirely from UIx components.

  Tokens/CSS — new `styles/components/editorial-home.css` (registered in `components.css` and `main.css`), all `uix-`-prefixed:

  - **Page intro** — `.uix-page-intro` grid, `.uix-page-kicker` / `.uix-page-title` / `.uix-page-lede`, `.uix-intro-search__label`, `.uix-searchbar(__wrap)` with the leading-icon search input, and the full-width `.uix-shortcut-grid`.
  - **Notice queue** — `.uix-notice(__copy/__content/__meta/__actions/__position)` rotating-updates banner, with `.uix-notice__arrow--previous` flipping the previous-arrow icon.
  - **Featured briefing** — ONE `.uix-featured` card whose stage and rundown are internal zones split by a hairline: `.uix-featured(__stage/__visual/__content/__eyebrow/__title/__description/__meta/__now)`, the `.uix-story-signal(__value/__label)` hero numeral, `.uix-story-diagram(__bar)`, and the `.uix-rundown` story list (`__head/__eyebrow/__title/__items/__item[data-selected]/__number/__topic/__item-title`). The selected item grows a caret that breaks the divider toward the stage, and its number renders as a filled ordinal chip mirrored by `.uix-featured__now` in the stage eyebrow — the chip pairing carries the selection link at every breakpoint (the caret flips upward when the card stacks at 920px and turns off in the 620px vertical stack).
  - **Sections & grids** — `.uix-section-head` / `.uix-section-title` / `.uix-section-link`, `.uix-content-grid(--balanced)`, `.uix-rail` / `.uix-rail-card(__title/__meta)`, `.uix-resource-grid`.
  - **Content** — `.uix-news-lead(__meta/__title/__summary)`, `.uix-list-meta`, `.uix-content-list(__item/__title/__meta)`, `.uix-stat-line(__item/__value/__label)`, `.uix-event-row(__title/__meta)` + `.uix-event-date(__month/__day)`, `.uix-status-row(__name)`.
  - The prototype's **920px / 620px responsive rules** are ported with the components (single-column restacks, rundown re-orientation, stat-line flex rows, search-bar stack, story-signal step-down).

  Porting notes: spacing/type values are snapped to the `--uix-*` scales per the contract gate (check C); the genuinely off-scale editorial display sizes (the two fluid title ramps, the 48px story-signal numeral, 18px editorial card headings, the 20px stat numeral) and the 42px search-icon clearance are justified in `tests/raw-value-allowlist.json`.

  React — new presentational, router-free wrappers in `EditorialHome.tsx`, all exported with prop types: `PageIntro`, `SectionHead`, `NoticeQueue`, `FeaturedStage`, `FeaturedRundown` + `FeaturedRundownItem` (selection via `aria-pressed` + `[data-selected]`; `FeaturedStage` takes an `ordinal` prop rendered as the `.uix-featured__now` chip), `NewsLead`, `ContentList` + `ContentListItem`, `ResourceGrid`, `StatLine`, `EventRow`, `StatusRow`. Content, navigation, and behaviour stay with the consumer through `ReactNode` slots and standard DOM handlers; the notice copy and featured-stage content are `aria-live="polite"` regions so queue rotation / story swaps are announced.

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
