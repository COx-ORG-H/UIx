---
"@tensor_1/react": minor
"@tensor_1/tokens": minor
---

**`SortableList`** (HAR-1375, MOTUS C-16 photo order; TENSOR preset and start-page order): a list the person reorders, over the new `.uix-sortable` stylesheet. `items`, `getId`, `getLabel`, `renderItem(item, { index, count, dragging })`, `onReorder(orderedIds)`. Each row has a grip to drag with a pointer (the rows reorder live, the row lands under the pointer, one `onReorder` per drag) and Move up / Move down buttons that are always there, disabled at the ends; Alt+↑ / Alt+↓ move the focused row from anywhere in it, a focused grip moves with ↑ / ↓. Focus stays with the moved row (a move button that became disabled hands it to the other one), and a polite status says "{label} moved to position {position} of {count}". Nothing animates: keyboard moves are instant and a drag follows the pointer. Words from `labels` or `UixLabelsProvider` `sortableList`. On a phone the two move buttons stack, so the content keeps its width.

The reorder model is shared (`placeId` is exported): `ViewMenu`, `SavedViewMenu` and `NavFavourites` use the same helpers and drag hook. `NavFavourites` gains a `moved` label: its move announcement was English only.
