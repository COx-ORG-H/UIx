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
| Tokens (`--uix-*`) | `tokens/` (DTCG) | `build/css/tokens.css`, Tailwind theme, typed TS | `@tensor_1/tokens/*` |
| Per-product brand | `themes/*.tokens.json` | `themes/*.css` | `@tensor_1/tokens/themes/<product>` |
| CSS components (`.uix-*`) | `styles/components/*.css` | `build/css/styles.css` | drop-in classes |
| React wrappers | `packages/react/src/components/*.tsx` | `packages/react/dist/*` | `@tensor_1/react` |

Consumers vendor these (e.g. Tensor `pnpm uix:sync` → `packages/vendor/uix`). After any change here, run
`npm run build:all` then re-sync downstream.

### The spacing contract
All component spacing flows from the scale `--uix-space-0 … --uix-space-12` (4px base). Use these (or the
`.uix-stack` / `.uix-cluster` utilities) for layout rhythm — never hardcode px or Tailwind spacing in product
markup. This is the dial that keeps whitespace consistent across products.

### Table columns — sizing & cell behaviour
Consuming products size and truncate table columns by attaching a **UIx class to a column** — keyed to a
column id/class in the product's own markup — never by hand-coding pixel widths per app or targeting
`:nth-child`. The vocabulary lives in `styles/components/table.css` and is driven by a `--uix-col-*` width
scale (in `tokens/base/size.json`). This is the reusable replacement for the old per-app widths and the
`[data-uix-table-v2] … td:nth-child(2)` title cap.

**Width scale** (`--uix-col-*`):

| Token | px | Class | Typical column |
|---|---|---|---|
| `--uix-col-w-xs` | 92 | `.uix-col--w-xs` | priority, flag, pin |
| `--uix-col-w-sm` | 112 | `.uix-col--w-sm` | type, date, short status |
| `--uix-col-w-md` | 132 | `.uix-col--w-md` | id, status, category, team |
| `--uix-col-w-lg` | 176 | `.uix-col--w-lg` | assignee / person |
| `--uix-col-w-xl` | 240 | `.uix-col--w-xl` | long label |
| `--uix-col-title-min` | 340 | (floor for `.uix-col--flex`) | subject / title |

**Classes:**

| Class | Applies to | Behaviour |
|---|---|---|
| `.uix-table--fixed` | `<table>` | `table-layout: fixed; width: 100%` — column widths become authoritative and cell content no longer widens a column, so truncation is reliable. Use this (or emit a `<colgroup>`) whenever you set column widths. |
| `.uix-col--w-xs … --w-xl` | `<col>` / `<th>` / `<td>` | Sets the column to a width tier. |
| `.uix-col--flex` (alias `.uix-col--primary`) | header cell (`<th>`) | `width: auto` (fills remaining space) **plus** a `min-width: var(--uix-col-title-min)` floor so the title never collapses; the table scrolls horizontally instead. |
| `.uix-col--truncate` | `<th>` / `<td>` | One line + ellipsis. Needs a width source (a tier, the flex floor, or fixed layout). The primary/title column defaults to this. |
| `.uix-col--wrap` | `<th>` / `<td>` | Allows the cell to break to multiple lines. |
| `.uix-col--num` | `<th>` / `<td>` | Tabular figures + right alignment for numeric columns. |
| `.uix-id-cell__btn` / `.uix-id-cell__arrow` | cell content | The canonical row **click-through**: ID text + ↗ arrow as one button — a row click opens the side-peek, the arrow (revealed on row hover) opens the full record directly. |

> A `<col>` element can only carry `width` / `background` / `border`, so **width** classes work on `<col>`
> **and** cells, while **truncate / wrap / num** are cell-only (they set text properties). The primary
> column's `min-width` floor is likewise a cell property — put `.uix-col--flex` on its `<th>`, not the `<col>`.

**How a consumer maps its columns.** A product keeps its column model (ids, order) and maps each id to a
UIx class; UIx owns the pixels. TENSOR's `DataTable` flips to fixed layout and emits a `<colgroup>` when any
column declares a `meta.width` — the `<col>` elements carry the width tiers and the primary column's header
cell carries the flex floor + truncate:

```html
<table class="uix-table uix-table--pinned-col uix-table--fixed">
  <colgroup>
    <col class="uix-col--w-md"> <!-- natural_id 132 → md      -->
    <col>                       <!-- subject: flex (floor on the <th>) -->
    <col class="uix-col--w-md"> <!-- state      124 → md      -->
    <col class="uix-col--w-xs"> <!-- priority    92 → xs      -->
    <col class="uix-col--w-lg"> <!-- assignee    176 → lg     -->
    <col class="uix-col--w-sm"> <!-- updated     128 → sm     -->
    <col class="uix-col--w-md"> <!-- sla         148 → md     -->
  </colgroup>
  <thead><tr>
    <th class="uix-col--w-md">ID</th>
    <th class="uix-col--flex uix-col--truncate">Subject</th>
    <th class="uix-col--w-md">State</th>
    <th class="uix-col--w-xs">Priority</th>
    <th class="uix-col--w-lg">Assignee</th>
    <th class="uix-col--w-sm">Updated</th>
    <th class="uix-col--w-md">SLA</th>
  </tr></thead>
  <tbody>
    <tr>
      <td><button class="uix-id-cell__btn" data-uix-goto="INC-2043">INC-2043<svg class="uix-id-cell__arrow">…</svg></button></td>
      <td class="uix-col--truncate">VPN disconnects randomly for EU remote staff</td>
      <!-- …state, priority, assignee, updated, sla… -->
    </tr>
  </tbody>
</table>
```

Reconciling TENSOR's current `apps/web/lib/list-surfaces/column-widths.ts` onto the scale: `natural_id 132 → md`,
`state 124 → md`, `priority 92 → xs`, `assignee 176 → lg`, `dates 128 → sm`, `sla 148 → md`. Widths snap to the
nearest tier — the quantization is deliberate (products stop hand-picking px). Because truncation is a cell
class, the `<col>` sizes the column while `.uix-col--truncate` on the body `<td>`s clips the text.

## React component catalog (`@tensor_1/react`)

Thin wrappers over the `.uix-*` classes (`cx('uix-…', className)` + props; pure presentation, zero app deps —
this is what keeps UIx stack-neutral). Current set:

- **Form:** Button, ButtonGroup, Input, InputGroup, Textarea, Select, Checkbox, Radio, RadioGroup, Switch, Field
- **Layout:** Card, **PageHeader**, **DetailLayout**, **List/ListItem**, AppShell (**`nav` full/rail/hidden tiers · `focus` immersive mode w/ Esc-exit · `mainBleed`**; `collapsed` kept as a back-compat alias), Sidebar (+Nav*), Tabs/Tab
- **Overlays:** Modal, Drawer, Peek, **Popover**, **CommandPalette** (+Group/Item)
- **Feedback / state:** Alert, Spinner, Toast/Toaster, **EmptyState**, **ErrorState**, **Skeleton**, **LoadingState**
- **Data display:** Table (+Th/Td/Tr/Wrap; `fixed` layout, Th `sortOrder` for multi-sort; **BulkBar, RowActions/RowAction, ExpandToggle, CellStrong/CellSub, Mark/Highlighted**), Pagination, StatusPill, **Stat**, **Label**, **Tooltip**, **Avatar/AvatarGroup/UserChip**, **Comments/Comment**, **Timeline/TimelineItem**, **Prose/Note**
- **Capability:** Kanban (+Column/Card), Tree, Chart
- **Table engine (framework-agnostic):** `table-engine` — `multiSort` / `toggleSort`, `applyFilters` (typed ops), `searchRows` / `highlightSegments`, `serializeView` / `parseView` (linkable saved views), `virtualWindow`, and selection helpers (`toggleId`, `selectAllState`, `togglePage`, `mergePinned`). Pure, dependency-free, unit-tested; the **`useTable`** hook composes it into React selection/sort/filter/search/view state, and `guide/app.js` ports the same algorithms so the vanilla styleguide behaves identically.

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

These have CSS in `styles/components/` but no `@tensor_1/react` wrapper yet. Completing them finishes the React layer.
Prioritize by product demand.

- **Presentational (easy wrap):** breadcrumbs, kbd, meter, progress, segmented, steps, stepper, reactions,
  attachment, audit-log, notification-center, inbox, pipeline, flow, sla, heartbeat, media, lightbox,
  description-list, contact-card, utility-bits, view-menu, table-toolbar, labels(✓ as Label)
- **Interactive (need real logic, not just a wrapper):** combobox, calendar, file-upload, slider, tag-input,
  menu, form (FormGrid/Fieldset)

When you build one: add `packages/react/src/components/<Name>.tsx`, export from `packages/react/src/index.ts`,
and if it needs a demo, add it to `packages/tokens/index.html`.
