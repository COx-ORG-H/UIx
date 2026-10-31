# @tensor_1/react

## 2.54.0

### Minor Changes

- d761253: Two-axis grids, and a save refusal that wraps (HAR-2752, HAR-2753, HAR-2749).

  - `MatrixInput` (`rows`, `columns`, `options`, `value`, `onChange`, `rowAxisLabel`, `columnAxisLabel`, `labels`, `getCell`, `disabled`, `readOnly`): a grid of choices filled from the keyboard alone, one tab stop with arrow keys between cells. Each cell is a `Select`. An option can be `unrated`, and a cell can carry `help`, an `error` or a lock.
  - `MatrixHeatmap` (`rows`, `columns`, `cells`, `onOpenCell`, `renderLink`, `rowAxisLabel`, `columnAxisLabel`, `labels`): a count and a named band per cell, each cell one control that opens the drill-through. An empty cell stays apart from a zero the caller chose to hide.
  - Both are a `role="grid"` table with sticky row and column headers in a scroller of their own, carry no words of their own, and never show colour alone. New stylesheet `components/matrix.css`; `--uix-matrix-max-height` keeps the column headers in view down a long grid.
  - `SaveStatus`: a failed save's text wraps inside its container instead of overflowing it, and the retry stays beside or under the text. `saving` and `saved` stay on one line.

## 2.53.0

### Minor Changes

- 35f7614: `CardLink` takes `renderLink` (HAR-2576), the same `UixRenderLink` adapter as `ButtonLink`, so a whole-card link keeps client navigation and prefetch with the router's link as its one anchor. Next.js consumers no longer need `<Link legacyBehavior>` round the card. With no `renderLink`, or one that returns nothing, it is the plain `<a>` it was.

## 2.52.0

### Minor Changes

- 5d07102: `RowAction` has a link form (HAR-2713): `<RowAction href="…" renderLink={…} target rel>` renders `<a class="uix-rowact">` with the same hover reveal, focus reveal and weight as the button form, so a row verb that navigates (an in-app page, a `mailto:`, a PDF in a new tab) hides at rest with its neighbours instead of always showing as a `ButtonLink`. Without `href` it is the button it always was. New export: `RowActionLinkProps`; `RowActionProps` gains `href?: undefined` so the two forms discriminate.

## 2.51.2

### Patch Changes

- 46627d8: Radio, Checkbox and Switch keep their hidden `<input>` inside their label (HAR-2708). The input is `position: absolute`, but the label was not positioned, so inside a scroller whose positioned ancestor sits outside it (the AppShell main area) the input stayed at its scroll-0 spot: a focus scroll or an automated click landed on whatever was there. The labels are now `position: relative`; nothing moves visually.

## 2.51.1

### Patch Changes

- 00427e1: Row actions: an icon-only control (`<Button icon>` or `.uix-rowact`) now sits on the same centre line as the word buttons beside it. On the text baseline it sat 3–5 px higher, visibly so when a product mixes verbs with a peek or kebab (MOTUS shelves, the TENSOR data table). CSS only, in `.uix-table__actions`; row height is unchanged.

## 2.51.0

### Minor Changes

- c4fcdba: DataWorkspace follow-ups from the MOTUS and TENSOR adoptions of 2.50 (HAR-2631, HAR-2632, HAR-2634, HAR-2635). This is a minor release, not the planned 2.50.1 patch: it adds a `--uix-*` token (`--uix-row-h-standard`), and the contract's semver table makes an additive token minor.

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

## 2.50.0

### Minor Changes

- e210e1f: DataWorkspace closes the gaps that held back the MOTUS and TENSOR adoptions (HAR-2622..2626, ADR-0005 addendum). Every prop is additive: a workspace that sets none of them renders the same markup as in 2.49.

  - **Responsive ladder (HAR-2622):** `mobile: 'priority' | 'cards'` with `column.priority` (`low` goes below 900 px of workspace width, `mid` below 600 px) and `column.label`; `cards` turns rows into labelled cards below 768 px: the checkbox beside the id, the row's actions (words or icons, always shown) at the card's foot. From the narrowest step (under 600 px) nothing is frozen. The step follows the workspace's own width (a ResizeObserver), measured before the first paint.
  - **Rich id cell (HAR-2622):** `idColumn.render` puts a title over a muted line (or a search match) in the same button or link; `idColumn.linkId` makes the whole id the record's link, with the ↗ inside it, for a row without a peek.
  - **States and slots (HAR-2622, HAR-2624):** `empty`, `filteredEmpty` and `error` bodies; `emptyAction` and `filteredEmptyAction`; `stateOverride` for a product state such as a page past the end (the toolbar stays); `loadingRows`; `beforeBody` between the toolbar and the rows; `savedViews.note`.
  - **Toolbar (HAR-2622):** `search.onSubmit`, `search.onClear` and `search.maxLength` (SearchBar gains `maxLength`); `saveViewAs: 'always'`; `filters.onClearAll(scope)`, so a product whose state is the URL clears every filter in one change.
  - **Selection (HAR-2622):** `maxSelection` disables the unchecked boxes at the cap; ranges and select-all stop there.
  - **Multi-column sort (HAR-2623):** `sort` takes an ordered list (or `multiSort` while it is still `null`); Shift + click, Shift + Enter or Shift + Space adds, turns or removes a key; each sorted header shows its place through `Th sortOrder`, now with `Th sortOrderLabel` (`labels.sortPriority`, "Sort priority {n}") in the header button's name; `aria-sort` stays. `onSortChange` gets the shape `sort` holds.
  - **Behaviour change, `table-engine` `toggleSort` (and the styleguide's port):** an additive toggle of a key that is already sorted now turns it in place, keeping its priority (TanStack Table and TENSOR do this); before, it moved to the end. A new key is still appended; a key cycling to none is still removed. MOTUS reaches `toggleSort` through its workspace-state `withSort`: a Shift + click on its first key now keeps it first.
  - **Table (HAR-2624):** `zebra`, `freezeFirstColumn` (with selection, the checkbox and the first column), `column.className`, `column.minWidth`, and `fixed`: `table-layout: fixed` with a `<colgroup>` from the columns' widths and tiers (a `uix-col--flex` column takes the slack) and the table's min-width at the sum of the columns' floors (TENSOR HAR-997), so a `uix-col--truncate` column clips instead of growing. It is on by default when a column has `className` or `minWidth` (both new, so no 2.49 table changes); `idColumn.width` / `minWidth` size the id column there.
  - **Row groups (HAR-2625):** `groups` with `collapsedGroups` / `onCollapsedGroupsChange`: a header row per group with a toggle, its count (`labels.groupCount`) and aggregates under their columns, a tri-state group checkbox; Shift ranges run across groups in visual order; collapsing keeps the header where it was.
  - **Windowing (HAR-2626):** `virtualize` over `useVirtualRows`, windowed at `threshold` rows or more (default 100, as TENSOR), off with `pagination` or `groups` and while in cards (crossing the cards step keeps the same rows, focus and scroll), with `aria-rowcount` / `aria-rowindex` and `aria-hidden` spacers. A row the window scrolls away while it has focus parks focus on the scrolling body and gets it back when it returns.
  - **Keyboard rows (HAR-2626):** `rowNavigation` turns on a roving tab stop: ↑ ↓ Home End move it, Enter opens the row (`onRowActivate`, else its id: the peek or the link), Space does not scroll the page. `onRowActivate` turns it on too and also makes a click on the row activate it (not a click on a control, its checkbox or actions cell, or a portalled menu); `activateOnClick={false}` keeps that to Enter. `activeRowId` / `onActiveRowChange` let the product drive it from its own shortcuts; it moves focus only when focus is already in the table or nowhere. Focus stays on its row across a refetch and moves to the first row of a new page.
  - Rows are memoised: a selection change re-renders only the rows it changed. That needs stable `columns`, `idColumn`, `rowActions` and `getRowProps` (`useMemo` / `useCallback`) and immutable row objects: a row mutated in place keeps its old cells.
  - **Fix:** a second Escape restores a maximized workspace at once; a View or saved-view trigger whose popover has closed no longer holds it until the popover's toggle event arrives.
  - New labels in the `dataWorkspace` group: `sortPriority`, `groupCount`, `groupCountOne`, `collapseGroup`, `expandGroup`, `selectGroup`.

## 2.49.1

### Patch Changes

- 31f2620: ConfirmDialog and PromptDialog: the footer buttons wrap. A long confirm label (a 35-character German "Auf nicht schwerwiegend herabstufen") breaks onto a second line at 320 px instead of starting outside the dialog (HAR-2541).

## 2.49.0

### Minor Changes

- 062c66b: Drag affordances shared by every draggable thing (motion rollout WP2: HAR-2590). New stylesheet `components/drag.css`: `[data-uix-drag="lifted"]` (pointer: lift, scale 1.02, deeper shadow), `[data-uix-drag="grabbed"]` (keyboard: dashed ring, no motion), `[data-uix-drop-target]`, `.uix-drop-line` and `[data-uix-settle]` (the landing). Reduced motion (OS or `data-motion="reduce"`) keeps the states and drops the scale and the landing.

  - `SortableList` rows lift while dragged and settle when dropped; `DashboardCanvas` widgets settle where a pointer drag drops them (keyboard steps stay instant).
  - `Kanban`: `KanbanCard dragging`, `KanbanColumn dropTarget`, new `KanbanDropLine`.
  - `settleDrop(el)` and `useKeyboardGrab({ id, label, onMove, onDrop, onCancel, labels })` (Space/Enter pick up and drop, arrows move, Escape or leaving puts back, every step said politely; the picked-up state follows `id` across lists), with `UixLabelsProvider` `keyboardGrab`, `DEFAULT_KEYBOARD_GRAB_LABELS` and the types `KeyboardGrabDirection`, `KeyboardGrabLabels`, `UseKeyboardGrabOptions`, `UseKeyboardGrabResult`, `KanbanDropLineProps`.
  - `.uix-kanban__body` gains 4 px of top padding, so a lifted or picked-up top card is not clipped by the scrolling column.

- 954f353: Lists that move visibly, the success outcome, sliding tab and segment indicators (motion rollout WP2: HAR-2586, HAR-2588, HAR-2589).

  - `MotionList` (`items`, `getKey`, `renderItem`, `as`): items enter (rise 8 px + fade), leave (fade in place, then the rest glide up) and re-sort (FLIP glide), never on first render; focus stays on a moved item, moves to the next item when the focused one leaves, and is never pulled in from outside. New stylesheet `components/list-motion.css` (`.uix-motion-list`, `[data-uix-entering]`, `[data-uix-exiting]`, `[data-uix-moving]`).
  - `useDeferredReorder(items, getKey)` → `{ items, held, listProps }`: a live re-sort waits while a mouse is over the list or keyboard focus is inside it.
  - `SuccessState` (`title`, `headingLevel`, `reference`, `referenceLabel`, `next`, `nextTitle`, `action`, `focusOnMount`, `variant`): a mark that draws once, the title focused on mount on a page, what happens next and the next action. Classes `.uix-success*` in `states.css`.
  - Tabs (line, pill) and Segmented: the selection mark slides on a click and jumps from the keyboard; `useSlidingIndicator`. Both render a hidden `.uix-tabs__indicator` / `.uix-segmented__indicator` first child (decorative, `aria-hidden`); the options' own marks show until it is placed, in forced colours, and in Segmented's link mode.
  - CollapsibleSection: opening fades the body in on `::details-content`; an already open section, a keyboard open and closing are instant.
  - All of it follows the in-app reduced-motion choice (`data-motion="reduce"`) as well as the OS setting.

- de50359: Overlay timing (HAR-2578, motion rollout work package 1, part B), on the tokens part A added.

  - **New tokens (additive) for the feedback kit:** `--uix-dur-change` (1200 ms, a change tint on the row or field that changed), `--uix-delay-pending` (300 ms before a pending indicator shows), `--uix-hold-pending` (500 ms it then stays at least), `--uix-hold-result` (1500 ms an in-place result holds).

  - **Exits are faster than enters.** Modal, Drawer and Peek enter at `--uix-dur-slow` (240 ms) and leave at `--uix-dur-exit-slow` (160 ms); popovers, menus, Select and tooltips enter at `--uix-dur-fast` (120 ms) and leave at `--uix-dur-exit-fast` (80 ms). Every exit is ease-out. The closed state's rule carries the exit duration, the open state's the enter.
  - **Popovers, menus, Select and SearchSuggest grow from their trigger:** `scale(.95)` plus opacity about the anchor point. `useAnchoredPosition` writes that point as `--uix-anchor-origin` on the overlay (`transform-origin: var(--uix-anchor-origin)`); the old `--uix-lift` slide away from the anchor is gone. Its placement check now accounts for a scale about that origin.
  - **Keyboard-opened overlays do not animate.** A Modal, Drawer, Peek, Popover, Menu or Select opened or closed right after a key press (Enter on a button, ↓ on a menu trigger, Escape) carries `[data-uix-key-opened]`, which `motion.css` treats like `[data-uix-instant]`.
  - **Tooltip delay group.** A `Tooltip` waits `--uix-delay-tooltip` (400 ms) before it opens on hover. While one is open, and for `--uix-delay-tooltip-skip` (300 ms) after the last one closed, a neighbour opens at once with no fade, and the bubble it replaces goes at once (two never overlap). Keyboard focus still opens it at once.
  - **Toasts move on transitions:** they enter from the toaster's edge and leave toward it (`--uix-dur-slow` in, `--uix-dur-exit` out) and turn around if updated mid-exit. When a toast arrives or leaves, the others glide to their new place (`--uix-dur`, `--uix-ease-out`, so the one making room clears the newcomer early). A toast with a close action can be swiped away: past a third of its width, or flung faster than 0.11 px/ms, it flies out and closes; a slow, short drag snaps back. `toast-store` removes a leaving toast after the CSS `--uix-dur-exit`; `TOAST_LEAVE_MS` (its fallback) is now 110.
  - **SearchSuggest** enters once per opening: a list that hides and reappears between result sets while the user types comes back in place (`[data-settled]`) instead of replaying its enter.
  - **Bulk bar** enters on a transition from `@starting-style` instead of a keyframe.

### Patch Changes

- 9188c2a: Follow-ups to the batch PRs (#159, #165, #166, #168).

  - `Chip` `onClick` now receives the click event (`(event) => void`; a `() => void` handler still works), so a chip can be the trigger of a `Menu`. `DataWorkspace`'s "+ Filter" is now a real `Chip variant="add"`; its markup is unchanged.
  - Shortcut key caps are hidden on touch devices (`@media (hover: none) and (pointer: coarse)`): the Sidebar search row's keys (also in the AppShell phone drawer), the keys of Menu, CommandPalette and Tooltip rows, SearchSuggest's trailing key, and a Button's hint bubble, which a tap used to open. `aria-keyshortcuts`, the spoken keys and descriptions are unchanged; a key a product puts in a Menu or CommandItem shortcut slot is clipped from view, not removed. One rule in `components/kbd.css`.
  - `RelationshipGraph controls="compact"`: the footer (navigation hint, zoom level, controls) is a band across the map's bottom edge on the map's background with a rule above it, so no node shows half under a pill; fit, the first view, Reset and zooming about the centre leave the band's height free.
  - `RelationshipGraph layout="layered"` edge labels are drawn above every line, each on an opaque chip of the map's surface, in the small text size (meta) at >= 4.5:1; a tone is the chip's border. A busy node's trunk stands 4 px from the node so each stub carries its label on a straight run. Markup: labels moved from each `.uix-relationship-graph__link` into `g.uix-relationship-graph__edge-labels > g.uix-relationship-graph__edge-label[data-edge]` (rect + text); links gained `data-edge`. Wrapping fits the larger text (about 12 characters per line in a standard gap).
  - `RelationshipGraph` legend items are inline-flex rows with a real `span.uix-relationship-graph__legend-mark` (was `li::before`), centred on their words; items wrap whole.
  - The layered map is a pan surface: it no longer selects text or starts a native drag (`user-select: none`, `-webkit-user-drag: none`, `dragstart` cancelled). The relationship list stays selectable.
  - `Table`: every row state sets `--uix-row-bg` (a registered colour) on the row; frozen cells (`.uix-table--pinned-col`, `.uix-table--pinned-actions`, DataWorkspace's frozen id) paint it over the surface, so a frozen cell follows selected, pinned, zebra and hover (hover now only where the device can hover). Fixes the zebra stripe on selected even rows in the frozen id column.
  - `BulkBar` wraps: actions take a second row on a phone instead of running off the edge.
  - `Segmented` clips its sliding indicator to the track, so a window that narrows mid-slide cannot widen the page.

## 2.48.0

### Minor Changes

- 60ebc9f: **`AuditLog`** (HAR-987; MEDx S50 "Historija pristupa", POSx PRT-01 / INT-01): who opened or changed which record, and when. An ordered list of `events` (`actor`, `action` from your labelled `actions` with a pill tone, `target`, `at`, optional `detail` behind a Details disclosure), each with the relative time and the exact one under it (`formatExact` where the browser lacks the locale's data: Chromium has none for `bs`). With `filters` / `onFiltersChange`, a filter bar of kit chips over `FilterEditor`: period (date range), person (`actors`) and action, a × on a set filter, Clear filters. `hasMore` / `onLoadMore` / `loadingMore` for keyset "Show older entries" (focus stays, the count is announced). `status` `loading` (skeleton rows, first load only), `error` (with `onRetry`), `forbidden`; empty and filtered-empty states. `refreshing` keeps the rows on show in a `BusyRegion` while the filters reload. Presentational: the product fetches, owns the audit semantics, and passes rows free of health data. All words from `labels` or `UixLabelsProvider` `auditLog`. `.uix-audit` gains the React parts (`.uix-audit-log*`); on a phone a row stacks.
- adba3d0: **`Breadcrumbs renderLink`** (HAR-1385, MOTUS B-P3): each item's link is rendered by your router through the same `UixRenderLink` adapter `ButtonLink`, `Stat`, `Pagination` and `Steps` take (`renderLink={(p) => <NextLink {...p} />}`), so client navigation and prefetch survive and a locale-aware link adds the locale prefix. Without it the links stay plain `<a>`. `.uix-breadcrumbs` items now wrap a long unbroken title (a German compound, a file name) instead of widening a 320 px page.
- e7e5d51: **`Inset`** (HAR-1818; MOTUS UXR-05b): a bordered, sunken well inside a card body for a preview or a specimen (a rendered header, an image crop, a code sample), over the new `.uix-inset` class in `card.css`. A `--uix-border` hairline, `--uix-radius-md`, `--uix-bg-subtle` and `--uix-space-4` padding; `padding="sm"` (`.uix-inset--sm`, `--uix-space-3`) for a dense card and `tone="surface"` (`.uix-inset--surface`) for a well on a panel that is already subtle. It has no shadow and no card semantics, so it replaces a `Card` nested in a `Card` and local "preview box" CSS. The content's layout is the consumer's. The Card reference page shows it in both themes.
- 16bc79e: **`CheckboxGroup`** (HAR-1799, MOTUS UXR-05): checkboxes under one name, the counterpart of `<RadioGroup label>`. It renders a `<fieldset>` whose `<legend>` (`label`) names the group, so a screen reader announces it with each box, and the field's message slot below: `hint`, or `error` (announced, `role="alert"`), tied to the group with `aria-describedby`. `required` draws the marker after the legend, `disabled` disables every box, and `columns` sets the most columns the boxes form (a column is never narrower than 10rem, so a phone gets one). New classes `.uix-checkbox-group`, `__legend`, `__options`; a box stays on the first line of a label that wraps.
- d67a6fe: **`CodeDisplay`** (HAR-1253; SHOPx PRE-08 till pairing code, the voucher code): a one-time code shown large. Monospace characters in groups (`groupSize`: a number or a list of lengths; a code that already contains spaces or hyphens keeps its own groups), a drawn `separator` that is never read out, `size` `md` / `lg`, and a visible `label` that names the group. A screen reader hears the code character by character, groups apart ("K 7 Q, 4 P X, 9 M W"); `spell` swaps in a spelling alphabet. `expiresAt` adds a countdown (`m:ss`, one update per second, never a live region): at `warnBefore` seconds (default 60) it turns to a warning and a polite status says "{time} left" once; at zero the code is struck through, the line says it has expired in words (not colour alone), the status says so once, and `onExpire` runs once. A code that arrives already expired is shown expired without an announcement. `copyable` adds a `CopyButton` (copies the bare code) while the code is live. Words: `labels` or `UixLabelsProvider` `codeDisplay` (`expiresIn`, `expiresSoon`, `expired`, `copy`, `copied`, `copyFailed`). Helpers `codeGroups` and `formatCountdown` are exported.

  New stylesheet `styles/components/code-display.css`. Groups wrap whole on a narrow screen and the separator ends its line.

- 403b40c: **`Combobox` at keyboard and placement parity with `Select`** (HAR-1588). The list is a top-layer popover placed with `useAnchoredPosition`, so it is no longer clipped inside a Drawer, a Popover or an `overflow: hidden` cell. ↑ ↓ PageUp PageDown move (Home End too while an option is active), disabled options are skipped and the list does not wrap; Escape closes it and puts the chosen option's text back; reopening from the keys no longer filters the list by the chosen label. `options` also take groups (`ComboboxGroup`: `{ label, options, disabled }`, rendered as `role="group"`); the no-match row is outside the listbox; the chosen option has a check mark. New props `aria-labelledby` (replaces `label` as the input's name), `aria-describedby`, `aria-invalid`, `inputId`, `placement`; new export `filterComboboxItems`. CSS: `.uix-combobox__popup`; the static `.uix-combobox__listbox` rule now applies to a list that is a direct child of `.uix-combobox` only.
- 327ce4a: **`CommandPalette` items mode** (HAR-1378, MOTUS C-10, TENSOR B2 / HAR-1458): pass `items` (`{ id, label, group, keywords, description, icon, shortcut, onSelect, href, disabled }`) and the palette does what both products hand-built:

  - filters with the kit's `foldForSearch` (case and diacritics folded, so "ubersicht" finds "Übersicht"), best match first: a label that starts with the query, then word starts, then contains, then `keywords`. The model is exported: `filterCommandItems`, `groupCommandItems`; `filter` replaces it.
  - groups the results under their headings (the group of the best match first), marks the match, and shows `recent` items first while the query is empty.
  - keeps one option active through `aria-activedescendant`: ↑ / ↓ wrap and skip disabled items, Home / End jump while the query is empty (they move the caret once there is text), Enter runs the item (`onSelect`, then `href` through `onNavigate` or the browser), `onItemSelect` hears every choice. The active row scrolls into view at once.
  - an empty state (`emptyLabel`), and the result count, both translatable (`UixLabelsProvider` `commandPalette.empty`, `recent`, `resultsOne`, `resultsMany`).
  - `open` / `onOpenChange` host it in its own native `<dialog>` (focus in the field, Escape or a click outside closes, focus back on the opener, the query cleared), with no animation: a keyboard surface used many times a day opens at once.
  - `limit` (default 100) caps the rendered rows of a long list; the count still says how many were found.

  Children mode is unchanged. `.uix-cmdk` no longer overflows a narrow container (`max-width: 100%`), and a row's hover tint applies only on devices that hover.

- 6ead0e8: **What TENSOR's `ConfirmAction` needs from the kit confirmations** (HAR-1831), so it can become a thin adapter over `ConfirmDialog`, `Popconfirm` and the undo toast.

  `Popconfirm`

  - `children`: content between the text and the buttons, e.g. a required reason field. A field there has focus when the step opens, and the step takes its full width (`.uix-popconfirm--content`, `.uix-popconfirm__content`). `confirmDisabled` keeps Confirm disabled until it is filled.
  - `role` (default `alertdialog` when `destructive`, else `dialog`), and `title` is optional: without it the step is named by its confirm button (`labelledBy: 'title' | 'confirm'` to choose).
  - Escape is only the step's own: not while a popup inside it is open (a Select's list closes first), not one meant for a dialog opened above it, and only the newest open step answers (a small shared overlay stack). `onEscapeKeyDown(event)` runs first and `preventDefault()` keeps the step open. With focus inside the step the Escape no longer also reaches a Drawer or Modal around it.
  - `closeWhenAnchorHidden`: cancel when the anchor scrolls out of view.
  - `confirmProps` (also on `ConfirmDialog`): attributes for the confirm button, e.g. `{ 'data-action-id': 'ci.delete' }`; its `onClick` runs first and `preventDefault()` stops the confirm. New type `ConfirmButtonProps`.

  `ConfirmDialog`

  - `pending` now also blocks Escape (and any close request), the × and Cancel until the action settles; Confirm shows its loading state.
  - A dialog the caller unmounts while open (`{open && <ConfirmDialog …/>}`) gives focus back to the control that opened it: `Modal`, `Drawer` and `Peek` now open and close their `<dialog>` in a layout effect, while it is still in the document.
  - It forwards its `ref` to the `<dialog>`, and so does `Modal`.
  - `typeToConfirmLabel` takes a node; `typeToConfirmPlaceholder`; the field is `aria-invalid`, with a message under it (`typeToConfirmMismatch`, or `UixLabelsProvider` `confirmDialog.typeToConfirmMismatch`, default "That does not match {value}."), as soon as the typed text stops being the start of the value. The message space is reserved, so the footer does not move.

  Undo toast

  - `pauseOnHover: false` on any toast (and on `toast.undoable`): a fixed timer that closes the toast `duration` after it appears, even under the pointer, with focus in it or in a hidden tab, for an undo window that must end on time.
  - `toast.undo(id)` undoes an undoable toast from code, as if Undo were pressed; `toast.dismiss(id)` still commits.

- 5a5f853: **`ContactCard`** (HAR-1379; MOTUS C-15, TENSOR incident people card and user peek): the React wrapper of `.uix-contact`. `name` (a quiet link with `href` / `renderLink`; `nameAs` for a heading), `role`, `avatar`, `email` and `phone` as selectable text, Email / Call as `mailto:` / `tel:` `ButtonLink`s whose accessible names start with their visible words ("Email {name}", WCAG 2.5.3), then your `actions` and `stats`. `state="purged"`: a neutral placeholder avatar, "Removed contact", "Personal data erased", and no role, details, links or actions even when stale props still carry them; `state="unavailable"`: the name and a line saying the details are unavailable, nothing else. `bare` drops the card frame and its padding for a surface that already has one. Words: `labels` or `UixLabelsProvider` `contactCard`. `telHref(phone)` is exported.

  `contact-card.css`: the actions wrap (equal widths, at least 7rem each) instead of squeezing, long names and addresses break inside the card, and new parts `.uix-contact--bare`, `__details`, `__detail`, `__placeholder`, `__note`.

- 7300946: **`DataWorkspace`** (HAR-1388; UIx ADR-0005; TENSOR `data-table.tsx`, MOTUS `UixDataWorkspace.tsx`): the generic presentation half of a data table, composed from the kit's pieces and driven by props. Toolbar in one order: saved view (`savedViews` → `SavedViewMenu`), Save changes / Save as when `viewChanged`, filter chips with a × and "+ Filter" over `FilterEditor` (`filters`), search (`search`, Ctrl/⌘ + / focuses it), View (`viewMenu` → `ViewMenu`), maximize (`maximized` / `onMaximizedChange`, Escape restores), then `toolbarEnd`. A `Table` with the record-id cell (`idColumn`: the id opens a peek, ↗ links to the record), sortable headers (`sort` / `onSortChange`), selection kept by id with Shift-click ranges and select-all (`selection` / `onSelectionChange`), a `BulkBar` (`bulkActions`), a frozen row-actions column (`rowActions`), and `getRowProps` (e.g. for `ChangeHighlight`). Footer: "x–y of N", rows per page and `Pagination` (`pagination`: offset or cursor). States: first-load skeletons (`status="loading"`), empty, filtered empty with Clear filters, error with retry, and a refetch that keeps the rows under `TableWrap refreshing` (`refreshing`). Words from `labels` or `UixLabelsProvider` `dataWorkspace`. The product keeps its surface registry, URL state, fetching, sorting, filtering and permissions. New stylesheet `data-workspace.css`.
- 961bc2f: **Date fields with no call-site workaround** (HAR-2432, found adopting 2.40.2 in TENSOR HAR-1485).

  - `UixLabelsProvider` takes `dateFormat` (`UixDateFormat`: `locale`, `formatDate`, `parseDate`, `placeholder`): one provider sets the format of every `DatePicker`, `DateTimePicker`, `DateRangePicker` and the `locale` of `TimePicker`; a prop on one field still wins.
  - `FilterPopover type="date"` renders the kit `DatePicker` instead of a native `<input type="date">`; the value stays `YYYY-MM-DD` (`''` for none).
  - `DateRangePickerLabels` gains `label` and `invalidMessage` (English defaults unchanged), so a provider-wrapped app gets no English from the range picker; the `label` / `invalidMessage` props still win.
  - `DateTimePicker` names its time input from the field label's accessible text: an `aria-hidden` required "\*" is left out, and the name follows the label when its text changes after mount (a translation that loads late).

- 889fb82: **`DiffViewer` for people, `MatchReview` adopt mode** (HAR-1369, MOTUS B-A9):

  - `DiffViewer` `labelFor(path)` names an entry ("Authors" for `$.authors`; a string also names its regions and buttons), `renderValue(value, path, side)` shows a value as the product does instead of `JSON.stringify`, and `provenance(path, side)` says under each version where it came from. Without them nothing changes. Words can come from `UixLabelsProvider` `diffViewer`.
  - `MatchReview` `fieldMode="adopt"`: per candidate (`candidateLabel`), a table of the record now against the candidate, field by field, with a checkbox where the values differ ("Same" where not); the Adopt button calls `onAdopt(candidateId, fieldIds)` and is busy only once it has run 300 ms; a failure keeps the choice and says so; `provenance(candidate)` opens in a disclosure; Dismiss stays. On a phone each field stacks as a block (the table keeps its roles). New labels for the mode; all words can come from `UixLabelsProvider` `matchReview`. The default `decide` mode is unchanged.

- 32845c2: **The display-preference contract** (HAR-1372, batch e8; MOTUS C-4 / B-A12, TENSOR A7 / B14): theme, contrast, text size, motion and density, owned by UIx instead of every product.

  - Tokens (`components/display-preferences.css`, in the bundle and in `@tensor_1/tokens/components/display-preferences`): `<html data-contrast="more">` re-points `--uix-text-hushed`, `--uix-text-muted`, `--uix-border` and `--uix-border-strong` to stronger mixes of the theme's own text and surface (muted and hushed text >= 7:1, hairlines >= 3:1, light and dark); `data-text-scale="sm|lg|xl"` scales the rem type ramp (93.75 / 112.5 / 125 %); `data-density="compact|comfortable"` re-points `--uix-row-h` and `--uix-control-h`; `data-motion="reduce"` applies the reduced-motion policy (`motion.css`, and the pulse that replaces each looping indicator) without the OS setting. No new `--uix-*` names; nothing changes without an attribute.
  - React: `useDisplayPreferences({ storageKey, defaults, apply })` (stored in `localStorage`, follows `prefers-color-scheme` / `prefers-contrast` for `system`, other tabs and other users of the hook in the tab; writes the attributes on `<html>` with every transition suspended for that frame, so nothing fades between themes); `ThemeSwitcher` (light / dark / system radio group over `Segmented`, `display="icons"`); `DisplayPreferences` (the five settings as labelled radio groups, `settings` to pick some); `displayPreferencesScript(storageKey, defaults)`, an inline head script that applies the stored choice before the first paint; the pure model (`parseDisplayPreferences`, `resolveDisplayAttributes`, `applyDisplayAttributes`, `readSystemDisplayPreferences`, `DEFAULT_DISPLAY_PREFERENCES`, `DISPLAY_PREFERENCE_OPTIONS`). Words: `labels` or `UixLabelsProvider` `displayPreferences`.
  - `useReducedMotion` / `prefersReducedMotion` also answer true for `<html data-motion="reduce">`.

- e51a3d2: **`EntityPicker` / `SearchSuggest` gaps for TENSOR's pickers** (HAR-1834).

  - **A non-retryable failure.** Reject `onSearch` with `{ retryable: false, message? }` (`EntityPickerSearchError`) or pass `isRetryable(error)`: the list shows the message, or the new `labels.forbidden` ("You do not have access to search these records."), and no Retry row.
  - **Disabled and invalid while empty.** `SearchSuggest` gains `disabled` and `invalid`, and `EntityPicker` forwards its own, so an empty disabled picker cannot be typed in and an empty required one with an error is announced invalid.
  - **Clear resets the query.** After ×, the old query and its rows are gone and the field has focus.
  - **Naming.** With a `<label for>` (a `Field`) or `aria-labelledby` (`EntityPicker`; `inputLabelledBy` on `SearchSuggest`) the input gets no `aria-label`, so the visible label is its name.
  - **Async search keeps its rows.** While the next query loads, the last answer stays in view (`aria-busy` at once) and the spinner waits 300 ms (the kit's `useDelayedPending`: shown after 300 ms, then kept at least 500 ms), so a fast answer shows none. In the search mode Enter during a search now picks nothing and does not submit the form (it used to pick the first row, or submit when there was none).

- 6edee04: **`EventRow`** (HAR-1370; MOTUS B-P8 programme, TENSOR portal events): new optional slots. `weekday`, `year` and `time` are drawn in the date tile (weekday above the month, year under the day, the start time at the foot), and the tile widens to its longest line (never under 42 px), so titles in one list still start at one x. `dateTime` makes the tile a `<time>` element with that machine-readable value. `media` puts a thumbnail at the row's end, drawn 4:3 and cropped to fill (`object-fit: cover`); below 620 px it moves under the text, so the title keeps the row's width. Titles and meta now break long words instead of overflowing. A row without the new props renders exactly as before.

  `editorial-home.css` gains `.uix-event-row--media`, `__media`, `.uix-event-date__weekday`, `__year`, `__time`. (Splitting `editorial-home.css` per pattern, which the issue suggested considering, is not part of this change.)

- cdcc5b3: Showing what changed (motion rollout WP2: HAR-2583, HAR-2585, HAR-2587).

  - `ChangeHighlight` (`value`, `as`, `variant: 'tint' | 'ring'`, `announce`, `disabled`), `useChangeHighlight(value, { announce, disabled })` and `flashChanged(el)`: a value that changed in place is tinted at once and the tint fades (about 1.3 s), never on the first render; a row tints its cells, a ring suits a pill. Reduced motion and forced colours: a steady outline for the same time. Plain markup: `.uix-changed`. New stylesheet `components/change-highlight.css`.
  - `announcePolite(text, from?)`: one polite live region per page, or per open dialog.
  - `Count` (`value`, `format`): one 4 px tick in the change's direction with a fade, tabular figures; reduced motion fades only. New stylesheet `components/count.css`.
  - `useOptimisticValue(serverValue, commit, { onRollback })` → `{ value, set, pending, rollback, rollbacks }`: optimistic only for reversible personal actions; a failed save comes back visibly (flash it with `ChangeHighlight value={rollbacks}`) and `onRollback` says what was restored. Types `OptimisticRollback`, `UseOptimisticValueOptions`, `UseOptimisticValueResult`, `ChangeHighlightOptions`, `ChangeHighlightProps`, `CountProps`.

- 3165036: **`FilterEditor`: tags, dates with a condition, labels for restored ids** (HAR-1832, TENSOR HAR-1484):

  - **`tags` kind** (`{ kind: 'tags'; values: string[] }`): free-text values typed in the kit tag input. Enter or a comma adds one, a pasted "a, b" adds both, each tag has a remove button, Backspace on an empty field takes the last back; Apply takes a tag still being typed along. New labels `addTag`, `addTagHint`.
  - **`date` kind** (`{ kind: 'date'; operator: 'on' | 'before' | 'after' | 'between'; from?; to? }`, `field.dateOperators`): the condition is kept, so a saved one-day `between` comes back as `between`, not `on`. `summarizeFilter` says "before 05.10.2026" (`on` / `before` / `after` summary labels), and `dateFilterBounds(value)` gives the half-open range a query needs ("before" is `< day`, "after" is `>= the next day`). New labels `date`, `dateOperators`. `date-range` is unchanged.
  - **`field.resolveLabels(ids)`**: chosen reference ids restored from a saved view (no label, or the id as label) are named in the editor, once per set of ids (StrictMode included); `resolveFilterLabels(field, value)` does the same for the chip outside the editor. `isUnresolvedChoice` tells such a choice.
  - **Enter applies in every kind** (a checkbox, a number, a date, a search field), not only the text field; a button, an open list, a tag being added or an IME commit keep their Enter. `onApply` now receives the value to apply (read it rather than your state, which has not caught up when Enter applies in the same event).
  - The reference search runs once per query, retry or field: it no longer searches again on every render when the `field` object is not memoized. Results on show stay while the next ones load, and "Searching…" appears only after 300 ms.

  `.uix-filter-editor[data-kind="date"]` puts the condition on its own row, like a number filter.

- b9448ce: **`Input`, `Select` and `Textarea` take `size="lg"`** (HAR-1812, MOTUS UXR-11): 44 px, the touch-target floor of a public page and the height of `Button size="lg"`, so a public form no longer restates the controls' height. `Input` and `Select` are `'sm' | 'md' | 'lg'`; `Textarea` gains `size?: 'md' | 'lg'` (its 84 px floor already clears 44 px; `lg` takes the larger type and padding and still grows). New classes `.uix-input--lg`, `.uix-select--lg` (also on a plain `<select class="uix-select">`) and `.uix-textarea--lg`. In an `InputGroup`, the leading and trailing icons move in with the lg field's padding and the text clears them. Documented on the Input & field page beside Button's sizes, with a form at `lg`.
- 53083d4: **Icons, not text glyphs** (HAR-1576, operator review 2026-10-07 points 3 and 8): no UIx component or docs specimen uses a text character where an icon belongs.

  - React: `Toast`'s close button draws `XIcon`; `Pagination`'s first / previous / next draw `ChevronsLeftIcon`, `ChevronLeftIcon`, `ChevronRightIcon`; `MetricInput`'s steppers draw `PlusIcon` / `MinusIcon`; `SavedViewMenu`'s pin draws `StarIcon` (filled while pinned); a `Step` in the error state draws `XIcon` (it was `!`). Each icon is centred in its control.
  - CSS: the table sort arrows (`th[data-sort]::after`) are the icon set's `arrow-up-down` / `arrow-up` / `arrow-down` drawn through a mask in `currentColor`, not `↕ ↑ ↓` text; the React `Select` trigger's chevron is a masked `::after` in the theme's muted text colour (a native `<select>` cannot hold a pseudo-element and keeps its image). New `.uix-glyph` + `.uix-glyph--chevron-down | arrow-up | arrow-down | arrow-up-down | x` (in `icon.css`) for plain-CSS slots that cannot hold an `<svg>`. In forced colours every mask is drawn in `CanvasText` (the active sort arrow in `Highlight`). The masks are not new `--uix-*` tokens.
  - Guard: `packages/react/scripts/glyph-icons.mjs` fails, with file and line, on `× ✕ ▸ ▾ › ‹ « » ⌄ ✓ ★ ⋯ ↕ ↑ ↓ + −` as the only content of a button, a link or a `__close / __remove / __chevron / __icon / __marker / __step / __btn` slot (React sources, docs markup, the table specimen, the plain-CSS example), as a JS string on its own, or in a CSS `content:`. Its allowlist holds only text (Kbd legends, diff signs, the search-suggest breadcrumb separator), each with a reason, and may only shrink.

  Visible change: those controls now show the icon set's strokes instead of font glyphs.

- e97ad67: **`InlineEdit` as a record field** (HAR-1833, TENSOR HAR-1490 `EditableRecord`):

  - **Any value type**: `InlineEdit<T>` with `equals` (an unchanged draft saves nothing), `isEmpty`, `renderView` and `renderEditor` for options, people and time windows.
  - **`commit`**: `explicit` (default, as before), `blur` (also when focus leaves the editor; leaving a field whose last attempt failed with the same draft sends nothing), `change` (a choice saves at once; no Save button). The editor's `save(next)` saves the value just chosen: `onChange(next)` then `save()` used to save the stale draft.
  - **`renderError(error, { message, draft, retry, cancel })`** for Try again or Reload latest after a version conflict, and **`onStateChange`** (`idle` / `editing` / `saving` / `saved` / `error`).
  - **Controllable** `editing` / `onEditingChange` (one field open at a time) and `draft` / `onDraftChange` (dirty reporting).
  - After a save the **accepted value shows** until `value` changes, instead of the old one until the parent refetches.
  - **`trigger="icon"`**: the value stays text (a link, a chip) and a pencil button is named only "Edit {label}".
  - **`readOnlyReason`**: why the field cannot be edited, shown under the value and wired by `aria-describedby` (new label `readOnly`).
  - The pending state (the Save spinner, "Saving…", the read-only field) shows only once a save has run 300 ms, so a fast save never flashes; typing is ignored from the start of the save. The editor is `aria-busy` at once.

  **Fix:** `inline-edit.css` was never in the bundle (`component-list.css`), so `InlineEdit` rendered as bare browser buttons since it shipped. It is now, a test fails when any component stylesheet is missing from the list, and a value no longer wraps early ("Amra / Kovač"): the view's negative margin moved from the button to its wrapper. Hover backgrounds apply only on devices that hover.

- 5ccfd0b: **`Lightbox` for an annotating viewer** (HAR-1826, TENSOR C12 capture redaction): `actions` renders buttons in a toolbar before Close (Tab order: actions, then Close; inside the dialog's focus trap); `renderOverlay({ index, item, media, width, height })` is laid over the picture's own box (not the letterbox around a fitted one) and follows the fit / actual-size toggle, and a stroke on it never swipes; `onKeyDown` runs first for every key and `onEscapeKeyDown` for Escape: `event.preventDefault()` claims the key, so the viewer neither pages nor closes while a draft is open. A single item shows no counter (it showed "1 of 1"). The words can now come from `UixLabelsProvider` (`lightbox`). With actions, the picture starts below the toolbar.
- 38ffee6: **`NavItem` and `SubNavItem` forward their ref** (HAR-1810) to the rendered `<a>` or `<button>`, so a nav row can anchor a `Popover` (`<NavItem as="button" ref={anchor} popoverTarget="account-menu">` with `<Popover anchor={anchor}>`): MOTUS's account and "…" utility rows no longer need to be hand-built `button.uix-navitem`. `popoverTarget` and the other button attributes still pass through with `as="button"`. The ref type is `HTMLAnchorElement | HTMLButtonElement`.
- fb1d467: **`PasswordInput`, `OtpInput` and `InputGroup trailingAction`** (HAR-1376). `PasswordInput` is an `Input type="password"` with a reveal toggle inside the field's end: a button with `aria-pressed` whose name stays "Show password" (`labels.show` or `UixLabelsProvider` `passwordInput`); a pointer press keeps the caret in the field, and a revealed password is hidden again when its form submits. `revealed` / `defaultRevealed` / `onRevealedChange`, `size` and every `Input` prop (`autoComplete`, `name`, Field wiring) pass through. `OtpInput` is one native input (`inputMode="numeric"`, `autoComplete="one-time-code"`, `pattern`, `maxLength`) drawn as `length` cells: paste-friendly ("123 456" and "123-456" keep the digits), `onComplete(code)` once per filled code, `mode="alphanumeric"`, `groupSize`, the error state from `Field`. `InputGroup` gains `trailingAction`, a real control inside the field's end (`.uix-input-group__action`); the cells are `.uix-otp`, `__input`, `__cell`, `__sep`.
- 8212a1f: **`PrintLayout`**, **`PrintSignature`**, **`PrintPageBreak`** (HAR-986 MEDx S20 findings and day list, S43 A5 poster; HAR-1252 SHOPx PRE-01 A5 poster and SHOP-03 one-page readout, folded in): a print document frame for the browser's own print. `size` `A4` / `A5` and `orientation` pick a named CSS page (`@page uix-print-a4` …) with the paper's margins; `header` and `footer` repeat on every printed page (the frame is a layout `<table role="presentation">`, because Chromium repeats a real `<thead>` / `<tfoot>` and not a CSS table of divs, measured); `pageNumbers` (default on) prints "page / pages" in the bottom-right margin; everything inside reads ink-on-paper tokens (text, surfaces, borders, table rows, and in the dark theme the tinted status backgrounds), on screen as a paper preview and on paper. `isolate` (default on): while a frame is on the page, printing shows only the frames — the app shell, its toolbars, toasts and dialogs are left out, and the containers that hold a frame become plain flow so a scroll box cannot cut it to one page; the sheet is paper even with background graphics on. `singlePage` keeps a poster or a readout in one piece, the preview is exactly one page tall, and content that does not fit is outlined and reported through `onOverflowChange`. `PrintSignature` (`label`, `name`, `placeAndDate`, `stamp`; words from `UixLabelsProvider` `printLayout`) is never split across pages; `PrintPageBreak` starts a new page. Tables inside keep their rows whole and repeat their own header row; focus rings are not printed. Utilities `.uix-print-keep`, `.uix-print-hide`, `.uix-print-only`.

  New stylesheet `styles/components/print-layout.css`. A Playwright test prints a real PDF: A4 pages then the A5 poster page at their CSS sizes, the header and footer on every A4 page, the poster on one page, and the poster's QR code still scans with print media.

- bfc1fc3: **`QrCode`** (HAR-1251; SHOPx PRE-01 poster, the voucher): a string as a scannable, print-safe SVG QR code with the standard four-module quiet zone. `value` (encoded as UTF-8 bytes), `label` (the symbol's accessible name: say where it leads), `errorCorrection` `L` / `M` (default) / `Q` / `H`, `size` (CSS pixels, default 160, or any CSS length such as `'32mm'`; keep at least 2 px per module on a screen and 0.4 mm on paper), `minVersion` (one symbol size for a set of posters). The symbol is print ink on print paper (`--uix-print-ink` / `--uix-print-paper`) in light, dark, print and forced colours, because scanners read dark on light; it shrinks with its container and stays square. A value too long for a QR code renders a labelled square that says so (`labels.tooLong`, or `UixLabelsProvider` `qrCode`).

  The encoder is the kit's own and has no runtime dependency: `encodeQr(text, { errorCorrection, minVersion, mask })` returns the module matrix (versions 1 to 40, all eight masks scored by the standard's penalty rules), `qrPath(matrix, margin)` the dark modules as one SVG path, `qrDataCapacity` / `qrVersionFor` the capacity table, and `QrCapacityError` is thrown past version 40. Tests decode the output with a reference decoder (jsQR, a dev dependency only) for the products' inputs at every level, every version from 1 to 12 filled to its last byte and a sample up to 40; a Playwright spec decodes the pixels Chromium paints at the smallest documented size in both themes, with print media and in forced colours.

  New stylesheet `styles/components/qr-code.css` (`.uix-qr-code`, `__paper`, `__ink`, `--error`).

- 2245ced: **`QrScanner`** (HAR-1254; SHOPx SHOP-07 receipt scan and SHOP-09 till scan, the public scan page; MOTUS circulation intake): a camera viewfinder for a decoder the product supplies. `decode(frame)` receives `{ imageData, video }` (scaled to `maxFrameSize`, every `interval` ms) and returns the text it read, or nothing; the component makes no network request. `onResult` is called once per new text (`repeatAfter` ms before the same text counts again) and a polite status says "Code read: {value}" once; the viewfinder's corners turn green for a moment (no movement under reduced motion; no decorative scanning line). States (`onStatusChange`): `idle` (the `explainer` and a start button, before any browser prompt), `asking`, `scanning`, `denied` (how to allow the camera again, and Try again), `unsupported` (no camera API), `no-camera`, `no-frame`; a camera the browser already allows starts at once with `autoStart`, one it already refused shows `denied` without a prompt. A hint appears after `hintAfter` ms without a code; a torch toggle where the camera has one; `manualEntry` is rendered in every state. The camera stops on Stop, on unmount and while the page is hidden. Words: `labels` or `UixLabelsProvider` `qrScanner`.

  New stylesheet `styles/components/qr-scanner.css`: the frame is 4:3 while the camera runs and a padded panel in every other state, so no message is cut at 320 px.

- 8b9c9eb: **Quiet status defaults** (HAR-1563, colour K2 of the 2026-10-07 operator review): a status in a dense view is a coloured dot beside a neutral label, outlines use a neutral hairline, and a stat trend is coloured by what the change means, not by which way it moved.

  - `StatusPill treatment`: `'soft'` (the default tinted wash; `'filled'` stays as its alias, so nothing breaks), `'dot'` (`.uix-pill--dot`: no fill, no inline padding, the label in `--uix-neutral-text`, the dot in the tone's `*-solid`; for tables) and `'outline'` (a `--uix-neutral-border` hairline, a hushed label and the tone's dot; only `critical` keeps a toned border). `dot` and `outline` always draw the dot. New tone `progress` (in flight, the `info` blue).
  - `Stat trend.sentiment`: `'positive' | 'negative' | 'neutral'` (`.uix-stat__trend--positive` / `--negative`).
  - In forced-colors mode the pill dot and the toned-stat dot are drawn in `CanvasText`.

  **Visible default changes:**

  - A `Stat` trend without `sentiment` is now neutral grey. It was green for `up` and red for `down` (`.uix-stat__trend--up` / `--down` no longer carry colour). Pass `sentiment` for your metric.
  - `StatusPill treatment="outline"` (`.uix-pill--outline`) now has a neutral border, a hushed label and a dot. It had the tone's colour on the label and a 40 % tone border.
  - A toned `Stat` (`warning`, `danger`) keeps a neutral border; a dot of the tone leads its value. The border was toned.
  - `Alert` tone borders are 24 % of the tone (30 % and 40 % before). The warning icon already used `--uix-warning-text` (6.4:1 on its light tint).

- c1ea985: **`RelationshipGraph` at CMDB topology sizes** (HAR-1387; TENSOR B30 / A6 topology). The layered layout stays (no force layout); what kept the 300- and 600-node maps from reading is fixed, each measured on the 300/600-item harness (six levels, cross, lateral and back edges, a few cycles):

  - **Repeated labels.** A column that takes more than four forward edges says their most common relation once, in its header ("1 hop · 53 · depends on"); only edges that differ keep a label. Hover and focus labels follow the real focus, not the roving tab stop the root holds on load. Drawn labels at 300 nodes: 200 (197 "depends on") → 0. New: `LayeredColumn.edgeLabel`, `RoutedEdge.columnLabel`.
  - **Black fan-out.** A node with more than four forward children routes them as a bus — a trunk in the middle of the column gap, a stub into each target (`RoutedEdge.bus`, `data-bus`) — and edge strokes are opaque, mixed into the map surface, so fifty edges on one trunk stay one grey line. Active edges are drawn last.
  - **Map chrome.** The hint and the zoom level sit on `--uix-surface` with a hairline border; a focused item scrolls clear of the footer.
  - **Flag.** An item flagged "cycle" (`data-flag`) keeps its name clear of the flag.
  - **Descriptions and list.** A node's description names five relationships, then "and N more, listed in the relationship list" (new label `moreRelations`); the hub's went from 2,890 to 298 characters. The list's button names only the node; its neighbours are a `<ul>` beside it under `connectedHeading`, eight until "Show all N" / "Show fewer" (`showAllRelations`, `showFewerRelations`). `connectedTo` is no longer read; a consumer that translated it keeps its words as the heading.
  - **Warning tone.** The warning graph tone uses `--uix-warning-text`: `--uix-warning-border` was 2.9:1 on the map, under 3:1.
  - **Dragging.** Every pointer move of a drag re-rendered every item, edge and list row (95th-percentile frame 100 ms at 300 nodes, 450 ms at 600). A pan or a zoom now only moves the stage (p95 16.7 ms at 600 nodes on the same machine).

- c9c9d2f: **`RelationshipGraph` gaps** (HAR-1639; TENSOR K3 gaps map and CMDB topology, found against 2.31.0). (1) An edge takes `variant: 'dashed'`, a `tone` (`neutral` / `info` / `success` / `warning` / `danger` / `accent`) and a `description`. (2) A node takes a `tone` (its border and a bar on its leading edge); a legend item takes `tone`, `shape` (`edge` / `node`) and `variant`, so the legend matches. (3) `revealId` brings a node into view without moving focus (smooth, or at once with reduced motion, through `useReducedMotion`). (4) The toolbar can be hidden: `controls="none"` (and the compact cluster since 2.45.0) now applies to the radial layout too. (5) No root border without `rootId` (a map with several starting points); `markRoot` overrides. (6) Edge labels that would be drawn over each other are moved apart, top to bottom, and one that would drift too far from its edge is left out (`separateEdgeLabels`, `edgeLabelSize` are exported). (7) The edge layer stays decoration; each node's accessible description lists its relationships, edge descriptions included (`labels.relationTo` / `labels.relationFrom`). (8) An edge across more than one column is a `skip` edge: solid, routed in a channel under every item of the columns it crosses, and neither end is flagged as a cycle; a back edge that closes no loop is `back` (not flagged either); only `cycle` edges flag their nodes. `LayeredEdgeKind` gains `skip` and `back`, so code that switches over it exhaustively needs the two new cases; `LayeredItem.inCycle` is now true for cycle edges only.

  `relationship-graph.css`: tones for edges, nodes and legend swatches, dashed edges, line and box legend swatches.

- fdedd85: **`SchedulingCalendar` day view by resource** (HAR-983; MEDx S10 truthful day view, S13 slot actions, S48 phone day list). With `view="day"` and `resources` (`{ id, label, description? }`) the day is one column per resource on a slot axis of real instants in `timeZone` (a clock-change day is as long as it really is). `resourceSpans` (`{ id, resourceId, start, end, kind: 'free' | 'booked' | 'off', label?, accessibleName? }`) are drawn time-aligned: a free span is cut into bookable slots of `slotMinutes` (default 15), a booking and time off stay whole, overlapping spans share the width, and a time no span covers is hatched "no schedule" — never free, nothing is inferred from missing data. `dayStart` / `dayEnd` set the axis (default `07:00`–`19:00`). `onSelectSlot` receives `{ resourceId, start, end, kind, span }` for a click, Enter or Space on a slot or a booking; `selectedSlot` marks one (`aria-current`). Keyboard: one tab stop; ArrowUp / ArrowDown within a column, ArrowLeft / ArrowRight to the nearest time in the next column that has something to select, Home / End. The time gutter and the heads stay in view while the grid scrolls inside its own box. `loading` shows skeletons on the first load and keeps the spans on screen, dimmed and `aria-busy`, on a refetch; `emptyNote` when there are no spans. Below `resourceListBelow` (default 480 px of the calendar's own width) the day is a list, one resource after another, with "no schedule" rows for the gaps; `resourceLayout` fixes `columns` or `list`. New words (all optional in `SchedulingCalendarLabels`): `resourceGrid`, `availability`, `noSchedule`, `slotName`, `resourceHint`, `noResources`. The model is exported: `resourceDaySlots`, `layoutResourceColumn`, `resourceDayGaps` and their types.

  `scheduling-calendar.css`: the resource day's parts; no kind takes a hue (the band alone does): free is open with a thin bar, a booking filled with a heavy bar and its words, time off quiet words, no schedule hatched; on paper they read the print map.

- 72070db: **`SearchSuggest freeText`** (HAR-2465, TENSOR DF-06 / DR-7): a text field with suggestions that never replaces what the person typed and never submits the surrounding form by accident. The value is the text; Enter without an active row keeps it and is always prevented (also while `loading`); no row is picked unless the person moves to it (ArrowDown / ArrowUp, then Enter) or clicks it, and then its title replaces the text through `onValueChange` without submitting; blur, Tab and Escape keep the text (a second Escape does not clear it). No magnifier is drawn (`.uix-search-suggest--free-text`). `onSelect` is now optional. The search mode is unchanged, as are `Combobox` and `EntityPicker`. Decision record: `Docs/adr/0004-search-suggest-free-text.md`.
- 3144911: **`Segmented selection="link"`** and **`LocaleSwitcher`** (HAR-1380, MOTUS C-12): a language switcher is navigation, not a choice. `selection="link"` renders a `<nav>` (named by your `aria-label`) around a list of links with the same pill look; each `SegmentedOption` takes `href` (and `hrefLang`, `lang`), the one whose `value` is `value` carries `aria-current="page"`, `renderLink` renders them with your router, and every link is its own tab stop (no arrow-key roving). `LocaleSwitcher` (`locales=[{ code, label, href }]`, `current`, `label`) sets `lang` and `hreflang` on each link. In forced-colours mode the chosen segment of any `Segmented` (pressed, checked or current) now keeps an outline; it was invisible there.
- 36ea9a2: **Keyboard shortcuts: `ButtonLink shortcut`, and one screen-reader rule for Button and Tooltip** (HAR-2416).

  - `ButtonLink` takes `shortcut`, like `Button`: hover or keyboard focus shows the keys in a hint above the link (an icon link's `aria-label` before them), so an action that navigates can show its key too. No hint while `disabled`.
  - Screen readers now hear a shortcut once, the same way on every control: as the control's description ("Control+K"; "Command+K" on Apple). A `Button` or `ButtonLink` is described by the hint's spoken keys, after any `aria-describedby` of its own; a `Tooltip` describes its trigger with its text and the spoken keys (a closed Tooltip used to read the glyphs too: "Shift+? Shift ?").
  - **Behaviour change:** the kit no longer sets `aria-keyshortcuts` on a `Button`, `ButtonLink` or `Tooltip` trigger with `shortcut`. Before, a Button exposed its key only there (not announced by every screen reader), and a Tooltip set it beside the description (said twice by those that announce both). An `aria-keyshortcuts` you pass yourself is kept. Menu rows are unchanged (keys in the row's text and `aria-keyshortcuts`).

- a216005: **Sidebar actions and search, `AccountMenu`, the nav-tier hotkey and the phone nav tier** (HAR-1371, batch e7; MOTUS C-2 / B-A13 / B-A15, TENSOR B15 / B31):

  - `Sidebar actions` (`.uix-sidebar__actions`): controls beside the brand (a mode toggle, a "…" `Menu`, collapse-all); hidden in the rail. `Sidebar search={{ label, shortcut, onActivate }}` (`.uix-sidebar__search`): a search row that opens your search or command palette and shows its keys (`KbdCombo`, `aria-keyshortcuts`); showing the keys does not bind them. `Sidebar footer` (`.uix-sidebar__foot`): a slot pinned to the bottom. In the rail the search row and the account trigger are centred icon buttons that keep their names.
  - `AccountMenu user={{ name, sub, avatar, status }} items={…}` (`.uix-account-menu`): the avatar (photo, your node, or the initials, hidden from assistive tech), the name and a second line as the trigger of a `Menu`; `collapsed` for the rail; `placement` (default `top-start`); words through `labels` or `UixLabelsProvider` `accountMenu.menu`. Also `accountInitials()` and `DEFAULT_ACCOUNT_MENU_LABELS`.
  - `AppShell navHotkey="["` switches the sidebar between `full` and `rail`, instantly. The character decides, not the modifiers that typed it (AltGr+8 on Windows, Option+5 on a Mac); ⌘, Ctrl without Alt, key repeat, typing in a field or a contenteditable, and an open modal dialog never switch it. `AppShell` keeps the tier itself when `nav` is not set (`defaultNav`), and reports it through `onNavChange`; `navTierStorageKey` remembers it in `localStorage`, applied before the first paint (and reported once, so your `Sidebar nav` can follow).
  - `AppShell phoneNav="drawer"` (`[data-phone-nav]`; the default with `layout="viewport"`, `phoneNav="none"` to keep the column): at 40rem and under the sidebar column goes and a menu button (`.uix-shell__nav-button`, at the start of the topbar or the top of main) opens the sidebar in a start-side `Drawer`, always full (a rail chosen on a wide screen does not carry over), and kept until its close transition ends; Escape closes it and returns focus, following a link closes it. Words: `openNavLabel` / `navigationLabel` or `appShell.openNav` / `appShell.navigation`.

  All additive; a shell without these props renders as before.

- 5092f0f: **`SortableList`** (HAR-1375, MOTUS C-16 photo order; TENSOR preset and start-page order): a list the person reorders, over the new `.uix-sortable` stylesheet. `items`, `getId`, `getLabel`, `renderItem(item, { index, count, dragging })`, `onReorder(orderedIds)`. Each row has a grip to drag with a pointer (the rows reorder live, the row lands under the pointer, one `onReorder` per drag) and Move up / Move down buttons that are always there, disabled at the ends; Alt+↑ / Alt+↓ move the focused row from anywhere in it, a focused grip moves with ↑ / ↓. Focus stays with the moved row (a move button that became disabled hands it to the other one), and a polite status says "{label} moved to position {position} of {count}". Nothing animates: keyboard moves are instant and a drag follows the pointer. Words from `labels` or `UixLabelsProvider` `sortableList`. On a phone the two move buttons stack, so the content keeps its width.

  The reorder model is shared (`placeId` is exported): `ViewMenu`, `SavedViewMenu` and `NavFavourites` use the same helpers and drag hook. `NavFavourites` gains a `moved` label: its move announcement was English only.

- dc3679e: **The staff shell from UIx options, not local overrides** (HAR-1815; workspace ADR-0047: MOTUS staff UI = TENSOR):

  - `AppShell layout="viewport"` (`.uix-shell--viewport`): an application shell, not the framed demo box. No border or radius, `100dvh`, no fixed top-bar row (the sidebar and main run the full height; a `topbar`, when given, takes its own height at the top of the main column), main padding `space-7 space-6 space-6` widening to `space-8` at the sides from 80rem, and below 40rem one column with the sidebar hidden (the phone nav tier). `layout="frame"` (default) is unchanged.
  - `PageHeader size="display"` (`.uix-page-header--display`): the staff type preset — a 40 px heading-font title (`--uix-text-display`, leading 1.05, weight 600, tight tracking; the h2 size below 40rem), a bold hushed eyebrow, a body-size hushed subtitle up to 42rem, and the row aligned to the bottom.
  - `DetailPage variant="staff"` (`.uix-detail-page--staff`): the title at h2 / 1.15, the back link an inline hushed link without an underline, each metric an eyebrow label over a regular-weight, tabular h3 value.
  - `SectionHead size="compact"` (`.uix-section-head--compact`, `.uix-section-title--compact`): 15 px / 1.3 / 600 for an in-card section; `SectionHead as="h3"`.
  - `CellSub tabular` (`.uix-cell-sub--tabular`): tabular numerals for read-back codes. New `CellSubProps` type.

  All additive; defaults unchanged.

- c06a95f: **A `Stat` link tile looks like a link at rest** (HAR-1803; MOTUS UXR-32): a tablet has no hover, so `Stat href` now draws a trailing chevron (`.uix-stat__go`, the kit's `ChevronRightIcon`) in its label row. An in-place action tile (`onActivate` with `haspopup={false}`) gets `.uix-stat--action`, which underlines its value with a dotted line; dialog and menu tiles keep their down chevron. All three are shapes, visible without colour and in forced colours. A plain figure tile is unchanged. The hover tint of interactive tiles applies only under `@media (hover: hover)`.

  Visible change: link tiles and in-place action tiles look different at rest (a chevron, a dotted underline).

- a752d1c: **`StatRow`** (`.uix-stat-row`, review of HAR-1803): a row of `Stat` tiles that reflows — as many side by side as fit at 8.5rem each (12rem with `.uix-stat-row--hero` or once a hero tile is in the row; `minTileWidth` / `--stat-row-min` to choose), down to one per row on a phone. A fixed six-column row broke labels letter by letter at 320 px. Stat labels now use `overflow-wrap: break-word`, so a word wraps whole and breaks only when it alone is wider than the tile.
- f23be77: **`TagInput`** (HAR-1377): several short tags in one field, over the existing `.uix-taginput` / `.uix-tag` CSS. Enter or a comma adds a chip, a paste of "a, b, c" adds three; a duplicate (ignoring case and accents), a `validate` refusal or one past `maxTags` keeps the text and says why; `suggestions` open in a top-layer list once the person types or presses ArrowDown (Enter adds the active one, Escape closes it); Backspace in the empty field reaches the last chip, ArrowLeft / ArrowRight move between chips, Backspace or Delete removes one and focus stays with the tags (the field is the only tab stop); each change is announced politely. Works in `Field`; `name` submits one hidden value per tag; words via `labels` or the new `UixLabelsProvider` group `tagInput`. CSS: `.uix-taginput-field`, `.uix-taginput__message`, `.uix-taginput__popup`, the invalid and disabled states, and a long tag wraps inside its chip.
- 063ed81: **`TimePicker`** (HAR-1835): a time of day (`HH:mm` or `null`) beside `DatePicker`, so no product renders `<input type="time">`. The field shows the locale's clock (24 h in `de`, 12 h in `en-US`, `hour12` overrides) and reads a typed time on Enter or blur (`1430`, `14.30`, `9`, `2:30 pm`); ArrowUp / ArrowDown step the hour or the minutes under the caret (minutes to the next `minuteStep`), PageUp / PageDown the hour, Alt+ArrowDown opens a list of the times at `minuteStep` between `min` and `max` (a listbox in a top-layer popover; Enter picks, Escape closes it and returns focus). A time that cannot be read, or one before `min` / after `max`, marks the field invalid and says why (`onInputProblem`). `name` submits through a hidden input; `id`, `required`, `invalid`, `disabled`, `readOnly`, `size`, the `aria-*` of a `Field`; words via `labels` or the new `UixLabelsProvider` group `timePicker`. The pure helpers are exported (`parseTimeInput`, `formatTimeKey`, `stepTime`, `timeSlots`, …).

  `DateTimePicker` uses it for its time part (it rendered a native time input). Its `minuteStep` now defaults to 15 and steps the arrow keys and the list; any typed minute is still kept. New prop `timeLabels`. CSS: `.uix-time-picker`, `__input`, `__popover`, `__list`; the time part keeps `.uix-date-time-picker__time`.

- 9006caa: **`Tree`: each treeitem is named by its own row, not by its whole subtree** (HAR-1828). A treeitem had no `aria-label` / `aria-labelledby`, so its name came from its content, nested group included: once expanded, "Grace Hopper" was announced (and matched by `getByRole('treeitem', { name })`) as "Grace Hopper Alice Lovelace Bob Builder …". Each row is now `aria-labelledby` its own `.uix-tree__label` (an id scoped to the tree, so two trees never share one), in the nested and the virtualised tree and for the loading and error rows. New `TreeNodeData.ariaLabel` names a row whose `label` is rich (an avatar, a name and a meta line) by just the part that should be spoken. TENSOR's portal org chart (HAR-1486) can swap to the kit Tree after the bump.
- b95518e: **`useVirtualRows` measures the rows' real pitch** (HAR-1829). New option `measureRows`: a selector for the mounted data rows inside the container (e.g. `'tbody > tr[data-row]'`). With it the hook sizes its spacers and window from the rows' mean `offsetHeight` instead of trusting `rowHeight`, which becomes the first-paint estimate. A row's height comes from CSS and content (kit padding, a second line, density): TENSOR's virtualiser was told 32 / 44 / 56 px while its rows rendered at 51 / 63 / 75 px, which gave short spacers, a short scrollbar and a window that drifted away from the rows on screen. It measures when windowing starts, when `rowHeight` changes (a density switch) and when the container resizes, never while scrolling, so the spacers do not move under the reader. The result now has `rowHeight`, the height in use, to scroll a keyboard-focused row into view. Without `measureRows` nothing changes. Unblocks TENSOR HAR-1463.

### Patch Changes

- b4f426d: Review fixes for the overlays-and-keyboard batch:

  - **Tabs**: a pill row with one long unbroken word no longer widens the page (`.uix-tab` breaks it with `overflow-wrap: anywhere`; the pill row is `inline-flex`, sized by its min-content). In forced colors a focused, selected pill shows its focus ring rather than the selected outline.
  - **Popconfirm**: the step takes Escape on its own React `onKeyDown`, after the controls inside it, so an expanded disclosure inside the step no longer lets Escape reach (close, or ask "Discard changes?" in) the Drawer or Modal around it. An Escape that ends an IME composition is left alone, so a typed reason is not lost. With `closeWhenAnchorHidden`, focus that was in the step goes back to the anchor without scrolling, and a step whose field holds text stays open when its anchor scrolls away.
  - **ConfirmDialog type-to-confirm**: the field has `autocapitalize="none"` and `autocorrect="off"`, so a phone keyboard does not turn the first letter into a mismatch; the mismatch message reserves its own wrapped height, so the footer stays put also when it wraps (a long value, German).
  - **Tooltip**: documented that an open bubble takes the first Escape, also on a combobox-style trigger.

- 7249cfd: Review fixes for the data-and-editing batch (PR #168) in components that were already released:

  - **Search folding** (`foldForSearch`, SearchSuggest, CommandPalette, Combobox filtering): đ, ø, ł, ı, ħ and ŧ fold to the letter people type (d, o, l, i, h, t), so "Dordevic" finds "Đorđević".
  - **CommandPalette**: in forced colours the active option keeps a `Highlight` outline. A pointer press that starts in the panel and is released on the backdrop (selecting text, a drag) no longer closes the palette.
  - **FilterEditor**: a reference search's "Searching…" follows the kit pending rule (after 300 ms, then at least 500 ms) and sits below the results in one live region that stays mounted, so the results do not jump. A range typed the wrong way round (number or date `between`, `date-range`) is applied in order instead of matching nothing; `dateFilterBounds` and `summarizeFilter` read such a value in order too. Another `field` starts a fresh body (search, typed tag), and a tag typed in a tags field no longer leaks into Apply after the field changed kind.
  - **TableWrap / table.css**: `TableWrap` measures whether its table overflows sideways and sets `data-overflow="true" | "false"`; frozen columns (`pinnedCol`, `pinnedActions`) draw their divider only when the wrap overflows (plain HTML without the measurement keeps the dividers). New `--uix-selcol-w` (44px) on `.uix-table` names the selection column's width.
  - **ViewMenu, SavedViewMenu** (the shared row drag): the draft order lasts only while a drag does, so an order the consumer refuses does not stay on screen; a cancelled pointer (`pointercancel`) and Escape during a drag put the rows back and report nothing, and that Escape does not also close the menu.

- fdb32be: Review fixes for the batch 5 display components (PR #166):

  - **SchedulingCalendar resource day** (HAR-983): hour lines only; a free slot is open paper with no box and no words at rest, and shows the ghost surface and "+ 08:15" on hover (pointer devices) and keyboard focus; a booking is the time grid's own entry chip (`entry` + `tg-item`), heavy only when selected; "no schedule" stays hatched; slots are 2.75rem tall under a coarse pointer. Two bookings at the same start are two items: one tab stop and one `aria-current` (stops were keyed by start).
  - **QrScanner** (HAR-1254): the first render is `idle` on the server and in the browser (it rendered `unsupported` on the server: a hydration mismatch); a new `facingMode` while scanning switches the camera (it left a black frame); a read is cleared when the camera goes, so a refused or lost camera is announced.
  - **QrCode** (HAR-1251): the "too long" state is words, not an `img` named like a working code; optional `eci` marks non-ASCII text as UTF-8 (ECI 26); a `minVersion` that is not a finite number throws a `RangeError` instead of reading as "too long"; `DEFAULT_QR_CODE_LABELS` is exported.
  - **CodeDisplay** (HAR-1253): `size="lg"` fills its container and scales a three-by-three code to fit one line (down to the h2 size) instead of breaking it in a card at 320–360 px.
  - **ContactCard** (HAR-1379): `telHref` puts an extension ("ext. 12", "x12", "#12", "lok. 12") after the number as `;ext=` instead of dialling it.
  - **PrintLayout** (HAR-986): the screen preview is the page at its true width and print type size, scaled down whole to the room it has (it reflowed narrower at one page's height, so a poster that prints on one page was reported as overflowing at 320–390 px); the page sits in a `.uix-print-preview` box. The overflow measure subscribes once per page shape instead of on every render.

- b4e9b87: **Safari: an Escape that closes a popover inside a Drawer or Modal no longer closes the dialog too** (HAR-2417). WebKit hands one Escape both to an open light-dismiss popover and to the dialog around it (a `cancel` after the popover closed), where Chromium and Firefox give it to the popover only: in Safari a clean drawer closed together with its help popover, and a dirty one asked "Discard changes?". The dialog now treats a `cancel` that arrives in the same task as a popover's light dismiss as the popover's. Found by running the 2.42.0 browser specs (description list, discard step, search bar, shortcuts) in Firefox and WebKit, which CI's cross-browser job now does.
- 4e3b663: **`DatePicker` and `DateRangePicker mode="field"`: an Escape pressed right after the calendar opened no longer reaches what is around the field** (HAR-2389). The field decided whether Escape was its own from React state that follows the popover's `toggle` event, which the browser queues: in the moment between the calendar opening and that event (seen under CI load), the Escape closed the calendar _and_ reached the page, so a Drawer or Modal holding the field could treat it as its own. The field now asks the popover itself whether it is open.
- 2a0c5b5: **Form fields, after review** (HAR-1376, HAR-1377, HAR-1835, HAR-1834, HAR-1588, HAR-1812, HAR-1575).

  - **`PasswordInput`.** Toggling the reveal keeps the caret and selection where they were. Chrome used to move the caret to the start, so typing went on there. At `lg` the toggle is a 44 px target; it still looks 36 px.
  - **`TagInput`.**
    - Adding goes as far as it can. A paste or a typed list adds every piece up to the first refusal (a duplicate, `maxTags` or `validate`). It fills `maxTags` up to the cap, and the refused piece and the rest stay in the field with the reason.
    - The chips are a named list (`role="list"`, labels `list`, `count`), and the field's description says how many there are.
  - **`OtpInput`.**
    - A paste is inserted at the caret, up to `length`, and replaces the code only when the whole code is selected. A paste with nothing usable in it changes nothing.
    - Full-width digits count.
    - There is no `maxLength` any more, so autofill no longer cuts "ABCD-EFGH" before cleaning.
    - The digits run left to right in an RTL page, and a cell can shrink to 20 px, so 8 cells fit a phone card.
  - **`TimePicker`.**
    - Enter and the arrows during an IME composition are left to the composition, and "１４：３０" is read.
    - A `min` after `max` (22:00 to 06:00) is an overnight range: the list, the keys and the check wrap midnight, and the new `outside` label applies.
    - With no locale from a prop or the provider, the server and the first client render write a neutral 24-hour time. The viewer's clock follows once mounted.
    - New exports: `isOvernightRange` and `timePartEnds`.
  - **`DateTimePicker`.** It takes `hour12`, and the `Field`'s hint and error describe the time too.
  - **`EntityPicker` / `SearchSuggest`.** Disabling the picker during a search ends its busy state, and a disabled field shows no spinner.
  - **`Combobox`.** "No match" is announced: its status region is mounted empty and then filled.
  - **`Select size="lg"`.** It keeps 44 px of end padding for its chevron (it was 64 px).
  - **`FilterPopover`, for consumers' end-to-end tests.** With `type="select" | "enum" | "boolean"` the control is now a `<button role="combobox">` that opens the kit's list. A hidden native select only carries the form value. Playwright `selectOption()` on the old native select no longer works: click the trigger, then the option (`getByRole('option', { name })`).
  - **The native-select gate.** It now skips comments, scans `.ts` as well as `.tsx`, and also catches `createElement('select')`, `h('select')` and `jsx('select')`.

- f38c222: **An Escape that closes a hover hint no longer reaches the Drawer or Modal around it** (HAR-2415). In a Drawer or Modal, one Escape meant to dismiss a `Tooltip`, an `InfoTip` panel, a `Button` shortcut hint or a hover card (`Popover openOnHover`) also acted on the dialog: a clean dialog closed, a `dirty` one opened its "Discard changes?" step. While a hint is open, its Escape is now taken in the capture phase and cancelled, so it closes only the hint; the next Escape is the dialog's. Focus does not move (an InfoTip still returns focus to its ? when focus was in the panel).
- a797ad7: **No browser dropdown anywhere in UIx** (HAR-1575, operator review 2026-10-07). `RuleBuilder` (the all/any combinator, each condition's field and operator, each action's type), `BrandProfiles` (the profile) and `FilterPopover` (`type="select" | "enum" | "boolean"`) render the kit `Select` instead of a native `<select>`; values, events and labels are unchanged, and every choice is keyboard-driven as in `Select`. A rule builder's field and operator columns now grow to their longest label before the value column takes the rest, so "is greater than" is no longer cut off. The docs and `tables.html` use the real Select markup (its saved-view menu and its inline priority and assignee edits included), and the docs' Select specimens fire `input` and `change` on their form proxy like the React one. Gates: `packages/react/src/no-native-select.test.mjs` (static: React sources, docs, guide and every tokens page) and a sweep of every explorer route in both themes in `tests/a11y/a11y.spec.mjs` (runtime).
- 8fe7118: **`Tree` indents its levels again**: `.uix-tree ul { padding: 0 }` beat `.uix-tree__group`'s indent, so every nested row of a non-virtual tree sat at the same x as its parent (levels 5+ kept their guide line). The group rule is now scoped under `.uix-tree`. Found while checking HAR-1828's org chart in a browser.

  **`Tabs` (line)**: the underline moves at once while the keyboard is in the tab row (arrow keys switch tabs many times a minute); a pointer choice keeps the short slide, and reduced motion has none.

- d73d3b7: **Segmented: the selected option is a visible boundary** (review of HAR-1372): its lifted fill was only 1.05:1 (dark) and 1.09:1 (light) against the track, so the selected option now also draws an inset `--uix-text-muted` hairline (4.9:1 light, 7:1 dark on the track; WCAG 1.4.11). The weight stays, so selecting never shifts the options beside it. Visible change for every `Segmented` / `.uix-segmented` (ThemeSwitcher, DisplayPreferences, view toggles).
- 13bee4f: **The status colour policy** (HAR-1564, colour K3 of the 2026-10-07 operator review): docs → Foundations → Status colour (`explorer.html#status-colour`). Neutral is the default for every lifecycle state; blue is in flight, green a positive outcome worth noticing, amber attention soon, red failed / breached / blocked and actionable now; a solid fill only for SEV-1. Treatment by surface (table `dot`, header `soft`, flag `outline`), a colour budget (one filled hued pill per row, three hues per screen, filled hues on at most 30% of rows), trends by sentiment, and the dark-mode targets. With a mapping matrix and the same ITSM queue rendered both ways. The Status pill, Alert, Stat tile, Scheduling calendar and Scheduling timeline pages link to it; `Docs/design-system.md` has the summary. Documentation only.
- 61b3635: **`Tab` renders `type="button"`, so a `Tabs` strip inside a `<form>` no longer submits it** (HAR-1764). A `<button>` with no type is a submit button: every click on a tab, and every arrow key in automatic activation (which clicks the tab), sent the surrounding form. TENSOR's article editor can drop its `preventSubmit` workaround after the bump.

  Every other kit `<button>` that is not meant to submit was checked: the three `Peek` buttons (previous, next, close) had no type either and now say `type="button"`; all the others (pager, tab-strip scroll buttons, `Segmented` options, `Chip`, `Steps`, menus, pickers, toolbars …) already did. `Button` keeps the HTML default on purpose: it is the generic button, and `<Button type="submit">` or a plain `<Button>` in a form behaves as a `<button>` does. A new source scan (`button-type-scan.test.mjs`) fails on any other kit `<button>` without a type.

- df9a5e6: **`Tabs overflow="wrap"` (the default) wraps the tab row** (HAR-1754). `.uix-tabs` was a flex row without `flex-wrap`, so tabs that did not fit shrank and wrapped their labels inside each tab, and at 320 px a tab row could still push the page sideways (TENSOR's routing settings: 44 px). The row now wraps onto more rows in all three variants, and no tab is wider than its row (`max-width: min(16rem, 100%)`, and an unbroken word breaks inside its tab), so one long label wraps inside its tab. A row that fits is unchanged; `overflow="scroll"` keeps its single scrolling row. TENSOR can drop its `.incident-related__tabs` rules after the bump.

  In forced-colors mode the selected tab of the `line` and `pill` variants had no cue at all (the underline and the fill are backgrounds, which the mode removes): the underline is now drawn in `SelectedItem` and the selected pill gets an outline. Tab hover only applies where the pointer can hover. The Tabs reference page shows a wrapped row.

- e6cc8ac: **One title → secondary-text rhythm** (HAR-1577, operator review 2026-10-07 point 7): `List` (`.uix-list__title` + `__meta`), `Attachment` in plain markup (`__name` + `__size`), `Media` (`__name` + `__meta`) and `NavItem` (`__label` + `__desc`) now put `--uix-space-1` (4 px) between a title and its secondary line, like Alert, Card, Chart, Contact, Inbox, ToggleRow, Pipeline and Toast already did. They had 0 px of box gap (line-height only). `.uix-attachment__name` and the Media name/meta are block-level, so `<span>` markup stacks too. Mechanical per-component rules, no new class; 4 px, since no operator answer on 2 px for dense lists came in (Search suggest keeps its 2 px).

  Visible change: those four secondary lines sit 4 px lower.

## 2.47.0

### Minor Changes

- 8fba59b: State feedback on the latency ladder (motion rollout WP2: HAR-2580, HAR-2581, HAR-2582). Nothing new shows for the first 300 ms of an action; a pending indicator then stays at least 500 ms; an in-place result holds 1.5 s.

  - `useDelayedPending(pending, { delay, minVisible })` and the constants `PENDING_DELAY_MS` (300), `PENDING_MIN_VISIBLE_MS` (500), `RESULT_HOLD_MS` (1500).
  - `Button loading` now blocks presses at once but shows its spinner only after 300 ms, held at least 500 ms, and keeps the button's full colour instead of the 50 % dim (`loadingDelay={0}` for the old instant spinner; plain markup `data-loading` is unchanged). `Button` stays server-renderable: the timers live in a client child.
  - `Button result` (`'success' | 'error' | null`) and `resultLabels`: a check or alert mark and words crossfade over the label for 1.5 s after an action, announced through a polite region outside the button (in the nearest dialog, else the body), with the button's width held to its widest wording; an icon-only button shows the mark alone. Set `result` to `null` when an action starts. `UixLabelsProvider` `buttonResult`; `DEFAULT_BUTTON_RESULT_LABELS`; types `ButtonResult`, `ButtonResultLabels`.
  - Migration: the React `Button` no longer renders `data-loading`; while `loading` it carries `data-pending` (at once) and a hidden `[data-uix-btn-busy]` marker child (after the delay). A selector or e2e wait on `button[data-loading]` should use `[aria-busy="true"]`. Any `loading` prop (even `false`) adds that hidden first child.
  - `SaveStatus delay` (default 300 ms): a fast save goes straight to "Saved"; `delay={0}` restores every state at once.
  - `Spinner delay` and `LoadingState delay` (`true` = 300 ms).
  - `BusyRegion busy` and `TableWrap refreshing`: a refetch keeps its rows, dims them under an indeterminate bar and sets `aria-busy`; under reduced motion the bar breathes instead of sweeping; right to left it sweeps leftwards. `BusyRegion` wraps its children in `.uix-busy-region__content`. New stylesheet `components/busy-region.css`.

## 2.46.0

### Minor Changes

- 9bc43b6: The motion contract and its gate (HAR-2578, motion rollout work package 1, part A). The canonical vocabulary is the docs Foundations → Motion page.

  - **New tokens (additive):** exit durations `--uix-dur-exit-fast` (80 ms), `--uix-dur-exit` (110 ms), `--uix-dur-exit-slow` (160 ms), about two-thirds of each enter; `--uix-delay-tooltip` (400 ms) and `--uix-delay-tooltip-skip` (300 ms); loop durations `--uix-loop-spin` (600 ms), `--uix-loop-progress` (1200 ms), `--uix-loop-shimmer` (1400 ms), `--uix-loop-ping` (1600 ms), `--uix-loop-blink` (1100 ms), `--uix-loop-pulse` (2000 ms); `--uix-dur-highlight` (2400 ms). No value of an existing token changed. `--uix-ease-in-out` keeps `cubic-bezier(.77,0,.175,1)`; the spec's unshipped `.4,0,.2,1` was corrected to it. `--uix-ease-in` stays for compatibility but must not be used: an accelerating exit reads as lag.
  - **Gate `check-motion.mjs` in `test:contract`:** fails on a raw time value, `transition: all`, an ease-in curve, an animated layout property (width, height, inset, margin, padding, grid tracks, box-shadow), an infinite or moving animation with no `prefers-reduced-motion` rule for its selector, and a `:hover` that moves or reveals outside `@media (hover: hover) and (pointer: fine)`. Every raw time in the kit is now a token.
  - **Reduced motion keeps feedback:** under `prefers-reduced-motion: reduce` transitions keep only fades and colour changes (transform and layout glide drop out), instead of every transition being cut. Spinner, Button loading, Skeleton, indeterminate Progress, SaveStatus, a running Flow node and Heartbeat pulse slowly (`uix-pulse`) instead of freezing. Product keyframes still end at once.
  - **`useReducedMotion()` and `prefersReducedMotion()`** (new exports) for motion that JavaScript drives.
  - **`Modal instant`** opens and closes with no animation (`[data-uix-instant]`); `CommandPalette` marks the dialog or popover it sits in itself, so a palette in a plain `Modal` no longer animates for 240 ms. `[data-uix-cmdk-dialog]` still works.
  - **Hover gating:** card lift, kanban lift, the avatar edit overlay, the inline-edit pencil, view-menu grips and the legacy `[data-uix-tip]` move or reveal on hover only on a fine pointer. **Table row actions, the pin, the id-cell arrow, the cell-edit pencil, the sidebar star and the favourites menu trigger are now visible at rest on touch screens**; on a fine pointer they still reveal on hover or keyboard focus.
  - **No layout animation:** `Meter` and `Progress` move on `transform` (the React components set `--val`; a legacy inline `width` still works, without motion). The AppShell nav tiers and sidebar nav groups switch instantly instead of animating grid tracks. Box-shadow changes step instead of animating (focus rings appear instantly). `.uix-arrival` fades an outline instead of a box-shadow.
  - **Toast exit** runs at `--uix-dur-exit` with ease-out instead of ease-in.
  - PR template: a Motion line. Spec §5.9 corrected (no more ease-in exits).

## 2.45.1

### Patch Changes

- aab6ac5: Two narrow-width fixes found in TENSOR.

  - **`RelationshipGraph` `controls="compact"` (TENSOR HAR-2512):** the hint ("Drag to move · Ctrl + scroll to zoom"), the zoom level and the icon cluster no longer overlap. The hint was positioned on its own, capped at `100% - 15rem` and hidden only below a 640 px _viewport_, so on a 500–600 px map on a wide screen the zoom level was drawn over the end of the hint (a 574 px map beside side cards at 1280 px; measured: the boxes intersected at every map width from 280 to 574 px). The three now share one row, `.uix-relationship-graph__footer`, along the map's bottom edge: the hint takes only the room the controls leave (ellipsis, then hidden below a 24rem row), then the zoom level gives way (hidden below 17rem), and the cluster always stays. The row lets the pointer through to the map. `tests/a11y/relationship-graph-map.spec.mjs` measures the three boxes at twenty map widths from 280 to 1200 px, in German and English.
  - **Rich-text toolbar (TENSOR HAR-2511):** the toolbar wraps its groups onto more rows instead of scrolling sideways inside the field. On TENSOR's incident form at 320 px the field is 238 px wide and its 21 tools sat in a 701 px row, about two thirds of them behind a sideways scroll. A group that starts a row draws no separator; a group wider than the row wraps its own tools. In the composer the tool row asks for one row, so the counter and `toolbarEnd` wrap below it first and the tools then wrap across the whole bar. The field's first tool now sits 4 px from the frame (was 8), so its icon lines up with the text below it.
  - **Rich-text placeholder (TENSOR HAR-2511):** a long placeholder grows the editor instead of running out of it over whatever follows the field. It still floats, so the caret stays at the start of its first line.

## 2.45.0

### Minor Changes

- 7e00589: `RelationshipGraph` layered mode gets map controls (TENSOR HAR-2501). `controls="compact"` replaces the eight-button toolbar with an icon cluster in the map's corner (zoom in, zoom out, fit, reset, full screen, each with a tooltip) and the zoom level; the map takes keyboard focus (arrows pan, `+`/`−` zoom, `0` resets, Escape leaves full screen), a plain wheel keeps scrolling the page and says how to zoom, and full screen covers the page. `controls="none"` hides the controls (HAR-1639 item 4). `initialView="fit"` opens with every item in view. New labels: `fullscreen`, `exitFullscreen`, `navigationHint(modifier)`, `viewportKeyboardHint`. New icon: `ScanIcon`. The defaults (`controls="full"`, `initialView="readable"`) are unchanged.

## 2.44.1

### Patch Changes

- 4986af0: `DashboardCanvas` below 36rem (TENSOR HAR-2443): an item taller than one row no longer runs over the items below it. The one-column rule set `grid-auto-rows: auto` on the canvas from inside the canvas's own container query, which a container query cannot do, so every item kept one 5rem track and drew its extra rows over the next item. Each item now spans as many fixed rows as it has on the wide canvas, so it is exactly as tall as there and the next item starts below it. The narrow test in `tests/a11y/dashboard-canvas.spec.mjs` now checks every item's height and that each starts below the one before.

## 2.44.0

### Minor Changes

- 3ce3874: `DashboardCanvas` (HAR-2441, for TENSOR HAR-1823): a free dashboard layout on twelve columns. Each item has a place and a size in grid units (`{ col, row, w, h }`, optional min/max). In edit mode an item is dragged by its move handle and resized by its corner handle, both snapping to whole cells and pushing what they land on downwards; the arrow keys on a focused handle do the same one step at a time, and a polite live region says where the item went. Below 36rem of its own width the canvas is one column in reading order. The pure model behind it is exported for an item menu: `placeCanvasItem`, `moveCanvasItem`, `resizeCanvasItem`, `normalizeCanvas`, `compactCanvas`, `canvasReadingOrder` and friends. New stylesheet `components/dashboard-canvas.css`.

## 2.43.1

### Patch Changes

- 216f87f: `OrgChart` initials (HAR-1807): bracketed parts and titles are no longer initials. "Tenant Admin (dev)" showed "T(", "[TST] Sofia Rossi (acme)" "[(" and "Dr. Anna-Maria Koenig" "DK"; they now show "TA", "SR" and "AK". A word that ends in a full stop before the last name ("Dr.", "Prof.", a middle initial) is skipped, and the first letter of a word is its first letter in any script, never a quote or bracket in front of it.

  `Drawer` and `Modal`: `onClose` gets the click again. Since 2.42 the close button, a `DialogClose`, the drawer's backdrop and "Discard" called `onClose()` with no argument, so a consumer that tells a person's close request (an event) from the browser closing the dialog by itself (no argument) stopped reacting to the close button: TENSOR's `ConfirmAction` ignored it while the dialog was still open. `onClose` is now typed `(event?: DialogCloseEvent) => void`; Escape on a clean dialog and `<form method="dialog">` still call it with no argument, as before 2.42.

## 2.43.0

### Minor Changes

- 0df2c82: New `OrgChart`: reporting lines as a top-down chart of person cards (HAR-1807; TENSOR's People directory had only an indented list).

  - **Cards:** photo or initials (`Avatar`), name, title, team, location, an optional `badge` ("You"), and the number of direct reports, which is also the control that shows or hides them.
  - **Lazy reports:** `loadChildren(node)` runs the first time a person is opened, with a loading row and a retryable error row in place of the reports. A controlled `expanded` opens a whole reporting line; `revealId` scrolls to and focuses a person once their card exists (search), then calls `onReveal`.
  - **Compact:** a row of people without reports of their own stacks in one column (`stackLeaves`, default true).
  - **Frame:** zoom 25–150 % around the centre, Fit to width, reset, drag-to-pan; opening a manager keeps their card in place; a wide chart stays centred on its top until the reader moves it.
  - **Narrow:** below 48rem of the chart's own width (container query) it becomes an indented vertical tree.
  - **Keyboard:** a WAI-ARIA tree with one tab stop whose arrows follow the picture in the chart (↑ manager, ↓ reports, ← → along a level) and are the tree keys in the list; Enter opens a person, Space shows or hides their reports, a letter jumps to the next name. A failed load is announced.
  - **Words:** `labels` or `UixLabelsProvider` `orgChart`; English defaults in `DEFAULT_ORG_CHART_LABELS`.
  - **Tokens:** a new `components/org-chart` module.

## 2.42.0

### Minor Changes

- 986d0d4: **`Drawer` and `Modal` ask before throwing away unsaved input** (HAR-2029, TENSOR audit UXC-01). New props `dirty` and `pending`:

  - `dirty` (e.g. react-hook-form's `formState.isDirty`): Escape, the close button, a backdrop click (Drawer) and a `DialogClose` open an anchored "Discard changes?" step with focus on "Keep editing". Keep editing returns focus to where it was; Discard calls `onClose`. A clean dialog closes at once, as before.
  - `pending` (a save in flight): none of them does anything; the close button is `aria-disabled`.
  - **`DialogClose`**: a `Button` for the footer's Cancel that goes through the same guard (the step opens against it).
  - Words: a new `UixLabelsProvider` group `discardPrompt` (`title`, `description`, `keepEditing`, `discard`), or `discardLabels` on one dialog.
  - Escape is taken on the dialog's keydown after the controls inside it (an open Select still closes its list first), so repeated Escape presses never close a dirty dialog, whatever the browser's close-watcher rules. If the browser still closes a guarded dialog by force, it reopens and asks.
  - `useDialog(open, onClose, keepOpen?)`: the optional `keepOpen` is asked before a native close is passed on.
  - The Drawer's close button is now styled by `.uix-drawer__close` (it had inline styles); `.uix-drawer__close` and `.uix-dialog__close` are dimmed while `aria-disabled`.

  Products that passed `dismissOnBackdrop={false}` to keep a form drawer open can pass `dirty` instead and drop it.

- f79cd4f: **`.uix-dl` / `DescriptionList` stack when narrow** (HAR-2032, TENSOR audit UXC-04): below 22rem of the list's own width each label sits above its value and both take the full width, so a long label ("Neue Tickets pro Person und Stunde") no longer squeezes the value to a letter per line or pushes it off a 320 px screen. It is a container query on the list itself, so a 20rem side rail stacks at desktop width too, and a wide card keeps its label column. Products that stacked the list with a local override (TENSOR's `STACK_ON_A_PHONE`, HAR-1651) can delete it.

  Where it stacks now: a phone card, a 20rem side rail, and always in a `DetailLayout` side column (280 px, which leaves the list about 230 px). A peek or drawer (about 380 px of list) keeps its label column.

  The list is an inline-size container for this, so its content no longer sizes it:

  - In a box sized by its content it is now **12rem wide, and stacked**, where it used to be as wide as its content: a flex row, the kit `Popover` or a hover card, a rich `Tooltip` (`max-content`), an auto-layout table cell, `inline-block`, a float, a column flexbox that does not stretch its children (`align-items: center`), a grid track sized by content. Give the list `flex: 1` or a width there.
  - Its minimum width is 12rem too, where it used to be its longest label plus a gap, so a long label no longer pushes a phone page sideways through a parent grid with `auto` tracks.
  - Inside a value, an unnamed `@container` query or a `cqi` / `cqw` unit (Tailwind v4's `@sm:` variants) now measures the list, not the container outside it. Name the container you mean (`@container/card`, Tailwind `@sm/card:`).
  - Label/value pairs wrapped in `display: contents` `<div>`s stack too. The stacked label is pulled 8 px toward its value, which assumes the default 12 px row gap.

- b683e6a: Five gaps MOTUS and TENSOR worked around locally:

  - **`Button` / `ButtonLink` `wrap`** (HAR-1813): a long label may wrap. The size becomes a minimum height (`.uix-btn--wrap`), so a human-language label breaks onto a second line in a narrow or 200 %-zoomed column instead of widening it (WCAG 1.4.10). Opt-in; icon-only buttons keep their square and every other button is unchanged.
  - **Anchored overlays under CSS `zoom`** (HAR-1798): `useAnchoredPosition` (Select, Popover, Popconfirm, Tooltip, menus) places in on-screen pixels and divides by the effective zoom when it writes, and `Select` sizes its list from the trigger the same way. Under `html { zoom: 2 }` a list opened low on the page used to land at twice its offset, below the viewport, and twice as wide as its trigger.
  - **`ContentList` titles and meta** (HAR-1811) break an unbroken word (`overflow-wrap: anywhere`) instead of widening the page at 320 px.
  - **`MetricInput` `required` and `hint`** (HAR-1819): the same required marker as `Field`, native `required` and `aria-required` on the input, and a hint under the control in its `aria-describedby`; an `errorMessage` joins the hint.
  - **HAR-1814**: a table row the keyboard is in shows its row actions and id-cell arrow (`:focus-within`, as on hover); a sortable header keeps its neighbours' letter-spacing and case; `DetailLayout` without a side gives the main column the full width; `NavItem` draws its own inset focus ring, which a Sidebar's `overflow-x: hidden` no longer clips; and `Input warning` / `Field warning` add a "check this" state (warning border, a polite message; an error still wins).

- 6e71c6f: **`SearchBar`** (HAR-2030, TENSOR audit UXC-02): one search field look and behaviour over the `.uix-searchbar` contract, so no product hand-builds a search box. `label` names the field and its `search` landmark (visually hidden; the field shows `placeholder`); `value` / `defaultValue` with `onValueChange`; `onSubmit` on Enter or the optional submit button (`submitButton`); `onClear` after the clear button or Escape emptied the field (focus stays in the field; an empty field lets Escape through, so it still closes a dialog); `size` `md` (default, header and toolbar) or `lg` (44 px, public pages); `submitVariant`; `inputDescribedBy`; `landmark={false}` for a field that filters a list or table (by default it is a `search` landmark, so do not wrap it in a `<search>` of your own). It is not a `<form>`: Enter never submits a surrounding form. Words: `labels` or a new `UixLabelsProvider` group `searchBar` (`clear`, `submit`).

  `.uix-searchbar` gains the parts it needs: `.uix-searchbar__clear` (inside the field's end; where it is present the browser's own search × is not drawn, so hand-built markup keeps it), `.uix-searchbar--md` (keeps its submit button beside it on a phone), and a field with no submit button now takes the whole row (it used to stop 8 px short, at the empty button column's gap).

- 5ce9bc8: **Keyboard shortcuts where people act** (HAR-2031, TENSOR audit UXC-03): a `shortcut` prop in `KbdCombo` key names (`['A']`, `['Mod', 'K']`) on

  - **`Button`**: hover or keyboard focus shows the keys in a hint above the button (an icon button's `aria-label` before them), and the button gets `aria-keyshortcuts` unless it has its own. The button holds only an empty hidden marker; the hint is portalled after mount (into the nearest `<dialog>`, else `<body>`), so the button's text, name, layout and selectors are unchanged: a `ButtonGroup`'s corners and a full-width button keep their geometry, and `toHaveText('Save')` still holds. Focus a menu or dialog sends back after a mouse choice opens no hint. `Button` stays server-renderable.
  - **`Tooltip`**: the keys follow the text in the bubble, and the trigger gets `aria-keyshortcuts`. Around a `Button` with a `shortcut` it takes that shortcut, so there is one bubble with the label and the keys.
  - **`MenuItem`, `MenuItemRadio`, `MenuItemCheckbox`**: key names render with `KbdCombo` at the row's end and set the row's `aria-keyshortcuts`; any other node renders as given, as before. An array of strings now counts as key names (`['⌘', 'K']` passed as a node would render as two keys).

  `Mod` is ⌘ / `Meta` on Apple and Ctrl / `Control` elsewhere (the server and the hydrating render use the non-Apple form; a menu row mounted later reads the platform at once). KbdCombo now also names `Esc`, `Del` / `Delete` and `Space`; `+` is spoken and written as `Plus` in `aria-keyshortcuts`. New exports: `ariaKeyShortcuts(keys, platform)` for a control the kit does not render, and the `KeyShortcut` type. The kit only shows a shortcut; the product binds the key. In a tooltip bubble the keys are drawn as outlines in the bubble's own colour.

### Patch Changes

- b0fd4ff: `Select` (searchable): the narrowed list now has its active option from the moment it renders. The active option used to be pulled back into the filtered list one task after each keystroke, so in between the filter field named no option: a screen reader heard the active option drop and return on every keystroke, and an Enter that arrived in that window (fast typing, paste then Enter, a slow device) closed the list without choosing anything. The same gap followed every async load that changed the list.

## 2.41.0

### Minor Changes

- 1d66ae0: `Table`: a frozen trailing actions column. `.uix-table--pinned-actions` (`<Table pinnedActions>`) keeps the last column sticky at the right edge while the wrap scrolls sideways, so a row's one-click peek or kebab no longer needs a horizontal scroll first on a narrow screen or with extra columns turned on. It mirrors `.uix-table--pinned-col`: the header cell sticks on both axes and sits above the body, the cell draws a hairline on its leading edge, and it repaints the row's zebra, hover, pinned and selected state opaquely. Mark row state with `<Tr selected>` / `<Tr pinned>` (`data-selected` / `data-pinned`); a frozen cell follows those, not a consumer's own row class.

  Fixes in the frozen first column (`.uix-table--pinned-col`), shared with the new one: in dark mode the pinned and selected row tints are translucent, so the frozen cell let the cells scrolling under it show through; they are now layered over the surface. On a `--no-zebra` table, every even row's frozen cell ignored hover, pinned and selected (a higher-specificity rule held it at the plain row colour). An expanded detail row keeps its own tint under either pin.

## 2.40.2

### Patch Changes

- Versioned with `@tensor_1/tokens` 2.40.2 (the Segmented and SchedulingCalendar narrow-width fixes are CSS); no change in the React package itself.

## 2.40.1

### Patch Changes

- 59d8f1e: ChartPanels no longer writes "Projection" inside the plot: its legend already names the dashed line, and in a narrow panel the in-plot label collided with a threshold's gutter label. `forecastSeries` takes `regionLabel: false` for the same choice; a standalone chart keeps the label by default.

## 2.40.0

### Minor Changes

- 8d31ea6: `RichTextEditor` mentions (HAR-1599): `onMentionSearch(query)` turns `@` into a "People" list fed by the product (keyboard: arrows, Enter or Tab, Escape; loading, empty and failed states as a status line). A pick is one token drawn with `.uix-mention` and stored as `@[Name](mention:<id>)`, which round-trips byte-exact and is never a link. `Markdown` draws the token and takes `resolveMention` for the shown name; `findMentions`, `formatMention`, `readMention` and `isMentionId` read and write the form. `Comment avatar={false}` drops the avatar column (`.uix-comment--bare`) for a comment on a timeline rail.

- 977d413: `ToggleRow`: the visible label is now a real `<label>` for the switch, so clicking the words flips it and the label names it; the description is the switch's `aria-describedby`. `accessibleLabel` is optional and only needed when the label is not text (HAR-1607).

### Patch Changes

- 75f8cd3: Threshold crossings: every crossing keeps its ring, but only the latest carries a visible "Crossed <x>" label; earlier ones show theirs on hover. A series that crosses its limit repeatedly no longer stacks colliding labels along the line.

  InsightCard: a chart embedded in the card no longer clips the first glyph of its title and footer (the frameless chart clips with a 4 px `overflow-clip-margin` instead of a hard edge).

## 2.39.0

### Minor Changes

- 5972118: Decision-grade charts (HAR-1553, HAR-1554, HAR-1556; unblocks TENSOR HAR-1559 and HAR-1560).

  - **New entry `@tensor_1/react/chart/analytic`**: a tree-shaken ECharts build with line, bar and scatter, mark lines, areas and points, a piecewise visual map, inside zoom and a linked axis pointer, SVG only (≤ 185 kB Brotli; the lean `chart/preset` stays ≤ 170 kB). It exports `Chart`, `ChartPanels`, `CorrelationScatter`, the overlay helpers, the pure models and every type.
  - **Overlays from typed data** (`ChartThreshold`, `ChartEvent`, `ChartForecast`, `ChartComparison`): `thresholdMarks` (a solid reference line labelled in the right gutter, the bad side shaded), `eventMarks` (unlabeled lines through the plot plus an event lane of pins that owns the tooltip and the click), `forecastSeries` (a hidden lower bound, a stacked band in `--uix-chart-forecast-band` and the only dashed line), `comparisonSeries` (a thin solid ghost), `partialPeriod`, `crossingPoints` / `findCrossings`, and `combineMarks` to put several on one series.
  - **`ChartPanels`**: two or more variables with different units on aligned panels, one x axis and one crosshair (`axisPointer.link`), one tooltip listing every panel at the hovered x, the event lane on top, a legend that names every role by its swatch shape, and one hidden data table per panel with lower, upper, threshold and event columns. A panel has one unit and one y axis: a dual y-axis cannot be expressed.
  - **`CorrelationScatter`**: dots with an OLS trend line, r and n with "association, not cause", percentile lines, thresholds on either axis and a breaking point; 26 px hit targets over 9 px dots; below `minPoints` (default 8) it shows "Not enough data (n = k of 8)" instead of a trend.
  - **`Chart` (every entry)**: `option` may be a function of the theme's chart tokens (re-run on a light/dark flip), and the new props `group` (one crosshair across cards via `echarts.connect`), `onEvents` (drill-down) and `tables` (further hidden data tables).
  - **`InsightCard` and `Bullet`** (root entry, server-renderable): the headline is the answer, a status is a word plus an icon, KPIs carry a comparison and a bullet against target instead of a gauge, an honest coverage note, source, updated and one action; `layout="split"` puts an aside next to the chart from 60rem of card width and stacks below; `variant="plain"` drops the card chrome inside another frame (a dashboard widget). Every word is replaceable through `labels`.
  - **Chart statistics** (root entry, pure, for servers): `linearFit`, `quantiles`, `predictionBand`, `normalQuantile`, `studentTQuantile`.
  - **Tokens:** a new `components/insight-card` module (InsightCard + Bullet); `chart` gains `.uix-chart__stats` and `.uix-chart__insufficient`. `uixChartTokens()` also returns `warning` and `danger` for emphasised marks.
  - **Docs:** a new "Decision-grade charts" page with the overlays, panels with a scatter, and the level-2 Delivery health. The `#chart` CSS demo now uses only classes that exist, and the level-1 residence example's budget line is solid with its label in the gutter.

## 2.38.0

### Minor Changes

- c26df37: `Stat`: interactive tiles line up with read-only tiles in a row, and a new `pending` state (HAR-1753).

  - **Fixed: a button tile centred its rows.** A grid or flex row stretches its tiles to the tallest one, and a `<button>` that is taller than its content centres that content. `.uix-stat--interactive` was `display: block`, so in one row of four 95 px compact tiles the label started 13 px from the top on a read-only tile, 16 px on a button tile with a one-line meta and 27 px on a button tile with no meta. The interactive tile is now a flex column: label, value and meta start at the top whatever the height of the tile. The link tile (`href`) is an `<a>` and was not affected.
  - **Visible change:** an interactive tile that is taller than its content (stretched by its row, or given a height) now has its rows at the top and the spare room below them, like a read-only tile. A tile that is as tall as its content looks the same. A consumer that worked around this with its own `display: flex; flex-direction: column` on the tile can delete that rule.
  - **New: `Stat pending`.** On a tile with `onActivate` it sets `aria-busy="true"` and `aria-disabled="true"`, and `onActivate`, `onClick` and `onKeyDown` are not called until it ends. The button is never natively `disabled`, so it keeps focus. Read-only and link tiles ignore the prop.
  - **CSS:** `.uix-stat--interactive[aria-busy="true"]` is dimmed, shows `cursor: progress` and has no hover tint. Plain-HTML consumers set the two ARIA attributes on the button themselves.
  - No token changes.

## 2.37.0

### Minor Changes

- 87e319c: Print styles for `SchedulingCalendar` and `SchedulingTimeline` (HAR-1541). The same components print: a consumer adds no print CSS of its own and no print-only markup. No public API change.

  - **Nothing scrolls on paper.** Under `@media print` the month grid, the time grid, the agenda and the timeline have no scroller and fit the page width (the timeline's axis is fitted to the page and its bars follow); a week row, an agenda row and a lane stay on one page; sticky headings, the timeline's axis and its lane names do not stick.
  - **Paper is light.** New theme-invariant tokens `--uix-print-ink`, `--uix-print-ink-quiet`, `--uix-print-paper`, `--uix-print-paper-quiet`, `--uix-print-line` and `--uix-print-danger`; each component's colour map is written again from them inside `@media print`, so a dark screen theme does not reach the page.
  - **Nothing depends on a background** (browsers drop them unless the reader asks for background graphics): the `high` band is a heavy edge in the signal colour on the paper's own surface, never a fill; each window pattern has an edge style of its own (`solid`, `diagonal` dashed, `cross` double, `dotted` dotted); hour lines and the timeline's grid lines are drawn as lines; marker glyphs and the hatch of bars that share time ask to be printed (`print-color-adjust: exact`). A highlighted agenda row underlines its title.
  - **Text in full where the layout allows.** Month chips wrap to show the whole title and their day cell grows. A time-grid item is at least as tall as its time and grows to hold its words; one too short for a line, which shows only its markers on a screen, prints its words too (they are in the markup with `data-room="none"`, hidden on a screen). A timeline bar keeps its share of the axis, so on a narrow page a short bar shows its time and not its title, and the bars are packed into sub-rows for the width they had on the screen.
  - **An item covers what is behind it.** Both components ask for their surfaces to be printed as they are (`print-color-adjust: exact`), so a chip or a bar hides the window, the hour line or the grid line behind it. A browser may refuse, which is why no meaning rests on a surface.
  - **One new name in each colour map:** `--calendar-band-high-edge` and `--timeline-band-high-edge`, the edge of the `high` band on paper, where `--calendar-band-high-fill` / `--timeline-band-high-fill` is the paper's. No screen rule reads the new name: on a screen the edge and the fill are still the fill name, so a stylesheet that overrides it looks as before.
  - **Left out on paper:** the header's buttons and view switch, the "now" line, and a move not yet sent. The period title, the zone label and the legend print.
  - **Every row prints.** A long agenda and a timeline over `virtualizeAbove` rows mount every row while the page prints (`beforeprint`, or print media) and are a window of rows again afterwards. `window.print()` called from inside a React effect, on mount or later, runs before those rows are there: such a page calls it from an event handler or a timer, or passes `virtualizeAbove={Infinity}`.

- e49e8db: `SchedulingTimeline`: service lanes in collapsible groups, windows drawn once and limited to their lanes, proposal-based moves, resize off by default, virtualised rows, sub-ticks, and a neutral colour map (HAR-1521).

  - **Groups.** `groups` (`id`, `label`, `meta`, `laneIds`, `collapsed`, `summary`) puts lanes into collapsible blocks in the order given; a lane no group names is drawn after them. A collapsed group is one row with `summary.count` and `summary.markers`, which the consumer supplies, worded by the `groupSummary` label (default `Items: {count}`). That row stands for the lanes it hides: when a window covers one of them, the row gets a strip under its head and the window is drawn there, in sight and in reach. `onToggleGroup(id)` hands the state to the consumer; without it a group opens and closes itself.
  - **Windows once, scope-true.** An overlay is one element whatever the number of rows (it was one per lane). `laneIds` limits it to the rows of those lanes with a clip; unset, it covers every row. Windows are neutral: `pattern`, and `kindLabel`, the name and `scopeLabel` as visible text. `onSelectOverlay` makes each window a named button. Point `markers` take `laneIds` too, and are one line each.
  - **Moves are proposals.** `onProposeMove(id, { start, end, adjusted })`: drag a bar, or press Shift and an arrow key to build a pending move, Enter to send it and Escape to drop it. A press that travels under 4 px is a click; Enter with nothing pending selects. The timeline never moves the bar. On a week or month axis a step is a calendar day, so the wall-clock time is kept across a clock change. `onMoveItem` is unchanged: one call for every key press and every drop.
  - **Resize is off unless asked for.** `onResizeItem(id, { start, end })` is the only way to move the end of a bar (Alt+Shift and an arrow key). **Behaviour change:** before this release that chord called `onMoveItem`; without `onResizeItem` it now does nothing and no hint offers it. Pass the same function as `onResizeItem` to keep it.
  - **Stacking without a generic flag.** `flagOverlaps={false}` keeps the sub-rows and drops the hatch and the default words for bars that share time; the consumer says what clashes through `markers`. The default is `true`, as before.
  - **Items take the calendar's item API:** `band` (only `high` is filled), `status` (a line style), `markers` (shape or icon plus text), `accessibleName`, and `data-item-id` / `data-band` / `data-status` on the bar. Bar text is cut at a word: a first word that does not fit is not shown at all (the title is still the name and the tooltip). A bar is at least 24 × 24 px, and bars drawn at that minimum are packed into sub-rows of their own instead of covering each other.
  - **Long timelines.** Above `virtualizeAbove` rows (default 150) only the rows near the viewport are mounted; arrow keys still reach every bar, and the row that holds the focused control stays mounted. The rows counted are the ones passed, `lanes` plus `groups`, so whether a timeline is virtual does not move with its width or with how its bars pack. `maxHeight` makes the lanes scroll inside the timeline under a fixed axis.
  - **Axis.** `subTicks` (local hours) draws minor ticks inside each day of a `day` axis; on an `hour` axis an hour that occurs twice shows its UTC offset, and so do the default names and announcements of a bar in such an hour. `notice` sits above the axis and `columnNotes` puts a note on the column of a day.
  - **One packer.** `layoutLane` places bars with `packLanes` (uncapped) and takes `{ flagOverlaps, minSpan }`. Which bars are flagged as sharing time is unchanged, a span that ends before it starts included. **Two changes in the rows.** (1) The component passes the time its narrowest bar covers as `minSpan`, measured from the track: bars drawn at the 24 px minimum (it was 8 px) get sub-rows of their own instead of covering each other, so a lane of short bars close together is taller than before, and its height follows the width of the track. On a month axis at the default `tickWidth` a lane of daily bars is six sub-rows. (2) With no options at all, a zero-length bar at the instant another bar starts takes a sub-row of its own; before this release it was drawn over the start of that bar.
  - **Colour (visible change).** Every colour is one `--timeline-*` name at the top of `scheduling-timeline.css`. Bars are no longer tinted by `state`, windows by `kind`, and the now-line and the point markers are neutral; the two problem states keep a marker with their word, and the kinds are told apart by pattern. In forced colours the high band, the marker shapes, the now-line and the hatches are redrawn in system colours.
  - **Row heights.** With `groups`, `laneIds` or a virtual window, rows have a fixed height and a lane label that does not fit is cut with an ellipsis. A timeline that uses none of them keeps rows that grow with their label.
  - **Deprecated, still working in 2.x:** `SchedulingTimelineOverlayKind`, `overlay.kind`, `item.state` and the `states` / `overlays` labels. `overlay.kind` is now optional.
  - **New labels** (translate them): `statuses`, `overlay`, `moveKeysHint`, `resizeHint`, `proposeHint`, `moveProposed`, `moveSent`, `moveCancelled`, `gapForward`, `groupSummary`. A timeline with `onMoveItem` and no `onResizeItem` reads `moveKeysHint` where it read `moveHint`.
  - **New exports:** `SchedulingTimelineGroup`, `timelineSubTicks`, `timelineStepDelta`, `timelineRepeatedHourOffset`, `TimelineSubTick`, `LayoutLaneOptions`. `TimelineTick` gains `offsetLabel`.
  - **Docs:** the timeline specimen on the SchedulingCalendar page is rendered from the component (`packages/react/scripts/render-scheduling-timeline-specimen.mjs`).

## 2.36.0

### Minor Changes

- 553ccc5: Seven older kit gaps that TENSOR's triage still found blocking (HAR-1346). Everything is additive.

  - **Date fields (HAR-1383).** New `DatePicker`: a text input that shows the date and reads a typed one (ISO, or three numbers in the locale's order), with a button that opens one month in a popover. The value is `YYYY-MM-DD`; `min`, `max`, `isUnavailable`, `formatDate`, `parseDate`, `locale`, `weekStartsOn`, `today`, `name`. Text that is not a date, or a date that cannot be chosen, marks the field invalid, says why and leaves the value alone (`onInputProblem`). New `DateTimePicker`: the date field with a time input and the time zone shown beside it; its value is `YYYY-MM-DDTHH:mm`, the shape `datetime-local` holds. `DateRangePicker` gains `mode="field"` (a trigger that shows the range and opens the months in a popover, closing on the end date) and `weekStartsOn`. Words come from `UixLabelsProvider` `datePicker` and `dateTimePicker`; `DateRangePickerLabels` has three new keys (`placeholder`, `fieldStart`, `fieldRange`; `labels` stays a `Partial`). New helpers: `parseDateInput`, `formatDateKey`, `datePattern`, `dateOrder`, `isValidDateKey`, `splitDateTime`, `joinDateTime`, `timeZoneName`.
  - **`InlineEdit` (HAR-1381):** a value edited where it is shown. The value is a button named by the value and "Edit {label}"; the editor has Save and Cancel; Enter saves, Escape cancels, nothing is saved on blur; a promise from `onSave` shows the busy state and a rejection keeps the draft with the reason; focus returns to the value. `multiline`, `validate`, `renderView`, `renderEditor`, `disabled`, and words from `UixLabelsProvider` `inlineEdit`.
  - **`RadioCard` (HAR-1373):** `RadioGroup variant="card"` with `RadioCard` (`title`, `description`, `media`): a native radio group drawn as cards, one column on a phone.
  - **Tree loads children on expand (HAR-1382):** `TreeNodeData.hasChildren` and `Tree loadChildren`. A loading node is `aria-busy` with a loading row; a failed load shows an error row whose Enter, Space or click retries, and focus follows the row that replaces the one it was on. Words: `labels` or `UixLabelsProvider` `tree`.
  - **Avatar presence (HAR-1374):** `Avatar presence` (`online`, `busy`, `away`, `offline`), each a shape as well as a colour and each in visually hidden text (`presenceLabels`); `status` is still `presence="online"`. New `PresenceDot`. Fixed: the avatar's round mask clipped the dot to a quarter; an avatar with a dot no longer clips it.
  - **EntityPicker (HAR-1648):** `onSearch` may resolve `{ options, hasMore: true }`: the list then ends with a row that says more match, and the status says so. Below `minQueryLength` the open list shows a hint. `EntityPicker` reads `UixLabelsProvider` `entityPicker`. `SearchSuggest` gains the `idle` and `note` slots.
  - **CommandPalette (HAR-1647):** the result count is a label: `UixLabelsProvider` `commandPalette.resultsOne` / `resultsMany`, or `resultsLabel(count)`.
  - **CSS:** new `components/date-picker` and `components/inline-edit` modules; additions to `avatar.css`, `radio.css`, `tree.css` and `search-suggest.css`. No token changes.

## 2.35.0

### Minor Changes

- f87503a: `SchedulingCalendar`: one tab stop per view with a keyboard model for days and items, item emphasis, and `List roving` (HAR-1527).

  - **One tab stop per view.** The month grid, the Week/Day time grid and the agenda are each a single tab stop. Item buttons are no longer tab stops of their own (`tabIndex="-1"`); they are reached from their day.
  - **Month.** Arrows, Home and End move between days as before. **Enter on a day with items now moves focus into them** (ArrowUp/ArrowDown, Home and End between them; Enter calls `onSelectEntry`; Esc returns to the day). Space or a click on the day number still calls `onSelectDate`, and so does Enter on a day with no items. A bar that covers several days is reached from any of them, and Esc returns to the day it was entered from.
  - **Week/Day time grid.** The tab stop is a day head; ArrowLeft/ArrowRight move between days and Enter goes into the day's items and windows. On an item Enter selects it, or confirms a pending move; Esc drops a pending move, and with none pending now returns to the day head.
  - **Agenda** (grouped, and the flat one without `agendaGroups`). ArrowUp/ArrowDown, Home and End walk the rows, the window notes and "open day", including rows a long agenda has not mounted yet. A step is counted in rows, so it crosses days with no row; a step that is still waiting for its row is given up when focus leaves.
  - **The keys act on the calendar's own items only.** A field or link rendered inside a cell or an item keeps its keys. A row's "+N" is reached from the day it opens. An item reached with the pointer takes the tab stop to its day. A move not yet sent is dropped, and announced as cancelled, when the arrow keys leave the item.
  - **Announcements.** A day button, and the day head of the time grid, is named with the date and `days[date].label`, through the new `labels.dayName` (`'{date}, {label}'`). Before, the time-grid head was named with the label alone; a consumer whose labels already say the date sets `dayName: '{label}'`.
  - **`entry.emphasis: 'highlight' | 'dim'`** sets `data-highlight` / `data-dim` on the item in every view: a heavier edge in the text colour and a heavier weight, or quieter text. Neither changes a hue, the line style of the state or the band's leading edge. With forced colours a highlighted title is underlined and dimmed text is grey.
  - **`List roving`**: the items of the list are one tab stop (`role="list"`, items `role="listitem"`); ArrowUp/ArrowDown, Home and End move between items, Enter and Space activate the focused one, and focus stays on the same item across re-renders with the same keys. A control inside an item keeps its own tab stop. Items may be wrapped, or rendered later by a child. Without `roving` the list is unchanged.
  - **Tokens:** emphasis rules in `components/scheduling-calendar`, roving focus rules in `components/list`.

  Behaviour to check when upgrading: code or tests that pressed Tab to reach a calendar item, or Enter on a day number to call `onSelectDate`, need the new keys (arrows after Enter; Space for the day). Esc on an item now returns to its day (month and time grid) and is not passed on. A day's accessible name now starts with the date (see `labels.dayName`).

## 2.34.0

### Minor Changes

- 1b7170c: `SchedulingCalendar`: an agenda grouped by day with consumer-owned groups, and a counts-only month for narrow screens (HAR-1520).

  - **`agendaGroups`** (`{ date, heading?, annotations?, rows, hiddenCount?, continuesCount? }[]`): the consumer decides which entry is listed under which day, in which order, and how many are left out. `view="agenda"` renders exactly these and never sorts, groups or counts. Without it the agenda is the flat list sorted by start, as before.
  - **Semantics.** Each day has a heading (`<h3>`; `agendaHeadingLevel` changes the level) with the date through `formatDate`, then its rows in an `<ol>`. Above `virtualizeAbove` rows (default 200) the agenda is one scroller of fixed-height rows and mounts only the rows near the viewport (on the server too, and when the list grows past the threshold after mounting); every row stays reachable with Tab. In that form each window note has a row of its own under the heading, and a narrow row gives the title its own line.
  - **Rows** use the item API: a swatch for `band` and `status`, the time range in the zone, the title (it takes the row width and wraps), `meta`, markers with their text, and the status as words. A row is a button that calls `onSelectEntry` and carries `data-item-id`; its accessible name includes `meta`. The time is two times of day when the entry starts on that day and ends within a day; otherwise both ends go through `formatInstant`, and an `allDay` entry reads the new `labels.allDay` ("All day").
  - **`SchedulingAgendaGroup`** is exported for typing the groups.
  - **Counts and notes.** `hiddenCount` shows "N not shown — open day" (`labels.hiddenInDay`), which calls `onShowMore(date)`; a day with no rows keeps its heading. `continuesCount` shows "Continues: K listed under an earlier day" (`labels.continuesInDay`). `annotations` are windows: one focusable note per window beside the heading, calling `onSelectOverlay`, never one per row. `notice` renders above the first heading.
  - **`monthDensity="counts"`**: each month cell shows the consumer's `days[date].count` and markers only, with no chips and no entry bars, in columns narrow enough for a 375 px screen. Windows keep their bar and name. No count is derived from the entries: a row's "+N" is for windows over `windowLaneCap` only. The setting leaves the week as it is.
  - **Tokens:** agenda and counts-density rules in `components/scheduling-calendar`. The flat agenda's rules are scoped to its own list.
  - **Docs:** the Agenda view of the SchedulingCalendar page is built from `agendaGroups`; a counts-only month specimen.

## 2.33.0

### Minor Changes

- 8c5980d: `SchedulingCalendar`: a Week/Day time grid with real-instant geometry and proposal-based moves (HAR-1509).

  - **Opt-in.** `timeGrid` draws `view="week"` as seven day columns on an hour axis; the new `view="day"` is one column and is always a time grid. Without `timeGrid` the week stays seven day cells. The built-in view switch offers Day only with the time grid, and steps a day at a time (`previousDay` / `nextDay` labels).
  - **Geometry from real instants.** A day column is as tall as its day: 23 rows on the day the clocks go forward (no "02"), 25 on the day they go back ("02" twice, each with its UTC offset). An item sits at the hours that really elapsed since the day began. A week that holds such a day labels that column's hours in the column.
  - **Midnight and the top lane.** `placesInTopLane(entry, timeZone, { crossMidnightMinutes })` (default `TOP_LANE_CROSS_MIDNIGHT_MINUTES = 360`, prop `topLaneCrossMidnightMinutes`): all-day entries (`entry.allDay`), entries longer than a day and entries running more than the threshold past their first local midnight go to a lane above the hours (`topLaneCap`, default 3 rows). A shorter midnight-crosser stays in the grid as a start part (the one tab stop, with the whole accessible name) and a hidden continuation with a "from HH:MM" cue.
  - **Lanes.** Overlapping items share a column in at most `maxLanes` lanes (default 4), and in fewer when a lane would be narrower than an item showing a time and six title characters. What does not fit is hidden, and the column's "+N" is `days[date].overflowCount` when the consumer gives one.
  - **Moves are proposals.** With `canMove` and `onProposeMove(id, { start, end, adjusted })`: drag an item (snapped to `step`, default 15 minutes, and to day columns), or press Shift and an arrow key to build a pending move, Enter to send it, Escape to drop it. A press that travels under 4 px is a click. The calendar never moves, refuses or cancels anything: it draws entries where the props say. "+1 day" keeps the wall-clock time (`addZonedDays`); a time that does not exist that day moves forward once and is announced (`adjusted: 'gap_forward'`). Top-lane spans drag by whole days only. `entry.movable: false` pins one entry. Without `canMove` there is no grab cursor, key binding or hint.
  - **Windows.** One named, focusable bar per window in a strip above the top lane (`windowLaneCap`, default 2 there), "+N windows" for the rest; a `global` window also shades its hours behind the items.
  - **Day heads and now.** Each column head shows the date (`formatDate(date, 'column')`, a new part), the consumer's `days[date].count` and markers with their text, and takes `days[date].label` as its accessible name. `now` (an ISO instant; the component keeps no clock) draws one line in the column of its day.
  - **`renderEntry(entry, context)`** gets `context.availableLines` in the time grid (0: markers only).
  - **New exports:** `placesInTopLane`, `TOP_LANE_CROSS_MIDNIGHT_MINUTES`, `layoutTimeGridDay`, `layoutDaySpans`, `proposeMove`, and the types `MoveProposal`, `TimeGridEntryContext`, `TimeGridEntryInput`, `TimeGridSegment`, `TimeGridPart`, `TimeGridDayLayout`, `DaySpanLayout`, `PlacedDaySpan`. `SchedulingCalendarView` gains `'day'` and `SchedulingDatePart` gains `'column'`.
  - **Tokens:** the time grid rules in `components/scheduling-calendar`; the now-line and the move outline are neutral and read from the colour map.
  - **Docs:** the Week and Day views of the SchedulingCalendar page are the time grid, with a 25-hour day specimen.

## 2.32.0

### Minor Changes

- d2e9330: Calendar math in one explicit IANA zone (HAR-1504): pure functions for zoned days, real hour slots, "+1 day", end-exclusive day spans, lane packing and a top-N cut. They use only `Intl`, never the process time zone or a fixed day length, so daylight-saving days have 23 or 25 hours.

  - **Days and slots:** `zonedDayBounds(dateKey, tz)` (the end of a day is the start of the next; a day whose midnight is skipped starts at its first instant) and `zonedHourSlots(dateKey, tz)` (one `{ instant, label, offsetLabel }` per real hour; a repeated hour appears twice, each with its UTC offset).
  - **"+1 day":** `addZonedDays(instant, n, tz)` keeps the wall-clock time and returns `adjusted: 'gap_forward'` when the time does not exist and moves forward, once.
  - **Day membership:** `zonedDaySpan(start, end, tz)` is end-exclusive (an entry ending at local 00:00 stays on its last day) and throws a `RangeError` on an inverted or empty interval. `enumerateDateKeys(span, { limit })` returns `{ dates, truncated }` instead of stopping silently.
  - **Lanes:** `packLanes(intervals, maxLanes, { order: 'start' | 'given' })` assigns first-fit lanes, `null` for what does not fit, with `laneCount` and `overflow` per overlap cluster.
  - **Top-N:** `rankOverflow(items, compare, n)` → `{ visible, hidden }`.
  - **Formatters:** `cachedDateTimeFormat(locale, options)` shares one `Intl.DateTimeFormat` per locale and options shape. `zonedDateKey` now goes through it (same signature and result), so a 2,100-entry month builds a few formatters instead of one per call.
  - **Deprecated, unchanged:** `zonedDateSpan` (end-inclusive, swaps inverted ends) and `enumerateDateSpan` (stops silently at 370). Use `zonedDaySpan` and `enumerateDateKeys`.
  - **Docs:** a "Calendar model" page with a DST example.

- de741cb: Calm, balanced dark status ramp and a neutral status family (HAR-1562, absorbs HAR-1384).

  - **Dark status values retuned.** Every dark status TEXT token now sits in one lightness band (OKLCH L 74–80 %, chroma ≤ 0.10) near `--uix-text-hushed`; solids are capped at chroma 0.14 and tints are the solid at 12 % alpha. Status text contrast on the dark surface now spans 8.1–9.8:1 (it was 6.8–11.2:1). The dark danger fill is `#BE3A41` (white text 5.4:1), so products no longer need a local dark danger override. `--uix-info` (a fill with white text) is unchanged.
  - **New tokens (additive):** `--uix-success-text` (light aliases `--uix-success`, dark `#7CC79F`), the neutral status family `--uix-neutral-solid` / `-text` / `-bg` / `-border`, and `--uix-radius-xl: 24px`.
  - **Components paint status text with the text role:** `.uix-pill--success` / `--sla-ok`, `.uix-alert--success` / `--warning` icons, `.uix-stat__trend--up` and `.uix-sla[data-state="ok"]`.
  - Light-mode values are unchanged apart from the new tokens.

- a93e0c6: Charts look like UIx with no consumer styling (HAR-1552).

  - **`uixChartTheme()`** (from `@tensor_1/react/chart` and `/chart/preset`): token palette, fonts, a solid hairline grid, axes and the UIx tooltip. `Chart` merges it under your option (your option wins) and re-applies it when `<html>`'s `class` / `data-theme` or the OS scheme changes, without a remount. New prop `theme?: 'uix' | 'none'` (default `'uix'`). Also exported: `mergeChartTheme`, `uixChartTokens` (the resolved analytic roles) and `uixChartAreaGradient`.
  - **New tokens:** `--uix-chart-grid`, `-axis`, `-reference`, `-zone-warning`, `-zone-danger`, `-forecast-band`, `-event`, `-partial`, `-comparison`, light and dark.
  - **Palette re-stepped:** `--uix-chart-1..8` keep their hue order and now pass the dataviz palette checks in both modes (lightness band, chroma ≥ 0.10, adjacent CVD ΔE ≥ 8, normal-vision ΔE ≥ 15, ≥ 3:1 on surface and bg-app). Light failed the normal-vision floor before; dark had 7 of 8 slots outside the band.
  - Docs: a "Chart tokens" foundations page; the styleguide charts consume the same theme (no dashed gridlines).

- 03d49b6: New `DashboardGrid`, the layout grid for dashboard widgets (HAR-1555; unblocks TENSOR HAR-1557).

  - **Spans:** `DashboardGrid.Item` (also exported as `DashboardGridItem`) takes `span={1 | 2 | 'full'}`. Span 2 clamps to the columns there are, and `full` fills the row at every width.
  - **Columns follow the grid's own width** (a container query), not the viewport: `columns={{ base: 1, sm: 2, lg: 3 }}` with `sm` 36rem, `md` 48rem, `lg` 60rem, `xl` 80rem of grid width. The default is 1 column, 2 from `sm` and 3 from `lg`. `gap` is `sm`, `md` or `lg`.
  - **Size-aware widgets:** each item is an inline-size container (`uix-dashboard-grid-item`), so a Chart can take its height from the item's width (`height="clamp(160px, 40cqi, 360px)"`) and a card can use container queries. Widgets in one row share a height.
  - **Plain HTML and custom elements:** the class contract is `.uix-dashboard-grid` (`--cols-N`, `--{sm,md,lg,xl}-cols-N`, `--gap-sm|lg`) with `.uix-dashboard-grid__item` (`--span-2`, `--full`). `dashboardGridClassName` and `dashboardGridItemClassName` return the same classes for an element you render yourself.
  - **Tokens:** a new `components/dashboard-grid` module.

- 47b2bd5: DateRangePicker and the Calendar day cells now use one shape for every state: hover, range start and end, today and keyboard focus are the same circle, concentric with the cell, and the in-range band is the circle's height and meets the start and end circles with no notches (no band while only a start is picked; RTL mirrors). Focus is a round ring with a surface gap so it stays visible on the accent circle, and forced-colours mode keeps the range (Highlight start/end, underlined in-range days). `DateRangePicker` gains a `today` prop (defaults to the viewer's local date, `null` for none) and marks that day with `aria-current="date"`. The Calendar grid drops its column gap so its range band joins (HAR-1570).
- 26488b2: `FilterEditor` enum presets (HAR-1505; TENSOR change calendar state scope).

  - **`FilterField.presets`:** named selections (`FilterPreset { id, label, values }`) shown as toggle chips (`aria-pressed`) in a labelled group above the search box and options. Activating one replaces the selection with its values. The preset equal to the selection (as a set) is pressed, and editing the options un-presses it. No native `<select>`.
  - **`matchFilterPreset(field, value)`** returns that preset. `summarizeFilter` returns its label, using the new optional `preset` summary label (default `'{label}'`, which also accepts `{field}`).
  - **Labels:** an optional `labels.presets` (default "Presets") names the group. `UixLabelsProvider` gains a `filterEditor` entry for every `FilterEditor` word, and an explicit `labels` prop still wins.
  - **Tokens:** `.uix-filter-editor__presets` in `components/table-toolbar`.

- 5195924: `SchedulingCalendar`: a shared item API, consumer-owned counts and a calm Month (HAR-1506).

  - **Item API.** An entry takes `band` (`none | low | medium | high`: the only dimension with a hue, and only `high` is filled), `status` (`tentative | committed | live | done | dead`: line style and dimming, never a hue), `markers` (a shape or an icon with text) and `accessibleName`. Every item carries `data-item-id`, `data-band` and `data-status`.
  - **Consumer-owned counts.** `days` (`{ count, overflowCount, label, markers }` per date) and `dayEntries` (the chips of each day, already ranked and cut). With both, the calendar places, ranks, cuts and counts nothing, "+N" is `overflowCount`, and a day never expands in place. With `days` alone the chips are still the day's `entries`, cut to `maxEntriesPerDay`.
  - **Spans drawn once.** An entry or window that covers several days is one bar per week row, in lanes above the chips. `layoutMonthSpans(spans, days, { timeZone, weekStartsOn, laneCap })` packs them in the order given and `schedulingGridDays(anchorDate, view, weekStartsOn)` returns the grid it needs; pass the result as `spanLayout`, or let the calendar lay them out. `windowLaneCap` and `spanLaneCap` default to 2 where the cells have a fixed height; where they grow (no `days`, `dayEntries` or `onShowMore`) every span gets a lane. A row with more spans than lanes shows "+N" and calls `onShowMore` with the first day that has a hidden one.
  - **Windows.** An overlay takes `pattern` (`diagonal | cross | dotted | solid`), `kindLabel`, `scopeLabel`, `global` and `accessibleName`. Windows are neutral, named in visible text, focusable, and call `onSelectOverlay`.
  - **Page-owned chrome.** `legend` and `legendCaption` (the legend is exactly the items given), `showHeader`, `notice`, `emptyNote`, `onSelectDate`, and per-view `previousMonth` / `nextMonth` / `previousWeek` / `nextWeek` labels.
  - **Day membership is end-exclusive in `timeZone`** for entries and windows: an entry ending at local midnight stays on its last day, and a window is placed by its zoned days, not its UTC date. `itemDaySpan` and `zonedTimeOfDay` are exported.
  - **Fixed month geometry.** With `days` / `dayEntries`, or `maxEntriesPerDay` together with `onShowMore`, every cell keeps one height.
  - **Changed defaults (visible).** A chip reads `HH:MM title` (24 h, in the zone), and a long title is cut at the chip edge without an ellipsis. In the month and week grids entries are no longer tinted by `state`: `conflicted` and `blackout-violation` show a marker with the word for that state instead (the agenda keeps its state pill until it is rebuilt), and "+N more" takes the text colour. The default instant text in accessible names and the agenda is the `day` date text plus the 24-hour time, so a 2,100-entry month builds at most four `Intl.DateTimeFormat` instances.
  - **Deprecated, unchanged in 2.x:** `entry.state` and `SchedulingEntryState`, `overlay.kind` and `SchedulingOverlayKind` (`kind` is now optional), and the `previous` / `next` labels.
  - **Tokens:** every colour of `components/scheduling-calendar` goes through one block of `--calendar-*` names at the top of the file. Forced-colours repairs for the high band, marker shapes and window hatches.
  - **Docs:** the SchedulingCalendar page is rendered from the component by `packages/react/scripts/render-scheduling-calendar-specimen.mjs`; a test fails when the page and the component differ.

- 0fa70fe: `Select` draws its own list instead of opening the browser's dropdown (HAR-1572). It follows the WAI-ARIA select-only combobox pattern, and existing call sites keep working without changes.

  - **Same API:** `<option>`/`<optgroup>` children (including fragments and `.map()`), `value`/`defaultValue`, `onChange(e)` with `e.target.value`, `name`, `required`, `form`, `disabled`, `ref` (still the `HTMLSelectElement`), react-hook-form `register` and `Controller`. A visually hidden native `<select data-uix-select-proxy>` holds the value, so `FormData`, `form.reset()`, autofill and `required` work as before. The `id` moves to the trigger, so `<label htmlFor>` and `Field` still name it.
  - **Trigger and list:** the trigger is a `<button role="combobox">` with the `.uix-select` look, and long values end in an ellipsis. The list is a top-layer popover placed with `useAnchoredPosition`, so it is never clipped inside a Drawer, a Popover or an `overflow: hidden` cell, and it flips near the edge of the viewport. It is at least as wide as the trigger and at most 320 px tall.
  - **Keyboard (APG):** ↑ ↓ Home End PageUp PageDown, Alt+↓ / Alt+↑, Enter, Space, Tab, Escape (keeps the value and focus), and typeahead (type several letters, or repeat one letter to cycle). Disabled options and groups are skipped.
  - **New optional props:** `options` (options and groups as data, with `description`, `icon`, `keywords`), `onValueChange`, `placeholder`, `invalid`, `readOnly`, `searchable` (`'auto'` above 12 options), `loadOptions` (loading, empty and error-with-retry states; stale requests are aborted), `renderOption`, `renderValue`, `placement` and `labels` (also `UixLabelsProvider` `select`). `multiple` gives a `string[]` value, a "+N" with a spoken count, and Delete to clear.
  - **Phones:** with `(pointer: coarse) and (max-width: 640px)` the list opens as a bottom sheet (`Drawer side="bottom"`) with 44 px rows.
  - **CSS:** `select.css` styles the trigger, the popup, the form proxy and the states. `.uix-listbox` options now show hover/keyboard focus and the selected value differently (the selected one has a check mark), and there are classes for groups, icons and descriptions. Where `appearance: base-select` is supported, a plain `<select class="uix-select">` gets the same look for its open list; Firefox still shows the operating-system list.
  - New exported types: `SelectOption`, `SelectGroup`, `SelectLabels`.

- c170f90: Twelve gaps TENSOR found while moving its hand-built UI onto the kit at 2.31.0 (HAR-1346 follow-ups). Everything is optional except the three items marked **Behaviour change**.

  - **Anchored overlays stay inside the viewport (HAR-1613).** A `Popover` / `useAnchoredPosition` panel that fits neither above nor below its anchor slides over it instead of leaving the viewport, also after a scroll or a resize; once the anchor has left the viewport the panel follows it out. New: `Popover capHeight`, and on the hook `capHeight`, `onAnchorHidden`, `shiftMainAxis`; `computePosition` returns `mainAxisNatural`, `mainAxisRange` and `available`. With CSS anchor positioning, a panel held at the viewport limit (or within 64 px of it) is written as fixed coordinates.
  - **Menu (HAR-1629):** `MenuItemRadio`, `MenuItemCheckbox`, `MenuRadioGroup`; every item kind forwards `id` and `data-*`; Escape and Tab on the trigger close a menu with no item to focus; the menu is capped to the viewport and scrolls.
  - **CollapsibleSection (HAR-1628):** `defaultOpen` (a remembered state wins over it, and a passed `open` no longer overrides the remembered state at mount), `persistStorage="local"`, an `openRequest` already set at mount is honoured and every request focuses the summary (`undefined` and `0` mean "no request"), `compact`, `headingLevel`. Fixed: the browser's own `toggle` event at mount could overwrite the remembered state.
  - **Steps (HAR-1628):** `progress={false}` renders numbered sections that hold content, with no state drawn or announced; `headingLevel`. `DescriptionItem termProps` / `descriptionProps`. `closeLabel` is optional on `PromptDialog` and `ConfirmDialog`.
  - **Tabs (HAR-1600):** `aria-label`, `aria-labelledby` and other HTML attributes reach the `role="tablist"` element, in both overflow modes.
  - **Segmented (HAR-1604):** **Behaviour change:** a `Segmented` is one tab stop (the selected option, or the first enabled one); Arrow keys move and select, Home / End jump, Left / Right swap in right-to-left. `selection="radio"` renders `radiogroup` / `radio` / `aria-checked`.
  - **useVirtualRows (HAR-1616):** `estimatedViewportHeight` (a window instead of every row before the scroller is measured), `enabled`, and a window clamped to the row count in the same render when the data shrinks under a large `scrollTop`. Rows are windowed when `rows.length > threshold`.
  - **RuleBuilder (HAR-1618):** the built-in validation messages are labels (`issue…`) and `checks` turns individual checks off; `conditionsOnly`; `combinator` (fixed, never emits the other value) and `hideCombinator`; `allowGroups`; `UixLabelsProvider` `ruleBuilder`. **Behaviour change:** `readOnly` renders the builder with its controls disabled instead of an English sentence; the sentence is `readOnly="summary"` and its words are labels. `RuleBuilderLabels` has 13 new keys (the seven `issue…` messages and the six summary words): `labels` stays a `Partial`, but an object typed as the full `RuleBuilderLabels` needs them. New exports: `setRuleCombinator`, `DEFAULT_RULE_VALIDATION_MESSAGES`, `DEFAULT_RULE_SUMMARY_WORDS`, `RuleCheck`, `RuleValidationOptions`, `RuleSummaryWords`.
  - **Chip (HAR-1632):** the × is named from `UixLabelsProvider` `chip.remove`; the ref and `bodyProps` reach the body button of a removable chip; `current` for link chips (`aria-current="page"` and the filled look). `Chip` and `Alert` are now `forwardRef` components.
  - **FileUpload and Attachment (HAR-1630):** a long unbroken file name no longer widens `FileUpload`; both read `UixLabelsProvider` (`fileUpload`, `attachment`); `sizeBase={1024}`, `formatSize`, and `formatFileSize(bytes, locale, { base, units })`. Markup: a download link's name "Download {name}" is now visually hidden text inside the link instead of an `aria-label`. Fixed: the rejected-files list had `role="alert"` on the `<ul>`, which removed its list role; the alert is now a wrapper around the list.
  - **Alert, Note, StatusPill, PromptDialog, Popover (HAR-1614):** `Alert` `onDismiss` / `dismissLabel` / `actions`, a forwarded ref, and a text column that wraps a long title at 320 px; `Note tone` accepts `undefined` and `"neutral"`; `StatusPill size` (`sm`, `md`, `lg`); `PromptDialog` `multiline`, `destructive`, `error`, `role`, and its field now takes focus when the dialog opens; `Popover openOnHover`.
  - **Spinner, Meter, Heartbeat (HAR-1606):** `Spinner size="sm"` (16 px); `Meter tone="neutral"` and `tone="accent"` (3:1 against the track in light and dark for every theme); new `Heartbeat` and `LiveIndicator`.
  - **ViewMenu (HAR-1601):** the density options no longer break a label inside a word at phone width; options that do not fit one row wrap as whole options.
  - **CSS:** additions to `menu.css`, `card.css`, `steps.css`, `segmented.css`, `rule-builder.css`, `file-upload.css`, `alert.css`, `status-pill.css`, `spinner.css`, `meter.css` and `view-menu.css`. No token changes.

- a93a5a0: New `TextDiff`, a two-way diff of two texts (HAR-1368; TENSOR C11 knowledge-article version diff).

  - **Line diff:** a Myers diff. Removed and added lines are paired by similarity, so a renumbered list still lines up, with the changed words marked inside each pair.
  - **Word diff:** compares prose word by word.
  - **Views and folding:** split (stacks in narrow containers) or unified. `context` folds long unchanged runs, and focus moves to the first revealed line.
  - **Not colour alone:** changes are `<del>`/`<ins>` with a −/+ sign and spoken words.
  - **Large input:** a `maxTokens` limit, and a `maxEdits` budget past which the changed middle shows as one replacement.
  - **Model:** `diffText`, `diffTokens`, `textDiffRows`, `tokenizeText`.
  - **Tokens:** a new `components/text-diff` module.

### Patch Changes

- 451dc9e: The `#file-upload` docs specimen now matches the React `FileUpload`: a centred UIx "Choose files" button under the title and hint, instead of a full-width native file input. An empty `.uix-filelist` no longer adds a spacer below the drop zone (HAR-1567).
- 9a3b00d: `FilterPopover` renders a plain UIx field: the label sits above the control, tied to it with `for`/`id`, 8 px apart, with 16 px before Clear/Apply and 16 px padding all round. It used to wrap the control in `<label class="uix-label">`, the Label tag pill, which drew an accent-tinted band around the field with 1 px under the select. The `.uix-filter-popover .uix-label` rule is gone, and the tag pill rule is now `.uix-label:not(label)`, so a `<label class="uix-label">` left in consumer markup no longer paints the band (use `.uix-field__label` for form labels). A new test fails on any `<label>` with `uix-label` in the React sources, docs, guide and `tables.html` (HAR-1573).
- 94b3210: CollapsibleSection's chevron is now the UIx `ChevronDown` icon (an inline SVG in a fixed 16 x 16 box centred on the summary row) instead of the text character U+2304, which an OS fallback font drew narrow and distorted and which jumped about 13 px on every toggle. The chevron only rotates, about its own centre, and takes the text colour on summary hover (HAR-1571).
- 9708b8a: Tag and chip remove "x": one spec for `.uix-tag__remove` and `.uix-chip__remove` (HAR-1569). Both are now a 20 px circle with the Lucide X centred in it, at the pill's trailing end 2 px from the edge, with a concentric 24 px hit area, a round focus ring and a hover tint of the text colour that shows on any pill (it was a 16 px rounded square on the tag, off-centre, with a hover lighter than the tag). The pill height is unchanged. Forced-colours mode outlines the hovered control. `<Chip onRemove>` draws `XIcon` from the UIx icon set, and the docs tag-input specimen uses the Lucide X instead of a text "×". Markup that put a text "×" inside `.uix-tag__remove` should switch to an SVG icon (e.g. `XIcon` from `@tensor_1/react/icons`).
- e6fbae3: List, Toast and Pipeline: a title and its secondary text now stack with the same result whatever element the markup uses. `.uix-list__title`/`__meta` and `.uix-pipeline__title`/`__description` are block-level, and `.uix-toast__body` is a flex column with a `--uix-space-1` gap, so `<span>`/`<strong>` markup no longer renders as one run-on line with a 0 px gap. The React output is unchanged. The three docs specimens use `<div>`, and `tests/a11y/docs-text-stacks.spec.mjs` measures every explorer route for glued text (HAR-1568).

## 2.31.0

### Minor Changes

- 5fda359: New `EntityPicker`: a form field that holds one record found by an async search (HAR-1366; TENSOR B28/C5 `entity-picker.tsx` and its eight consumers, MOTUS B-P10). It shows the chosen record with a named clear button. Choosing again opens a `SearchSuggest` list with loading, empty and error states, and Retry is a keyboard-reachable list row (the defect in TENSOR HAR-1336). Stale results are ignored and focus is returned. `name` posts the id; `id` and `aria-describedby` work with `Field`.

  `SearchSuggest` gains `inputId` and `inputDescribedBy`, which put an id and a description on the input itself.

- 61ea6bc: New `FileUpload` and `Attachment` / `AttachmentList` (HAR-984/985; TENSOR C15 attachments panel, MOTUS C-7 photo intake). `FileUpload` checks picked or dropped files against `accept`, `maxSize` and `maxFiles` and hands the accepted ones to the product, which uploads them and reports progress, success and failure through `items`. It has a real "Choose files" button, a rejection alert, per-file progress, Retry, remove, thumbnails and optional alt text. `Attachment` is a stored-file row: the name as a link or download, size, meta, a state slot, actions, remove, and `loading`/`error`/`forbidden` statuses. It's server-renderable. New pure helpers: `formatFileSize`, `fileMatchesAccept`, `partitionFiles`, `fileKind`. Tokens: `.uix-file-upload*` rules in `components/file-upload` and list rules in `components/attachment` (`.uix-attachments--list`, `__body`, `__line`, `__meta`, `__error`, `__actions`). Existing `.uix-dropzone`, `.uix-filelist` and `.uix-attachment` rules are unchanged.
- 372e973: New `FilterEditor` and a typed filter model (HAR-1365; TENSOR C6 `table-filter-editor.tsx`, MOTUS C-1 "+ filter"). `FilterPopover`'s value is one string; `FilterEditor` edits a typed `FilterValue`:

  - `enum`: multi-select checkboxes, with a diacritic-insensitive option search once the list is long.
  - `text`: a condition and text.
  - `number`: a condition (incl. `between`) and an optional unit.
  - `date-range`: two date fields.
  - `boolean`: Any / Yes / No.
  - `reference`: records found by an async `onSearch`, with loading, empty and error-with-retry states and removable chips.

  `summarizeFilter(field, value, { formatDate })` writes the chip text ("State: Open, Pending", "Age: 3 – 14 days", "Created: 01.10.2026 – 05.10.2026"). `isFilterEmpty` and `emptyFilterValue` complete the model. `FilterPopover` is unchanged. Tokens: `.uix-filter-editor*` rules in `components/table-toolbar`.

- 9d3143a: New `Lightbox`, a full-screen media viewer (HAR-1367; TENSOR C12 `capture-viewer.tsx`, MOTUS C-8 programme gallery). It has previous/next buttons, ←/→, Home/End and swipe, an announced counter, a caption, a fit/actual-size toggle and video items. It's a native `<dialog>` with focus on Close and focus returned to the opener. Tokens: gallery rules in `components/lightbox` (`.uix-lightbox--gallery`, `__stage`, `__media`, `__bar`, `__nav`, `__close`). The single-image `.uix-lightbox` is unchanged.

## 2.30.0

### Minor Changes

- 7d5e9e7: New `SchedulingTimeline`: lanes of bars on a time axis (HAR-1364; TENSOR C8, the change day/week timeline, rollout Gantt rows and licence-renewal markers).

  - **Props:** `lanes`, `items` (`laneId`, `title`, `start`, `end`, `state`, `meta`, `movable`), `range`, `scale` (`hour`/`day`/`week`/`month`), `timeZone`, `locale`, `overlays` (`freeze`/`maintenance`/`blackout`, all lanes or one), `markers`, `now`, `weekStartsOn`, `tickWidth`, `step`, `formatTick`, `formatInstant`, `renderItem`, `onSelectItem`, `onMoveItem`, `loading`/`error`/`onRetry`, and `labels` (also through `UixLabelsProvider` as `schedulingTimeline`).
  - **Bars:** overlapping bars stack and are hatched. Bars move by drag or Shift+arrow keys, and their end changes with Alt+Shift+arrow keys; moves snap to the step and are announced.
  - **Keyboard and screen readers:** one tab stop with arrow and Home/End navigation. Windows and markers are listed for screen readers.
  - **Pure model:** `timelineTicks` (wall-clock ticks in a zone, DST-safe), `placeSpan`, `layoutLane`, `shiftSpan`, `snapToStep`, `pixelsToMs`, `defaultTimelineStep`.
  - **Tokens:** new `components/scheduling-timeline` stylesheet.

  Fix: the `SchedulingCalendar` grid is now the containing block for visually hidden text (entry states, badge words). Before, a hidden word could escape the grid's scroller and widen the page on a phone.

## 2.29.0

### Minor Changes

- 1132a3d: The UIx icon set, a new `@tensor_1/react/icons` subpath (HAR-996). Icons come only from UIx (workspace ADR-0038). This lets TENSOR (270 files, 199 glyphs), MOTUS (8 files), POSx, MEDx and SHOPx drop `lucide-react` and turn on their icon-library bans.

  - **233 glyphs**, Lucide's (lucide-react 1.39.0, ISC, notice in `THIRD_PARTY_NOTICES.md`). They cover every name TENSOR and MOTUS import today plus the POSx, MEDx and SHOPx lists on HAR-996.
  - **Components:** each glyph is a tree-shakeable `<Name>Icon` component (`ShieldCheckIcon`), plus the older Lucide names the products use as aliases (`AlertTriangleIcon`, `CheckCircle2Icon`, `Loader2Icon`, …). `Icon name="shield-check"` picks one at run time. `UixIcon` replaces `LucideIcon`; `IconName`, `IconProps`, `ICON_GLYPHS` and `createIcon` are also exported. `etc/icon-names.json` maps each Lucide name to its UIx component for a codemod.
  - **Props:** `size` (`sm`/`md`/`lg` = `--uix-icon-*`, or a length), `tone` (`current`, `muted`, `accent`, `success`, `warning`, `danger`, `info`), `label` (role="img" with a name; otherwise `aria-hidden`), `strokeWidth`.
  - **Tokens:** a new `components/icon` stylesheet (`.uix-icon`, sizes, tones, forced-colors, and a `.uix-icon-grid` reference grid). It is in the bundle.

## 2.28.0

### Minor Changes

- b7ed3eb: An imperative toast queue: `toast()`, `toast.success/error/warning/info/loading`, `toast.update`, `toast.dismiss`, `toast.promise` and `toast.undoable`, rendered by `Toaster` (UIx HAR-1363; TENSOR A2/C3 and MOTUS A3/A4/C-13, which retires `sonner` in both).

  - **`Toaster`** now also renders a toast store (default: the one behind `toast()`; `store` prop for another). It shows at most `limit` toasts (default 3), pauses timers while hovered or focused and while the tab is hidden, closes the focused toast on Esc, and takes a `position` (`bottom-end` default, plus `bottom-start`, `bottom-center`, `top-end`, `top-start`, `top-center`). Hand-managed `<Toast>` children render as before.
  - **Defaults:** success/info/default 5 s, warning 8 s; error and loading stay until dismissed or updated. A reused `id` replaces in place. A loading toast that settles is announced again.
  - **`toast.undoable(message, { onUndo, onCommit })`:** the TENSOR C2 undo pattern. `onCommit` runs when the toast closes without Undo.
  - **`Toast`** gains `tone="warning"` and an `action` slot (`.uix-toast__action`). Tone glyphs are built in until the icon set (HAR-996) lands.
  - **The store is a plain module** (`createToastStore`, `createToastApi`, `ToastStore`, `ToastRecord`, `ToastOptions`, …) with no React import.

## 2.27.0

### Minor Changes

- dce872e: The small gaps TENSOR and MOTUS were hand-building around (workspace ADR-0038 "always use UIx"; the 2026-10-06 reuse audits; UIx HAR-1346 batch (a)). Every addition is optional, so existing calls render as before.

  - **SchedulingCalendar** (HAR-1347, TENSOR B1/C9): `weekStartsOn` (0–6, default Monday), `formatDate(date, 'day' | 'weekday' | 'month')` and `formatInstant` for a product date format, `maxEntriesPerDay` with a "+N more" toggle that expands the day or calls `onShowMore`, and `renderDayBadge`. The month and week grids gain weekday column headers. `buildMonthGrid` accepts any `CalendarWeekday`.
  - **ButtonLink** and **`size="xs"`** (HAR-1348, TENSOR A4/B5/B18, MOTUS C-3): a link that looks like a `Button`, and a 24 px button. One link adapter, `renderLink` (`UixRenderLink`, `UixLinkProps`), serves `ButtonLink`, `Stat`, `Pagination`, `MenuItem`, `Chip` and `Step`.
  - **Tooltip `content`** (HAR-1349, TENSOR A3): rich, non-interactive tooltip content.
  - **Stat `href` / `current` / `haspopup`** (HAR-1350, TENSOR B6/B7, MOTUS B-A7): a server-renderable link tile, and `aria-haspopup` that can say `menu` or nothing.
  - **Drawer `side`** (HAR-1351, TENSOR B15, MOTUS C-14): `start` for phone navigation, `bottom` for a bottom sheet.
  - **NavItem `description`** (HAR-1355, TENSOR B31): a wrapping second line. `.uix-navitem` now has a `min-height` of 36 px instead of a fixed height.
  - **CollapsibleSection `lazy` / `persistKey` / `openRequest`** (HAR-1352, TENSOR B32). Without them it is still a JS-free `<details>`.
  - **DescriptionList**: a long unbroken value wraps instead of widening the grid (HAR-1353).
  - **Card `titleId`** (HAR-1354, MOTUS B-A5).
  - **ConfirmDialog** `children`, `error`, `initialFocus`, `aria-describedby`, `tertiaryLabel`/`onTertiary`, `typeToConfirm`, `compensation`; new **Popconfirm**, an anchored single-step confirmation (HAR-1356, TENSOR C2, MOTUS B-A4/C-5). A `destructive` dialog now opens with focus on Cancel.
  - **Pagination** link mode (`hrefFor`) and cursor mode (`mode="cursor"`, First / Previous / Next, `summary`); `PaginationLabels.first` (HAR-1357, MOTUS B-P5/B-A22). Page buttons now carry `type="button"`.
  - **UixLabelsProvider** / **useUixLabels** (HAR-1358, TENSOR C20, MOTUS #3): translate kit chrome once for a subtree.
  - New **Menu**, **MenuItem**, **MenuGroup**, **MenuSeparator** (HAR-1359, TENSOR C1); **Chip**, **ChipGroup** (HAR-1360, TENSOR C7/B34, MOTUS C-6); **Kbd**, **KbdCombo** (HAR-1361, TENSOR C14, MOTUS B-A16); **Steps**, **Step** (HAR-1362, TENSOR C13, MOTUS C-9).

  Fixes found while building these: `PromptDialog`'s input label used `.uix-label` (the Label chip) and rendered as a blue pill; it is now a field label. `.uix-chip__count` used `opacity: .7`, which dropped the count below AA contrast; it now uses `--uix-text-muted` (and inherits on a pressed chip).

### Patch Changes

- b955d5e: The rich-text `composer` variant no longer squeezes its tool row to nothing when `toolbarEnd` is wide (TENSOR HAR-1125).

  - **The bug.** `.uix-rich-text--composer .uix-rich-text__bar` stayed on one row (`flex-wrap: nowrap`), and the tool row (`contain: inline-size`, so it has no content width of its own) only got the space the other items left. An audience toggle plus a submit button in `toolbarEnd` left it 0 px wide at 375 and 320 px: no formatting tool or emoji was reachable, and a click on a tool landed on the toggle.
  - **The fix** (`@tensor_1/tokens`, `rich-text.css`). The bar wraps, and the tool row keeps at least five tools (160 px, or the whole bar when the bar is narrower). When the counter or `toolbarEnd` would take that room, they move to their own row below the tools; the submit stays at the end. The tool row still scrolls sideways and never wraps. A status message still takes its own row (HAR-749); its separate `:has()` rule is gone because the bar now always wraps.
  - **What moves.** Only composers whose tool row was narrower than five tools: their trailing items now sit below the tools. Where the row already had room for five tools, nothing moves, and the visual goldens are unchanged. The loading/error fallback bar (no tools) wraps too, so a wide `toolbarEnd` stacks there instead of overflowing.
  - `@tensor_1/react` has no code change and is versioned in lockstep.
  - **Migration:** none. Consumers can delete local overrides of the composer bar's wrapping.

## 2.26.3

### Patch Changes

- e20cdc8: `EmojiPicker` no longer jumps when a category is chosen, stays attached to its trigger while the page scrolls, and closes once the trigger is scrolled out of view (TENSOR HAR-993). Every anchored overlay (`Popover`, `InfoTip`, `Tooltip`, `SearchSuggest`) gets the same placement fixes.

  - **The bug.** The picker was placed when it opened, before its content existed. The category bar only appeared once the emoji data had loaded, so the picker then grew past the space below its trigger without being placed again. `useAnchoredPosition` listened for scroll events in the capture phase, so the first scroll _inside_ the picker's grid (a category click) re-ran the flip from scratch, and the picker jumped from below the trigger to above it. The click also used `scrollIntoView()` and a plain `focus()`, which could scroll the page as well. While the page scrolled, the picker trailed its trigger by a frame, because it was moved from a JS scroll listener.
  - **One size.** The picker's rows have fixed heights in every state: the category bar is always rendered (buttons once the data is there, and it stays during a search). The loading, failure and "no results" line sits inside the fixed-height grid. The picker's size is the same loading, loaded, searching and failed.
  - **A side that stays.** While open, an anchored overlay keeps the side it opened on. It flips only when that side no longer fits and the other side does (`computePosition` option `stickySide`), so a size change or a small scroll never flips it back and forth. Scrolls inside the overlay are ignored, and so are scroll containers that do not hold the anchor. A `ResizeObserver` places it again when the overlay or its anchor changes size.
  - **No page scroll.** A category click scrolls only the grid, to the category's heading, and focuses its first emoji with `preventScroll`. Arrow keys scroll only the grid too.
  - **Attached while scrolling.** Where the browser supports CSS anchor positioning (Chromium 125+, Safari 26+), the engine's result is written as an offset from the anchor (`position-anchor` + `anchor()`), so the browser moves the overlay with its anchor in the same frame. The engine still decides the side, alignment and viewport clamp. The overlay is checked once per open to be where the engine placed it, and falls back to `position: fixed` left/top if not. Other browsers keep the fixed left/top path. The anchor name and `position-anchor` are removed on close and unmount.
  - **Closes when out of view.** New optional `Popover` props: `closeWhenAnchorHidden` (default `false`) closes the popover once an `IntersectionObserver` reports the anchor fully out of view (outside the viewport or a clipping ancestor), and `onAnchorHidden` is called just before it closes. Focus inside the popover is let go instead of returning to the hidden anchor. `EmojiPicker` turns this on and does not move focus back to its trigger in that case, so the page does not scroll back to the editor.
  - **Motion** (`@tensor_1/tokens`, `popover.css`). The popover fades and slides `--uix-lift` over `--uix-dur-fast`, always away from its anchor. It rises from below when placed on top, and moves sideways when placed left or right. An anchored `Popover` is held at its first frame until it has been placed, so the slide starts on the side it actually opens on. `prefers-reduced-motion` still turns the motion off.
  - **Migration:** none. Consumers that anchor their own `Popover` get the placement fixes automatically; `closeWhenAnchorHidden` is opt-in.

## 2.26.2

### Patch Changes

- d3f4d53: `Drawer`, `Modal` and `Peek` no longer close themselves right after mounting open under React StrictMode (TENSOR HAR-882).

  - **The bug.** Browsers queue a `<dialog>`'s `close` event and fire it in a later task. StrictMode runs every effect as mount → cleanup → mount, so `useDialog`'s cleanup closed the dialog and the re-run reopened it and added a new `close` listener before the queued event fired. That stale event then reached the new listener, which released the page scroll lock and called `onClose`, so a dialog rendered with `open` closed itself about 25 ms later in `next dev`. The same happened in production whenever `open` went true → false → true before the event fired.
  - **The fix.** `useDialog` ignores a `close` event that finds its dialog open again. Escape, a `method="dialog"` form and `close()` on an open dialog still call `onClose` once and release the scroll lock.
  - **Migration:** none. A consumer-side guard that stops such stale events (TENSOR's `stale-dialog-close-guard.ts`) is now redundant but harmless.

## 2.26.1

### Patch Changes

- d3733ff: `RichTextEditor`: applying a link no longer reloads the page or submits the form around the editor.

  - **The bug.** The link popover was a `<form>`, and it renders in place (no portal), so an editor inside a consumer's record form nested one form in another. Chrome stops a `submit` event at the nearest enclosing form, so React's root listener never saw it, the popover's `preventDefault()` never ran, and **Apply** did a native GET submit that reloaded the page and lost the unsaved record. Where the event does bubble (jsdom, older engines), React's `onSubmit` reached the host form and submitted the whole record instead.
  - **The fix.** The popover is a `<div>` now (same `uix-rich-text__link-form` class, same layout). **Apply** is `type="button"`, and Enter in the URL field applies the link and prevents the implicit submit of the host form (an IME's composition-confirming Enter is left alone, as a native form does). Escape still closes it. React's "`<form>` cannot be a descendant of `<form>`" console error on every editor inside a form is gone too.
  - **Migration:** none.

## 2.26.0

### Minor Changes

- 83c749b: Drawer closes on a backdrop click; images in the comment and template editor presets, and a notice where images aren't allowed (TENSOR HAR-547, HAR-749, HAR-770).

  - **Drawer closes on a backdrop click** (opt out with `dismissOnBackdrop={false}`). A click on the dimmed backdrop calls `onClose`, like Escape and the close button, so consumers need no change. Set `dismissOnBackdrop={false}` on a drawer that holds unsaved form input; Escape and the close button still close it. `Peek` already closed this way, and both now share one handler (`hooks/backdropDismiss.ts`): a click on the `<dialog>` itself outside its box counts, a click on its content never does, and a click that lands mid-close never re-fires `onClose`. A consumer `onClick` on either still runs first. On a phone, the browser's modal `max-width` leaves a 2em + 6px strip of backdrop (34 px at 320 px), and a tap on it closes the panel too.
  - **Images in every `RichTextEditor` preset.** `comment` and `template` now take pasted or dropped images, and show the toolbar image button, whenever `onUploadImage` is set, as `full` already did. Without `onUploadImage` nothing changes in the toolbar.
  - **`imagesUnavailableReason?: string`.** An image file pasted or dropped where images are off used to vanish silently. Now the editor inserts nothing and says why in its status line (`role="status"`): this text, or the new `imagesUnsupported` label ("Images can't be added here."). The notice clears on the next edit. A paste that also carries text (Excel, Word and Docs add a PNG rendering of what you copied) stays a text paste: no upload, no notice.
  - **Composer status row.** In `variant="composer"` a status message (uploading, failed, images off) takes its own row under the tools. Inline, it squeezed the toolbar to a sliver on a 320 px phone.
  - **`.uix-mark` (HAR-770).** It was reported as a phantom class. It is defined in `table.css` (since 2.5.0) and renders a themed tint in both themes. A new test now checks that every `uix-*` class a React component emits has a rule in `@tensor_1/tokens`, with deliberate hook classes listed by name and reason.
  - **Labels:** new `imagesUnsupported` in `RichTextLabels` (default above). Translate it with the others.
  - **Migration:** none. Every new prop is optional. A consumer with a drawer that must not close on a stray click sets `dismissOnBackdrop={false}`.

## 2.25.0

### Minor Changes

- 9001348: InfoTip: a small ? that explains a page, section or field, plus a `help` slot on PageHeader, Card, SectionHead and Field (HAR-737, for TENSOR's contextual help, HAR-736 / ADR-0226).

  - **`<InfoTip content label placement? />`.** `content` is plain text, never HTML, and blank lines become paragraphs. Empty or whitespace-only content renders nothing. `label` is the button's accessible name, e.g. "About: Incidents". The panel is a top-layer kit `Popover` (`popover="manual"`, so it never closes another open popover), at most about 360 px wide, and it is the button's `aria-describedby`.
  - **Behaviour.** Hover opens it after about 300 ms and it stays open while the pointer crosses into the panel. Keyboard focus opens it at once, and a click or tap keeps it open. Esc closes it and keeps focus on the ?. It does not close an enclosing dialog. A press outside also closes it.
  - **The ?** is a fixed 9 px filled glyph (Material Symbols `question_mark`, Apache-2.0), with no circle, the same size next to any text. It sits superscript at the top right of the title or label: its top is 0.2em above the cap line (`vertical-align: calc(1cap + 0.2em - 9px)`). Muted at rest, it turns the primary-button blue (`--uix-accent`) on hover and while open, with a 25 px hit area. The brief asked for a 16 px button with a 12 px `CircleHelp`. The operator replaced that during review because the ringed glyph was unreadable and read as part of the word.
  - **`help?: string | null` + `helpLabel?: string`** on `PageHeader` (after the title), `Card` and `SectionHead` (after the title) and `Field` (after the label, before the required marker). The ? always sits beside the heading or `<label>`, never inside it. A heading keeps its title as its name, and a Field label's control stays the input (a button inside a label becomes its activation target, TENSOR HAR-743). With `help`, Field draws the required marker as `.uix-field__required` after the ?. `helpLabel` defaults to `"About: <title>"` in English, so pass a translated one. The four components stay server-renderable: the slot helpers live outside the `"use client"` InfoTip module.
  - **CSS:** new `info-tip.css` (`.uix-info-tip`, `__button`, `__panel`) and row classes `.uix-page-header__title-row`, `.uix-card__title-row`, `.uix-section-head__title-row`, `.uix-field__label-row` and `.uix-field__required`. Markup without `help` is unchanged.
  - **Migration:** none. Every new prop is optional.

- fe4905d: SearchSuggest and `.uix-arrival`: "search and jump", the pattern behind Windows and Android Settings search (TENSOR HAR-763, for per-setting settings search).

  - **`<SearchSuggest>`** is a search field with a result list underneath. Each row shows:
    - a **title**, with the matched letters in bold;
    - a **breadcrumb** (`meta`), where the middle crumbs truncate first so the outermost and innermost stay readable, and the full path is in the row's `title`;
    - up to two lines of **context** (`description`).
  - **Keyboard and screen readers.** It follows the ARIA combobox pattern: focus stays in the field and `aria-activedescendant` names the active row.
    - ↑/↓ wrap. Home/End jump once a row is active.
    - Enter opens the active row, or the first row when none is active.
    - Escape closes the list, and a second Escape clears the text.
    - Each row is named "title, crumb › crumb" and described by its context.
    - An Enter or arrow key that belongs to an IME composition is left alone, and after Escape closes the list, Enter does not open a row the user can no longer see.
  - **Optional slots:**
    - `heading` + `headingAction`, e.g. "Recently opened · Clear";
    - `footer`, a last row reachable by the arrow keys, e.g. "Show all 23 results";
    - `loading`, with a spinner in the field and the list;
    - `empty` and `error` states;
    - `status`, a polite live region, e.g. "8 results";
    - `shortcutHint`, a `/` badge in the empty field;
    - a clear button;
    - `size="lg"` for page-level search;
    - `strategy="fixed"`, which floats the list on the viewport so a clipping toolbar or header (`overflow: hidden`) cannot cut it off; it follows the field and flips above it when there is no room below;
    - `inputRef`, to focus the field from a shortcut;
    - controlled `open`.
  - **Matching.** `searchSegments(text, query)` and `foldForSearch(text)` fold case, diacritics and ß, so "ubersicht" marks "Übersicht" and "strasse" marks "Straße". The whole query is marked where it occurs; otherwise each word is marked where it starts a word. The consumer still decides which rows match.
  - **`.uix-arrival`** is the "you are here" highlight for the element a link or result landed on. It tints the target for about 2.4 s and fades out. Under `prefers-reduced-motion` or forced colours it becomes a steady outline for 2 s. It sets `scroll-margin-block`, so a sticky header doesn't cover the target.
  - **Tests:**
    - `search-suggest-dom.test.mjs` covers the ARIA contract and keyboard model;
    - `search-suggest-model.test.mjs` covers match folding;
    - `tests/a11y/search-suggest.spec.mjs` runs in the browser, in both themes:
      - axe on results, the recent list, loading and error;
      - the opaque popup surface;
      - middle-first truncation at 280 px;
      - the 2-line clamp;
      - the keyboard journey to a landed target;
      - the reduced-motion arrival.
  - **Migration:** none. Both are new.

## 2.24.0

### Minor Changes

- 746cb14: DiffViewer: each action is named for the entry it resolves, and a `controlSize` option (for the MOTUS programme conflict comparison, EPE-07).

  - **Each action is named for its entry.** New `DiffViewerLabels` templates `acceptIncomingFor`, `keepCurrentFor` and `markPendingFor` (English defaults "Accept incoming for {path}", "Keep current for {path}", "Mark pending for {path}") become the buttons' accessible names. Before, every entry's buttons were all called "Accept incoming", so a screen reader could not tell which entry a button resolved. The visible words still come from `acceptIncoming` / `keepCurrent` / `markPending`. When you translate a name, keep the visible word inside it (WCAG 2.5.3).
  - **The action row and the summary are real groups.** They now have `role="group"`, so their existing `resolve` / `summary` labels are announced. Before, the `aria-label` sat on a plain `div`, where it is not allowed.
  - **`controlSize`** (`sm` default · `md` · `lg`) sets the height of the action buttons and the entry disclosure rows. `md` follows `--uix-control-h`, so a theme with 60px controls gets 60px actions. `lg` is 44px. The root carries `data-control-size`, and `diff-viewer.css` sizes the rows from it.
  - **Migration:** the buttons' accessible names now end with the entry path, so a test that finds them by their exact old name ("Accept incoming") must match "Accept incoming for $.path" instead, or match as a substring. The visible text has not changed.

- a1f1cbc: ViewMenu: its own surface, and column rows you can reorder (TENSOR HAR-666, the columns-menu half of the saved-views work). SavedViewMenu: a pointer drag now lands where you drop it.

  - **Own surface.** `.uix-view-menu` now draws its own background, border, radius and shadow, and scrolls at `min(60vh, 480px)` with `overscroll-behavior: contain`. It stays opaque inside an overlay shell that adds no chrome (TENSOR's `AnchoredOverlay` showed the table through it). Inside a `.uix-popover` it drops its own border and shadow, so there is no double frame. Section titles (`.uix-view-menu__label`) are sticky.
  - **Column rows: grip · checkbox · name · ⋯.** Hover paints the whole row, and long names truncate. `ViewMenuColumn.required` shows the name without a checkbox, in the checkbox's slot, with a tooltip. `textLabel` supplies the plain-text name for the accessible names when `label` is a node.
  - **`onReorder(orderedIds)`** gets every column id, first to last, and turns on reordering. The grip drags a row. The ⋯ menu offers Move up, Move down and Hide or Show, and it is the keyboard path, so the grip stays out of the tab order (the arrow keys still move it once it has been clicked). The ⋯ menu is an APG menu button on a top-layer `Popover`, so the scrolling panel never clips it. Escape closes only the menu and returns focus to its button. After a move, focus stays on the moved row, and a polite status announces the new position.
  - **Grip and ⋯ idle at 75%**, the same floor as SavedViewMenu. The HAR-666 brief asked for 45%, but that value measured below WCAG 1.4.11's 3:1 for the muted grip (see 2.23.0). The browser spec now measures both icons at rest in both themes.
  - **New optional props:** `columnLabels` (`rowActions`, `reorder`, `moveUp`, `moveDown`, `hide`, `show`, `required`, `moved`; English defaults; `{label}` / `{position}` / `{count}` templates), `displayLabel` (title over zebra/freeze), `footer` (e.g. Reset sort), and `className`. The density props are now optional, and the density section renders only when `densityOptions` and `onDensityChange` are given.
  - **SavedViewMenu drag fix.** Dragging a row down could stall after the first step, or land one slot past the pointer. React moves the dragged row's DOM node as the list reorders live, which drops pointer capture, and the drop index counted the dragged row itself. Both menus now follow the drag on the window and count only the other rows.
  - **Migration:** none needed for existing `ViewMenu` usage. A column list with `onReorder` renders more controls per row. `.uix-view-menu__cols` is a `ul` in the React component, and it no longer has its own 180px scroll area, because the panel scrolls instead.

## 2.23.0

### Minor Changes

- fa31f1f: `SavedViewMenu` takes on the saved-views row design from TENSOR's list toolbar (TENSOR PR #1995).

  - **Titled sections.** New `sections` prop (`SavedViewSection[]`: `id`, `label`, `items`), used instead of `items`. Each section renders under a `.uix-menu__label` title inside the same `.uix-menu`, for example your own views above the presets. Empty sections are hidden, and `emptyLabel` shows only when every section is empty. The flat `items` form still works as before.
  - **Row anatomy: grip · name · overflow.** The `actions` slot is now wrapped in `.uix-saved-views__actions` as the row's overflow slot. Names truncate, and a string name also gets a tooltip.
  - **Selection and hover cover the whole row.** The selected row (`active`) gets `data-active` and an accent tint (`--uix-brand-muted`) across grip, name and overflow, and its name button carries `aria-current`. There is no check glyph. Hover also covers the whole row, and the name no longer paints its own grey. In forced-colors mode, the selected row gets a `SelectedItem` outline.
  - **Quiet affordances.** The grip and the overflow slot are dimmed to 75% opacity until the row is hovered or has focus, a drag is under way, or the overflow trigger reports `aria-expanded="true"`. The dimming is deliberate, and the idle value still meets WCAG 1.4.11 3:1 non-text contrast on both themes (grip 3.19:1 light, 4.45:1 dark).
  - **Scrolling panel.** `.uix-saved-views` is capped at `min(60vh, 440px)` height and 400 px width, and it scrolls. Section labels stay pinned (`position: sticky`) while you scroll.
  - **Reorder within a section.** Pass `onReorder(orderedIds, sectionId)` with `reorderLabel` to add a drag grip to every row. You can drag the grip with a pointer, or focus it and press ArrowUp/ArrowDown. A row never leaves its section. The callback receives that section's full id order and its id (`undefined` in the flat form). It fires once per keyboard move and once per drop, and not at all for a drop that doesn't change the order. The new order shows straight away until the consumer's persisted order arrives.

  Persistence, permissions (which actions a row's overflow menu offers) and every label stay with the consumer.

## 2.22.0

### Minor Changes

- 7d2221d: Rendering fixes found in the docs explorer, plus larger avatar sizes.

  - `.uix-metric-input`: the control row is pinned to `--uix-control-h`, so the stacked +/− steps split the input height instead of making the unit and step columns 3 px taller than the input.
  - `.uix-relationship-graph__node`: selected, highlighted and conflicted fills are now opaque (`color-mix` over `--uix-surface`). The old translucent tints let edges, which run to node centres, cross through the node label.
  - `.uix-stepper`: `width: fit-content`, so a stepper no longer stretches to full width inside a column flex or grid container.
  - `.uix-brand-profiles`: form tracks can shrink (`minmax(0,1fr)`), and the native file input is capped at its container. Before this, the input's ~360 px intrinsic width pushed the form underneath the preview card.
  - New `.uix-avatar--xl` (64 px) and `.uix-avatar--2xl` (96 px) sizes with a proportionally larger status dot. React `Avatar` `size` accepts `'xl' | '2xl'`.

## 2.21.0

### Minor Changes

- 5551372: TENSOR deep-pass fixes (RX-125): translatable words everywhere, dark-mode elevation, and interaction fixes for trees, tabs, record pages and the date picker.

  - **Every component's words are translatable.** Accessible names and visible text that were English literals now come from props with English defaults: `closeLabel` (Drawer, Peek), `previousLabel` / `nextLabel` (Peek), `dismissLabel` (Toast), `regionLabel` (Toaster), `skipToContentLabel` / `exitFocusLabel` (AppShell), `onlineLabel` (Avatar), `inputLabel` (CommandPalette), `listLabel` (InboxList), `label` / `selectedLabel` (BulkBar), `expandLabel` / `collapseLabel` (ExpandToggle), `toneLabels` (Meter), `trendLabels` (Stat), and a `labels` object on Pagination, Chart, DateRangePicker, BuilderCanvas, RuleBuilder, MatchReview, DiffViewer, SchedulingCalendar, ColorPicker and BrandProfileEditor (each with an exported `DEFAULT_*_LABELS`). Plural announcements have `…One` / `…Many` templates with `{count}` placeholders. `scripts/literal-a11y-text.mjs` (run by the React tests) fails on any new literal.
  - **Chart loading text** is a real child (`ChartLabels.loading`) instead of CSS `content:`, so it can be translated and is announced inside the busy region.
  - **Dark elevation.** `--uix-shadow-sm/-md/-popover/-overlay` have dark values (a stronger drop plus the top highlight); a light-mode 6% shadow was invisible on dark surfaces. New `--uix-shadow-md`, which the interactive card's hover already used.
  - **Loading buttons** keep a visible ring on every variant (secondary, outline and ghost rendered blank).
  - **Tables are no longer capped at 460px** by default. Opt back in with `.uix-table-wrap--scroll` (`--uix-table-max-height`).
  - **Tree:** the indent stops growing past level 4 and labels wrap to two lines; the chevron is its own button, so a selectable tree selects on a row click and toggles only from the chevron (`toggleOnRowClick` restores the old behaviour, and stays the default for pure navigation trees).
  - **Tabs `activation="manual"`:** arrow keys move focus and Enter/Space selects. `"automatic"` stays the default.
  - **DetailPage `renderLink` / `onTabSelect`:** render the back link and tabs through your router's link, or handle tab selection without navigating (`href` stays the fallback).
  - **DateRangePicker** weekday headers follow `locale` (the grid stays Monday-first).
  - **RelationshipGraph:** each legend type draws its own chart colour, and radial edges of that type draw it too.
  - **Flow** branch / loop / mind-map canvases keep a 640px minimum inside the scrolling panel on narrow screens; the **pipeline** stage bar draws the border its active state colours.

## 2.20.0

### Minor Changes

- fbd452a: Operator primitives: tabs that scroll, toned and interactive stat tiles, and a copy button.

  - **`Tabs overflow="scroll"`** keeps one row that scrolls sideways, keeps the selected tab in view, and shows pointer-only edge buttons only on the side with hidden tabs. Works together with `TabPanel keepMounted`. Long or translated tab labels now wrap to two lines at a 16rem cap instead of stretching the row (all tab variants).
  - **`Stat`** gains `tone` (`neutral` | `warning` | `danger`: a toned outline and value, never a toned label), `size="compact"` for dense fact bands, and `onActivate` / `activateLabel` / `expanded`, which make the whole tile a button that opens an editor, named "label: value, action". `Stat` now forwards its ref.
  - **`CopyButton`** copies a value, confirms with a check and a polite "copied" announcement, and announces `failedLabel` when the copy is refused. `copyText` is the clipboard helper behind it; it never throws.
  - New tokens `--uix-warning-border` and `--uix-danger-border` for outlined toned containers (3:1 non-text contrast on surfaces in both themes).

## 2.19.2

### Patch Changes

- 2f6e67a: `.uix-segmented` fits its container when rendered on a `<fieldset>` (WCAG 1.4.10 reflow; TENSOR worklog composer).

  - **`.uix-segmented`** now sets `min-inline-size: 0` and `max-inline-size: 100%`. A fieldset defaults to `min-inline-size: min-content`, so an audience toggle on one could never be narrower than its longest words side by side and ran ~8 px past `.uix-composer` at 320 px (400 % zoom). On a `<div>` nothing changes.
  - **`.uix-segmented__option`** may now shrink and wrap: `white-space: normal` and `overflow-wrap: anywhere`. A label breaks onto a second line inside its option instead of clipping. At desktop widths nothing moves.
  - Consumers that rendered the toggle on a fieldset can drop any inline `minWidth: 0` or `maxWidth` workaround.

## 2.19.1

### Patch Changes

- 601d975: Bar-shaped footers wrap at 320 px instead of pushing their last control out of the box (WCAG 1.4.10 reflow; TENSOR PR #1780).

  - **`.uix-composer__bar`** now sets `flex-wrap: wrap` and a `row-gap` of `--uix-space-2`. The column gap is unchanged. An audience toggle (`.uix-segmented`) at the start and the submit button at the end now stack on two rows in a narrow container. Before, the submit button was pushed outside the card.
  - **`.uix-dialog__footer`** and **`.uix-card__footer`** wrap the same way. A tertiary action or meta text next to two buttons no longer clips at 320 px.
  - **Consumers can drop inline `flexWrap: 'wrap'` overrides** on these bars, such as the one in TENSOR `packages/shared/ui/src/worklog-feed.tsx`. An inline `justify-content: space-between` still works: the groups sit at both ends on one row and stack when they do not fit.
  - The rich-text `composer` variant keeps its toolbar row on one line. Its toolbar already scrolls sideways on narrow screens, so it opts out of the wrap.
  - Layer order and `--uix-accent-fg` are unchanged. At desktop widths nothing moves: the visual goldens are unchanged.

## 2.19.0

### Minor Changes

- 4c0a8ef: Calm links, a phone-fitting portal grid, kept tab panels, a RelationshipGraph that fits its content, comment variants and a SaveStatus indicator (TENSOR remediation RX-20..RX-23).

  - **Links no longer underline on hover unless they are content links.** The base layer dropped its blanket `a:hover` underline. Classless links in text keep their persistent underline (WCAG 1.4.1). Buttons and tabs rendered as `<a>` stop underlining under the pointer. Opt-in hover underlines (`.uix-link--quiet`, title slots, `.uix-btn--link`) are unchanged. If a product relied on the base hover underline for a class-bearing link inside running text, give that link a visible cue of its own.
  - **`.uix-cell-link`:** a table link that is quiet at rest as well as on hover. It keeps the row's text colour, never underlines, and keeps the focus ring. Use it on framework `<Link className>` anchors in table cells.
  - **`.uix-id-cell__btn`** keeps the row's text colour on hover instead of turning accent blue.
  - **`.uix-shortcut-grid`** fits its container (`auto-fit`, `minmax(min(100%, 12rem), 1fr)`) and lets labels wrap, so it no longer scrolls sideways at 320 px. Desktop column counts now follow the available width instead of a fixed four.
  - **`TabPanel keepMounted`** keeps an inactive panel mounted, `hidden` and out of the tab order. It is off by default.
  - **`RelationshipGraph` (radial):** every node carries its full label in `<title>`, and the `viewBox` grows to contain every node, including consumer-positioned ones.
  - **`Comment`:** `variant="system"` with `systemLabel`, and a `replyTo` quote with `replyToLabel`.
  - **`SaveStatus`:** `idle` / `saving` / `saved` / `failed`, with `onRetry` and translatable `labels`. The text sits in a polite live region that stays mounted in every state. New CSS module `components/save-status.css`.

- e409ef2: Rich-text authoring, a markdown viewer and emoji reactions (RTE-01), as three optional entries. The root entry imports none of them.

  - **`@tensor_1/react/rich-text`:** `RichTextEditor` and `RichTextEditorFallback` on Tiptap 3.31.3.
    - Markdown in, markdown out. `onChange` fires only for user edits.
    - Untouched blocks keep their exact source bytes, CRLF and `{{variables}}` included. Only edited blocks are re-serialized.
    - Raw HTML stays literal text, except `<br>`, which is a line break (GFM table cells need it). Link and image policies come from `isSafeUrl` and `resolveImageSrc`.
    - `full` / `comment` / `template` presets, `headingLevels`, image upload, paste and drop, and a Ctrl/Cmd+Enter submit shortcut.
    - Markdown source mode, a character counter, and a `composer` variant that renders in `Composer` / `ComposerBar` with `toolbarEnd`.
    - Unicode emoji from a toolbar picker and `:shortcode` suggestions.
    - `roundTripMarkdown(md)` runs the same pipeline without a DOM, so consumers can gate their own content corpus.
  - **`@tensor_1/react/markdown`:** TENSOR's dependency-free, sink-free `Markdown` viewer, with its behaviour preserved.
    - Adds strikethrough, task lists, GFM tables, nested lists, escapes and character references.
    - Renders images only when `resolveImageSrc` returns a URL, which is used verbatim.
    - Server-component safe: no hooks, no `"use client"`.
  - **`@tensor_1/react/emoji`:** `EmojiPicker` and `ReactionBar`.
    - `EmojiPicker`: search, categories, recent picks, and English or German names. The emoji data is a lazily imported bundled chunk.
    - `ReactionBar`: `aria-pressed` chips with reactor names in the tooltip and in the accessible name, plus quick picks.
  - **Offline by design:** no runtime network requests.
    - `@tiptap/extension-emoji` runs on a list without its CDN `fallbackImage` URLs or GitHub image emoji (`forceFallbackImages: false`).
    - A jsdom egress test spies on fetch, XHR, WebSocket, EventSource, beacons, image sources and appended resources.
  - **`emojiImageBaseUrl`** (editor, picker, reaction bar): an optional same-origin folder of `<codepoints>.png` images for devices that cannot draw an emoji. Unset means native emoji only, and no image set ships.
  - **Default link rule** (viewer and editor, used when no `isSafeUrl` is passed): http(s), mailto and same-app paths only. It refuses `//host`, backslashes and control characters. The viewer also bounds nesting and bracket scans, so hostile input cannot stall a server render.
  - **Known markdown limits**, documented in the README: edited lines lose leading spaces; tabs and space runs in list items and table cells become single spaces; a line break inside a checklist item is saved as a new paragraph of that item.
  - **Styles:** `.uix-rich-text` (new module), prose rules for tables, code blocks, rules, images and task lists, and the full `.uix-emoji-picker` and reaction focus/disabled states. Existing `--uix-*` tokens only; light and dark.

  Optional peer dependencies, all exact pins and all MIT:

  - `@tiptap/core`, `@tiptap/pm`, `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/markdown`, `@tiptap/extension-list`, `@tiptap/extension-table`, `@tiptap/extension-image`, `@tiptap/extension-emoji`, `@tiptap/extensions` and `@tiptap/suggestion`, all 3.31.3.
  - `marked` 17.0.6 and `emojibase-data` 17.0.0.

  Their installed dependencies are also all MIT (prosemirror-_, linkifyjs, emoji-regex, emojibase, is-emoji-supported, @floating-ui/_, fast-equals, use-sync-external-store); `is-emoji-supported` 0.0.5 ships no LICENSE file. `dist/` bundles none of this code. `@tensor_1/react` itself is `UNLICENSED` and ships no LICENSE file.

## 2.18.0

### Minor Changes

- 9fdf28a: `RelationshipGraph` gains an opt-in `layout="layered"` mode (ADR-0003), with no new dependency and no token change.
  - **Layout:** columns by distance from `rootId` (or a supplied `node.depth`), each node drawn once, lateral and cycle edges classified and marked, and leaf fan-outs collapsed into expandable clusters (`clusterThreshold`, `expandedClusterIds`, `onToggleCluster`).
  - **Rendering:** crossing-reduced ordering, edge labels (`edgeLabels`, `edge.emphasis`), arrowheads that can point back along the real relationship (`edge.arrow`), and HTML node buttons with `renderNode` / `renderCluster` slots and a full `nodeAriaLabel`.
  - **Interaction:** pan (drag, pinch, buttons), Ctrl/⌘-wheel zoom, Fit and Reset, structural arrow-key traversal, and controllable focus (`focusId`, `onFocusChange`). `dimmedNodeIds`, `height` and `showList` are also new.
  - **Localisation:** every string in both modes is now localisable through `labels` (`RelationshipGraphLabels`, `DEFAULT_RELATIONSHIP_GRAPH_LABELS`). The English defaults are unchanged.
  - **Model exports:** `layoutLayeredGraph`, `classifyLayeredEdges`, `layeredNeighbor` and `clusterIdFor`.

## 2.17.0

### Minor Changes

- Remediate every S1–S4 finding from the 2026-07 in-depth accessibility audit. Sortable headers are real buttons, the rich select and CommandPalette follow the APG combobox pattern with `aria-activedescendant`, Inbox is a keyboard listbox, and rail-mode nav items keep their accessible names. React: named dialogs with `h2` titles and attribute pass-through, `useDialog(open, onClose?)` releases the scroll lock on a native Esc, WCAG 1.4.13 tooltips, Toast announcer and focus hand-off, a complete Tabs pattern with the new `TabPanel` export, virtual-Tree focus lifecycle and typeahead, Kanban Alt+Arrow moves, Field auto label association, non-hard-disabled loading buttons, a live-region and naming pass over the feedback family, and a skip link in AppShell. Tokens/CSS: a `forced-colors.css` layer for Windows High Contrast, a global `[hidden]` guard, focus-visible reveals for hover-revealed controls, 24px minimum targets, and the type scale moved from px to rem. Two new automated gates scan overlays in their OPEN state and assert keyboard operability.

## 2.16.0

### Minor Changes

- a9832e5: Add `--uix-accent-text`, the brand hue as text on neutral or `--uix-brand-muted` surfaces, and use it for the selected filter chip (`.uix-chip[data-on]`).

  The selected chip used the solid accent as its text colour on a tint of that same accent. That measured 3.21:1 in dark mode, and below 3:1 in light mode for the POSx and mission-control brands. `--uix-accent-text` darkens the live accent in light mode and lightens it in dark mode, so it follows any brand override. The worst shipped theme now measures 5.48:1. The chip also gets its own `:focus-visible` ring, matching buttons and cards, so the ring shows even when a consumer does not load the base stylesheet.

  A new `npm run test:tokens` gate computes this contrast for every theme in both modes.

- 3bd1562: Add detailed operational pipeline and flow components, richer analytical chart chrome, explicit chart states, and Mission Control-oriented workflow/chart examples.

## 2.15.0

### Minor Changes

- af365d6: Promote reusable product patterns into UIx: Breadcrumbs, Combobox, RelativeTime, rich states, CardLink, DetailPage, related/settings compositions, generic dialogs, async-operation status, and controlled table view/filter/saved-view controls. Deepen Sidebar and NavGroup with complete rail styling, controlled disclosure, and focus restoration.

## 2.14.2

### Patch Changes

- Align the linked React package release with the Project Hub token contract.

## 2.13.0

### Minor Changes

- 6c119f3: Add the complete Phase 46.9 UIX-V3 component set: rule and canvas authoring,
  scheduling and date ranges, relationship graph and match review, metric and
  license controls, brand profiles, three-way diffs, and an accessible color
  picker. The release includes token-only component CSS, React 18/19 wrappers,
  serializable model helpers, deterministic examples, and accessibility coverage.

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
