---
"@tensor_1/react": minor
"@tensor_1/tokens": minor
---

HAR-3094, HAR-3099, HAR-3201 — text that fits.

- A shown date or time is one token. `RelativeTime` carries the new `.uix-time` (never breaks inside itself, tabular digits). New `DateTime` (`precision="date" | "minute"`) and `DateTimeRange` render `<time>` elements in the app-wide date format of the date fields (`UixLabelsProvider` `dateFormat`, else the locale's numeric date), so a shown date matches the pickers. A range breaks only after its dash, and a range within one day prints its date once: "11.11.2026 09:00 – 12:00".
- A table column width tier between `lg` (176 px) and `xl` (240 px): `--uix-col-w-lg-plus` 208 px, `.uix-col--w-lg-plus`, so a status pill of about 165 px ("Wartet auf Zustimmung") fits on one line without a 240 px column. DataWorkspace sizes its `<col>` and floor from it like the other tiers.
- `DataWorkspaceColumn` gets `textWrap` (`'nowrap'` — the new `.uix-col--nowrap`, one line and never cut — `'truncate'` or `'wrap'`) and `lineClamp` (at most N lines in `.uix-cell-clamp`, then an ellipsis), so a page never sets them on a cell by hand.
