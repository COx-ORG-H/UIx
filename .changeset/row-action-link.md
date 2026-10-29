---
'@tensor_1/react': minor
'@tensor_1/tokens': minor
---

`RowAction` has a link form (HAR-2713): `<RowAction href="…" renderLink={…} target rel>` renders `<a class="uix-rowact">` with the same hover reveal, focus reveal and weight as the button form, so a row verb that navigates (an in-app page, a `mailto:`, a PDF in a new tab) hides at rest with its neighbours instead of always showing as a `ButtonLink`. Without `href` it is the button it always was. New export: `RowActionLinkProps`; `RowActionProps` gains `href?: undefined` so the two forms discriminate.
