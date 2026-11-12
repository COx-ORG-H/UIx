---
"@tensor_1/react": minor
"@tensor_1/tokens": minor
---

HAR-3070 — `ContentListItem` takes `href` (and `renderLink`): the whole row becomes one link, with an arrow at rest and a focus ring on the row. Without `href` nothing changes. Breadcrumb links get a hit area of at least 24 × 24 px (a pseudo-element, the trail does not move) and draw in the link colour without an underline at rest, so a parent crumb reads as the way back. Found by the TENSOR knowledge-base council climb (HAR-2968).
