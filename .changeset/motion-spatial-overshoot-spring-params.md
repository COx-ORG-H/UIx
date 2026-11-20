---
"@tensor_1/tokens": minor
---

Motion contract: only geometry overshoots, and the springs are published for native apps.

- `check-motion` rule 10, `overshoot-effect`: an overshooting curve (`--uix-ease-pop`, `-tooltip`, `-bounce`, `-drawer`, the legacy `-spring`, or a literal `cubic-bezier()`/`linear()` that leaves 0..1) may ease only `transform`, `translate`, `scale`, `rotate` and `clip-path`. Opacity and colour clamp at their range, so an overshoot there sticks or flickers (Material 3 Expressive's spatial vs effects springs). The list of overshooting tokens is read from the token source. An overshooting `transition-timing-function` or `animation-timing-function` must name its properties or animation in the same rule, and it is checked against every longhand list the file sets for the same element.
- The tooltip's fade no longer rides the tooltip spring: it runs on `--uix-ease-glide` over `--uix-dur-glide` (95 % after about 175 ms, as the spring's was after about 165 ms). The scale keeps the spring.
- Glide, pop, tooltip and bounce publish stiffness, damping, mass, their overshoot, their duration token and a `cubic-bezier` fallback in `$extensions["uix.spring"]` and as `spring` in `@tensor_1/tokens/ts` (typed `UixSpring`), so React Native, SwiftUI or Compose can run the real spring.
