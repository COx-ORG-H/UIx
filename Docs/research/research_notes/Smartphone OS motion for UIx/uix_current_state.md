# UIx current motion and micro-interaction state (codebase inventory)

Scope: what UIx already ships for motion, transitions and micro-interactions, and the rules that constrain new motion. All code claims were read from **`origin/master` at commit `51461e51` (release 2.70.0, 2026-11-20)** with `git show origin/master:<path>`. The local checkout (branch `codex/release-uix-adoption`, 2.55.0) is stale and was not used. Links use `https://github.com/COx-ORG-H/UIx/blob/51461e51/<path>`. The GitHub remote is `COx-ORG-H/UIx`, not `uix-styleguide`. `gh pr list --repo COx-ORG-H/UIx --state open` returned `[]`, so there are **no open PRs**.

Short names used below: `effect.json` = `packages/tokens/tokens/base/effect.json` (the DTCG token source of truth), `motion.css` = `packages/tokens/styles/motion.css`, `check-motion` = `packages/tokens/scripts/check-motion.mjs`, `docs.js` = `packages/tokens/docs/docs.js` (the Foundations → Motion page, lines ~678–800).

## 1. Motion tokens: durations, easings, springs as linear(), glide and feedback timing

### Takeaway
UIx already has a large, documented motion token set. It covers four base durations with paired exit durations, about a dozen easings, and five spring curves sampled into CSS `linear()` (glide, pop, tooltip, bounce, plus the older cubic `ease-spring`). It also has arrival/stagger tokens, loop tokens, feedback holds and delays, and blur radii. Springs are tokens, not a JS physics engine. The page says the browser runs them on the compositor "with no animation library".

### Cited Findings
**Base durations, with exits about two-thirds of the enter:**
- `dur-fast` 120ms, `dur` 160ms, `dur-slow` 240ms, `dur-slower` 320ms. — [effect.json](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/tokens/tokens/base/effect.json)
- `dur-exit-fast` 80ms, `dur-exit` 110ms, `dur-exit-slow` 160ms. The exit durations are described as "Exits are faster than enters and never ease-in". — [effect.json](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/tokens/tokens/base/effect.json)

**Cubic easings:**
- `ease-out` = `cubic-bezier(.23,1,.32,1)` and `ease-out-strong` = `cubic-bezier(.2,0,0,1)`. — [effect.json](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/tokens/tokens/base/effect.json)
- `ease-in-out` = `cubic-bezier(.77,0,.175,1)`, for "movement already on screen". — [effect.json](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/tokens/tokens/base/effect.json)
- `ease-in` = `(.4,0,1,1)` is "Kept for compatibility only". `ease-spring` = `cubic-bezier(.34,1.56,.64,1)` is also legacy; the docs say "new work uses --uix-ease-pop". — [effect.json](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/tokens/tokens/base/effect.json); [docs.js](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/tokens/docs/docs.js)

**Springs sampled into `linear()` (2.60, the animate-ui study):**
- `ease-glide` / `dur-glide` 280ms. A damped spring (stiffness 550, damping 43, mass 1) with no overshoot. It is 95% of the way after about 175ms. Use: "A mark gliding between items already on screen… A new target retargets a running glide from where it is." — [effect.json](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/tokens/tokens/base/effect.json)
- `ease-pop` / `dur-pop` 280ms. A spring (800/42) with a 3% overshoot. "Controls only: never on data or status". — [effect.json](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/tokens/tokens/base/effect.json)
- `ease-tooltip` / `dur-tooltip` 410ms. A spring (400/31) with a 2% overshoot, used when a tooltip grows from .7 and when it travels to a neighbour. — [effect.json](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/tokens/tokens/base/effect.json)
- `ease-bounce` / `dur-bounce` 880ms. A spring (200/16) with an 11.6% overshoot, used for the radio dot. "Controls only". — [effect.json](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/tokens/tokens/base/effect.json)

**Other 2.60 easings and durations:**
- Easings: `ease-enter` (.25,.1,.35,1), `ease-leave` (0,0,.58,1), `ease-soft` (.215,.61,.355,1), `ease-fill` (.4,0,.2,1), `ease-drawer` (.34,1.2,.64,1, a 1% overshoot) and `ease-fade` (.25,.1,.25,1). — [effect.json](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/tokens/tokens/base/effect.json)
- Durations: `dur-menu` 220, `dur-fade-in` 100, `dur-row` 300, `dur-fade` 200, `dur-draw` 300, `delay-draw` 200, `dur-overlay` 400, `dur-drawer` 400, `dur-drawer-out` 160, `dur-disclosure` 350, `hold-pick` 250, `dur-swap-in` 340, `dur-swap-out` 130 and `swap-shift` 40px. — [effect.json](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/tokens/tokens/base/effect.json)
- `stagger-rows` 33ms. "Only the first ten step; the rest arrive with the tenth". — [effect.json](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/tokens/tokens/base/effect.json)
- Animated-icon durations: `dur-icon` 300, `-turn` 400, `-draw` 600, `-swing` 900, `-spin` 1250. — [effect.json](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/tokens/tokens/base/effect.json)

**Blur radii (2.60):**
- `scrim-blur` 4px, `arrive-blur` 4px, `swap-blur` 6px. Each can be turned off with `0px`. — [effect.json](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/tokens/tokens/base/effect.json)

**Feedback timing tokens (WP1 part B):**
- `delay-pending` 300ms, `hold-pending` 500ms, `hold-result` 1500ms, `dur-change` 1200ms and `dur-highlight` 2400ms. — [effect.json](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/tokens/tokens/base/effect.json)
- Tooltip delays: `delay-tooltip` 400ms and `delay-tooltip-skip` 300ms. — [effect.json](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/tokens/tokens/base/effect.json)
- The JS side duplicates these as constants: `PENDING_DELAY_MS = 300`, `PENDING_MIN_VISIBLE_MS = 500`, `RESULT_HOLD_MS = 1500`. `useDelayedPending` imports the constants, not the tokens. — [motion-timing.ts](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/react/src/motion-timing.ts); [useDelayedPending.ts](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/react/src/hooks/useDelayedPending.ts)

**Loop tokens:**
- `loop-spin` 600, `loop-progress` 1200, `loop-shimmer` 1400, `loop-ping` 1600, `loop-blink` 1100 and `loop-pulse` 2000 (the pulse is the reduced-motion stand-in). — [effect.json](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/tokens/tokens/base/effect.json)

**Arrival tokens (calm kit 2.56):**
- `dur-arrive` 420, `stagger-arrive` 45, `delay-arrive-trace` 150, `dur-arrive-trace` 700, `dur-arrive-grow` 500, `stagger-arrive-grow` 25, `dur-arrive-count` 600 and `arrive-rise` 8px. `lift` is 4px. — [effect.json](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/tokens/tokens/base/effect.json)

**How the tokens reach CSS and JS:**
- The built CSS carries all of these as `--uix-*` custom properties, `linear()` values included. — [build/css/tokens.css](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/tokens/build/css/tokens.css)
- JS reads them at runtime rather than duplicating them. `motion.ts` exports `tokenMs`, `tokenPx` and `tokenEase`; `tokenEase` parses both `cubic-bezier()` and an evenly spaced `linear()` into a JS easing function. — [motion.ts](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/react/src/motion.ts)
- There is no dark-mode motion override. `tokens/dark/effect.json` overrides only shadows. — [dark/effect.json](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/tokens/tokens/dark/effect.json)

### Inferences
- A "spring" token pattern already exists: a physics spring is sampled into `linear()` and paired with a settle-time duration. A new phone-OS-style spring should be another `ease-*`/`dur-*` pair in `effect.json`, not a JS spring library.
- `linear()` springs cannot be retargeted mid-flight with velocity carried over, because a CSS transition restarts its curve. The glide token's "retargets from where it is" works only because a transition interrupts from the current value. True velocity-preserving springs (for example a flick that hands its speed to a settle) are not covered today.

### Gaps
- No token for gesture physics: drag resistance or rubber-banding, a fling-velocity threshold, or snap points. The swipe constants live as JS literals in components (see §3).
- I did not verify that every `effect.json` token appears in `build/css/tokens.css`. Spot checks matched.

## 2. The motion contract (HAR-2578, 2.46.0): the gate, the reduced-motion policy, the blur-in-script rule, and other rules

### Takeaway
Motion is governed by a build-failing gate (`check-motion.mjs` in `npm run test:contract`) plus a docs contract (Foundations → Motion and "Rules for apps"). The gate has nine checks: raw times, `transition: all`, ease-in, animated layout properties including `box-shadow`, loops or moving animations without a reduced-motion rule, ungated `:hover` motion, loops that are not loaders, and any CSS-animated `filter`/`backdrop-filter`. Reduced motion means "remove movement, keep feedback", and it covers both the OS setting and an in-app `data-motion="reduce"`. Keyboard-opened and very frequent surfaces are instant.

### Cited Findings
**What the gate enforces:**
- Rules 1–8 from the gate's header comment: `raw-time` (any literal ms/s outside the token source, local custom properties included), `transition-all`, `ease-in`, `layout` (width/height/inset/margin/padding/grid-template-*/box-shadow in a transition list or `@keyframes`), `loop-no-reduced`, `moving-no-reduced` (keyframes that move transform/translate/scale/rotate need a `prefers-reduced-motion: reduce` rule for that selector in the same file), `hover-ungated` (hover movement or reveal must sit in `@media (hover: hover) and (pointer: fine)`) and `loop-not-loading`. — [check-motion.mjs](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/tokens/scripts/check-motion.mjs)
- Rule 9, `filter-motion`, fails any transition of `filter`, `backdrop-filter` or `-webkit-backdrop-filter`, and any `@keyframes` that animates one. Its message: "Linux WebKit crashes on it; drive a blur per frame with blurIn (motion.ts)". A constant backdrop blur is allowed. — [check-motion.mjs](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/tokens/scripts/check-motion.mjs)
- `LOOP_ALLOW` has 8 entries: Spinner, Skeleton, indeterminate Progress, the BusyRegion bar, Button loading, SaveStatus saving, a running Flow node and the ProseMirror gap cursor. "motion-allow does not exempt this rule". — [check-motion.mjs](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/tokens/scripts/check-motion.mjs)
- The TS check: a `transition`/`animation` string with a literal time in `packages/react/src` fails. "motion belongs in the stylesheets, on tokens". — [check-motion.mjs](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/tokens/scripts/check-motion.mjs)
- The escape hatch is a `motion-allow: <reason>` comment directly before a declaration. Four are in use:
  - the drawer's accelerating exit (operator choice, 2026-11-08), at `drawer.css:19`;
  - the sidebar group height animation via `grid-template-rows` (operator choice, 2026-11-08), at `sidebar.css:155`;
  - two in the global reduced-motion guard.
  - — [drawer.css](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/tokens/styles/components/drawer.css); [sidebar.css](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/tokens/styles/components/sidebar.css); [motion.css](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/tokens/styles/motion.css)
- A browser-level gate also exists: `tests/a11y/motion-policy.spec.mjs` "checks the reduced-motion behaviour and the instant surfaces in a real browser". There are also `motion-glide.spec.mjs` and `feedback-kit.spec.mjs`. — [docs.js](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/tokens/docs/docs.js); file list via `git ls-tree origin/master tests/a11y`

**Reduced-motion policy:**
- The policy is unlayered. Under `prefers-reduced-motion: reduce`, every element's `transition-property` is forced to opacity/colour/visibility/overlay/display only, `animation-duration` becomes `.001ms`, the iteration count becomes 1 and `scroll-behavior` becomes auto. — [motion.css](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/tokens/styles/motion.css)
- The same block is mirrored for `:root[data-motion="reduce"]` (the in-app preference, HAR-1372). — [motion.css](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/tokens/styles/motion.css)
- Loaders opt back in with a layered `!important` `uix-pulse` opacity breath (`--uix-loop-pulse`). — [motion.css](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/tokens/styles/motion.css)
- JS-driven motion reads `useReducedMotion()` / `prefersReducedMotion()`, which honour both the OS setting and `data-motion`. — [useReducedMotion.ts](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/react/src/hooks/useReducedMotion.ts)
- ECharts gets `animation: false` under reduced motion. — [ChartCore.tsx](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/react/src/components/ChartCore.tsx)

**Instant surfaces:**
- `[data-uix-instant]` and `[data-uix-key-opened]` (and their `::backdrop`) get `transition: none; animation: none`. — [motion.css](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/tokens/styles/motion.css)
- `watchInputModality()` tracks keydown versus pointerdown in the capture phase. `markKeyOpened()` sets the attribute on Modal, Drawer, Peek, Popover, Menu and Select. — [motion.ts](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/react/src/motion.ts)
- 2.60 exception: keyboard opens of Select, Menu and a sidebar group do animate (operator decision). — [docs.js](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/tokens/docs/docs.js)

**Docs contract (Foundations → Motion):**
- Every animation must answer one of four questions: "Did it register? / Is it working? / Did it work? / What changed, and where did it go?". "'It looks nicer' is never a purpose on a surface used daily." — [docs.js](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/tokens/docs/docs.js)
- **Frequency budget:**
  - keyboard-initiated or 100+ times a day: instant;
  - tens of times a day: ≤150ms, state feedback only, no travel;
  - occasional: 150–250ms enter;
  - rare: a modest delight, never repeated.
  - — [docs.js](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/tokens/docs/docs.js)
- **Latency ladder:**
  - ≤100ms: acknowledge;
  - 100–300ms: show nothing new;
  - >300ms: pending indicator, held ≥500ms;
  - >1s: say what is happening;
  - >10s: determinate progress and a way out;
  - interactive responses target ≤400ms at p75.
  - — [docs.js](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/tokens/docs/docs.js)
- **Mechanics:**
  - tokens only;
  - enter with a strong ease-out;
  - exits faster, never ease-in, except the operator's 2.60 animate-ui picks;
  - transform/opacity only;
  - interruptible: transitions or `@starting-style` rather than restarting keyframes;
  - "Nothing animates on a page's first render";
  - popovers, menus and tooltips grow from the trigger, from scale(.95) or (.9), "never scale(0)";
  - "No bounce in staff UI".
  - — [docs.js](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/tokens/docs/docs.js)
- **Rules for apps:**
  - "Arrive, respond and settle… A refresh never replays the arrival. Reduced motion is a fade of 200 ms or less. No pulsing, shaking, looping or overshoot on data or status… A state of unknown duration shows text."
  - The gate table maps "No loop outside a loader" to `loop-not-loading`.
  - — [Docs/design-system.md](https://github.com/COx-ORG-H/UIx/blob/51461e51/Docs/design-system.md)

**Lessons (LESSONS_LEARNED.md, 2026-11-08 and 2026-10-23 entries):**
- "never animate `filter` or `backdrop-filter` with CSS… A blur that clears is written per frame from script (`motion.ts` `blurIn`…)". — [LESSONS_LEARNED.md](https://github.com/COx-ORG-H/UIx/blob/51461e51/LESSONS_LEARNED.md)
- Transient motion inside a scroll container must not create scrollable overflow; clip it. A top-layer popover counts, because the UA gives it `overflow: auto`. — [LESSONS_LEARNED.md](https://github.com/COx-ORG-H/UIx/blob/51461e51/LESSONS_LEARNED.md)
- Motion tests assert on frames recorded with `requestAnimationFrame`, never on one sample taken after a sleep. — [LESSONS_LEARNED.md](https://github.com/COx-ORG-H/UIx/blob/51461e51/LESSONS_LEARNED.md)
- One-shot attribute animations must never resolve to `animation: none`, or `animationend` never fires. — [LESSONS_LEARNED.md](https://github.com/COx-ORG-H/UIx/blob/51461e51/LESSONS_LEARNED.md)
- Decorative motion elements added to shipped components go last, or in a pseudo-element. — [LESSONS_LEARNED.md](https://github.com/COx-ORG-H/UIx/blob/51461e51/LESSONS_LEARNED.md)
- Removing an enter animation exposes state races; key handlers must also read `:popover-open`. — [LESSONS_LEARNED.md](https://github.com/COx-ORG-H/UIx/blob/51461e51/LESSONS_LEARNED.md)
- Every reader of the in-app motion choice must use `prefersReducedMotion()` or a CSS mirror. — [LESSONS_LEARNED.md](https://github.com/COx-ORG-H/UIx/blob/51461e51/LESSONS_LEARNED.md)
- A subject-less `:has()` made WebKit restyle the page on every DOM change, so glide hosts are named. — [motion.css](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/tokens/styles/motion.css)

**Workspace doctrine (portfolio level):**
- The rule "Design the transition, not the frame": the frequency budget, the latency ladder, keep previous data, three cues for an in-place change, exits faster, transform/opacity only, reduced motion keeps meaning. "Motion taste… is shown as a recording or frame pair and asked". — [E:/Development/Docs/lessons/12-ui-design-systems-a11y.md line 34](file:///E:/Development/Docs/lessons/12-ui-design-systems-a11y.md)
- The portfolio hook text also gives concrete numbers ("press scales to 0.97, menus grow from the trigger in 140 ms and close in 80 ms… a dialog opens over a blurred backdrop in 160 ms"). Some of these differ from the shipped 2.60 tokens (menu 220ms both ways). — workspace guidance injected by hook (source: workspace lessons/ADR-0028 machinery); compare [effect.json](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/tokens/tokens/base/effect.json)

### Inferences
- Any new phone-style pattern must pass all nine gate rules. In practice that means:
  - no animated blur in CSS (use `blurIn`);
  - no height or width animation (the sidebar and drawer exceptions needed operator sign-off);
  - no overshoot on data or status;
  - no loops except loaders;
  - hover motion gated to fine pointers;
  - a reduced-motion branch for anything that moves.
- The "No bounce in staff UI" line conflicts with the shipped `ease-bounce` radio dot (11.6% overshoot). The tokens limit springs to "controls only", so the effective rule is "no overshoot on data/status; small overshoot on controls by operator choice". A report should treat bounce/overshoot as operator-decided, not open.
- The docs "Properties" line says "Animate transform and opacity (and filter / clip-path when needed)". That now contradicts the `filter-motion` gate for CSS. Filter is allowed only via script.

### Gaps
- I did not read `tests/a11y/motion-policy.spec.mjs` itself. Its coverage is cited from the docs page.
- The TENSOR plan `Docs/plans/2026-10-22-motion-and-micro-interactions.md` (the "motion standard §2.x" that the CSS comments cite) lives in the TENSOR repo and was not read.

## 3. Which components animate, and how (CSS transitions, WAAPI, View Transitions, JS libraries)

### Takeaway
Nearly all motion is native CSS: transitions, `@starting-style` with `transition-behavior: allow-discrete` for top-layer `<dialog>`/popover enter and exit, and `@keyframes` for one-shots. A small amount of JS sits on top: requestAnimationFrame blur, FLIP via measured boxes, one WAAPI call, and pointer-event swipe physics. There is no animation library (no framer-motion, react-spring, GSAP or auto-animate). There are no View Transitions and no scroll-driven animations.

### Cited Findings
**Dependencies and API usage:**
- `@tensor_1/react@2.70.0`'s peer and dev dependencies have no animation library. The list is tiptap, echarts, marked, emojibase, react and react-dom. — [packages/react/package.json](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/react/package.json)
- A grep of `packages/react/src` and `packages/tokens/styles` on origin/master found:
  - 0 hits for `startViewTransition`/`view-transition`;
  - 0 for `animation-timeline`/`scroll-timeline`/`view-timeline`;
  - 0 for `interpolate-size`/`calc-size`;
  - 0 for `navigator.vibrate`;
  - 0 for framer/react-spring/gsap;
  - 1 file with `.animate(` (Toast);
  - 20 `@starting-style` occurrences across card, drawer, modal, popover, search-suggest, select, table, toast, tooltip and motion.
  - — grep over [packages/react/src](https://github.com/COx-ORG-H/UIx/tree/51461e51/packages/react/src) and [packages/tokens/styles](https://github.com/COx-ORG-H/UIx/tree/51461e51/packages/tokens/styles)
- A 2026-06-15 plan once listed the "View Transitions API" in the tech stack and as a kanban reorder fallback, but nothing shipped. — [Docs/plans/2026-06-15-uix-styleguide-implementation.md](https://github.com/COx-ORG-H/UIx/blob/51461e51/Docs/plans/2026-06-15-uix-styleguide-implementation.md)

**Overlays:**
- **Dialog:** a native `<dialog>` that enters with opacity plus `translateY(8px) scale(.98)` through `@starting-style`. It opens at `--uix-dur-slow` and closes at `--uix-dur-exit-slow`. The `::backdrop` scrim fades over `--uix-dur-overlay` 400ms on `ease-soft` with a constant `backdrop-filter: blur(var(--uix-scrim-blur))`, and only the opacity animates. — [modal.css](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/tokens/styles/components/modal.css)
- **Drawer and Peek:**
  - Since 2.68 (HAR-4659) the Peek shares the drawer frame: it floats `--uix-drawer-gap` in from the edges.
  - It slides in on `ease-drawer` over 400ms with a 1% overshoot and out on `ease-in` over 160ms (motion-allow).
  - The scrim works as on the dialog.
  - A `side="bottom"` bottom sheet is capped at 85dvh, pads for `env(safe-area-inset-bottom)` and is dragged by its header (`touch-action: none`).
  - — [drawer.css](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/tokens/styles/components/drawer.css); [react CHANGELOG 2.68.0](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/react/CHANGELOG.md)
- **Drawer swipe to dismiss (2.60):**
  - Touch or pen only (`pointerType === 'mouse'` is ignored).
  - `SWIPE_SLOP` 6px, `SWIPE_VELOCITY` 0.11 px/ms measured over a `SWIPE_WINDOW` of 100ms.
  - It closes past a third of the panel or on a fling.
  - The scrim lightens with travel through `--uix-drawer-swipe`.
  - With unsaved changes it settles back and asks.
  - — [Drawer.tsx](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/react/src/components/Drawer.tsx); [docs.js](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/tokens/docs/docs.js)
- **Popover:** the Popover API with `@starting-style`, opacity plus `scale(.95)` from the trigger via an anchor origin. Enter `dur-fast`, exit `dur-exit-fast`. — [popover.css](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/tokens/styles/components/popover.css)
- **Menu and Select list:** they grow from scale(.9) over `dur-menu` 220ms on `ease-soft`, both ways. — [menu.css](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/tokens/styles/components/menu.css)
- **Row arrival in Menu and Select:** rows arrive in a stagger (`--uix-row-i` × 33ms, capped at the 10th) with `uix-row-in` (8px from the inline end, mirrored in RTL) and `uix-fade-in`. The blur clears in script (`useArrivalBlur`). — [motion.css](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/tokens/styles/motion.css)
- **Glide highlight:** one shared hover-highlight layer (`.uix-glide`, `useHoverGlide`) in Sidebar, Menu and Select, moved by transform/scale on `ease-glide`. It is hidden in forced-colors mode. — [motion.css](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/tokens/styles/motion.css); usage via grep of [Menu.tsx/Select.tsx/Sidebar.tsx](https://github.com/COx-ORG-H/UIx/tree/51461e51/packages/react/src/components)
- **Tooltip:**
  - It grows from scale(.7) on the tooltip spring.
  - In a delay group the bubble travels to the neighbour and morphs size through `--uix-morph-sx/sy` FLIP scaling.
  - The labels swap with `uix-swap-in`/`uix-swap-out` along the travel axis, clipped with `clip-path`, while the blur clears in script.
  - Hover-only `[data-uix-tip]` CSS tips are gated to fine pointers.
  - — [tooltip.css](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/tokens/styles/components/tooltip.css)
- **Toast:**
  - It enters from the edge via `@starting-style` (16px translate) at `dur-slow` and exits at `dur-exit`.
  - It has horizontal swipe to dismiss with the same 6px, 0.11 px/ms and 100ms constants.
  - The stack reflows with a WAAPI FLIP: `el.animate([{transform:translateY(Δ)},{transform:0}], {duration: tokenMs('--uix-dur'), easing: --uix-ease-out, composite:'add'})`.
  - — [toast.css](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/tokens/styles/components/toast.css); [Toast.tsx](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/react/src/components/Toast.tsx)

**Controls:**
- **Button:**
  - Press is `.uix-btn:active { transform: scale(.97) }`, cancelled when disabled.
  - The loading spinner is an `::after` that pulses under reduced motion.
  - The result state crossfades the label and result faces (`.uix-btn__face[data-result]`) using exit-fast out and dur in.
  - The result types are `ButtonResult` and `DEFAULT_BUTTON_RESULT_LABELS`.
  - — [button.css](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/tokens/styles/components/button.css); [index.ts](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/react/src/index.ts)
- **Switch:** the thumb `translateX(16px)` on `dur`/`ease-out`, the track colour on `dur`. No spring and no squish. — [switch.css](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/tokens/styles/components/switch.css)
- **Checkbox (2.60):** the fill grows from .7 on `ease-fill` over 300ms, then the tick draws (`stroke-dashoffset`) after a 200ms delay. — [checkbox.css](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/tokens/styles/components/checkbox.css)
- **Radio:** the dot springs from scale(0) on `ease-bounce`. — [radio.css](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/tokens/styles/components/radio.css)

**Indicators and disclosure:**
- **Tabs, Segmented and Sidebar current page:** `useSlidingIndicator` (FLIP on a measured box). It slides on `dur`/`ease-in-out` when the last input was a pointer and jumps after a key press or under reduced motion. The indicator span is the last child. — [useSlidingIndicator.ts](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/react/src/hooks/useSlidingIndicator.ts); [tabs.css](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/tokens/styles/components/tabs.css); [segmented.css](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/tokens/styles/components/segmented.css)
- **CollapsibleSection (accordion):**
  - It transitions `::details-content` opacity plus a 4px `translate`.
  - Height never animates: "what follows moves at once and the eye follows the fade".
  - Keyboard opens are instant.
  - Browsers without `::details-content` simply open.
  - The sidebar group is the one height animation (`grid-template-rows` 0fr↔1fr over 350ms, motion-allow).
  - — [card.css](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/tokens/styles/components/card.css); [sidebar.css](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/tokens/styles/components/sidebar.css)

**Loading, feedback and numbers:**
- **Skeleton and loading:**
  - The skeleton shimmer (`background-position`, `loop-shimmer`) pulses under reduced motion.
  - BusyRegion keeps content at opacity .8 under a sweeping top bar.
  - `SuccessState` scales a disc from .85 and draws a check once.
  - — [states.css](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/tokens/styles/components/states.css); [busy-region.css](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/tokens/styles/components/busy-region.css)
- **Feedback kit (WP2, HAR-2579):** exports `useDelayedPending`, `useChangeHighlight`/`flashChanged`, `useOptimisticValue`, `useSlidingIndicator`, `BusyRegion`, `ChangeHighlight`, `Count`, `Arrive`/`ArriveItem`/`useArrive`, `MotionList`, `SuccessState` and Button result. — [index.ts](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/react/src/index.ts)
- **Count:** "a number that ticks once when it changes". A 4px translate plus fade, direction-aware (up or down), with tabular figures. It counts up from zero only during an `Arrive` stage (600ms). "No tweened numbers in dense tables". — [count.css](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/tokens/styles/components/count.css); [Count.tsx](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/react/src/components/Count.tsx)
- **ChangeHighlight:** a tint held, then faded (`uix-changed`, about 1.2–1.3s). It becomes a steady outline under reduced motion or forced colours. — [change-highlight.css](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/tokens/styles/components/change-highlight.css)
- **Arrival (`.uix-arrival`):** an outline tint for a landing target, held for 2400ms. — [arrival.css](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/tokens/styles/components/arrival.css)

**Lists, drag and reorder:**
- **MotionList:** enter translateY(space-2) plus fade, exit scale(.98) plus fade, move by FLIP transform on `dur-slow`/`ease-in-out`. DataWorkspace exposes `rowMotion`. — [list-motion.css](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/tokens/styles/components/list-motion.css); [DataWorkspace.tsx](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/react/src/components/DataWorkspace.tsx)
- **Drag (HAR-2590):** a shared `drag.css` with lift on grab and drop line/target. On release a `uix-drag-settle` keyframe runs from scale(1.02). Keyboard grab comes from `useKeyboardGrab`. DashboardCanvas lifts a moved widget. — [drag.css](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/tokens/styles/components/drag.css); [dashboard-canvas.css](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/tokens/styles/components/dashboard-canvas.css)
- **SortableList, SavedViewMenu and ViewMenu reorder:** "The dragged row lifts and its neighbours make room by reordering, frame by frame: no motion of its own". The dragged row is at opacity .55, and the grips idle at opacity .75. — [sortable-list.css](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/tokens/styles/components/sortable-list.css); [view-menu.css](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/tokens/styles/components/view-menu.css)

**Charts and other motion:**
- **Charts and Sparkline:** `Arrive` drives a first-paint fade plus an 8px rise per card with a 45ms stagger. Lines trace in (`stroke-dashoffset`) over 700ms and bars grow (`scaleX`) over 500ms, in GlanceCharts and GlanceMarks through tokenMs. Charts "settle at rest for good" after the draw-in. — [arrive.css](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/tokens/styles/components/arrive.css); [GlanceCharts.tsx](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/react/src/components/GlanceCharts.tsx)
- **2.70 Sparkline (HAR-2880):** adds gaps, target, threshold and value text. No new motion was evident in the changelog. — [react CHANGELOG](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/react/CHANGELOG.md)
- **Animated icons (2.60, `animate` prop):** nudge, turn, swing, lid, pop and bump keyframes play once on hover of the parent control, with draw-in for a check. They are hover-only (no keyboard or touch), off by default, and "never on rows people pass a hundred times a day". — [icon.css](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/tokens/styles/components/icon.css); [docs.js](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/tokens/docs/docs.js)
- **Step entrance** (`.uix-anim-step-forward/-back`): a 24px directional slide, mirrored in RTL. **Hover lift** (`.uix-lift-hover`): fine pointers only, with the shadow stepping rather than animating. — [motion.css](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/tokens/styles/motion.css)
- **Studied and rejected on purpose (2.60):** "a sliding pagination pill… a tilting alert dialog… a long count-up spring… a collapsed toast deck… and any visible bounce on something crossing the screen." — [docs.js](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/tokens/docs/docs.js)

### Inferences
- UIx is already "native-app-like" for a desktop web kit: spring curves, shared-element-style glides, staggered list arrival, directional value swaps, swipe-to-dismiss on drawers and toasts, and a bottom sheet. Recommendations that just restate these would not be new.
- **Absent mechanisms,** the likely areas for new work:
  - the View Transitions API (route and page transitions, shared-element morphs between list and detail, for example a table row → Peek);
  - scroll-driven animations (collapsing headers, scroll-linked progress);
  - velocity-carrying springs or interruptible physics for drags;
  - rubber-band or overscroll resistance;
  - snap points or detents on the bottom sheet (only open/closed today);
  - long-press or context-menu gestures;
  - pull-to-refresh;
  - a press "squish" on the switch;
  - pinch and zoom, which belongs to the separate "Canvases" contract in `design-system.md` (not inspected in depth).
- **Plug-in points for new motion:**
  - `effect.json` for tokens;
  - `motion.css` for shared keyframes, helpers and policy;
  - `motion.ts` for the script-side helpers (`blurIn`, `tokenEase`, input modality);
  - `useReducedMotion`;
  - the swipe hooks (`useDrawerSwipe` in Drawer.tsx and `useSwipeToDismiss` in Toast.tsx, which duplicate their constants: a candidate shared gesture hook);
  - `useSlidingIndicator` and `useHoverGlide` for glides;
  - `MotionList` for list FLIP;
  - `drag.css` for drag;
  - `check-motion` `LOOP_ALLOW` and its rules for the gate.

### Gaps
- I did not read Kanban, DashboardCanvas or SortableList TSX in depth (pointer versus HTML5 drag, autoscroll).
- I did not read Select's value-swap code or SearchSuggest motion in detail.
- The `Canvases` interaction contract (pan, zoom, fit) was only noticed, not inventoried.

## 4. Glass, blur, translucency, corner and shape tokens, haptics, reduced transparency and contrast

### Takeaway
UIx's only "glass" is a constant 4px backdrop blur behind the modal and drawer scrims, plus a 2px blur behind the spinner overlay. There are no translucent material surfaces. Corners are a plain six-step radius scale with no squircle or `corner-shape`. There are no haptics. Contrast and forced colours are handled; `prefers-reduced-transparency` is not.

### Cited Findings
- **Scrim blur:** `backdrop-filter: blur(var(--uix-scrim-blur))` on the modal and drawer `::backdrop`, 4px. "The radius is constant and only the scrim's opacity animates (an animated radius re-renders a full-page blur every frame and starves software rendering, e.g. VDI desktops without a GPU)." — [effect.json](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/tokens/tokens/base/effect.json); [modal.css](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/tokens/styles/components/modal.css); [drawer.css](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/tokens/styles/components/drawer.css)
- **Spinner overlay:** `background: color-mix(in srgb, var(--uix-bg-app) 60%, transparent); backdrop-filter: blur(2px)`. — [spinner.css](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/tokens/styles/components/spinner.css)
- **Script blur:** `blurIn` writes `filter: blur()` per frame for arriving rows and swapping tooltip labels. It stops at once if reduced motion turns on mid-run. — [motion.ts](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/react/src/motion.ts)
- **Radius scale:** `radius-xs` 4px, `sm` 8px, `md` 12px, `lg` 16px, `xl` 24px ("hero cards, sheets, large dialogs"), `pill` 999px. — [size.json](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/tokens/tokens/base/size.json)
- **No squircle:** 0 hits for `squircle`, `corner-shape` or `superellipse`. — grep over [packages/tokens/styles](https://github.com/COx-ORG-H/UIx/tree/51461e51/packages/tokens/styles)
- **Shadows:** `shadow-sm/md/popover/overlay`. Dark mode adds an inset top highlight, `inset 0 1px 0 rgba(255,255,255,.04–.07)`, a subtle "lit edge". — [dark/effect.json](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/tokens/tokens/dark/effect.json)
- **Haptics:** 0 hits for `navigator.vibrate`. — grep over [packages/react/src](https://github.com/COx-ORG-H/UIx/tree/51461e51/packages/react/src)
- **Display preferences:**
  - Contrast is a DisplayPreferences axis: `contrast: 'standard' | 'more' | 'system'`, where system reads `(prefers-contrast: more)` and writes `data-contrast="more"`.
  - Motion is a parallel axis (`data-motion`).
  - Text scale and density are the other axes.
  - — [display-preferences-model.ts](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/react/src/display-preferences-model.ts)
- **Not handled:** 0 hits for `prefers-reduced-transparency`. — grep over [packages/tokens/styles](https://github.com/COx-ORG-H/UIx/tree/51461e51/packages/tokens/styles) and [packages/react/src](https://github.com/COx-ORG-H/UIx/tree/51461e51/packages/react/src)
- **Forced colours:** handled in about 36 places. For example, the glide layer is `display:none` and ChangeHighlight becomes an outline. — [motion.css](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/tokens/styles/motion.css); [change-highlight.css](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/tokens/styles/components/change-highlight.css)
- **Coarse pointers:** `pointer: coarse`/`any-pointer` appears in only 3 stylesheets (kbd, org-chart, scheduling-calendar). Hover motion is gated with `(hover: hover) and (pointer: fine)` by the gate. — grep over [packages/tokens/styles](https://github.com/COx-ORG-H/UIx/tree/51461e51/packages/tokens/styles); [check-motion.mjs](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/tokens/scripts/check-motion.mjs)
- **Touch targets:** 2.69 made the kit's small controls 24px targets (HAR-3215). — `git log origin/master` commit `2b03911b`

### Inferences
- **Translucent materials** (iOS-style glass, Android-style blur on bars or sheets) would be new. They would need:
  - a constant (not animated) `backdrop-filter`, per the gate;
  - a fallback under `prefers-reduced-transparency: reduce`, `data-contrast="more"` and `forced-colors`;
  - a performance budget for VDI/no-GPU desktops, which the scrim token already cites as a constraint.
- **Continuous corners** (squircle via `corner-shape: superellipse()`) would be a new token axis on the existing radius scale. Browser support is a gap to verify.
- **Haptics** (`navigator.vibrate`) are absent. They would matter only for touch consumers (POSx and MOTUS staff on tablets or phones). The web Vibration API is not available on iOS Safari (not verified here).

### Gaps
- I did not check whether `data-contrast="more"` removes the scrim blur or changes the scrim opacity.
- Browser support for `corner-shape` and `prefers-reduced-transparency` was not researched; this was a codebase-only task.

## 5. Documented gaps, roadmap items and pending motion references

### Takeaway
No motion work is open: there are no open PRs, and the WP1 and WP2 trackers are Done per the memory notes. There are known loose ends:
- the documentation is stale (the "coming" labels and the "Planned" roadmap table);
- the feedback-timing tokens are not adopted by the JS;
- `blurIn` and other script motion may not reach the itsmx-mobile token sync;
- TENSOR adoption of 2.46–2.60 motion is pending.

### Cited Findings
- **Stale "coming" labels:** the docs "Which motion for which state change" table still marks as `coming`:
  - the delayed-pending hook;
  - the Button success/error state;
  - BusyRegion/DataTable refreshing;
  - list FLIP;
  - Count;
  - the CollapsibleSection expand and sliding tab indicator;
  - drag;
  - SuccessState.

  All of these are exported from `index.ts` at 2.70.0. `docs.test.js` only asserts that ChangeHighlight is not marked coming. — [docs.js](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/tokens/docs/docs.js); [docs.test.js](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/tokens/docs/docs.test.js); [index.ts](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/react/src/index.ts)
- **Stale roadmap table:** `Docs/component-roadmap.md` "Motion and feedback kit" still says "These primitives are **Planned** in work package 2". It lists the same eleven primitives with planned shapes, for example "Disclosure expand ≤ 200 ms… never height" and "Sliding tab indicator ≤ 200 ms". — [Docs/component-roadmap.md](https://github.com/COx-ORG-H/UIx/blob/51461e51/Docs/component-roadmap.md)
- **WP2 status:** shipped across 2.47.0 (A), 2.48.0 (B) and 2.49.0 (C+D). HAR-2579 and its children are Done. Open follow-up: "the kit still uses the JS constants in motion-timing.ts, so switching to the tokens is an open follow-up". This is confirmed in code: `useDelayedPending` imports `PENDING_DELAY_MS`. — memory note `feedback-kit-wp2-2-47-to-2-49.md` (hint); verified against [useDelayedPending.ts](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/react/src/hooks/useDelayedPending.ts)
- **2.60 operator decisions:**
  - keyboard opens of Select, Menu and a sidebar group animate;
  - the sidebar group height animates;
  - the sidebar width stays instant;
  - the dialog keeps its calm rise, with no animate-ui tilt;
  - exits follow animate-ui.

  The animate-ui licence (MIT + Commons Clause) forbids redistributing its components, so only behaviour and numbers were ported. — memory note `motion-glide-2-60-animate-ui.md` (hint); consistent with [docs.js](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/tokens/docs/docs.js) and [drawer.css](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/tokens/styles/components/drawer.css)
- **Lesson TODOs:** "⚠ TODO no lint for `toBeVisible` as an 'it stayed open' check" and "⚠ TODO no generic gate for other state-gated key handlers". — [LESSONS_LEARNED.md](https://github.com/COx-ORG-H/UIx/blob/51461e51/LESSONS_LEARNED.md)
- **Workspace gate status:** the workspace lesson's motion gate was "in progress, nothing blocks yet (2026-10-22)" for TENSOR lints (`local-motion`, `pending-state`, `keep-previous-data`), tracked by TENSOR#2560 §5. — [E:/Development/Docs/lessons/12-ui-design-systems-a11y.md](file:///E:/Development/Docs/lessons/12-ui-design-systems-a11y.md)
- **Recent branches:** remote branches since 2.60 (HAR-3093, HAR-2880, HAR-3090, HAR-3215/3209, HAR-4659) are nav, sparkline, toolbar, target-size and peek work. None is a new motion package. — `git for-each-ref refs/remotes/origin` on 2026-11-20

### Inferences
- A report proposing new motion should:
  - not re-propose the WP2 primitives;
  - flag the docs and roadmap staleness as a cheap cleanup;
  - note that new motion would be a new work package (WP3-style) with its own HAR parent, since none exists.

### Gaps
- Linear was not queried, so no live HAR status was checked. Statuses come from the memory notes and code.
- The TENSOR repo's pinned UIx version and adoption state were not checked here. The memory notes say TENSOR pinned 2.55.x as of 2026-11-06.

## 6. Who consumes UIx, and are they desktop-first enterprise SaaS?

### Takeaway
UIx (`@tensor_1/tokens`, `@tensor_1/react`) is the mandatory web UI layer for the house products. TENSOR is a multi-tenant ITSM + CMDB SaaS for EU SMBs, a desktop, keyboard-heavy operator tool and the main driver of the kit. MOTUS (a library system with a public portal), MEDx (clinic practice management), POSx (point of sale for FBiH merchants) and SHOPx (QR-receipt promo attribution) are also named consumers. Some of these imply touch or tablet use.
A separate React Native app, itsmx-mobile, reads UIx tokens through a sync script and understands only `cubic-bezier()` easings.

### Cited Findings
- `design-system.md`: "UIx is the **one** UI layer for the house products (**Tensor, POSx, SHOPx**)". — [Docs/design-system.md](https://github.com/COx-ORG-H/UIx/blob/51461e51/Docs/design-system.md)
- Workspace guidance: "Staff UI in TENSOR, MOTUS, MEDx, POSx and SHOPx is UIx only (workspace ADR-0038)". The same guidance says "Make the surface fully usable from the keyboard… on any screen an operator lives in all day". — [E:/Development/Docs/lessons/12-ui-design-systems-a11y.md](file:///E:/Development/Docs/lessons/12-ui-design-systems-a11y.md)
- **TENSOR:** "Multi-tenant SaaS ITSM + CMDB platform targeting EU SMBs" (Incident, Problem, Change, CMDB, SLA, audit log). — [E:/Development/Projects/TENSOR/README.md](file:///E:/Development/Projects/TENSOR/README.md)
- **MOTUS:** "Library management system + bilingual (bs/en) public portal: AI-assisted book intake… circulation with QR scanning". — [E:/Development/Projects/MOTUS/README.md](file:///E:/Development/Projects/MOTUS/README.md)
- **MEDx:** "practice-management SaaS for private clinics in Bosnia & Herzegovina… online booking, lightweight patient portal". — [E:/Development/Projects/MEDx/README.md](file:///E:/Development/Projects/MEDx/README.md)
- **POSx:** "POS core for FBiH merchants, fiscal-ready by design". — [E:/Development/Projects/POSx/README.md](file:///E:/Development/Projects/POSx/README.md)
- **SHOPx:** "QR-receipt promo attribution for BiH retail". — [E:/Development/Projects/SHOPx/README.md](file:///E:/Development/Projects/SHOPx/README.md)
- **itsmx-mobile:**
  - It is a "Device-first React Native (Expo) field companion for the ITSMx ITSM + CMDB platform".
  - Its `scripts/sync-uix-tokens.mjs` reads TENSOR's vendored `tokens.css` and parses only `cubic-bezier(...)` for `ease-*` tokens.
  - The committed generated file at HEAD (1901a29, 2026-09-08) is from UIx `2.5.0`.
  - The memory note says a parser fix for the `linear()` springs was in flight (its PR #125). That claim is unverified.
  - — [E:/Development/Projects/itsmx-mobile/README.md](file:///E:/Development/Projects/itsmx-mobile/README.md); `git show HEAD:scripts/sync-uix-tokens.mjs` and `HEAD:packages/ui/src/generated/uix-tokens.ts` in itsmx-mobile
- **Evidence the kit is desktop-first but phone-aware:**
  - hover motion only on fine pointers;
  - VDI/no-GPU performance is cited as a constraint (scrim blur);
  - `DataWorkspace` has a `mobile` ladder prop;
  - there are phone layouts for SortableList ("On a phone Move up stacks over Move down");
  - the drawer bottom sheet pads for safe areas;
  - drawer and toast swipes are touch or pen only.
  - — [effect.json](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/tokens/tokens/base/effect.json); [DataWorkspace.tsx](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/react/src/components/DataWorkspace.tsx); [sortable-list.css](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/tokens/styles/components/sortable-list.css); [drawer.css](https://github.com/COx-ORG-H/UIx/blob/51461e51/packages/tokens/styles/components/drawer.css)

### Inferences
- **What carries over from phone patterns:** the primary consumer is a desktop, keyboard-first enterprise operator tool. The frequency budget makes high-frequency and keyboard actions instant. So phone-OS motion that relies on travel, overshoot or ambient polish would mostly be rejected for TENSOR staff screens. The patterns most likely to carry over:
  - spatial continuity (shared-element list → detail, which suits the Peek);
  - interruptible, velocity-aware gestures for touch consumers (POSx and MOTUS on tablets);
  - sheet detents;
  - reduced-transparency and contrast-aware materials;
  - "settle" feedback.
- **Phone patterns in their real form:** they belong in itsmx-mobile (React Native), which is outside the UIx web kit. Its token sync would also need to understand any new `linear()` spring tokens.

### Gaps
- I did not verify which consumers actually run on touch hardware (POSx terminals, MOTUS circulation desks) or what UIx version each pins today.
- I did not verify whether MEDx's and MOTUS's public portals (patient booking, catalog) use UIx or only their staff UI does. ADR-0038 as quoted scopes UIx to "Staff UI".
