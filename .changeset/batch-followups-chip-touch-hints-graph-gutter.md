---
"@tensor_1/react": patch
"@tensor_1/tokens": patch
---

Follow-ups to the batch PRs (#159, #165, #166, #168).

- `Chip` `onClick` now receives the click event (`(event) => void`; a `() => void` handler still works), so a chip can be the trigger of a `Menu`. `DataWorkspace`'s "+ Filter" is now a real `Chip variant="add"`; its markup is unchanged.
- Shortcut key caps are hidden on touch devices (`@media (hover: none) and (pointer: coarse)`): the Sidebar search row's keys (also in the AppShell phone drawer), the keys of Menu, CommandPalette and Tooltip rows, SearchSuggest's trailing key, and a Button's hint bubble, which a tap used to open. `aria-keyshortcuts`, the spoken keys and descriptions are unchanged; a key a product puts in a Menu or CommandItem shortcut slot is clipped from view, not removed. One rule in `components/kbd.css`.
- `RelationshipGraph controls="compact"`: the footer (navigation hint, zoom level, controls) is a band across the map's bottom edge on the map's background with a rule above it, so no node shows half under a pill; fit, the first view, Reset and zooming about the centre leave the band's height free.
