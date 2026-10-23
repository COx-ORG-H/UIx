---
"@tensor_1/react": minor
"@tensor_1/tokens": minor
---

**A `Stat` link tile looks like a link at rest** (HAR-1803; MOTUS UXR-32): a tablet has no hover, so `Stat href` now draws a trailing chevron (`.uix-stat__go`, the kit's `ChevronRightIcon`) in its label row. An in-place action tile (`onActivate` with `haspopup={false}`) gets `.uix-stat--action`, which underlines its value with a dotted line; dialog and menu tiles keep their down chevron. All three are shapes, visible without colour and in forced colours. A plain figure tile is unchanged. The hover tint of interactive tiles applies only under `@media (hover: hover)`.

Visible change: link tiles and in-place action tiles look different at rest (a chevron, a dotted underline).
