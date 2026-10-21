---
"@tensor_1/tokens": patch
"@tensor_1/react": patch
---

Two narrow-width fixes found in TENSOR.

- **`RelationshipGraph` `controls="compact"` (TENSOR HAR-2512):** the hint ("Drag to move · Ctrl + scroll to zoom"), the zoom level and the icon cluster no longer overlap. The hint was positioned on its own, capped at `100% - 15rem` and hidden only below a 640 px *viewport*, so on a 500–600 px map on a wide screen the zoom level was drawn over the end of the hint (a 574 px map beside side cards at 1280 px; measured: the boxes intersected at every map width from 280 to 574 px). The three now share one row, `.uix-relationship-graph__footer`, along the map's bottom edge: the hint takes only the room the controls leave (ellipsis, then hidden below a 24rem row), then the zoom level gives way (hidden below 17rem), and the cluster always stays. The row lets the pointer through to the map. `tests/a11y/relationship-graph-map.spec.mjs` measures the three boxes at twenty map widths from 280 to 1200 px, in German and English.
- **Rich-text toolbar (TENSOR HAR-2511):** the toolbar wraps its groups onto more rows instead of scrolling sideways inside the field. On TENSOR's incident form at 320 px the field is 238 px wide and its 21 tools sat in a 701 px row, about two thirds of them behind a sideways scroll. A group that starts a row draws no separator; a group wider than the row wraps its own tools. In the composer the tool row asks for one row, so the counter and `toolbarEnd` wrap below it first and the tools then wrap across the whole bar. The field's first tool now sits 4 px from the frame (was 8), so its icon lines up with the text below it.
- **Rich-text placeholder (TENSOR HAR-2511):** a long placeholder grows the editor instead of running out of it over whatever follows the field. It still floats, so the caret stays at the start of its first line.
