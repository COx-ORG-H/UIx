---
'@tensor_1/tokens': minor
'@tensor_1/react': minor
---

Calm kit, phase 1 of the TENSOR calm home: quieter status colours, quiet status, chart palette v2, glance cards and a first-paint arrival.

- Tokens: the danger, warning, success and info families are softer in light and dark (fills, text, dots, tints; overdue follows danger), every word AA on the surface and its tint. Palette v2: `--uix-chart-1..8` start with the series blue, teal and violet and have no red or amber slot; `--uix-chart-1` stays the brand blue (`#0455E6`, dark `#3280FC`); new `--uix-chart-series`, `--uix-chart-series-soft` and the arrival timings (`--uix-dur-arrive`, `--uix-stagger-arrive`, `--uix-delay-arrive-trace`, `--uix-dur-arrive-trace`, `--uix-dur-arrive-grow`, `--uix-stagger-arrive-grow`, `--uix-dur-arrive-count`, `--uix-arrive-rise`).
- `StatusDot` (a dot and a word). The `critical` StatusPill is now the danger tint with the danger words instead of a solid red fill.
- `ChartCard`, `BarList`, `StatusStrip`, `Sparkline`, `Meter target`/`targetLabel`; `GlanceLineChart` and `PairedBarChart` in `./chart` and `./chart/preset`, with the pure `glanceLineOption`, `pairedBarsOption` and `uixGlanceBase`. `UixChartTokens` gains `series`, `seriesSoft`, `categories`, `radius` and `shadow`.
- `Arrive`, `ArriveItem`, `useArrive` and `Count arrive`: cards rise in reading order, lines trace, bars grow and numbers count up on the first mount (or once per session with `name`), never on a refresh or new data; a fade under reduced motion.
