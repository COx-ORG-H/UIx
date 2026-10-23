---
"@tensor_1/react": patch
"@tensor_1/tokens": patch
---

Follow-ups to the batch PRs (#159, #165, #166, #168).

- `Chip` `onClick` now receives the click event (`(event) => void`; a `() => void` handler still works), so a chip can be the trigger of a `Menu`. `DataWorkspace`'s "+ Filter" is now a real `Chip variant="add"`; its markup is unchanged.
- Shortcut key caps are hidden on touch devices (`@media (hover: none) and (pointer: coarse)`): the Sidebar search row's keys (also in the AppShell phone drawer), the keys of Menu, CommandPalette and Tooltip rows, SearchSuggest's trailing key, and a Button's hint bubble, which a tap used to open. `aria-keyshortcuts`, the spoken keys and descriptions are unchanged; a key a product puts in a Menu or CommandItem shortcut slot is clipped from view, not removed. One rule in `components/kbd.css`.
- `RelationshipGraph controls="compact"`: the footer (navigation hint, zoom level, controls) is a band across the map's bottom edge on the map's background with a rule above it, so no node shows half under a pill; fit, the first view, Reset and zooming about the centre leave the band's height free.
- `RelationshipGraph layout="layered"` edge labels are drawn above every line, each on an opaque chip of the map's surface, in the small text size (meta) at >= 4.5:1; a tone is the chip's border. A busy node's trunk stands 4 px from the node so each stub carries its label on a straight run. Markup: labels moved from each `.uix-relationship-graph__link` into `g.uix-relationship-graph__edge-labels > g.uix-relationship-graph__edge-label[data-edge]` (rect + text); links gained `data-edge`. Wrapping fits the larger text (about 12 characters per line in a standard gap).
- `RelationshipGraph` legend items are inline-flex rows with a real `span.uix-relationship-graph__legend-mark` (was `li::before`), centred on their words; items wrap whole.
- The layered map is a pan surface: it no longer selects text or starts a native drag (`user-select: none`, `-webkit-user-drag: none`, `dragstart` cancelled). The relationship list stays selectable.
- `Table`: every row state sets `--uix-row-bg` (a registered colour) on the row; frozen cells (`.uix-table--pinned-col`, `.uix-table--pinned-actions`, DataWorkspace's frozen id) paint it over the surface, so a frozen cell follows selected, pinned, zebra and hover (hover now only where the device can hover). Fixes the zebra stripe on selected even rows in the frozen id column.
- `BulkBar` wraps: actions take a second row on a phone instead of running off the edge.
- `Segmented` clips its sliding indicator to the track, so a window that narrows mid-slide cannot widen the page.
