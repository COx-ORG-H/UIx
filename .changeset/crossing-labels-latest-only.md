---
'@tensor_1/react': patch
'@tensor_1/tokens': patch
---

Threshold crossings: every crossing keeps its ring, but only the latest carries a visible "Crossed <x>" label; earlier ones show theirs on hover. A series that crosses its limit repeatedly no longer stacks colliding labels along the line.

InsightCard: a chart embedded in the card no longer clips the first glyph of its title and footer (the frameless chart drops `overflow: hidden`).
