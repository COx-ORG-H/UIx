---
"@tensor_1/react": minor
"@tensor_1/tokens": minor
---

HAR-3095 — `LinkTile`, a navigation tile: a whole-card link to another page that the kit lays out. A 16 px `icon` and a trailing chevron (hushed, both `aria-hidden`) sit on the title's first line; the `title` names the link and the `description` (meta size, `descriptionLines` to clamp it) describes it; `titleAs` picks the title element (default `h3`); `renderLink` keeps router navigation, as on `CardLink`. Built on the interactive card (`.uix-card--interactive`, its hover and focus) with the card body's inset and nothing more (`.uix-link-tile`, `__body`, `__icon`, `__title`, `__description`, `__arrow`), so a page never builds the tile's inside or doubles its padding.
