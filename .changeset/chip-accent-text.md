---
"@tensor_1/tokens": minor
"@tensor_1/react": minor
---

Add `--uix-accent-text`, the brand hue as text on neutral or `--uix-brand-muted` surfaces, and use it for the selected filter chip (`.uix-chip[data-on]`).

The selected chip used the solid accent as its text colour on a tint of that same accent. That measured 3.21:1 in dark mode, and below 3:1 in light mode for the POSx and mission-control brands. `--uix-accent-text` darkens the live accent in light mode and lightens it in dark mode, so it follows any brand override. The worst shipped theme now measures 5.48:1. The chip also gets its own `:focus-visible` ring, matching buttons and cards, so the ring shows even when a consumer does not load the base stylesheet.

A new `npm run test:tokens` gate computes this contrast for every theme in both modes.
