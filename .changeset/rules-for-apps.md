---
"@tensor_1/tokens": minor
"@tensor_1/react": minor
---

Rules for apps: the calm-kit rules (signal budget, brand and neutrals, chart grammar, motion grammar, files) are now rules for every app that uses UIx, on a new docs page (Foundations → Rules for apps) and in `Docs/design-system.md`. The kit enforces the testable ones:

- `check-motion` rule `loop-not-loading` (in `test:contract`): an infinite animation fails unless it is an indeterminate loading indicator on the short `LOOP_ALLOW` list (Spinner, Skeleton, indeterminate Progress, BusyRegion bar, Button loading, SaveStatus saving, a running Flow step, the text caret). `motion-allow` does not exempt it.
- The chart palette test fails a series token that equals a danger role or sits within dE 10 of one.
- The status test fails a critical or danger status that paints a solid fill, in any treatment or mode.

Behaviour changes, so status never loops:

- `Heartbeat` / `LiveIndicator` is a still dot in its state's colour. The ring no longer pulses and, under reduced motion, the dot no longer breathes. The ring span stays in the markup and is not drawn. Say the state in words beside it (as `LiveIndicator` does).
- Flow diagram edges no longer march on hover or focus; they thicken at once instead.

Consumers pick these up on their next bump; no change is needed on their side.
