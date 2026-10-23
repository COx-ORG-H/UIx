# UIx component roadmap — canonical coverage map

This is the **canonical** source of truth for UIx component coverage: one row per CSS component file
in `packages/tokens/styles/components/*.css` (80 files at HEAD), mapped to its `@tensor_1/react`
export (if any), maturity, and a11y-review status. When you add or promote a component, update this
table — do not re-maintain a parallel "backlog" list elsewhere.

## How to read this table

- **CSS file** — the file under `packages/tokens/styles/components/`. Every file appears exactly once.
- **React export** — the truth is `packages/react/src/index.ts` (verified against `git show HEAD:packages/react/src/index.ts`), **not** any prose catalog:
  - **✓ `Name`** — a React wrapper is exported (the cited symbol is the primary export; groups list the family lead).
  - **absent** — CSS exists but no wrapper is exported yet (a planned wrapper).
  - **n/a** — CSS-only support surface with no standalone wrapper by design (`table-toolbar`, `utility-bits`).
- **Maturity** — `Planned` / `Alpha` / `Beta` / `Stable`. Maps to the A11Y-2 lifecycle: `Planned+Alpha → draft`, `Beta → beta`, `Stable → stable`.
  - **Rule:** anything not yet exported is **Planned**. Exported wrappers default to **Stable** (long-standing, in downstream use); wrappers that landed in the most recent feature waves (Composer/Segmented/Timeline family and the newest data-display additions) are marked **Beta** until they've soaked. No exported component is Alpha today.
- **A11y-reviewed** — has this component had a *manual* accessibility review? Only **Button** has (A11Y-1). Everything else is **no** until A11Y-2 sweeps the library. (Automated axe/lint coverage is not counted here.)

## Legend

| Symbol | Meaning |
|---|---|
| ✓ | React wrapper exported from `@tensor_1/react` |
| absent | No React wrapper yet (planned) |
| n/a | CSS-only by design; no standalone wrapper intended |

## Coverage table

| Component | CSS file | React export | Maturity | A11y-reviewed | Notes |
|---|---|---|---|---|---|
| Alert | alert.css | ✓ `Alert` | Stable | no | Feedback banner; `AlertTone`. |
| AppShell | app-shell.css | ✓ `AppShell` | Stable | no | `nav` full/rail/hidden tiers, `focus` mode, `mainBleed`. HAR-1815: `layout="viewport"` (frameless, `100dvh`, no top-bar row, one column under 40rem). HAR-1371: `navHotkey`, `navTierStorageKey`, `defaultNav`/`onNavChange`, `phoneNav="drawer"`. |
| Attachment | attachment.css | absent | Planned | no | Planned wrapper (presentational). |
| AuditLog | audit-log.css | ✓ `AuditLog` | Beta | no | HAR-987 (MEDx S50, POSx PRT-01): entries (actor, labelled action + target, relative + exact time, Details), period / person / action filters over `FilterEditor`, keyset "Show older entries", reload in a `BusyRegion`, first-load / empty / filtered-empty / error / forbidden states. |
| Avatar | avatar.css | ✓ `Avatar` | Stable | no | Also `AvatarGroup`, `UserChip`. 2.36.0 (HAR-1374): `presence` (`online`, `busy`, `away`, `offline`: a shape and a colour, the state in text), `PresenceDot`; the dot is no longer clipped by the avatar. |
| BrandProfiles | brand-profiles.css | ✓ `BrandProfiles` | Beta | no | Serializable brand editor; also `BrandProfileEditor`, apply/restore helpers. |
| Breadcrumbs | breadcrumbs.css | ✓ `Breadcrumbs` | Beta | no | Framework-neutral navigation wrapper. HAR-1385: `renderLink` renders the links with the app's router (the shared `UixRenderLink` adapter); a long unbroken title wraps. |
| BuilderCanvas | builder-canvas.css | ✓ `BuilderCanvas` | Beta | no | Palette, ordered canvas, property surface, and accessible move controls. |
| Button | button.css | ✓ `Button` | Stable | yes | Also `ButtonGroup`. Manual a11y review done (A11Y-1). HAR-2031: `shortcut` shows the keys in a hover / focus hint. HAR-2416: `ButtonLink shortcut`; screen readers hear the keys once, as the control's description (no kit `aria-keyshortcuts`). |
| Calendar | calendar.css | absent | Planned | no | Planned wrapper (interactive — needs real logic). |
| Card | card.css | ✓ `Card` | Stable | no | Layout container; also `CardLink` and `CollapsibleSection`. HAR-1818: `Inset` (`.uix-inset`), a sunken well inside a card body. |
| Chart | chart.css | ✓ `Chart` (`@tensor_1/react/chart`) | Beta | no | Optional ECharts adapter with accessible data table, analytical card states, metric, and legend chrome; lean preset also available. |
| Checkbox | checkbox.css | ✓ `Checkbox` | Stable | no | Form primitive. |
| ColorPicker | color-picker.css | ✓ `ColorPicker` | Beta | no | HSV/hex picker with presets, recent colors, and contrast feedback. |
| DashboardGrid | dashboard-grid.css | ✓ `DashboardGrid` | Beta | no | Layout grid for dashboard widgets: spans 1, 2 (clamped) and `full`; column count follows the grid's own width (container query); each item is an inline-size container so charts size from it. Also `DashboardGridItem` / `DashboardGrid.Item`, `dashboardGridClassName`. Landed with HAR-1555. |
| InsightCard | insight-card.css | ✓ `InsightCard`, `Bullet` | Beta | no | Decision card: answer headline, so-what, status word + icon, KPIs with comparison and a bullet against target, chart body with an optional aside (split from 60rem of card width), coverage, source, one action |
| ChartPanels / CorrelationScatter | chart.css | ✓ `@tensor_1/react/chart/analytic` | Beta | no | Aligned panels on one axis with one crosshair (no dual axes), overlays for thresholds, events, projections, the previous period, a partial period and crossings; a scatter with OLS trend, r, n, percentiles and a breaking point |
| Combobox | combobox.css | ✓ `Combobox` | Beta | no | Controlled searchable single-select with keyboard navigation. HAR-1588: at parity with `Select` (top-layer list, APG keys, groups, the no-match row outside the listbox). |
| CommandPalette | command-palette.css | ✓ `CommandPalette` | Beta | no | Also `CommandGroup`, `CommandItem`. 2.36.0 (HAR-1647): the result count is a label (`resultsLabel`, provider `commandPalette.resultsOne` / `resultsMany`). HAR-1378: items mode (`items`, `query`, `recent`, `open` / `onOpenChange` in a native dialog), built-in `filterCommandItems` over `foldForSearch`, `aria-activedescendant` with ↑ / ↓ / Home / End / Enter, groups, empty state. |
| Comments | comments.css | ✓ `Comments` | Beta | no | Also `Comment`. Recently landed. |
| ContactCard | contact-card.css | absent | Planned | no | Planned wrapper (presentational). |
| DatePicker | date-picker.css | ✓ `DatePicker` | Beta | no | A typed date field with a one-month calendar popover; ISO value, locale or custom format, `min` / `max` / `isUnavailable`, `weekStartsOn`. Also `DateTimePicker` (date and time, the zone shown; the `datetime-local` value shape). Landed 2.36.0 (HAR-1383). |
| DateRangePicker | date-range-picker.css | ✓ `DateRangePicker` | Beta | no | Controlled multi-month range selection with unavailable-date rules. 2.36.0 (HAR-1383): `mode="field"` (a trigger that opens the months in a popover), `weekStartsOn`. |
| DescriptionList | description-list.css | ✓ `DescriptionList` | Beta | no | Also `DescriptionItem`. HAR-2032: below 22rem of its own width (container query) each label sits above its value. |
| DetailLayout | detail-layout.css | ✓ `DetailLayout` | Stable | no | Layout scaffold; also the `DetailPage` record composition. |
| DiffViewer | diff-viewer.css | ✓ `DiffViewer` | Beta | no | Three-way JSON configuration diff and per-entry resolution. HAR-1369: `labelFor`, `renderValue(value, path, side)`, `provenance(path, side)`. |
| TextDiff | text-diff.css | ✓ `TextDiff` | Beta | no | Two-way text diff by line (changed lines paired, words marked) or by word for prose; split (stacks when narrow) or unified; folds unchanged runs; `diffText` / `textDiffRows` model. Landed with HAR-1368. |
| EditorialHome | editorial-home.css | ✓ `PageIntro` | Beta | no | Editorial-home kit (INTRA-04): family `SectionHead`, `NoticeQueue`, `FeaturedStage`, `FeaturedRundown(Item)`, `NewsLead`, `ContentList(Item)`, `ResourceGrid`, `StatLine`, `EventRow`, `StatusRow`. Ported from the approved TENSOR intranet prototype; landed 2.8.0. HAR-2030: `SearchBar` renders `.uix-searchbar` (label, icon, clear, Enter / Escape, `md` / `lg`, submit button). |
| DisplayPreferences | display-preferences.css | ✓ `DisplayPreferences` | Beta | no | HAR-1372: also `ThemeSwitcher`, `useDisplayPreferences`, `displayPreferencesScript`; the tokens read `data-contrast`, `data-text-scale`, `data-motion`, `data-density` on `<html>`. |
| Drawer | drawer.css | ✓ `Drawer` | Stable | no | Overlay. HAR-2029: `dirty` asks "Discard changes?" (anchored, focus on Keep editing) on Escape, ×, backdrop and `DialogClose`; `pending` blocks them. |
| FileUpload | file-upload.css | absent | Planned | no | Planned wrapper (interactive — needs real logic). |
| Flow | flow.css | ✓ `Flow` | Beta | no | Also `FlowNode`; presentational graph shell with explicit state text and consumer-owned geometry. |
| Form | form.css | ✓ `Field` | Stable | no | Also `ToggleRow`; `FormGrid`/`Fieldset` still planned. |
| Heartbeat | heartbeat.css | ✓ `Heartbeat` | Beta | no | The pulsing status dot (`live`, `idle`, `warning`, `danger`), decorative unless labelled; also `LiveIndicator` (dot + state text). Landed 2.32.0 (HAR-1606). |
| Inbox | inbox.css | ✓ `Inbox` | Beta | no | Also `InboxList`, `InboxItem`, `InboxDetail`. ITSM capability; recently landed. |
| Icon | icon.css | ✓ `Icon` (`@tensor_1/react/icons`) | Beta | no | 233 Lucide glyphs (ISC) as tree-shakeable `<Name>Icon` components plus a name-based `Icon`; sized by `--uix-icon-*`, decorative unless labelled. Landed 2.29.0 (HAR-996). |
| InlineEdit | inline-edit.css | ✓ `InlineEdit` | Beta | no | A value edited in place: the value is a button, the editor has Save and Cancel, Enter / Escape, pending and error states, focus returns to the value. Custom editors through `renderEditor`. Landed 2.36.0 (HAR-1381). HAR-1833: any value type (`equals`, `renderView`), `commit` explicit / blur / change, controllable `editing` and `draft`, `renderError` with retry, `onStateChange`, `trigger="icon"`, `readOnlyReason`; pending shown after 300 ms; the stylesheet is in the bundle at last. |
| Input | input.css | ✓ `Input` | Stable | no | Also `InputGroup`. |
| Kanban | kanban.css | ✓ `Kanban` | Beta | no | Also `KanbanColumn`, `KanbanCard`. Capability; recently landed. |
| Kbd | kbd.css | ✓ `Kbd` | Beta | no | Also `KbdCombo` (platform-aware ⌘/Ctrl glyphs, spoken key names). Landed 2.27.0 (HAR-1361). HAR-2031: `KeyShortcut`, `ariaKeyShortcuts`. |
| Label | labels.css | ✓ `Label` | Stable | no | Exported as `Label` (from `labels.css`). |
| LicensePositionBar | license-position-bar.css | ✓ `LicensePositionBar` | Beta | no | Meter + status recipe with explicit over-entitlement state. |
| Lightbox | lightbox.css | ✓ `Lightbox` | Beta | no | Full-screen media viewer (HAR-1367). HAR-1826: toolbar `actions`, `renderOverlay` in the picture's own box, keys the consumer claims (`onKeyDown`, `onEscapeKeyDown`); no counter for a single item. |
| Link | link.css | n/a | Beta | no | Quiet-link CSS contract; also consumed by the `RelatedLinks` composition. In-text prose links keep the base blue + underline (WCAG 1.4.1). |
| List | list.css | ✓ `List` | Stable | no | Also `ListItem`. |
| MatchReview | match-review.css | ✓ `MatchReview` | Beta | no | Descriptor-driven candidates, individual decisions, and bulk review. HAR-1369: `fieldMode="adopt"` (compare table, a checkbox per differing field, `onAdopt(candidateId, fieldIds)`, provenance disclosure; stacks per field on a phone). |
| Media | media.css | absent | Planned | no | Planned wrapper (presentational). |
| Menu | menu.css | ✓ `Menu` | Beta | no | APG menu button on the kit `Popover`; also `MenuItem` (link items, shortcut, danger), `MenuGroup`, `MenuSeparator`. Landed 2.27.0 (HAR-1359). 2.32.0 (HAR-1629): `MenuItemRadio`, `MenuItemCheckbox`, `MenuRadioGroup`, `id` / `data-*` on items, Escape on the trigger, capped to the viewport. HAR-2031: a key-name `shortcut` renders `KbdCombo` and sets `aria-keyshortcuts`. |
| Meter | meter.css | ✓ `Meter` | Beta | no | `MeterTone`. Recently landed. |
| MetricInput | metric-input.css | ✓ `MetricInput` | Beta | no | Formatted numeric input with unit and bounded step controls. |
| Modal | modal.css | ✓ `Modal` | Stable | no | Overlay; `useDialog` hook; also generic `ConfirmDialog` and `PromptDialog`. HAR-2029: `dirty` / `pending` as on Drawer, and `DialogClose`. |
| NotificationCenter | notification-center.css | absent | Planned | no | Planned wrapper (presentational). |
| OrgChart | org-chart.css | ✓ `OrgChart` | Beta | no | Reporting lines as a top-down chart of person cards (photo or initials, name, title, team, location, direct-report count as the expand control); `loadChildren` on expand with loading and retry rows, `revealId` for search, leaf rows stacked, zoom / Fit / pan, an indented list below 48rem of its own width; WAI-ARIA tree keys that follow the picture. `OrgChartNode`, `OrgChartLabels`. Landed with HAR-1807. |
| PageHeader | page-header.css | ✓ `PageHeader` | Stable | no | Layout header. HAR-1815: `size="display"`, the staff type preset. |
| Pagination | pagination.css | ✓ `Pagination` | Stable | no | Data-display control. |
| Peek | peek.css | ✓ `Peek` | Stable | no | Side-peek overlay. |
| Pipeline | pipeline.css | ✓ `Pipeline` | Beta | no | Also `PipelineStage`; compact bar and detailed scrollable operational rail. |
| Popover | popover.css | ✓ `Popover` | Beta | no | Overlay; recently landed. |
| Progress | progress.css | ✓ `Progress` | Beta | no | Recently landed. |
| Prose | prose.css | ✓ `Prose` | Stable | no | Also `Note` (`NoteTone`). |
| Radio | radio.css | ✓ `Radio` | Stable | no | Also `RadioGroup`. 2.36.0 (HAR-1373): `RadioCard` and `RadioGroup variant="card"` (title, description, media). |
| Reactions | reactions.css | absent | Planned | no | Planned wrapper (presentational). |
| RelationshipGraph | relationship-graph.css | ✓ `RelationshipGraph` | Beta | no | Bounded deterministic SVG with accessible equivalent list and traversal. |
| RuleBuilder | rule-builder.css | ✓ `RuleBuilder` | Beta | no | Declarative nested conditions-to-actions editor and model helpers. |
| SchedulingCalendar | scheduling-calendar.css | ✓ `SchedulingCalendar` | Beta | no | Month/week/agenda schedule in one explicit zone: band, status and markers per item, spans drawn once per week row, named windows, consumer-owned counts. |
| SchedulingTimeline | scheduling-timeline.css | ✓ `SchedulingTimeline` | Beta | no | Lanes of bars on a zoned time axis in collapsible groups; sub-rows packed by `packLanes`; one neutral, patterned window per overlay, limited to its lanes; proposal-based moves (`onProposeMove`), step commits (`onMoveItem`), resize only with `onResizeItem`; virtualised rows; sub-ticks; pure model helpers. Landed with HAR-1364, service lanes with HAR-1521. |
| Segmented | segmented.css | ✓ `Segmented` | Beta | no | Also `SegmentedOption`. HAR-1380: `selection="link"` (a named nav of links, `aria-current="page"`) and the `LocaleSwitcher` convenience. |
| SortableList | sortable-list.css | ✓ `SortableList` | Beta | no | HAR-1375: a list the person reorders: grip (pointer drag), Move up / Move down always present, Alt+↑ / Alt+↓, focus kept, polite announcement. Shares `reorder.ts` (`placeId`, `useRowDrag`) with ViewMenu, SavedViewMenu and NavFavourites. |
| Select | select.css | ✓ `Select` | Stable | no | Form primitive. |
| Sidebar | sidebar.css | ✓ `Sidebar` | Stable | no | Also controlled `NavGroup`, rail mode, `SidebarSection`, `NavItem`, and `SubNavItem`. HAR-1371: `actions`, `search`, `footer` slots and `AccountMenu`. |
| Sla | sla.css | absent | Planned | no | Planned wrapper (presentational). |
| Slider | slider.css | absent | Planned | no | Planned wrapper (interactive — needs real logic). |
| Spinner | spinner.css | ✓ `Spinner` | Stable | no | Feedback. |
| Stat | stat-tile.css | ✓ `Stat` | Stable | no | Exported as `Stat` (`StatTrend`). HAR-1563: `trend.sentiment`; toned tiles keep a neutral border. HAR-1803: a link tile shows a chevron at rest. |
| States | states.css | ✓ `EmptyState` | Stable | no | Also rich page/drawer variants, `ErrorState`, `ForbiddenState`, `NotFoundState`, `LoadingState`, `Skeleton`, and `AsyncOperationStatus`. |
| StatusPill | status-pill.css | ✓ `StatusPill` | Stable | no | `PillTone`, `PillTreatment`. HAR-1563: `treatment` `soft` (`filled` alias) / `dot` / `outline`, tone `progress`. |
| Stepper | stepper.css | absent | Planned | no | The numeric −/+ stepper (not a wizard; that is `Steps`). `MetricInput` covers bounded numeric entry today. |
| Steps | steps.css | ✓ `Steps` | Beta | no | Also `Step`; ordered list, state in text (complete/current/upcoming/waiting/error), navigable steps, stacks below 40rem. Landed 2.27.0 (HAR-1362). 2.32.0 (HAR-1628): `progress={false}` for numbered sections that hold content. |
| Switch | switch.css | ✓ `Switch` | Stable | no | Form primitive. |
| Table | table.css | ✓ `Table` | Stable | no | Family: `TableWrap`, `Th`, `Td`, `Tr`, `BulkBar`, `RowActions`, etc.; `useTable` + `table-engine`. |
| TableToolbar | table-toolbar.css | ✓ `Chip` | Stable | no | CSS support for Table and the exported `FilterPopover` composition. Also home of `.uix-chip`: React `Chip` (toggle, removable, link, "+ add") and `ChipGroup` landed 2.27.0 (HAR-1360). `FilterEditor` (HAR-1365) gained `tags` and `date` (on / before / after / between) kinds, `resolveLabels` for restored reference ids and Enter-applies in every kind in HAR-1832. |
| DataWorkspace | data-workspace.css | ✓ `DataWorkspace` | Beta | no | HAR-1388, ADR-0005: the generic presentation half of the products' data tables over Table / TableWrap refreshing / SavedViewMenu / ViewMenu / Chip + FilterEditor / SearchBar / BulkBar / Menu / Pagination; the product keeps registry, URL state, fetching, PII. |
| Tabs | tabs.css | ✓ `Tabs` | Stable | no | Also `Tab`. |
| TagInput | tag-input.css | ✓ `TagInput` | Beta | no | Type-to-add chips (Enter, comma, paste), suggestions in a top-layer list, refusals with a reason (duplicate, `validate`, `maxTags`), keyboard between the field and the chips, one hidden value per tag. Landed with HAR-1377. |
| Textarea | textarea.css | ✓ `Textarea` | Stable | no | Form primitive. |
| Timeline | timeline.css | ✓ `Timeline` | Beta | no | Also `TimelineItem`. Recently landed. |
| Toast | toast.css | ✓ `Toast` | Stable | no | Also `Toaster` (`ToastTone`). |
| Tooltip | tooltip.css | ✓ `Tooltip` | Stable | no | Overlay/feedback. HAR-2031: `shortcut` (keys in the bubble). HAR-2416: the keys are said once, in the trigger's description; no `aria-keyshortcuts`. HAR-2415: an Escape that closes the bubble does not reach a Drawer or Modal around it. |
| Tree | tree.css | ✓ `Tree` | Stable | no | Capability; `TreeNodeData`. 2.36.0 (HAR-1382): `hasChildren` and `loadChildren` (children loaded on expand, with a loading row and an error row with Retry). |
| Typography | typography.css | n/a | Stable | no | Foundation type styles (applied via classes); no standalone wrapper by design. |
| UtilityBits | utility-bits.css | n/a | Stable | no | CSS-only utilities (`.uix-stack`/`.uix-cluster` etc.); no standalone wrapper by design. |
| ViewMenu | view-menu.css | ✓ `ViewMenu` | Beta | no | Controlled density/row/column presentation with its own surface; column rows grip · checkbox · name · ⋯, `onReorder(orderedIds)` (full list), required columns; also `SavedViewMenu` (titled sections, grip · name · overflow rows, `onReorder` within a section). |

## Notes

- **Composer** (`Composer`/`ComposerBar`) and the `Field`, `StarButton`, `NavFavourites`, `RelativeTime`,
  `RelatedLinks`, `ToggleRow`, `CollapsibleSection`, dialog, table-control, and detail-page React exports have no
  dedicated CSS file of their own (they reuse `comments.css` / `form.css` / `sidebar.css` styling), so they are not
  rows above. They are, however, real exports in `@tensor_1/react` — see `packages/react/src/index.ts`.
- The **10 currently-planned presentational wrappers** are stepper, reactions, attachment, audit-log,
  notification-center, sla, heartbeat, media, lightbox, and contact-card. In addition, calendar, file-upload
  and slider remain Planned; those need real behaviour, not just a class wrapper (tag-input got its `TagInput` with HAR-1377). Kbd, Steps and
  Menu gained wrappers in 2.27.0 (the UIx reuse remediation, HAR-1346).

## Motion and feedback kit

The motion contract (tokens, the `check-motion.mjs` gate, the reduced-motion and hover policy, overlay
timing) landed in HAR-2578, work package 1 of the motion rollout. The canonical vocabulary is the docs
Foundations → Motion page; the plan is TENSOR `Docs/plans/2026-10-22-motion-and-micro-interactions.md`.
These primitives are **Planned** in work package 2 (the feedback kit). Until each ships, the Motion page
marks it *coming*.

| Primitive | Answers | Planned shape |
|---|---|---|
| Delayed-pending hook | Is it working? | Drives `Spinner` / `Button loading` / `LoadingState` / `SaveStatus`: show after 300 ms, hold at least 500 ms. |
| `Button` success / error state | Did it work? | Label/icon crossfade in place, held 1–2 s, announced through `aria-live`. |
| `BusyRegion` + DataTable `refreshing` | Is it working? | Keep previous rows, dim, top indeterminate bar, `aria-busy`. |
| Optimistic helper | Did it register? | `useOptimistic`-style, with a visible rollback that says what was restored. |
| `ChangeHighlight` / `.uix-changed` | What changed? | A tint on the changed row or field that fades over 1–1.5 s; a steady outline under reduced motion. Sibling of `.uix-arrival`. |
| List enter / exit / reorder (FLIP) | Where did it go? | Opacity plus ≤ 8 px travel; exit collapses on transform before the gap closes. |
| `Count` | What changed? | One tick on change, never a loop; no tweened numbers in dense tables. |
| `SuccessState` / receipt | Did it work? (a rare peak) | One success mark, then “what happens next”. |
| Disclosure expand (`CollapsibleSection`) | Where did it go? | ≤ 200 ms on transform/opacity, never height. |
| Sliding tab indicator | Where did it go? | The active indicator moves between tabs, ≤ 200 ms. |
| Drag affordances | Did it register? | Lift on grab, drop target and line, settle ≤ 200 ms, with a keyboard alternative. |
