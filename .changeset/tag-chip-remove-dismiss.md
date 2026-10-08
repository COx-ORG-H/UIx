---
"@tensor_1/tokens": patch
"@tensor_1/react": patch
---

Tag and chip remove "x": one spec for `.uix-tag__remove` and `.uix-chip__remove` (HAR-1569). Both are now a 20 px circle with the Lucide X centred in it, at the pill's trailing end 2 px from the edge, with a concentric 24 px hit area, a round focus ring and a hover tint of the text colour that shows on any pill (it was a 16 px rounded square on the tag, off-centre, with a hover lighter than the tag). The pill height is unchanged. Forced-colours mode outlines the hovered control. `<Chip onRemove>` draws `XIcon` from the UIx icon set, and the docs tag-input specimen uses the Lucide X instead of a text "×". Markup that put a text "×" inside `.uix-tag__remove` should switch to an SVG icon (e.g. `XIcon` from `@tensor_1/react/icons`).
