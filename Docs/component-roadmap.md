# UIx component roadmap — canonical coverage map

This is the **canonical** source of truth for UIx component coverage: one row per CSS component file
in `packages/tokens/styles/components/*.css` (69 files at HEAD), mapped to its `@tensor_1/react`
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
| Breadcrumbs | breadcrumbs.css | absent | Planned | no | Planned wrapper (presentational). |
| Button | button.css | ✓ `Button` | Stable | yes | Also `ButtonGroup`. Manual a11y review done (A11Y-1). |
| Calendar | calendar.css | absent | Planned | no | Planned wrapper (interactive — needs real logic). |
| Card | card.css | ✓ `Card` | Stable | no | Layout container. |
| Chart | chart.css | absent | Planned | no | Planned wrapper; CSS only at HEAD (not yet in `index.ts`). |
| Checkbox | checkbox.css | ✓ `Checkbox` | Stable | no | Form primitive. |
| Combobox | combobox.css | absent | Planned | no | Planned wrapper (interactive — needs real logic). |
| CommandPalette | command-palette.css | ✓ `CommandPalette` | Beta | no | Also `CommandGroup`, `CommandItem`. Recently landed. |
| Comments | comments.css | ✓ `Comments` | Beta | no | Also `Comment`. Recently landed. |
| ContactCard | contact-card.css | absent | Planned | no | Planned wrapper (presentational). |
| DescriptionList | description-list.css | ✓ `DescriptionList` | Beta | no | Also `DescriptionItem`. Recently landed. |
| DetailLayout | detail-layout.css | ✓ `DetailLayout` | Stable | no | Layout scaffold. |
| EditorialHome | editorial-home.css | ✓ `PageIntro` | Beta | no | Editorial-home kit (INTRA-04): family `SectionHead`, `NoticeQueue`, `FeaturedStage`, `FeaturedRundown(Item)`, `NewsLead`, `ContentList(Item)`, `ResourceGrid`, `StatLine`, `EventRow`, `StatusRow`. Ported from the approved TENSOR intranet prototype; landed 2.8.0. |
| Drawer | drawer.css | ✓ `Drawer` | Stable | no | Overlay. |
| FileUpload | file-upload.css | absent | Planned | no | Planned wrapper (interactive — needs real logic). |
| Flow | flow.css | absent | Planned | no | Planned wrapper (presentational). |
| Form | form.css | ✓ `Field` | Stable | no | `Field` wraps the form-row CSS; `FormGrid`/`Fieldset` still planned. |
| Heartbeat | heartbeat.css | absent | Planned | no | Planned wrapper (presentational). |
| Inbox | inbox.css | ✓ `Inbox` | Beta | no | Also `InboxList`, `InboxItem`, `InboxDetail`. ITSM capability; recently landed. |
| Input | input.css | ✓ `Input` | Stable | no | Also `InputGroup`. |
| Kanban | kanban.css | ✓ `Kanban` | Beta | no | Also `KanbanColumn`, `KanbanCard`. Capability; recently landed. |
| Kbd | kbd.css | absent | Planned | no | Planned wrapper (presentational). |
| Label | labels.css | ✓ `Label` | Stable | no | Exported as `Label` (from `labels.css`). |
| Lightbox | lightbox.css | absent | Planned | no | Planned wrapper (presentational). |
| Link | link.css | n/a | Beta | no | Quiet-link pattern in four forms: `.uix-link--quiet` opt-in, plus quiet-by-default title/name slots, data cells (`.uix-table td`, `.uix-dl dd`) and container anchors (`a.uix-card` etc.). In-text prose links keep the base blue + underline (WCAG 1.4.1); prose, alerts/toasts and `.uix-peek__title` are documented exclusions. CSS-only by design; landed 2.9.0, extended kit-wide in 2.10.0. |
| List | list.css | ✓ `List` | Stable | no | Also `ListItem`. |
| Media | media.css | absent | Planned | no | Planned wrapper (presentational). |
| Menu | menu.css | absent | Planned | no | Planned wrapper (interactive — needs real logic). |
| Meter | meter.css | ✓ `Meter` | Beta | no | `MeterTone`. Recently landed. |
| Modal | modal.css | ✓ `Modal` | Stable | no | Overlay; `useDialog` hook. |
| NotificationCenter | notification-center.css | absent | Planned | no | Planned wrapper (presentational). |
| PageHeader | page-header.css | ✓ `PageHeader` | Stable | no | Layout header. |
| Pagination | pagination.css | ✓ `Pagination` | Stable | no | Data-display control. |
| Peek | peek.css | ✓ `Peek` | Stable | no | Side-peek overlay. |
| Pipeline | pipeline.css | absent | Planned | no | Planned wrapper (presentational). |
| Popover | popover.css | ✓ `Popover` | Beta | no | Overlay; recently landed. |
| Progress | progress.css | ✓ `Progress` | Beta | no | Recently landed. |
| Prose | prose.css | ✓ `Prose` | Stable | no | Also `Note` (`NoteTone`). |
| Radio | radio.css | ✓ `Radio` | Stable | no | Also `RadioGroup`. |
| Reactions | reactions.css | absent | Planned | no | Planned wrapper (presentational). |
| Segmented | segmented.css | ✓ `Segmented` | Beta | no | Also `SegmentedOption`. Recently landed. |
| Select | select.css | ✓ `Select` | Stable | no | Form primitive. |
| Sidebar | sidebar.css | ✓ `Sidebar` | Stable | no | Also `SidebarSection`, `NavItem`, `NavGroup`, `SubNavItem`. 2026-08 additions (Beta until soaked): `NavSection` (static section header — the non-interactive contract; `.uix-navitem` is for focusable elements only), `SidebarIdentity`/`SidebarIdentityItem`/`SidebarIdentitySep` (org+user disclosure over a native-popover account menu, dev-only slot), `SidebarFooter`/`SidebarUtil`/`SidebarFooterSpacer` (quiet utility strip). All rail-aware; gated by `tests/a11y/nav-contract.spec.mjs`. |
| Sla | sla.css | absent | Planned | no | Planned wrapper (presentational). |
| Slider | slider.css | absent | Planned | no | Planned wrapper (interactive — needs real logic). |
| Spinner | spinner.css | ✓ `Spinner` | Stable | no | Feedback. |
| Stat | stat-tile.css | ✓ `Stat` | Stable | no | Exported as `Stat` (`StatTrend`). |
| States | states.css | ✓ `EmptyState` | Stable | no | Also `ErrorState`, `Skeleton`, `LoadingState`. |
| StatusPill | status-pill.css | ✓ `StatusPill` | Stable | no | `PillTone`, `PillTreatment`. |
| Stepper | stepper.css | absent | Planned | no | Planned wrapper (presentational). |
| Steps | steps.css | absent | Planned | no | Planned wrapper (presentational). |
| Switch | switch.css | ✓ `Switch` | Stable | no | Form primitive. |
| Table | table.css | ✓ `Table` | Stable | no | Family: `TableWrap`, `Th`, `Td`, `Tr`, `BulkBar`, `RowActions`, etc.; `useTable` + `table-engine`. |
| TableToolbar | table-toolbar.css | n/a | Stable | no | CSS-only support surface (toolbar chrome consumed by Table); no standalone wrapper by design. |
| Tabs | tabs.css | ✓ `Tabs` | Stable | no | Also `Tab`. |
| TagInput | tag-input.css | absent | Planned | no | Planned wrapper (interactive — needs real logic). |
| Textarea | textarea.css | ✓ `Textarea` | Stable | no | Form primitive. |
| Timeline | timeline.css | ✓ `Timeline` | Beta | no | Also `TimelineItem`. Recently landed. |
| Toast | toast.css | ✓ `Toast` | Stable | no | Also `Toaster` (`ToastTone`). |
| Tooltip | tooltip.css | ✓ `Tooltip` | Stable | no | Overlay/feedback. |
| Tree | tree.css | ✓ `Tree` | Stable | no | Capability; `TreeNodeData`. |
| Typography | typography.css | n/a | Stable | no | Foundation type styles (applied via classes); no standalone wrapper by design. The `.uix-text-*` set is CLOSED (incl. `uix-text-label`); enforced in consumers by `npx uix-classlint`, parity-tested by `lint/uix-classlint.test.mjs`. |
| UtilityBits | utility-bits.css | n/a | Stable | no | CSS-only utilities (`.uix-stack`/`.uix-cluster` etc.); no standalone wrapper by design. |
| ViewMenu | view-menu.css | absent | Planned | no | Planned wrapper (presentational). |

## Notes

- **Composer** (`Composer`/`ComposerBar`) and the `Field`, `StarButton`, `NavFavourites` React exports have no
  dedicated CSS file of their own (they reuse `comments.css` / `form.css` / `sidebar.css` styling), so they are not
  rows above. They are, however, real exports in `@tensor_1/react` — see `packages/react/src/index.ts`.
- The **16 currently-planned wrappers** (React=absent, Maturity=Planned, presentational unless noted): breadcrumbs,
  kbd, steps, stepper, reactions, attachment, audit-log, notification-center, pipeline, flow, sla, heartbeat, media,
  lightbox, contact-card, view-menu. In addition, the interactive-but-unwrapped surfaces (combobox, calendar,
  file-upload, slider, tag-input, menu) and chart are also Planned; those need real behaviour, not just a class wrapper.
