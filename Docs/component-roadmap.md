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
| AppShell | app-shell.css | ✓ `AppShell` | Stable | no | `nav` full/rail/hidden tiers, `focus` mode, `mainBleed`. |
| Attachment | attachment.css | absent | Planned | no | Planned wrapper (presentational). |
| AuditLog | audit-log.css | absent | Planned | no | Planned wrapper (presentational). |
| Avatar | avatar.css | ✓ `Avatar` | Stable | no | Also `AvatarGroup`, `UserChip`. |
| BrandProfiles | brand-profiles.css | ✓ `BrandProfiles` | Beta | no | Serializable brand editor; also `BrandProfileEditor`, apply/restore helpers. |
| Breadcrumbs | breadcrumbs.css | ✓ `Breadcrumbs` | Beta | no | Framework-neutral navigation wrapper. |
| BuilderCanvas | builder-canvas.css | ✓ `BuilderCanvas` | Beta | no | Palette, ordered canvas, property surface, and accessible move controls. |
| Button | button.css | ✓ `Button` | Stable | yes | Also `ButtonGroup`. Manual a11y review done (A11Y-1). |
| Calendar | calendar.css | absent | Planned | no | Planned wrapper (interactive — needs real logic). |
| Card | card.css | ✓ `Card` | Stable | no | Layout container; also `CardLink` and `CollapsibleSection`. |
| Chart | chart.css | ✓ `Chart` (`@tensor_1/react/chart`) | Beta | no | Optional ECharts adapter with accessible data table, analytical card states, metric, and legend chrome; lean preset also available. |
| Checkbox | checkbox.css | ✓ `Checkbox` | Stable | no | Form primitive. |
| ColorPicker | color-picker.css | ✓ `ColorPicker` | Beta | no | HSV/hex picker with presets, recent colors, and contrast feedback. |
| Combobox | combobox.css | ✓ `Combobox` | Beta | no | Controlled searchable single-select with keyboard navigation. |
| CommandPalette | command-palette.css | ✓ `CommandPalette` | Beta | no | Also `CommandGroup`, `CommandItem`. Recently landed. |
| Comments | comments.css | ✓ `Comments` | Beta | no | Also `Comment`. Recently landed. |
| ContactCard | contact-card.css | absent | Planned | no | Planned wrapper (presentational). |
| DateRangePicker | date-range-picker.css | ✓ `DateRangePicker` | Beta | no | Controlled multi-month range selection with unavailable-date rules. |
| DescriptionList | description-list.css | ✓ `DescriptionList` | Beta | no | Also `DescriptionItem`. Recently landed. |
| DetailLayout | detail-layout.css | ✓ `DetailLayout` | Stable | no | Layout scaffold; also the `DetailPage` record composition. |
| DiffViewer | diff-viewer.css | ✓ `DiffViewer` | Beta | no | Three-way JSON configuration diff and per-entry resolution. |
| EditorialHome | editorial-home.css | ✓ `PageIntro` | Beta | no | Editorial-home kit (INTRA-04): family `SectionHead`, `NoticeQueue`, `FeaturedStage`, `FeaturedRundown(Item)`, `NewsLead`, `ContentList(Item)`, `ResourceGrid`, `StatLine`, `EventRow`, `StatusRow`. Ported from the approved TENSOR intranet prototype; landed 2.8.0. |
| Drawer | drawer.css | ✓ `Drawer` | Stable | no | Overlay. |
| FileUpload | file-upload.css | absent | Planned | no | Planned wrapper (interactive — needs real logic). |
| Flow | flow.css | ✓ `Flow` | Beta | no | Also `FlowNode`; presentational graph shell with explicit state text and consumer-owned geometry. |
| Form | form.css | ✓ `Field` | Stable | no | Also `ToggleRow`; `FormGrid`/`Fieldset` still planned. |
| Heartbeat | heartbeat.css | absent | Planned | no | Planned wrapper (presentational). |
| Inbox | inbox.css | ✓ `Inbox` | Beta | no | Also `InboxList`, `InboxItem`, `InboxDetail`. ITSM capability; recently landed. |
| Input | input.css | ✓ `Input` | Stable | no | Also `InputGroup`. |
| Kanban | kanban.css | ✓ `Kanban` | Beta | no | Also `KanbanColumn`, `KanbanCard`. Capability; recently landed. |
| Kbd | kbd.css | absent | Planned | no | Planned wrapper (presentational). |
| Label | labels.css | ✓ `Label` | Stable | no | Exported as `Label` (from `labels.css`). |
| LicensePositionBar | license-position-bar.css | ✓ `LicensePositionBar` | Beta | no | Meter + status recipe with explicit over-entitlement state. |
| Lightbox | lightbox.css | absent | Planned | no | Planned wrapper (presentational). |
| Link | link.css | n/a | Beta | no | Quiet-link CSS contract; also consumed by the `RelatedLinks` composition. In-text prose links keep the base blue + underline (WCAG 1.4.1). |
| List | list.css | ✓ `List` | Stable | no | Also `ListItem`. |
| MatchReview | match-review.css | ✓ `MatchReview` | Beta | no | Descriptor-driven candidates, individual decisions, and bulk review. |
| Media | media.css | absent | Planned | no | Planned wrapper (presentational). |
| Menu | menu.css | absent | Planned | no | Planned wrapper (interactive — needs real logic). |
| Meter | meter.css | ✓ `Meter` | Beta | no | `MeterTone`. Recently landed. |
| MetricInput | metric-input.css | ✓ `MetricInput` | Beta | no | Formatted numeric input with unit and bounded step controls. |
| Modal | modal.css | ✓ `Modal` | Stable | no | Overlay; `useDialog` hook; also generic `ConfirmDialog` and `PromptDialog`. |
| NotificationCenter | notification-center.css | absent | Planned | no | Planned wrapper (presentational). |
| PageHeader | page-header.css | ✓ `PageHeader` | Stable | no | Layout header. |
| Pagination | pagination.css | ✓ `Pagination` | Stable | no | Data-display control. |
| Peek | peek.css | ✓ `Peek` | Stable | no | Side-peek overlay. |
| Pipeline | pipeline.css | ✓ `Pipeline` | Beta | no | Also `PipelineStage`; compact bar and detailed scrollable operational rail. |
| Popover | popover.css | ✓ `Popover` | Beta | no | Overlay; recently landed. |
| Progress | progress.css | ✓ `Progress` | Beta | no | Recently landed. |
| Prose | prose.css | ✓ `Prose` | Stable | no | Also `Note` (`NoteTone`). |
| Radio | radio.css | ✓ `Radio` | Stable | no | Also `RadioGroup`. |
| Reactions | reactions.css | absent | Planned | no | Planned wrapper (presentational). |
| RelationshipGraph | relationship-graph.css | ✓ `RelationshipGraph` | Beta | no | Bounded deterministic SVG with accessible equivalent list and traversal. |
| RuleBuilder | rule-builder.css | ✓ `RuleBuilder` | Beta | no | Declarative nested conditions-to-actions editor and model helpers. |
| SchedulingCalendar | scheduling-calendar.css | ✓ `SchedulingCalendar` | Beta | no | Month/week/agenda schedule with time-zone ranges and overlays. |
| Segmented | segmented.css | ✓ `Segmented` | Beta | no | Also `SegmentedOption`. Recently landed. |
| Select | select.css | ✓ `Select` | Stable | no | Form primitive. |
| Sidebar | sidebar.css | ✓ `Sidebar` | Stable | no | Also controlled `NavGroup`, rail mode, `SidebarSection`, `NavItem`, and `SubNavItem`. |
| Sla | sla.css | absent | Planned | no | Planned wrapper (presentational). |
| Slider | slider.css | absent | Planned | no | Planned wrapper (interactive — needs real logic). |
| Spinner | spinner.css | ✓ `Spinner` | Stable | no | Feedback. |
| Stat | stat-tile.css | ✓ `Stat` | Stable | no | Exported as `Stat` (`StatTrend`). |
| States | states.css | ✓ `EmptyState` | Stable | no | Also rich page/drawer variants, `ErrorState`, `ForbiddenState`, `NotFoundState`, `LoadingState`, `Skeleton`, and `AsyncOperationStatus`. |
| StatusPill | status-pill.css | ✓ `StatusPill` | Stable | no | `PillTone`, `PillTreatment`. |
| Stepper | stepper.css | absent | Planned | no | Planned wrapper (presentational). |
| Steps | steps.css | absent | Planned | no | Planned wrapper (presentational). |
| Switch | switch.css | ✓ `Switch` | Stable | no | Form primitive. |
| Table | table.css | ✓ `Table` | Stable | no | Family: `TableWrap`, `Th`, `Td`, `Tr`, `BulkBar`, `RowActions`, etc.; `useTable` + `table-engine`. |
| TableToolbar | table-toolbar.css | n/a | Stable | no | CSS support for Table and the exported `FilterPopover` composition. |
| Tabs | tabs.css | ✓ `Tabs` | Stable | no | Also `Tab`. |
| TagInput | tag-input.css | absent | Planned | no | Planned wrapper (interactive — needs real logic). |
| Textarea | textarea.css | ✓ `Textarea` | Stable | no | Form primitive. |
| Timeline | timeline.css | ✓ `Timeline` | Beta | no | Also `TimelineItem`. Recently landed. |
| Toast | toast.css | ✓ `Toast` | Stable | no | Also `Toaster` (`ToastTone`). |
| Tooltip | tooltip.css | ✓ `Tooltip` | Stable | no | Overlay/feedback. |
| Tree | tree.css | ✓ `Tree` | Stable | no | Capability; `TreeNodeData`. |
| Typography | typography.css | n/a | Stable | no | Foundation type styles (applied via classes); no standalone wrapper by design. |
| UtilityBits | utility-bits.css | n/a | Stable | no | CSS-only utilities (`.uix-stack`/`.uix-cluster` etc.); no standalone wrapper by design. |
| ViewMenu | view-menu.css | ✓ `ViewMenu` | Beta | no | Controlled density/row/column presentation; also `SavedViewMenu`. |

## Notes

- **Composer** (`Composer`/`ComposerBar`) and the `Field`, `StarButton`, `NavFavourites`, `RelativeTime`,
  `RelatedLinks`, `ToggleRow`, `CollapsibleSection`, dialog, table-control, and detail-page React exports have no
  dedicated CSS file of their own (they reuse `comments.css` / `form.css` / `sidebar.css` styling), so they are not
  rows above. They are, however, real exports in `@tensor_1/react` — see `packages/react/src/index.ts`.
- The **12 currently-planned presentational wrappers** are kbd, steps, stepper, reactions, attachment, audit-log,
  notification-center, sla, heartbeat, media, lightbox, and contact-card. In addition, calendar, file-upload,
  slider, tag-input, and menu remain Planned; those need real behaviour, not just a class wrapper.
