# Lessons learned

### 2026-08-05 · a11y/sidebar · `8b622fd`
- **Symptom:** Keyboard users could Tab into invisible links inside a collapsed sidebar nav group; focus vanished into clipped content.
- **Root cause:** The `grid-template-rows: 0fr` + `overflow: hidden` collapse animation only clips content visually — clipped elements remain in the tab order and the accessibility tree. Nothing set `visibility`/`inert`/`hidden` on the collapsed panel.
- **Fix:** Collapsed panel additionally gets `visibility: hidden`, with `visibility` added to the existing transition (its interpolation rule keeps the panel visible for the whole collapse, then hides at the end — animation unchanged, no JS needed, covers CSS consumers and React `NavGroup` alike).
- **Gate:** `tests/a11y/nav-contract.spec.mjs` injects focusable links into the showcase panel, collapses it, and asserts links are hidden and Tab from the trigger skips the panel (both themes).
- **Tag:** a11y, css-animation, generalizable — any show/hide done purely by clipping (`0fr`, `max-height: 0`, `overflow: hidden`) leaves content focusable; pair it with `visibility: hidden`/`inert`, and test reachability, not just appearance.
