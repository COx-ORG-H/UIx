---
"@tensor_1/react": minor
"@tensor_1/tokens": minor
---

HAR-3081 — `PageHeader size="compact"` (`.uix-page-header--compact`) sets the title one step down the type scale, at the h3 size, so a page whose first content must read first (a home page's alert about something broken now) is not outranked by its greeting. The eyebrow, subtitle, help and actions keep the default header's sizes and layout.

HAR-3089 — `Peek` takes `recordId`, shown over the title in the meta size with tabular figures and part of the dialog's name, and `openAction` (`{ label, href, renderLink?, onClick? }`), a secondary link button in the header row beside close, next in the Tab order after the title. With `openAction` the title takes the next row whole, as it does with the record arrows.

HAR-3093 — `NavItem` and `SubNavItem` take `trailing`, usually a `StarButton` (`SubNavItem` also takes `badge`). The link ends in one slot (`.uix-navitem__end`) that the badge and the star share: an unpinned star is hidden at rest with the badge in its place, hover or keyboard focus shows it and the badge steps aside, and a pinned star (or any star where no hover exists) keeps its place with the badge beside it. The row is a `.uix-navrow` around the link, since a button cannot sit inside a link; the star there is a 24 px box. A row without `trailing` renders as before.
