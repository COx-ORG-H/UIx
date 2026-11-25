# Web-platform capabilities for native-phone-grade motion in a React + CSS kit (as of 2026-11-20)

Scope: what browsers ship today (Chrome/Edge, Safari, Firefox) to reproduce iOS 26 Liquid Glass / SwiftUI springs, Material 3 Expressive springs and shape morphing, and One UI interruptible motion. Research ran on 2026-11-20 within a capped tool budget. Where a version came only from secondary or snippet-level sources, it is flagged. Version anchors: Firefox 159 shipped 2026-10-27 ([MDN Fx159](https://developer.mozilla.org/en-US/docs/Mozilla/Firefox/Releases/159)). Safari 27.0 features were published 2026-09-17 ([WebKit](https://webkit.org/blog/18325/webkit-features-for-safari-27-0/)). Chrome 147 went stable around 2026-04-07 ([web-features explorer](https://web-platform-dx.github.io/web-features-explorer/features/view-transitions-element-scoped/)).

## Springs in CSS (`linear()`) vs JS springs (WAAPI, Motion, react-spring)

### Takeaway
`linear()` is Baseline: Chrome/Edge 113, Firefox 112, and Safari (version not re-verified this session). It can bake a spring curve into CSS, but only as a fixed-duration, pre-sampled curve. It carries no velocity, so an interrupted transition restarts the curve instead of continuing the motion. Interruptible, gesture-driven springs (the One UI / SwiftUI feel) still need a JS spring. Motion's `animate` mini plus spring costs about 3.3 kB + 1.55 kB, so it is cheap enough to be the kit's default engine.

### Cited Findings
- `linear()` support: Chrome/Edge 113, Firefox 112. Use `@supports` to fall back to `cubic-bezier` — [Chrome for Developers: linear()](https://developer.chrome.com/docs/css-ui/css-linear-easing-function); [camoa guide](https://camoa.github.io/dev-guides/css/css-craft/spring-physics-and-advanced-easing)
- Chrome's own guidance: "linear() does not calculate it [duration] automatically". CSS needs a fixed duration that you may have to tune by hand. The spring example uses about 40 stops and a bounce about 15; more stops mean a smoother curve but more CSS. Generators offer "simplify" — [Chrome: Physics-based easing](https://developer.chrome.com/docs/modern-web-guidance/guides/ui-behaviors/physics-based-easing)
- The same guide: apply spring `linear()` to `transform`/`opacity`. Avoid overshoot on `opacity`, since values outside 0..1 cause flicker. Recommend Motion or GSAP when high-fidelity physics matters. Disable under `prefers-reduced-motion: reduce` — [Chrome: Physics-based easing](https://developer.chrome.com/docs/modern-web-guidance/guides/ui-behaviors/physics-based-easing)
- Generators: Jake Archibald and Adam Argyle's Linear() Easing Generator derives the duration from the spring's settle time. Josh Comeau calls it the best tool. A zero-damping spring cannot be expressed because it never settles. Easing Wizard exposes stiffness/damping/mass, but its duration is a separate fixed input — [Josh Comeau: linear()](https://joshwcomeau.com/animation/linear-timing-function)
- pqina samples a Svelte spring (stiffness/damping) into a `linear()` string — [pqina](https://pqina.nl/blog/css-spring-animation-with-linear-easing-function/)
- Sampling a damped harmonic oscillator at even time steps gives the stops. Interrupting gives no velocity continuity — [daily.dev summary: spring physics in CSS](https://daily.dev/posts/spring-physics-in-css-dw8lz2zin.md)
- Motion (motion.dev) sizes from the official docs: `useAnimate` mini about 3.3 kB, hybrid `animate` about 23 kB, full `motion` component about 34 kB, `LazyMotion` initial load as low as 4.6 kB — [motion.dev: reduce bundle size](https://motion.dev/docs/react-reduce-bundle-size)
- Motion feature comparison: spring is "Included (+1.55 kB)" in `animate` mini (WAAPI-backed) and included in full `animate` — [motion.dev feature comparison](https://motion.dev/docs/feature-comparison)
- The `domAnimation` and `domMax` (layout animations) feature-bundle sizes conflict across third-party mirrors: about 17/34 kB vs about 30/50 kB gzip. Treat them as unsettled — [Mintlify mirror](https://www.mintlify.com/motiondivision/motion/api/lazy-motion); [motion.dev LazyMotion](https://motion.dev/docs/react-lazy-motion)

### Inferences
- Recommended split for UIx:
  - Static, non-interruptible state changes (hover, press release, toast enter): CSS `transition` with spring `linear()` tokens, generated at build time from (duration, bounce) pairs.
  - Anything a finger or pointer can interrupt or fling (sheets, drag-to-dismiss, segmented thumb, carousel snap): a JS spring that keeps velocity. That means Motion `animate`/`motion` values or react-spring.
- Apple's SwiftUI `Spring(duration:bounce:)` maps to physical parameters (mass = 1):
  - stiffness = (2π / duration)²
  - damping = 4π(1 − bounce) / duration for bounce ≥ 0
  - Under this model, "duration" is the perceptual period, not the settle time.
  - The formula is recalled from Apple's WWDC23 "Animate with springs" material and was NOT re-fetched this session. Verify it before encoding tokens. A build script can turn (duration, bounce) into stiffness/damping, simulate it, and emit both a `linear()` string and the settle time to use as the CSS duration.
- The CSS duration must be the settle time, not Apple's perceptual duration. A bouncy spring therefore needs a longer CSS `transition-duration` than its "duration" token says.
- WAAPI accepts `linear()` strings as `easing`, so the same baked curves can drive JS-started animations without a library. Velocity hand-off still needs a JS physics loop (Motion does this).

### Gaps
- react-spring current bundle size and React 19 status were not fetched.
- The exact Safari version that shipped `linear()` was not re-verified (believed Safari 17.2).
- No source verified whether Motion's mini `animate` spring keeps velocity on interruption the way the full `motion` value does.

## View Transitions (same-document, cross-document, element-scoped, `view-transition-class`, `match-element`)

### Takeaway
Same-document view transitions are Baseline Newly available since Firefox 144 (Oct 2025), including `view-transition-class`. That is enough for button-to-dialog and list-to-detail morphs in an SPA. Firefox still lacks cross-document transitions, which are now an Interop 2026 focus area. Element-scoped transitions (`element.startViewTransition`, which allow concurrent and nested transitions) are Chromium-only, from Chrome/Edge 147.

### Cited Findings
- Firefox 144 (2025-10-14) shipped same-document view transitions with `view-transition-name` and `view-transition-class`. web.dev reports same-document VT became Baseline Newly available with Fx144, and lists `match-element` among the features. Mozilla's own Fx144 notes do not mention `match-element` explicitly — [web.dev](https://web.dev/blog/same-document-view-transitions-are-now-baseline-newly-available); [MDN Fx144](https://developer.mozilla.org/en-US/docs/Mozilla/Firefox/Releases/144)
- `match-element` works only in same-document view transitions — [Chrome: View transitions in 2025](https://developer.chrome.com/blog/view-transitions-in-2025)
- Firefox reportedly added view transition types in Firefox 147 (2026-01-13). This is a secondary claim; the Fx147 notes were not checked — [web.dev](https://web.dev/blog/same-document-view-transitions-are-now-baseline-newly-available)
- Cross-document VT is not in Firefox (bug 1860854). Secondary claims of Firefox 132/144 cross-doc support are unreliable — [whoooop.co.uk](https://whoooop.co.uk/blog/cross-document-view-transitions)
- Safari shipped cross-document view transitions in 18.2. Interop 2026 expands the VT focus area from same-document plus `view-transition-class` (2025) to cross-document as well. Mozilla notes the area includes `rel="expect"` and `blocking="render"` — [WebKit: Announcing Interop 2026](https://webkit.org/blog/17818/announcing-interop-2026/); [Mozilla Hacks](https://hacks.mozilla.org/2026/02/launching-interop-2026/)
- Element-scoped view transitions (`Element.startViewTransition()`) are stable in Chrome 147 and Edge 147 (2026-04-07/10), enabling concurrent and nested transitions. Not supported in Firefox or Safari. Testing behind a flag began in Chrome 140. The `view-transition-scope` value was renamed from `auto` to `all` in 147.0.7717.0 — [Chrome blog](https://developer.chrome.com/blog/element-scoped-view-transitions); [web-features explorer](https://web-platform-dx.github.io/web-features-explorer/features/view-transitions-element-scoped/); [CSSWG draft explainer](https://github.com/w3c/csswg-drafts/blob/main/css-view-transitions-2/element-scoped-view-transitions.md)
- Safari 27.0 fixed several VT bugs:
  - inserting a CSS rule mid-transition snapped the group to its final state
  - an outbound cross-doc VT started from a render-blocked document
  - snapshots are now stored in sRGB

  The post does not mention element-scoped VT — [WebKit: Safari 27.0](https://webkit.org/blog/18325/webkit-features-for-safari-27-0/)

### Inferences
- For UIx morphs (button → popover/dialog, row → detail panel), use document-level `document.startViewTransition` plus `view-transition-name`/`-class`. It works in all three engines.
- Wrap it in a hook that:
  - feature-detects
  - skips the transition under reduced motion
  - calls `flushSync` inside the callback for React state updates
- Element-scoped VT, needed so two morphs don't block each other or freeze the whole page, is Chromium-only progressive enhancement. A document-level VT makes the page non-interactive during the transition. That is the main INP-style risk, so keep durations short (≤300 ms).
- VT easing is CSS, so spring `linear()` tokens apply to `::view-transition-group(*)`. VT cannot be interrupted with velocity: a new `startViewTransition` skips the running one. Gesture-driven morphs should stay JS (Motion `layout` / `layoutId`).

### Gaps
- No Firefox release-note source confirmed `match-element` explicitly, and no ship version was found for `match-element` in Safari.
- No date found for Firefox cross-document VT.
- No WebKit or Gecko position on element-scoped VT was found.

## Scroll-driven animations and scroll-state container queries

### Takeaway
Scroll-driven animations (`animation-timeline: scroll()/view()`, `animation-range`, `ScrollTimeline`/`ViewTimeline`) became Baseline Newly available on 2026-10-27, when Firefox 159 enabled them by default. Safari has had them since 26.0, and they are an Interop 2026 focus area. Scroll-state container queries (`stuck`/`snapped`/`scrollable`/`scrolled`) are still Chromium-only (Chrome/Edge 133+).

### Cited Findings
- Firefox 159 (2026-10-27) enables scroll-driven animations by default: `animation-timeline`, `scroll-timeline`, `view-timeline`, `animation-range`, plus the `ScrollTimeline` and `ViewTimeline` interfaces — [MDN Fx159](https://developer.mozilla.org/en-US/docs/Mozilla/Firefox/Releases/159); [Releasebot Mozilla Nov 2026](https://releasebot.io/updates/mozilla)
- "We shipped support for scroll-driven animations in Safari 26.0". Scroll-driven animations are a new Interop 2026 focus area — [WebKit: Interop 2026](https://webkit.org/blog/17818/announcing-interop-2026/)
- Baseline Newly available in October 2026 per community sources; the web.dev entry was not checked directly — [DEV: SDA are Baseline](https://dev.to/richicodes/scroll-driven-animations-are-baseline-at-last-3c8g); [scroll-driven-animations.style](https://scroll-driven-animations.style/demos/baseline-newly-available/css/)
- Pre-October 2026 articles calling SDA "not Baseline" are stale — [whoooop.co.uk](https://whoooop.co.uk/blog/css-scroll-driven-animations)
- Scroll-state queries: Chrome/Edge 133 shipped `stuck`, `snapped`, and `scrollable` in early 2025. Firefox has none (bugzil.la/1931980) and Safari has none, including Safari 27 per one source. Use `@supports (container-type: scroll-state)` — [web-features explorer](https://web-platform-dx.github.io/web-features-explorer/features/container-scroll-state-queries/); [MDN guide](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Conditional_rules/Container_scroll-state_queries); [mewastudio](https://www.mewastudio.com/en/blog/scroll-state-queries-sticky-interface-css)
- Scroll-state queries are absent from the Interop 2026 focus-area list — [WebKit: Interop 2026](https://webkit.org/blog/17818/announcing-interop-2026/)

### Inferences
- Collapsing large-title headers (iOS) and minimize-on-scroll toolbars and tab bars (iOS 26 / One UI): drive them with `animation-timeline: scroll()` and `animation-range: 0 120px` on `transform`/`opacity`. This is now cross-engine and runs off the main thread where the engine allows.
- "Show the toolbar again on scroll up" needs scroll direction. SDA expose position, not direction. Scroll-state `scrolled` (direction) is Chromium-only, so a small passive scroll listener that toggles a data attribute is still the portable path.
- Scroll-edge effects (iOS 26 fade/blur under bars) and "stuck" shadows: use scroll-state `stuck` as enhancement. The fallback is an IntersectionObserver sentinel, or an SDA on the first 1 px of scroll.
- Under reduced motion, keep the end state (collapsed header) but snap rather than scrub: `animation: none` and toggle with a class.

### Gaps
- Firefox and WebKit ship plans for scroll-state queries were not found.
- The `scrolled` (direction) value's Chrome version was not verified this session.

## Shape morphing (border-radius, `corner-shape`, `shape()`)

### Takeaway
Cross-engine shape morphing comes from two features:
- Animating `border-radius` (long supported).
- The `shape()` function in `clip-path`, which is Baseline: Chrome 135, Safari 18.4, and reportedly Firefox 148. It interpolates between shapes with matching command structure, and is an Interop 2026 focus area.

`corner-shape` (squircle/superellipse, scoop, bevel, notch) is Chromium-only in stable (Chrome 139+). Firefox has it only in pre-release builds and Safari only in Technology Preview, so use it as progressive enhancement over `border-radius`.

### Cited Findings
- `shape()`: Chrome/Edge 135, Safari 18.4. WebKit confirms "We shipped support for the shape() function in Safari 18.4", and it is an Interop 2026 focus area — [Chrome blog: shape()](https://developer.chrome.com/blog/css-shape); [WebKit: Interop 2026](https://webkit.org/blog/17818/announcing-interop-2026/)
- Firefox `shape()`: translated Chrome pages list Firefox 148, and a third-party article reads web-features as "Baseline newly available since February 24, 2026". An older web-features snapshot showed Firefox unsupported. Verify on MDN — [Chrome blog (translated)](https://developer.chrome.com/blog/css-shape?hl=de); [levelup.gitconnected](https://levelup.gitconnected.com/css-clip-paths-can-finally-resize-with-the-element-most-developers-still-hard-code-path-2a8094b6528a); [web-features explorer](https://web-platform-dx.github.io/web-features-explorer/features/shape-function)
- Safari 27.0 fixed `shape()` computed values and blending `shape()` with basic-shape `offset-path` (`<coord-box>`) — [WebKit: Safari 27.0](https://webkit.org/blog/18325/webkit-features-for-safari-27-0/)
- `corner-shape`: Chrome 139+ stable. caniuse lists Safari as unsupported through 27 (TP only). Firefox data conflicts: caniuse lists "Firefox 162" (a future version given Fx159 shipped 2026-10-27), and another source says Nightly-only from Nightly 158 (2026-09-10). Use `@supports (corner-shape: squircle)`; it degrades to ordinary round corners — [caniuse corner-shape: squircle](https://caniuse.com/mdn-css_properties_corner-shape_squircle); [squircle.js.org](https://squircle.js.org/blog/squircles-in-css); [Smashing Magazine Mar 2026](https://www.smashingmagazine.com/2026/03/beyond-border-radius-css-corner-shape-property-ui/)

### Inferences
- Material 3 Expressive shape morphs (circle → rounded square → pill on press or selection) are achievable cross-engine:
  - With `border-radius` transitions on the element itself (cheap, but triggers paint).
  - With `clip-path: shape()` keyframes that have the same number and type of commands (interpolable, also paint).
  Neither is compositor-only, so keep them to small elements such as buttons, FABs, and chips, not large surfaces.
- iOS-style continuous corners (squircle): `corner-shape: superellipse(...)`/`squircle` in Chromium with plain `border-radius` elsewhere. Mismatched corners between engines are cosmetic, not functional, so this is a safe enhancement.
- Firefox `corner-shape` is unreleased as of 2026-11-20: caniuse's "162" is beyond the current release.

### Gaps
- No source quantified the paint cost of animating `clip-path: shape()` vs `border-radius`.
- No source confirmed whether `corner-shape` values themselves interpolate (for example, round → squircle).
- MDN's current Firefox `shape()` entry was not fetched directly.

## Glass/material effects (backdrop-filter, SVG displacement refraction)

### Takeaway
Plain `backdrop-filter: blur() saturate()` works in all engines. It is GPU-expensive, especially on fixed bars over scrolling content on mid- and low-end Android.

True Liquid Glass refraction uses an SVG `feDisplacementMap` applied through `backdrop-filter: url(#filter)`. That works only in Chromium, because Safari and Firefox don't accept SVG filters in `backdrop-filter`. It is also costly to resize or animate, because the displacement map has to be rebuilt. Recommendation: blur-only glass as the kit default, refraction as an opt-in Chromium enhancement, and a solid-fill substitute for legibility and accessibility modes.

### Cited Findings
- kube.io: Chrome allows SVG filters as `backdrop-filter`, which is non-spec. Dynamic shape or size changes are costly because most tweaks force the displacement map to rebuild. The demo is Chrome-only — [kube.io: Liquid Glass in the Browser](https://kube.io/blog/liquid-glass-css-svg/)
- Safari and Firefox fall back to plain blur; "Safari doesn't support backdrop-filter: url() either" — [rizroze/liquid-glass](https://github.com/rizroze/liquid-glass); [html-in-canvas.dev](https://html-in-canvas.dev/liquid-glass-effect/)
- Gate refraction with `@supports (backdrop-filter: url(#lg))`. Pitfalls:
  - a displacement map with alpha 0 does nothing, because Chromium premultiplies by alpha
  - SVG filters default to linearRGB, which shifts neutral gray and adds a constant offset

  — [emit-solution.com](https://emit-solution.com/en/blog/recreate-apple-liquid-glass-css); [dev.to vitalbadjo](https://dev.to/vitalbadjo/liquid-glass-css-the-apple-liquid-glass-effect-with-css-only-plus-svg-refraction-1hkd)
- Measured cost: Firefox Android profiler showed about 24 ms average GPU time with `backdrop-filter` vs about 2 ms without during gentle scrolling. Worst on Mali-G710 (Pixel 7) because of multiple intermediate render targets — [Mozilla bug 1809738](https://bugzilla.mozilla.org/show_bug.cgi?id=1809738)
- Fixed top and bottom bars with `backdrop-filter: blur` over scrolling content cause heavy scroll lag (m.youtube.com on Firefox Android) — [Mozilla bug 1732817](https://bugzilla.mozilla.org/show_bug.cgi?id=1732817)
- Without GPU acceleration, blur lags in Firefox but reportedly holds up in Chromium 140 — [Mozilla bug 1988728](https://bugzilla.mozilla.org/show_bug.cgi?id=1988728)

### Inferences
- Budget: at most one or two simultaneous `backdrop-filter` surfaces visible during scroll on mobile, with a modest blur radius. Never animate `backdrop-filter` values themselves. Fade an overlay's `opacity` instead, which matches the existing UIx memory note "never CSS-animate filter".
- Legibility: glass needs a tint layer and a guaranteed contrast floor for text, measured against worst-case content behind it. Provide the solid fallback via `prefers-reduced-transparency` (Chromium only), `prefers-contrast: more`, and an app-level setting, because Safari does not expose reduced transparency.

### Gaps
- No cross-browser controlled benchmark of `backdrop-filter` cost on Safari/iOS was found.
- No measured cost for the SVG-refraction approach was found beyond "expensive to rebuild".
- No WebGPU or `html-in-canvas` glass approach was evaluated for production use.

## Interactions (`@starting-style`, allow-discrete, height:auto, popover + anchor, press, drag velocity, haptics)

### Takeaway
Entry and exit animation of top-layer UI is Baseline:
- `@starting-style` and `transition-behavior: allow-discrete`: Chrome 117, Safari 17.4, Firefox 129.
- Popover.
- Anchor positioning: Firefox 147 in Jan 2026; caniuse still says "partial".

Animating to `height: auto` (`interpolate-size` / `calc-size()`) was last confirmed Chromium-only (Chrome 129). Haptics: the Vibration API does nothing on iPhone, and the iOS `<input type=checkbox switch>` label-click haptic trick reportedly stopped working in iOS 26.5, so haptics can only be a progressive enhancement.

### Cited Findings
- `@starting-style` and `transition-behavior: allow-discrete` became Baseline Newly available with Firefox 129. First versions: Chrome/Edge 117, Firefox 129, Safari 17.4 — [web.dev: Baseline entry animations](https://web.dev/blog/baseline-entry-animations)
- Firefox caveat: Fx129+ accepts `allow-discrete` without transitioning `display` (bug 1882408), so exit animations can vanish immediately. Its current status was not confirmed. If you use a `transition` shorthand, put `transition-behavior: allow-discrete` after it, because the shorthand resets it. `::backdrop` needs its own `display`/`overlay` allow-discrete transition and its own standalone `@starting-style` — [Chrome: animate to/from top layer](https://developer.chrome.com/docs/modern-web-guidance/guides/ui-behaviors/animate-to-from-top-layer); [MDN @starting-style](https://developer.mozilla.org/docs/Web/CSS/Reference/At-rules/@starting-style)
- Safari 27.0 fixed `display` transitions animating popover and `<dialog>` incorrectly on close, and popover light-dismiss edge cases — [WebKit: Safari 27.0](https://webkit.org/blog/18325/webkit-features-for-safari-27-0/)
- Anchor positioning: Mozilla's intent to ship was dated 2025-12-02, and it was reportedly default-on in Firefox 147 (2026-01-13), making it Baseline. caniuse marks Fx147+ as "Partial". Chrome/Edge and Safari already supported it. It remains an Interop 2026 focus area for reliability — [Mozilla dev-platform intent](https://groups.google.com/a/mozilla.org/g/dev-platform/c/B71NFNrZ8Lo); [Refonte Learning](https://www.refontelearning.com/blog/css-anchor-positioning-reaches-baseline); [caniuse](https://caniuse.com/css-anchor-positioning); [WebKit: Interop 2026](https://webkit.org/blog/17818/announcing-interop-2026/)
- Safari 27.0 anchor changes:
  - transform-aware anchoring (follows an anchor's `transform`/`translate`/`scale`)
  - default `position-anchor` is now `normal`
  - `anchor-valid`/`anchor-visible` replace `anchors-*`

  — [WebKit: Safari 27.0](https://webkit.org/blog/18325/webkit-features-for-safari-27-0/)
- Interop 2026 includes dialog and popover additions: `closedby`, `popover="hint"`, `:open` — [WebKit: Interop 2026](https://webkit.org/blog/17818/announcing-interop-2026/)
- `interpolate-size: allow-keywords` and `calc-size()`: Chrome/Edge 129. Firefox and Safari were unsupported as of the Sep 2024 Chrome doc. No newer cross-browser source was found — [Chrome: animate to height:auto](https://developer.chrome.com/docs/css-ui/animate-to-height-auto)
- Haptics:
  - `<input type=checkbox switch>` arrived in Safari 17.4. Calling `click()` on its associated `<label>` fires iOS haptics.
  - `navigator.vibrate()` is ignored on iPhone.
  - The `ios-haptics` README says the trick "only works on ios 17.4 to 26.4, as apple patched it in ios 26.5". There is no Apple statement.
  - A WebKit bug asks that switch haptics require user activation.

  — [WebKit: An HTML Switch Control](https://webkit.org/blog/15054/an-html-switch-control/); [ios-haptics README](https://unpkg.com/ios-haptics@3.1.1/README.md); [WebKit bug 285120](https://bugs.webkit.org/show_bug.cgi?id=285120)
- Safari 27.0: the switch control now responds to native-appearance CSS properties — [WebKit: Safari 27.0](https://webkit.org/blog/18325/webkit-features-for-safari-27-0/)
- `web-haptics-polyfill`: iOS switch trick, Android `navigator.vibrate` with intensity, audio fallback on desktop — [web-haptics-polyfill](https://doublej.github.io/web-haptics-polyfill/)

### Inferences
- Morphing popovers (iOS 26 menus that grow out of their button):
  - `popover` + anchor positioning + `@starting-style` (scale from `transform-origin` at the anchor side, opacity) works cross-engine in CSS.
  - A real "button becomes the menu" morph needs a view transition (same-document) or a Motion `layoutId`.
  - Do not rely on Firefox exit transitions until bug 1882408 is confirmed fixed.
- Height:auto accordions: use `interpolate-size` as Chromium enhancement. Portable fallbacks are `grid-template-rows: 0fr → 1fr` transitions, or Motion's height animation.
- Press feedback: `:active { scale: .96 }` with a short spring `linear()` release is compositor-friendly.
  - iOS Safari only fires `:active` on touch when a touch listener exists (long-standing behavior, not re-verified).
  - Pointer-events-based press state is more reliable.
- Drag-to-dismiss and fling: compute velocity from `pointermove` samples (last ~50–100 ms) and hand it to a JS spring. CSS cannot accept initial velocity.
  - Use `touch-action` on the drag handle so the browser doesn't steal the gesture.
- Haptics are best-effort only: Android Chrome `vibrate(10)` on commit actions. Never use haptics as the only feedback channel.

### Gaps
- Current Firefox/Safari status of `interpolate-size`/`calc-size()` is not verified for late 2026; this research found no evidence of shipping.
- Firefox bug 1882408's current status is unknown.
- Popover API Baseline date was not re-verified (believed 2024).
- No source confirms iOS 26.5+ haptics behavior beyond library READMEs.

## Accessibility preferences (`prefers-reduced-motion`, `prefers-reduced-transparency`, `prefers-contrast`)

### Takeaway
`prefers-reduced-motion` is universal and should gate the whole motion system. Under it, substitute crossfades and instant state changes; don't just remove feedback. `prefers-reduced-transparency` works only in Chromium (118/119+). Firefox implements it but disables it by default, and Safari doesn't support it (WebKit cites privacy concerns). Glass therefore also needs an app-level "solid surfaces" setting.

### Cited Findings
- `prefers-reduced-transparency`: Chrome 118 (blog) / 119 (caniuse, web-features). Edge matches. Firefox implemented it on all platforms but it is off by default. Safari desktop and iOS are unsupported, with WebKit's position "unknown (concerns: privacy)" — [Chrome blog](https://developer.chrome.com/blog/css-prefers-reduced-transparency); [caniuse](https://caniuse.com/wf-prefers-reduced-transparency); [web-features explorer](https://web-platform-dx.github.io/web-features-explorer/features/prefers-reduced-transparency); [Mozilla bug 1736914](https://bugzilla.mozilla.org/show_bug.cgi?id=1736914)
- Chrome's spring guidance disables spring transitions under `prefers-reduced-motion: reduce` — [Chrome: Physics-based easing](https://developer.chrome.com/docs/modern-web-guidance/guides/ui-behaviors/physics-based-easing)
- With reduced motion, entry transitions should be suppressed and the change made instant — [web.dev: Baseline entry animations](https://web.dev/blog/baseline-entry-animations)

### Inferences
- Substitution table for UIx:
  - spatial morphs, VT slides, and shape morphs → 120–150 ms opacity crossfade
  - springs with overshoot → no-overshoot ease-out, or instant
  - scroll-scrubbed headers → discrete snap between states
  - parallax and decorative loops → off
  - glass → solid tinted surface under reduced transparency, `prefers-contrast: more`, or a kit setting
  - focus rings and selection feedback → keep, since they convey state
- The existing UIx motion contract (2.46.0 reduced-motion policy, per project memory) should extend its tokens with a reduced variant for each spring token rather than a global kill switch.

### Gaps
- `prefers-contrast` support versions were not re-verified this session (believed Baseline across engines).
- `forced-colors` interaction with glass was not researched.

## INP / jank: what to animate, will-change, compositor rules, low-end budgets

### Takeaway
Animate only `transform`, `opacity` (and individual `translate`/`scale`/`rotate`) for anything long-running or gesture-driven. Treat these as paint-bound and keep them small and brief: `border-radius`, `clip-path`, `filter`/`backdrop-filter`, `height`, and VT snapshots of large areas. Use `will-change` only just before a gesture starts, then remove it. This session found little 2026-specific measured guidance, so most of this section is inference.

### Cited Findings
- Spring `linear()` should target `transform`/`opacity`, which run on a separate (compositor) thread. Avoid overshoot on opacity — [Chrome: Physics-based easing](https://developer.chrome.com/docs/modern-web-guidance/guides/ui-behaviors/physics-based-easing)
- `backdrop-filter` can raise GPU frame time by about 12× (2 → 24 ms) during scroll on a mid-range Mali GPU, blowing the 16.7 ms frame budget — [Mozilla bug 1809738](https://bugzilla.mozilla.org/show_bug.cgi?id=1809738)
- Liquid-glass displacement maps are expensive to rebuild on size or shape change — [kube.io](https://kube.io/blog/liquid-glass-css-svg/)
- Interop 2026 "Web Compat" includes scroll/animation event timing — [WebKit: Interop 2026](https://webkit.org/blog/17818/announcing-interop-2026/)

### Inferences
- INP risk mostly comes from JS work on the input path (React re-renders before the animation starts), not from the animation itself.
  - Start the visual response (CSS class or WAAPI) synchronously in the event handler.
  - Defer heavy state updates (`startTransition`).
  - Avoid document-level view transitions on high-frequency interactions, because they block input while the snapshot is captured.
- Low-end budget heuristic for UIx:
  - at most one glass surface over scrolling content
  - no blur animations
  - shape morphs only on elements around 64 px or smaller
  - ≤300 ms for non-gesture transitions
  - test on a throttled Android profile (4× CPU)
- Motion's WAAPI-backed `animate` keeps transform/opacity animations on the compositor even when the main thread is busy. rAF-driven JS springs do not, unless the library hands the animation off to WAAPI. Prefer hybrid engines for non-gesture springs.

### Gaps
- No 2026 primary source with measured INP impact of view transitions or JS spring libraries was fetched.
- `will-change` memory guidance and Chrome's current compositing rules were not re-fetched this session.
- No published low-end-device frame-budget numbers were found for 2026.
