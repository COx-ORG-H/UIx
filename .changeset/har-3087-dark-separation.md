---
"@tensor_1/tokens": minor
---

HAR-3087, HAR-3088, HAR-3085 — the dark theme separates rows, cards, the page, a selected row and the side peek. On near-black a step that separates a light page does not show, and every TENSOR council judge named the dark structure in every round (never the light one), while the text contrast probe passed. Dark only, light unchanged; the operator chose the direction from a picture pair:

- `--uix-border` .08 → .12 and `--uix-border-strong` .14 → .20 (row dividers and card edges 1.22:1 → 1.39:1 on the card).
- `--uix-bg-app` #0A0A0A → #070707: the page sits below the card.
- New `--uix-table-head-bg`: the table header (and its frozen cells) paints it — the card's surface in light, #1A1A1A in dark, a visible band. A product theme with its own surfaces keeps its header as it was until it sets the token.
- `--uix-bg-hover` #1F1F1F → #232323, so a hovered row stays apart from the header band and the keyboard position in a menu or listbox (`bg-hover` on `surface-2`) is stronger than before; `--uix-bg-active` #262626 → #2A2A2A keeps its step above hover (a row action hovered inside a hovered row, a neutral pill or a track on one).
- `--uix-shadow-sm`'s lit top edge .04 → .07, since a black shadow cannot show on the page.
- A selected row: `--uix-row-selected-bg` .16 → .17, and a 2 px leading edge in the new `--uix-row-selected-edge` (the accent in dark, transparent in light). The tint alone stays at a strength where a checked checkbox (the accent) keeps 3:1 on the row.
- New `--uix-scrim-peek` (light .5, the `--uix-scrim` value; dark .32) behind the side peek, so the list beside it stays legible (muted text ≥ 3:1 on a dimmed row) while it still reads as behind. Modal and drawer keep `--uix-scrim`.
