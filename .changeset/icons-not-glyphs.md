---
"@tensor_1/react": minor
"@tensor_1/tokens": minor
---

**Icons, not text glyphs** (HAR-1576, operator review 2026-10-07 points 3 and 8): no UIx component or docs specimen uses a text character where an icon belongs.

- React: `Toast`'s close button draws `XIcon`; `Pagination`'s first / previous / next draw `ChevronsLeftIcon`, `ChevronLeftIcon`, `ChevronRightIcon`; `MetricInput`'s steppers draw `PlusIcon` / `MinusIcon`; `SavedViewMenu`'s pin draws `StarIcon` (filled while pinned); a `Step` in the error state draws `XIcon` (it was `!`). Each icon is centred in its control.
- CSS: the table sort arrows (`th[data-sort]::after`) are the icon set's `arrow-up-down` / `arrow-up` / `arrow-down` drawn through a mask in `currentColor`, not `↕ ↑ ↓` text; the React `Select` trigger's chevron is a masked `::after` in the theme's muted text colour (a native `<select>` cannot hold a pseudo-element and keeps its image). New `.uix-glyph` + `.uix-glyph--chevron-down | arrow-up | arrow-down | arrow-up-down | x` (in `icon.css`) for plain-CSS slots that cannot hold an `<svg>`. In forced colours every mask is drawn in `CanvasText` (the active sort arrow in `Highlight`). The masks are not new `--uix-*` tokens.
- Guard: `packages/react/scripts/glyph-icons.mjs` fails, with file and line, on `× ✕ ▸ ▾ › ‹ « » ⌄ ✓ ★ ⋯ ↕ ↑ ↓ + −` as the only content of a button, a link or a `__close / __remove / __chevron / __icon / __marker / __step / __btn` slot (React sources, docs markup, the table specimen, the plain-CSS example), as a JS string on its own, or in a CSS `content:`. Its allowlist holds only text (Kbd legends, diff signs, the search-suggest breadcrumb separator), each with a reason, and may only shrink.

Visible change: those controls now show the icon set's strokes instead of font glyphs.
