# UIx — the house design system (single source of UI)

UIx is the **one** UI layer for the house products (**Tensor, POSx, SHOPx**). Everything visual —
tokens, components, spacing, motion — originates here and is consumed downstream. Products **do not
fork or hand-roll UI**: they consume UIx and, when something is missing, **add it here** rather than
building a bespoke local component.

> Policy in one line: **all product UI is UIx UI.** No parallel button, no parallel page header, no
> parallel empty state. If UIx lacks it, that's a UIx gap to fill — open it here.

## What UIx ships

| Layer | Source | Build output | Consume as |
|---|---|---|---|
| Tokens (`--uix-*`) | `tokens/` (DTCG) | `build/css/tokens.css`, Tailwind theme, typed TS | `@uix/tokens/*` |
| Per-product brand | `themes/*.tokens.json` | `themes/*.css` | `@uix/tokens/themes/<product>` |
| CSS components (`.uix-*`) | `styles/components/*.css` | `build/css/styles.css` | drop-in classes |
| React wrappers | `react/src/components/*.tsx` | `react/dist/*` | `@uix/react` |

Consumers vendor these (e.g. Tensor `pnpm uix:sync` → `packages/vendor/uix`). After any change here, run
`npm run build:all` then re-sync downstream.

### The spacing contract
All component spacing flows from the scale `--uix-space-0 … --uix-space-12` (4px base). Use these (or the
`.uix-stack` / `.uix-cluster` utilities) for layout rhythm — never hardcode px or Tailwind spacing in product
markup. This is the dial that keeps whitespace consistent across products.

## React component catalog (`@uix/react`)

Thin wrappers over the `.uix-*` classes (`cx('uix-…', className)` + props; pure presentation, zero app deps —
this is what keeps UIx stack-neutral). Current set:

- **Form:** Button, ButtonGroup, Input, InputGroup, Textarea, Select, Checkbox, Radio, RadioGroup, Switch, Field
- **Layout:** Card, **PageHeader**, **DetailLayout**, **List/ListItem**, AppShell, Sidebar (+Nav*), Tabs/Tab
- **Overlays:** Modal, Drawer, Peek, **Popover**, **CommandPalette** (+Group/Item)
- **Feedback / state:** Alert, Spinner, Toast/Toaster, **EmptyState**, **ErrorState**, **Skeleton**, **LoadingState**
- **Data display:** Table (+Th/Td/Tr/Wrap), Pagination, StatusPill, **Stat**, **Label**, **Tooltip**, **Avatar/AvatarGroup/UserChip**, **Comments/Comment**, **Timeline/TimelineItem**, **Prose/Note**
- **Capability:** Kanban (+Column/Card), Tree, Chart

**Bold = added in the UIx-adoption pass** (the components Tensor had rebuilt bespoke now live here).

## Domain boundary (what does NOT move into UIx)

UIx is **presentational and stack-neutral**. Business logic, data-fetching, and domain concepts stay in the
**consumer**, composed from UIx primitives:

- Data-coupled widgets (tRPC/query-driven dashboards) → build in the product, render with UIx `Card`/`Stat`/`Chart`.
- Workflow/compliance components (e.g. an approval `ConfirmAction` carrying audit/RBAC metadata) → product owns
  the logic; the **shell** uses UIx `Button`/`Modal`/`Alert`.
- Domain badges/icons (regulatory status, entity-type icons) → product owns the meaning; styling via UIx `Label`/`StatusPill`.

The test: if it needs to know about ITSM/POS/Shop concepts, tRPC, or audit trails, it's a **consumer** component
that *uses* UIx — not a UIx component.

## Coverage backlog — CSS components still needing a React wrapper

These have CSS in `styles/components/` but no `@uix/react` wrapper yet. Completing them finishes the React layer.
Prioritize by product demand.

- **Presentational (easy wrap):** breadcrumbs, kbd, meter, progress, segmented, steps, stepper, reactions,
  attachment, audit-log, notification-center, inbox, pipeline, flow, sla, heartbeat, media, lightbox,
  description-list, contact-card, utility-bits, view-menu, table-toolbar, labels(✓ as Label)
- **Interactive (need real logic, not just a wrapper):** combobox, calendar, file-upload, slider, tag-input,
  menu, form (FormGrid/Fieldset)

When you build one: add `react/src/components/<Name>.tsx`, export from `react/src/index.ts`, and if it needs a
demo, add it to `index.html`.
