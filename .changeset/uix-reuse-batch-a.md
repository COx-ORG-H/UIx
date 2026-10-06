---
"@tensor_1/tokens": minor
"@tensor_1/react": minor
---

The small gaps TENSOR and MOTUS were hand-building around (workspace ADR-0038 "always use UIx"; the 2026-10-06 reuse audits; UIx HAR-1346 batch (a)). Every addition is optional, so existing calls render as before.

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
