---
"@tensor_1/react": minor
"@tensor_1/tokens": minor
---

**The staff shell from UIx options, not local overrides** (HAR-1815; workspace ADR-0047: MOTUS staff UI = TENSOR):

- `AppShell layout="viewport"` (`.uix-shell--viewport`): an application shell, not the framed demo box. No border or radius, `100dvh`, no fixed top-bar row (the sidebar and main run the full height; a `topbar`, when given, takes its own height at the top of the main column), main padding `space-7 space-6 space-6` widening to `space-8` at the sides from 80rem, and below 40rem one column with the sidebar hidden (the phone nav tier). `layout="frame"` (default) is unchanged.
- `PageHeader size="display"` (`.uix-page-header--display`): the staff type preset — a 40 px heading-font title (`--uix-text-display`, leading 1.05, weight 600, tight tracking; the h2 size below 40rem), a bold hushed eyebrow, a body-size hushed subtitle up to 42rem, and the row aligned to the bottom.
- `DetailPage variant="staff"` (`.uix-detail-page--staff`): the title at h2 / 1.15, the back link an inline hushed link without an underline, each metric an eyebrow label over a regular-weight, tabular h3 value.
- `SectionHead size="compact"` (`.uix-section-head--compact`, `.uix-section-title--compact`): 15 px / 1.3 / 600 for an in-card section; `SectionHead as="h3"`.
- `CellSub tabular` (`.uix-cell-sub--tabular`): tabular numerals for read-back codes. New `CellSubProps` type.

All additive; defaults unchanged.
