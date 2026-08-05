# Lessons learned

### 2026-08-05 · a11y/sidebar · `8b622fd`
- **Symptom:** Keyboard users could Tab into invisible links inside a collapsed sidebar nav group; focus vanished into clipped content.
- **Root cause:** The `grid-template-rows: 0fr` + `overflow: hidden` collapse animation only clips content visually — clipped elements remain in the tab order and the accessibility tree. Nothing set `visibility`/`inert`/`hidden` on the collapsed panel.
- **Fix:** Collapsed panel additionally gets `visibility: hidden`, with `visibility` added to the existing transition (its interpolation rule keeps the panel visible for the whole collapse, then hides at the end — animation unchanged, no JS needed, covers CSS consumers and React `NavGroup` alike).
- **Gate:** `tests/a11y/nav-contract.spec.mjs` injects focusable links into the showcase panel, collapses it, and asserts links are hidden and Tab from the trigger skips the panel (both themes).
- **Tag:** a11y, css-animation, generalizable — any show/hide done purely by clipping (`0fr`, `max-height: 0`, `overflow: hidden`) leaves content focusable; pair it with `visibility: hidden`/`inert`, and test reachability, not just appearance.

### 2026-07-09 · a11y/react · `aee4265`
- **Symptom:** Screen readers mis-announced or skipped Field errors, Tree state, and Toasts; UIX-FIX-04.
- **Root cause:** ARIA attributes placed on the wrong elements (`aria-selected` on a `<button>` is invalid — it belongs on the `treeitem`), errors not linked via `aria-describedby`, and a permanent live-region wrapper (Toaster) double-announcing its children.
- **Fix:** Field errors wired with `aria-describedby` + `aria-invalid` + `role=alert`; Tree rebuilt as WAI-ARIA tree (`tree/treeitem/group`, `aria-level`, roving tabindex); Toast itself is the live region (`alert` for danger, `status` otherwise), Toaster demoted to a plain container.
- **Gate:** axe-core gate in `packages/tokens/tests/a11y` runs on both themes, fails on serious/critical violations. Keyboard-interaction paths are manual (SR protocol in docs) — ⚠ TODO: scripted keyboard-nav assertions.
- **Tag:** a11y, aria, generalizable — put ARIA state on the element owning the role; never wrap toasts in a second live region.

### 2026-07-09 · react/useDialog · `4c1dc72`
- **Symptom:** Background page scrolled behind open Modal/Drawer/Peek; UIX-FIX-03.
- **Root cause:** `<dialog>.showModal()` makes the background inert but does NOT lock scrolling; `body { overflow: hidden }` alone is insufficient because the scrolling root is `document.scrollingElement` (`<html>`).
- **Fix:** `useDialog` locks the scroll root with scrollbar-width compensation and `overscroll-behavior: contain`, reference-counted for stacked dialogs; styleguide unlocks via a MutationObserver on the `open` attribute (survives Esc/backdrop/`close()` and allow-discrete animated exits).
- **Gate:** ⚠ TODO — no automated check; verified manually in Chromium (computed overflow, scrollbar padding, ref-count balance). Smallest gate: a DOM test asserting scroll-root style set/restored across open→close→reopen and stacked dialogs.
- **Tag:** dialog, scroll-lock, generalizable — `showModal()` ≠ scroll lock; lock `document.scrollingElement`, not just `body`.

### 2026-07-09 · react/table-engine · `c083013`
- **Symptom:** Every numeric/enum/boolean/date saved-view filter silently matched zero rows after a URL round-trip; UIX-FIX-01.
- **Root cause:** Serialization dropped type information: `parseView` hard-coded `kind:'text'` and inferred array-vs-scalar from the serialized text, and `matchFilter` had no date branch (date ops fell into `asNum` → `NaN`). The old test only exercised `kind:'text'`, masking all of it.
- **Fix:** `serializeView` carries each filter's `kind` (with `~ | ,` escaping), `parseView` restores kind + value types (array-ness from the op), `matchFilter` gained a date branch; legacy kind-less URLs still parse.
- **Gate:** FilterKind × FilterOp matrix test in `packages/react/src/table-engine.test.mjs` round-trips serialize → parse → match and asserts row-set equality.
- **Tag:** serialization, round-trip, generalizable — round-trip tests must cover the full type matrix, not one friendly case; never infer types from serialized text.
