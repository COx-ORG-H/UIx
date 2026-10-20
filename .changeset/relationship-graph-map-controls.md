---
"@tensor_1/tokens": minor
"@tensor_1/react": minor
---

`RelationshipGraph` layered mode gets map controls (TENSOR HAR-2501). `controls="compact"` replaces the eight-button toolbar with an icon cluster in the map's corner (zoom in, zoom out, fit, reset, full screen, each with a tooltip) and the zoom level; the map takes keyboard focus (arrows pan, `+`/`−` zoom, `0` resets, Escape leaves full screen), a plain wheel keeps scrolling the page and says how to zoom, and full screen covers the page. `controls="none"` hides the controls (HAR-1639 item 4). `initialView="fit"` opens with every item in view. New labels: `fullscreen`, `exitFullscreen`, `navigationHint(modifier)`, `viewportKeyboardHint`. New icon: `ScanIcon`. The defaults (`controls="full"`, `initialView="readable"`) are unchanged.
