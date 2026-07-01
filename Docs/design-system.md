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

**How a consumer maps