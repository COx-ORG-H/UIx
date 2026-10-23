---
"@tensor_1/react": minor
"@tensor_1/tokens": minor
---

**`useVirtualRows` measures the rows' real pitch** (HAR-1829). New option `measureRows`: a selector for the mounted data rows inside the container (e.g. `'tbody > tr[data-row]'`). With it the hook sizes its spacers and window from the rows' mean `offsetHeight` instead of trusting `rowHeight`, which becomes the first-paint estimate. A row's height comes from CSS and content (kit padding, a second line, density): TENSOR's virtualiser was told 32 / 44 / 56 px while its rows rendered at 51 / 63 / 75 px, which gave short spacers, a short scrollbar and a window that drifted away from the rows on screen. It measures when windowing starts, when `rowHeight` changes (a density switch) and when the container resizes, never while scrolling, so the spacers do not move under the reader. The result now has `rowHeight`, the height in use, to scroll a keyboard-focused row into view. Without `measureRows` nothing changes. Unblocks TENSOR HAR-1463.
