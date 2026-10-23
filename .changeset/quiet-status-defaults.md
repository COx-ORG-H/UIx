---
"@tensor_1/react": minor
"@tensor_1/tokens": minor
---

**Quiet status defaults** (HAR-1563, colour K2 of the 2026-10-07 operator review): a status in a dense view is a coloured dot beside a neutral label, outlines use a neutral hairline, and a stat trend is coloured by what the change means, not by which way it moved.

- `StatusPill treatment`: `'soft'` (the default tinted wash; `'filled'` stays as its alias, so nothing breaks), `'dot'` (`.uix-pill--dot`: no fill, no inline padding, the label in `--uix-neutral-text`, the dot in the tone's `*-solid`; for tables) and `'outline'` (a `--uix-neutral-border` hairline, a hushed label and the tone's dot; only `critical` keeps a toned border). `dot` and `outline` always draw the dot. New tone `progress` (in flight, the `info` blue).
- `Stat trend.sentiment`: `'positive' | 'negative' | 'neutral'` (`.uix-stat__trend--positive` / `--negative`).
- In forced-colors mode the pill dot and the toned-stat dot are drawn in `CanvasText`.

**Visible default changes:**
- A `Stat` trend without `sentiment` is now neutral grey. It was green for `up` and red for `down` (`.uix-stat__trend--up` / `--down` no longer carry colour). Pass `sentiment` for your metric.
- `StatusPill treatment="outline"` (`.uix-pill--outline`) now has a neutral border, a hushed label and a dot. It had the tone's colour on the label and a 40 % tone border.
- A toned `Stat` (`warning`, `danger`) keeps a neutral border; a dot of the tone leads its value. The border was toned.
- `Alert` tone borders are 24 % of the tone (30 % and 40 % before). The warning icon already used `--uix-warning-text` (6.4:1 on its light tint).
