---
"@tensor_1/react": minor
"@tensor_1/tokens": minor
---

Calm kit review fixes, before 2.56.0 ships:

- `UixChartTokens`: the new `series`, `seriesSoft`, `categories`, `radius` and `shadow` fields are optional, so a tokens object built for 2.55 still type-checks. `uixChartTokens()` always fills them; the glance charts fall back to `palette[0]`.
- `GlanceLineChart` / `PairedBarChart` settle at rest once their draw-in is over: data that arrives later (a new bar, a new point) appears at once instead of growing in.
- The `Arrive` stage context is shared across the CommonJS bundles, so a chart from `@tensor_1/react/chart` draws in with a stage from `@tensor_1/react` (it already did under ESM).
- `Count arrive` counts up once: a value that changes while the stage still plays ticks instead of counting up again.
- `StatusDot`: the dot wears the tone's text colour like its word, so it clears 3:1 on the tone's own tint too (light success and warning dots were 2.78:1 and 2.91:1 there).
