---
'@tensor_1/react': minor
---

`CardLink` takes `renderLink` (HAR-2576), the same `UixRenderLink` adapter as `ButtonLink`, so a whole-card link keeps client navigation and prefetch with the router's link as its one anchor. Next.js consumers no longer need `<Link legacyBehavior>` round the card. With no `renderLink`, or one that returns nothing, it is the plain `<a>` it was.
