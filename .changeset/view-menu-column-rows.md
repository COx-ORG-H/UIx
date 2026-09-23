---
"@tensor_1/tokens": minor
"@tensor_1/react": minor
---

ViewMenu: its own surface, and column rows you can reorder (TENSOR HAR-666, the columns-menu half of the saved-views work). SavedViewMenu: a pointer drag now lands where you drop it.

- **Own surface.** `.uix-view-menu` now draws its own background, border, radius and shadow, and scrolls at `min(60vh, 480px)` with `overscroll-behavior: contain`. It stays opaque inside an overlay shell that adds no chrome (TENSOR's `AnchoredOverlay` showed the table through it). Inside a `.uix-popover` it drops its own border and shadow, so there is no double frame. Section titles (`.uix-view-menu__label`) are sticky.
- **Column rows: grip · checkbox · name · ⋯.** Hover paints the whole row, and long names truncate. `ViewMenuColumn.required` shows the name without a checkbox, in the checkbox's slot, with a tooltip. `textLabel` supplies the plain-text name for the accessible names when `label` is a node.
- **`onReorder(orderedIds)`** gets every column id, first to last, and turns on reordering. The grip drags a row. The ⋯ menu offers Move up, Move down and Hide or Show, and it is the keyboard path, so the grip stays out of the tab order (the arrow keys still move it once it has been clicked). The ⋯ menu is an APG menu button on a top-layer `Popover`, so the scrolling panel never clips it. Escape closes only the menu and returns focus to its button. After a move, focus stays on the moved row, and a polite status announces the new position.
- **Grip and ⋯ idle at 75%**, the same floor as SavedViewMenu. The HAR-666 brief asked for 45%, but that value measured below WCAG 1.4.11's 3:1 for the muted grip (see 2.23.0). The browser spec now measures both icons at rest in both themes.
- **New optional props:** `columnLabels` (`rowActions`, `reorder`, `moveUp`, `moveDown`, `hide`, `show`, `required`, `moved`; English defaults; `{label}` / `{position}` / `{count}` templates), `displayLabel` (title over zebra/freeze), `footer` (e.g. Reset sort), and `className`. The density props are now optional, and the density section renders only when `densityOptions` and `onDensityChange` are given.
- **SavedViewMenu drag fix.** Dragging a row down could stall after the first step, or land one slot past the pointer. React moves the dragged row's DOM node as the list reorders live, which drops pointer capture, and the drop index counted the dragged row itself. Both menus now follow the drag on the window and count only the other rows.
- **Migration:** none needed for existing `ViewMenu` usage. A column list with `onReorder` renders more controls per row. `.uix-view-menu__cols` is a `ul` in the React component, and it no longer has its own 180px scroll area, because the panel scrolls instead.
