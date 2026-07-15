# Manual Screen-Reader Test Protocol — UIx v2

**Slice:** A11Y-1 · **Owner:** UIx accessibility · **Last updated:** 2026-07-03

This protocol defines how a human tester manually verifies a UIx v2 component with real
assistive technology (AT). It pairs with:

- `result-template.md` — the machine-parsable result form to copy per component.
- `results/` — one filled `<component-id>.md` per component tested (see `results/button.md`).

A component is identified by its **component id**, which is the lowercase basename of its
CSS file in `packages/tokens/styles/components/` (e.g. `button` from `button.css`,
`modal` from `modal.css`). This vocabulary is shared verbatim with slices A11Y-2 and
BREADTH-1 — do not invent new ids.

---

## 1. AT / OS / Browser matrix

Manual SR testing is done against a fixed set of AT + OS + browser pairings. Each pairing
is a **tier**. Testing an AT with a browser it is not paired with here is out of scope
(e.g. NVDA + Chrome is not a tier) because vendor guidance and real-world usage concentrate
on these combinations.

| Tier | Assistive tech | OS | Browser | Status for "Stable" |
|------|----------------|----|---------|---------------------|
| T1 | NVDA (latest stable) | Windows 11 | Firefox (latest) | **REQUIRED** |
| T2 | JAWS (latest stable) | Windows 11 | Chrome (latest) | Recommended |
| T3 | VoiceOver | macOS (latest) | Safari (latest) | Recommended |

### Tier required for the "Stable" maturity level

To promote a component to **Stable**, **Tier 1 (NVDA + Firefox on Windows) MUST pass** every
applicable checklist item below (a documented `na` is acceptable where an item genuinely does
not apply). T2 and T3 are strongly recommended and any failures on them MUST be recorded in the
result file, but they do not by themselves block Stable. A component with a T1 `fail` on any
applicable item CANNOT be Stable.

Record every tier you actually exercised in the result header as `pass`, `fail`, or `na`.
Use `na` only when the tier was genuinely not run (e.g. no macOS hardware available) — never
to paper over a failure.

---

## 2. Per-component checklist

Run every item for each component. Each item is either **pass**, **fail**, or **na** (with a
one-line reason for `na` or `fail`). "Announced" means the AT speaks it without the tester
having to hunt for it.

1. **Accessible name** — the control exposes a correct, non-empty accessible name (from visible
   text, `aria-label`, `aria-labelledby`, or an associated `<label>`). Icon-only controls still
   announce a meaningful name.
2. **Role** — the AT announces the correct role (e.g. "button", "dialog", "checkbox"). Native
   elements are preferred over ARIA `role=` overrides.
3. **Value / state announced** — current value and states are announced and update live:
   pressed/checked/selected/expanded, disabled, invalid, required, busy/loading, etc.
4. **Focus order = visual order** — Tabbing moves through controls in the same order they appear
   visually; no focus is trapped unexpectedly and nothing off-screen steals focus.
5. **Full keyboard operability** — every interaction is reachable and operable from the keyboard
   with the expected keys:
   - **Tab / Shift+Tab** — move focus forward / backward.
   - **Enter** — activate the primary action (buttons, links, default submit).
   - **Space** — activate buttons; toggle checkboxes/switches.
   - **Esc** — dismiss overlays (dialog, popover, menu, drawer) and cancel edits.
   - **Arrow keys** — move within composite widgets (tabs, radio group, menu, listbox, grid,
     segmented control).
6. **Focus-visible ring** — a clearly visible focus indicator appears on keyboard focus
   (UIx uses `:focus-visible { outline: 2px solid var(--uix-ring); outline-offset: 2px }`),
   and it is not suppressed for keyboard users.
7. **aria-live on async** — asynchronous updates (loading -> loaded, toast/alert, validation
   errors, live result counts) are announced via an appropriate live region
   (`aria-live`, `role="status"`/`role="alert"`) and/or `aria-busy`. `na` if the component has
   no async behavior.
8. **Reduced-motion honored** — with OS "reduce motion" enabled, non-essential animation and
   transition is removed or reduced to imperceptible. UIx ships a global guard in
   `packages/tokens/styles/motion.css` that collapses `animation-duration`/`transition-duration`
   to `.001ms` under `prefers-reduced-motion: reduce`; confirm the component visibly honors it
   and that no essential information is conveyed by motion alone.

---

## 3. Workflow

1. Copy `result-template.md` to `results/<component-id>.md` (id = lowercase CSS basename).
2. Fill the header block with the component id, uix version under test
   (`packages/tokens/package.json` `version`), tester, and date.
3. Exercise each tier in the matrix; for each, walk the checklist and record `pass`/`fail`/`na`.
4. Set the per-tier header field (`nvda-firefox`, `jaws-chrome`, `voiceover-safari`) to the
   overall verdict for that tier: `pass` only if every applicable item passed, `fail` if any
   applicable item failed, `na` if the tier was not run.
5. Keep the header block machine-parsable — do not reorder or rename keys; every key from
   `result-template.md` must be present verbatim.
