---
"@tensor_1/tokens": patch
"@tensor_1/react": patch
---

**One title → secondary-text rhythm** (HAR-1577, operator review 2026-10-07 point 7): `List` (`.uix-list__title` + `__meta`), `Attachment` in plain markup (`__name` + `__size`), `Media` (`__name` + `__meta`) and `NavItem` (`__label` + `__desc`) now put `--uix-space-1` (4 px) between a title and its secondary line, like Alert, Card, Chart, Contact, Inbox, ToggleRow, Pipeline and Toast already did. They had 0 px of box gap (line-height only). `.uix-attachment__name` and the Media name/meta are block-level, so `<span>` markup stacks too. Mechanical per-component rules, no new class; 4 px, since no operator answer on 2 px for dense lists came in (Search suggest keeps its 2 px).

Visible change: those four secondary lines sit 4 px lower.
