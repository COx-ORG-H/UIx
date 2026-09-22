---
"@tensor_1/tokens": minor
"@tensor_1/react": minor
---

`SavedViewMenu` takes on the saved-views row design from TENSOR's list toolbar (TENSOR PR #1995).

- **Titled sections.** New `sections` prop (`SavedViewSection[]`: `id`, `label`, `items`), used instead of `items`. Each section renders under a `.uix-menu__label` title inside the same `.uix-menu`, for example your own views above the presets. Empty sections are hidden, and `emptyLabel` shows only when every section is empty. The flat `items` form still works as before.
- **Row anatomy: grip · name · overflow.** The `actions` slot is now wrapped in `.uix-saved-views__actions` as the row's overflow slot. Names truncate, and a string name also gets a tooltip.
- **Selection and hover cover the whole row.** The selected row (`active`) gets `data-active` and an accent tint (`--uix-brand-muted`) across grip, name and overflow, and its name button carries `aria-current`. There is no check glyph. Hover also covers the whole row, and the name no longer paints its own grey. In forced-colors mode, the selected row gets a `SelectedItem` outline.
- **Quiet affordances.** The grip and the overflow slot are dimmed to 75% opacity until the row is hovered or has focus, a drag is under way, or the overflow trigger reports `aria-expanded="true"`. The dimming is deliberate, and the idle value still meets WCAG 1.4.11 3:1 non-text contrast on both themes (grip 3.19:1 light, 4.45:1 dark).
- **Scrolling panel.** `.uix-saved-views` is capped at `min(60vh, 440px)` height and 400 px width, and it scrolls. Section labels stay pinned (`position: sticky`) while you scroll.
- **Reorder within a section.** Pass `onReorder(orderedIds, sectionId)` with `reorderLabel` to add a drag grip to every row. You can drag the grip with a pointer, or focus it and press ArrowUp/ArrowDown. A row never leaves its section. The callback receives that section's full id order and its id (`undefined` in the flat form). It fires once per keyboard move and once per drop, and not at all for a drop that doesn't change the order. The new order shows straight away until the consumer's persisted order arrives.

Persistence, permissions (which actions a row's overflow menu offers) and every label stay with the consumer.
