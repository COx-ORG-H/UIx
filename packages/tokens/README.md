# @tensor_1/tokens

UIx v2 design tokens — the **`--uix-*` contract** (colors, typography, spacing, radii, motion, light/dark) for the house products. One [DTCG](https://www.designtokens.org/) source generates **CSS variables**, a **Tailwind theme**, and **typed TS constants**.

> Stack-neutral. Drop the CSS into any project (HTML, React, Vue, Tailwind, server-rendered). The `--uix-*` names *are* the contract — override values, never names.

## Install

```sh
npm i @tensor_1/tokens
```

## Use

**Tailwind / shadcn:**
```css
@import "@tensor_1/tokens/css";            /* the --uix-* contract (light + dark) */
@import "@tensor_1/tokens/themes/tensor";  /* a product brand */
@import "@tensor_1/tokens/tailwind";       /* @theme — bg-uix-accent, rounded-uix-md, … */
@import "tailwindcss";
```
(Tailwind v3: `presets: [require('@tensor_1/tokens/tailwind/preset')]`.)

**Plain CSS:** link `@tensor_1/tokens/css`, then a product theme.

**TS / ECharts / React Native:**
```ts
import { cssVar, light, dark, num } from "@tensor_1/tokens/ts";
```
`cssVar` in the browser (respects brand + dark); `light` / `dark` / `num` for non-DOM (SSR, RN, server-rendered charts).

## Brand a project

Override the write-only brand slots; `accent` / `link` / `ring` / `brand-muted` re-chain automatically:
```css
:root { --uix-brand: #16A34A; --uix-brand-fg: #FFFFFF; }
:root:where(.dark,[data-theme="dark"]) { --uix-brand: #22C55E; }
```

## Exports

| Subpath | What |
|---|---|
| `./css` | the `--uix-*` contract (`:root` light, dark selector) |
| `./styles` | component CSS (use with the tokens + a theme) |
| `./tailwind` · `./tailwind/preset` | Tailwind v4 `@theme` / v3 preset |
| `./ts` | typed `cssVar` / `light` / `dark` / `num` |
| `./themes/{tensor,posx,shopx,mission-control}` | per-product brand |

Source of truth: `tokens/*.json` (DTCG) → [Style Dictionary](https://styledictionary.com). Part of the **[UIx v2 styleguide](https://github.com/COx-ORG-H/UIx)**.

## Primitives — consume, don't fork

The following CSS primitives (and their `@tensor_1/react` wrappers) are the intended consumption point for the tokens below. If your codebase reimplements any of these, replace it with the primitive so theme/brand overrides, dark mode, and WCAG contrast all apply automatically.

| Primitive | CSS file | Key `--uix-*` tokens |
|---|---|---|
| Row selection | `table.css` `tr[aria-selected]` | `--uix-row-selected-bg` |
| Table column sizing | `table.css` `.uix-col--w-*` / `--flex` / `--truncate` / `--num` · `<Table fixed>` | `--uix-col-w-xs…xl`, `--uix-col-title-min` |
| Selection bulk bar | `table.css` `.uix-bulkbar` · `<BulkBar>` | `--uix-brand-muted`, `--uix-accent` |
| Row hover actions / kebab | `table.css` `.uix-table__actions` / `.uix-rowact` · `<RowActions>` / `<RowAction>` | `--uix-bg-active`, `--uix-text-muted` |
| Expandable row detail | `table.css` `.uix-table__detail` / `.uix-kv` · `<ExpandToggle>` | `--uix-bg-subtle` |
| Inline cell edit | `table.css` `.uix-cell-edit` | `--uix-ring`, `--uix-success` |
| Column resize grip | `table.css` `.uix-table__resize` | `--uix-accent` |
| Search-match highlight | `table.css` `.uix-mark` · `<Mark>` / `<Highlighted>` | `--uix-warning-bg`, `--uix-warning` |
| Cell content vocabulary | `table.css` `.uix-cell-strong` / `-sub` / `-mono` · `<CellStrong>` / `<CellSub>` | `--uix-text-muted`, `--uix-font-mono` |
| Responsive table ladder | `table.css` `.uix-table--priority` / `--cards` | `--uix-border`, `--uix-surface`, `--uix-shadow-sm` |
| Record compare view | `table.css` `.uix-compare` | `--uix-border`, `--uix-surface`, `--uix-bg-subtle` |
| Utilization / threshold bar | `meter.css` · `<Meter>` | `--uix-attention`, `--uix-overdue`, `--uix-warning`, `--uix-danger` |
| Triage inbox | `inbox.css` · `<Inbox>` / `<InboxItem>` | `--uix-brand-muted`, `--uix-accent` (accent stripe) |
| Status + SLA + priority pill | `status-pill.css` · `<StatusPill>` | `--uix-sla-ok/at-risk/breached`, `--uix-p1`…`--uix-p5`, `--uix-attention`, `--uix-overdue` |
| Entity detail related-panels | `<DetailLayout>` (`@tensor_1/react`) | `--uix-surface`, `--uix-border` |
| App-shell nav width tiers | `app-shell.css` `.uix-shell[data-nav="full\|rail\|hidden"]` · `<AppShell nav>` | `--uix-sidebar-w`, `--uix-sidebar-w-rail` |
| Shell focus / full-bleed | `app-shell.css` `.uix-shell[data-focus]` / `.uix-shell__main--bleed` · `<AppShell focus mainBleed>` | `--uix-z-overlay`, `--uix-space-7` |
| Table logic engine | `@tensor_1/react` `table-engine` (multiSort / applyFilters / searchRows / serializeView / virtualWindow / selection) | — behaviour primitive; keeps vanilla + React grids identical |

If you reach for `var(--uix-danger)` or `var(--uix-warning)` to render SLA urgency or severity, use `<StatusPill tone="sla-breached">` or `<StatusPill tone="p1">` instead — the component handles WCAG contrast, dark mode, and brand overrides; a raw literal does not.

Likewise, don't fork the data grid: a product-local `data-table.tsx` (bespoke sort/filter/selection/resize + hand-coded column widths) should be replaced by `<Table>` + the subcomponents above, composed over the framework-agnostic `table-engine` (or the `useTable` hook). Sorting, filtering, search highlighting, saved views, and virtualization then match the vanilla styleguide exactly, and every visual affordance re-themes with the tokens listed here.
