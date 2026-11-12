---
"@tensor_1/tokens": minor
---

HAR-3087, HAR-3088, HAR-3085 — the dark theme separates rows, cards, the page, a selected row and the side peek. On near-black a step that separates a light page does not show, and every TENSOR council judge named the dark structure in every round (never the light one), while the text contrast probe passed. Dark only, light unchanged, chosen by the operator from a picture pair:

- `--uix-border` .08 → .12 and `--uix-border-strong` .14 → .20 (row dividers and card edges 1.22:1 → 1.39:1 on the card).
- `--uix-bg-app` #0A0A0A → #070707 and `--uix-surface-2` #171717 → #1A1A1A; the table header (and its frozen cells) paints `--uix-surface-2`, which is the card's white in light and a visible band in dark.
- `--uix-shadow-sm`'s lit top edge .04 → .07, since a black shadow cannot show on the page.
- `--uix-row-selected-bg` .16 → .28: a selected row is ≥ 1.3:1 from plain, zebra and pinned rows (it was 1.1:1 against a zebra row).
- New `--uix-scrim-peek` (light .5, the `--uix-scrim` value; dark .32) behind the side peek, so the list beside it stays legible (muted text ≥ 3:1 on a dimmed row) while it still reads as behind. Modal and drawer keep `--uix-scrim`.
