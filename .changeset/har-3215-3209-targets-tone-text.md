---
"@tensor_1/tokens": minor
"@tensor_1/react": minor
---

HAR-3215 — the kit's small controls reach a 24 px own box (WCAG 2.5.8) without moving the text beside them: the record-id cell button, row actions (`.uix-rowact`, button and link), the column pin, the row expander and a sort button over a one-letter header; the chip and tag remove × is a 24 px circle drawn in the footprint the 20 px one had; the column and saved-view grips are 24 px wide; the tree toggle is a 24 px box around its 16 px chevron; `MetricInput`'s − and + sit side by side at the control's full height instead of two 18 px halves; `ValidationSummary` error links own a 24 px line. axe `target-size` now finds nothing on any docs page, and the own-box count fell from 627 to 425 (tables 192 → 11, data display 88 → 27).

HAR-3209 — text the kit painted in a flat tone uses the tone's `-text` token, which reaches 4.5:1 in both themes: a selected reaction, the active step's number, a sort-order number, inserted audit text, a positive chart or KPI delta, a finished upload's status and a field's success line. A new token test fails on any component rule that colours text with flat `--uix-accent`, `--uix-warning`, `--uix-danger`, `--uix-success` or `--uix-info`; glyph-only rules (icons, the star, sort arrows) are listed with what they paint.
