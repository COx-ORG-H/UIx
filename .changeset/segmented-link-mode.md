---
"@tensor_1/react": minor
"@tensor_1/tokens": minor
---

**`Segmented selection="link"`** and **`LocaleSwitcher`** (HAR-1380, MOTUS C-12): a language switcher is navigation, not a choice. `selection="link"` renders a `<nav>` (named by your `aria-label`) around a list of links with the same pill look; each `SegmentedOption` takes `href` (and `hrefLang`, `lang`), the one whose `value` is `value` carries `aria-current="page"`, `renderLink` renders them with your router, and every link is its own tab stop (no arrow-key roving). `LocaleSwitcher` (`locales=[{ code, label, href }]`, `current`, `label`) sets `lang` and `hreflang` on each link. In forced-colours mode the chosen segment of any `Segmented` (pressed, checked or current) now keeps an outline; it was invisible there.
