# Manual SR Result — `button`

Worked example for slice A11Y-1. Component under test: the UIx `Button`
(`packages/react/src/components/Button.tsx`) styled by
`packages/tokens/styles/components/button.css`. Component id is `button` (lowercase CSS
basename). See `../manual-sr-protocol.md`.

## Header (machine-parsable)

```yaml
component: button
uix-version: 2.6.0
tester: Haris
date: 2026-07-03
nvda-firefox: pass
jaws-chrome: pass
voiceover-safari: na
```

Header key reference:

- `component` — `button`.
- `uix-version` — `2.6.0` (from `packages/tokens/package.json`).
- `tester` — Haris.
- `date` — 2026-07-03.
- `nvda-firefox` — Tier 1 verdict (NVDA + Firefox, Windows). REQUIRED for Stable.
- `jaws-chrome` — Tier 2 verdict (JAWS + Chrome, Windows).
- `voiceover-safari` — Tier 3 verdict (VoiceOver + Safari, macOS). Not run this pass (no
  macOS hardware available), hence `na`.

## Component notes

- Renders a native `<button>` element with `forwardRef`; variant/size are class-only
  (`uix-btn`, `uix-btn--<variant>`, `uix-btn--<size>`).
- `disabled` OR `loading` sets the native `disabled` attribute; `loading` also sets
  `data-loading`, which hides the label (`color: transparent`) and shows a CSS spinner via
  `::after`. There is no `aria-live` / `aria-busy` wiring — the loading state is purely visual.
- Focus ring: `.uix-btn:focus-visible { outline: 2px solid var(--uix-ring); outline-offset: 2px }`.
- Motion: `:active { transform: scale(.97) }` and the `uix-spin` loading animation are both
  neutralized by the global `prefers-reduced-motion: reduce` guard in
  `packages/tokens/styles/motion.css` (unlayered `!important`, collapses durations to `.001ms`).

## Checklist results

| # | Item | NVDA+FF | JAWS+Chrome | VO+Safari | Notes |
|---|------|---------|-------------|-----------|-------|
| 1 | Accessible name | pass | pass | na | Text-label buttons announce their child text. Icon-only buttons (`icon` prop) still require a caller-supplied `aria-label` — the prop only changes styling, not naming; verify per usage. VO+Safari not run. |
| 2 | Role | pass | pass | na | Native `<button>` -> announced as "button". No ARIA role override. VO+Safari not run. |
| 3 | Value / state announced | pass | pass | na | `disabled`/`loading` set native `disabled`, announced as "dimmed"/"unavailable". Loading has no distinct announcement (no `aria-busy`); acceptable for a plain button but flagged below. VO+Safari not run. |
| 4 | Focus order = visual order | pass | pass | na | Single control; DOM order = visual order; no positive tabindex. `ButtonGroup` is a plain flex wrapper and does not reorder. VO+Safari not run. |
| 5 | Full keyboard operability (Tab/Shift-Tab/Enter/Space/Esc/arrows) | pass | pass | na | Tab / Shift+Tab reach and leave it; Enter and Space both activate (native button behavior). Esc / arrows `na` — a button has no dismiss or composite-navigation semantics. Disabled/loading correctly skipped in tab order. VO+Safari not run. |
| 6 | Focus-visible ring | pass | pass | na | Keyboard focus shows the 2px `--uix-ring` outline with 2px offset; not shown on mouse click (`:focus-visible`). Visible in both dark and light themes. VO+Safari not run. |
| 7 | aria-live on async | na | na | na | The base button has no async behavior. In `loading` state the spinner is visual-only with no live region / `aria-busy`, so a screen-reader user is not told the action is in progress — the control simply becomes disabled silently. Not required for a plain button, but callers using `loading` for long operations should pair it with their own live region. Tracking as a follow-up. |
| 8 | Reduced-motion honored | pass | pass | na | With OS reduce-motion on, the `:active` scale and the loading spinner are collapsed to imperceptible by the global guard in `motion.css`; no information is conveyed by motion alone. VO+Safari not run. |

## Summary

Tier 1 (NVDA + Firefox) passes every applicable item, so `button` **meets the Stable bar**.
Tier 2 (JAWS + Chrome) also passes. Tier 3 (VoiceOver + Safari) was not run this pass (`na`)
and should be completed before the next release audit.

One follow-up, not blocking Stable: the `loading` state is visual-only (no `aria-busy` /
live region). Consider adding `aria-busy={loading}` to the button and documenting that
callers announce completion of long-running actions via their own `role="status"` region.
