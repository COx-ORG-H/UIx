---
"@tensor_1/react": minor
"@tensor_1/tokens": patch
---

**`Breadcrumbs renderLink`** (HAR-1385, MOTUS B-P3): each item's link is rendered by your router through the same `UixRenderLink` adapter `ButtonLink`, `Stat`, `Pagination` and `Steps` take (`renderLink={(p) => <NextLink {...p} />}`), so client navigation and prefetch survive and a locale-aware link adds the locale prefix. Without it the links stay plain `<a>`. `.uix-breadcrumbs` items now wrap a long unbroken title (a German compound, a file name) instead of widening a 320 px page.
