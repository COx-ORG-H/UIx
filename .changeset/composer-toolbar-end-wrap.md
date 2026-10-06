---
"@tensor_1/tokens": patch
"@tensor_1/react": patch
---

The rich-text `composer` variant no longer squeezes its tool row to nothing when `toolbarEnd` is wide (TENSOR HAR-1125).

- **The bug.** `.uix-rich-text--composer .uix-rich-text__bar` stayed on one row (`flex-wrap: nowrap`), and the tool row (`contain: inline-size`, so it has no content width of its own) only got the space the other items left. An audience toggle plus a submit button in `toolbarEnd` left it 0 px wide at 375 and 320 px: no formatting tool or emoji was reachable, and a click on a tool landed on the toggle.
- **The fix** (`@tensor_1/tokens`, `rich-text.css`). The bar wraps, and the tool row keeps at least five tools (160 px, or the whole bar when the bar is narrower). When the counter or `toolbarEnd` would take that room, they move to their own row below the tools; the submit stays at the end. The tool row still scrolls sideways and never wraps. A status message still takes its own row (HAR-749); its separate `:has()` rule is gone because the bar now always wraps.
- **What moves.** Only composers whose tool row was narrower than five tools: their trailing items now sit below the tools. Where the row already had room for five tools, nothing moves, and the visual goldens are unchanged. The loading/error fallback bar (no tools) wraps too, so a wide `toolbarEnd` stacks there instead of overflowing.
- `@tensor_1/react` has no code change and is versioned in lockstep.
- **Migration:** none. Consumers can delete local overrides of the composer bar's wrapping.
