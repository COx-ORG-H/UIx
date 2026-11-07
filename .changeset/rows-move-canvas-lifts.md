---
"@tensor_1/react": minor
"@tensor_1/tokens": minor
---

Table rows that move, a dashboard card that lifts, and a highlight hook that paints on its own (HAR-2755).

- **`DataWorkspace rowMotion`** (new, off by default): the body becomes a motion list. A row that arrives rises in, a row that leaves fades out while the rows after it glide into its place, and a re-sort glides. When the last rows leave, the empty state waits for them. A new page, filter or view that replaces most rows (none kept, or more than 12 arriving and leaving) swaps at once. Focus moves to a neighbour when its row leaves. Grouped and windowed bodies keep plain rows. A leaving row stays in the DOM, inert and `aria-hidden`, until its exit ends.
- **`MotionList onExited`** (new): called once the last leaving item has gone, so a list that shows an empty state in its place can wait for the exit.
- **`DashboardCanvas`**: a widget dragged by its move handle carries `data-uix-drag="lifted"` (raised, a deeper shadow, solid) while the dashed preview shows where it lands, then settles. A resize still only dims the widget.
- **`useChangeHighlight` and `flashChanged` paint by themselves**: the change-highlight rules now match `[data-uix-changed]` on any element, so the hook's documented usage (a ref on a plain cell) tints and then clears. Before, every rule also needed the `.uix-change-highlight` class that only `ChangeHighlight` adds, so the bare hook painted nothing and its attribute stayed set.

Consumers: TENSOR turns on `rowMotion` for its list pages and uses the bare hook for live rows.
