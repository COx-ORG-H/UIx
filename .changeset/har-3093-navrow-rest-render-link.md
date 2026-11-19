---
"@tensor_1/react": patch
"@tensor_1/tokens": patch
---

HAR-3093 follow-up from TENSOR's sidebar adoption. A nav row whose only trailing control is an unpinned star now gives its label the star's room at rest, where hover exists: the empty end slot and its gap go away until hover or keyboard focus brings the star back. In TENSOR's 248 px sidebar, "Berechtigungskonzept" and "Lebenszyklus EoL/EoS" read in full again. Rows with a badge, a pinned star, or no hover are unchanged. `NavItem` and `SubNavItem` take `renderLink` (as on `ButtonLink`), so a product can draw the row with its router's link; the row's classes, `aria-current`, `href`, the ref and the children are passed in.
