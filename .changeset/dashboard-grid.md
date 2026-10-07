---
"@tensor_1/tokens": minor
"@tensor_1/react": minor
---

New `DashboardGrid`, the layout grid for dashboard widgets (HAR-1555; unblocks TENSOR HAR-1557).

- **Spans:** `DashboardGrid.Item` (also exported as `DashboardGridItem`) takes `span={1 | 2 | 'full'}`. Span 2 clamps to the columns there are, and `full` fills the row at every width.
- **Columns follow the grid's own width** (a container query), not the viewport: `columns={{ base: 1, sm: 2, lg: 3 }}` with `sm` 36rem, `md` 48rem, `lg` 60rem, `xl` 80rem of grid width. The default is 1 column, 2 from `sm` and 3 from `lg`. `gap` is `sm`, `md` or `lg`.
- **Size-aware widgets:** each item is an inline-size container (`uix-dashboard-grid-item`), so a Chart can take its height from the item's width (`height="clamp(160px, 40cqi, 360px)"`) and a card can use container queries. Widgets in one row share a height.
- **Plain HTML and custom elements:** the class contract is `.uix-dashboard-grid` (`--cols-N`, `--{sm,md,lg,xl}-cols-N`, `--gap-sm|lg`) with `.uix-dashboard-grid__item` (`--span-2`, `--full`). `dashboardGridClassName` and `dashboardGridItemClassName` return the same classes for an element you render yourself.
- **Tokens:** a new `components/dashboard-grid` module.
