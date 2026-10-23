---
"@tensor_1/react": minor
"@tensor_1/tokens": minor
---

**`CommandPalette` items mode** (HAR-1378, MOTUS C-10, TENSOR B2 / HAR-1458): pass `items` (`{ id, label, group, keywords, description, icon, shortcut, onSelect, href, disabled }`) and the palette does what both products hand-built:

- filters with the kit's `foldForSearch` (case and diacritics folded, so "ubersicht" finds "Übersicht"), best match first: a label that starts with the query, then word starts, then contains, then `keywords`. The model is exported: `filterCommandItems`, `groupCommandItems`; `filter` replaces it.
- groups the results under their headings (the group of the best match first), marks the match, and shows `recent` items first while the query is empty.
- keeps one option active through `aria-activedescendant`: ↑ / ↓ wrap and skip disabled items, Home / End jump while the query is empty (they move the caret once there is text), Enter runs the item (`onSelect`, then `href` through `onNavigate` or the browser), `onItemSelect` hears every choice. The active row scrolls into view at once.
- an empty state (`emptyLabel`), and the result count, both translatable (`UixLabelsProvider` `commandPalette.empty`, `recent`, `resultsOne`, `resultsMany`).
- `open` / `onOpenChange` host it in its own native `<dialog>` (focus in the field, Escape or a click outside closes, focus back on the opener, the query cleared), with no animation: a keyboard surface used many times a day opens at once.
- `limit` (default 100) caps the rendered rows of a long list; the count still says how many were found.

Children mode is unchanged. `.uix-cmdk` no longer overflows a narrow container (`max-width: 100%`), and a row's hover tint applies only on devices that hover.
