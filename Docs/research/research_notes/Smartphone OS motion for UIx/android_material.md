# Android / Pixel motion, shape, color and micro-interactions (Material 3 Expressive → Android 17 QPR2), as of 2026-11-20

Scope note: notes for a web design-system team (React + CSS, enterprise SaaS). Numbers marked "source:" come from AOSP Jetpack Compose Material3 token/source files on android.googlesource.com (androidx-main), which are the most reliable public spec values because m3.material.io is client-rendered and could not be fetched as text. Release labels: **A16** = Android 16 (2025), **A16 QPR1** = Sept 2025 Pixel Drop, **A16 QPR2** = Dec 2025, **A17** = June 2026, **A17 QPR1** = Sept 2026, **A17 QPR2** = Nov 2026. "UNVERIFIED" marks items with only secondary or snippet-level support.

## 1. What is shipping now, and what Android 17 and recent Pixel Drops added on top of Android 16's Material 3 Expressive

### Takeaway
As of 2026-11-20 the newest shipping Pixel build is **Android 17 QPR2**, released 2026-11-10 alongside the November 2026 Pixel Drop. Material 3 Expressive (M3E) first shipped to Pixels in **A16 QPR1 (Sept 2025)**. Android 17 made it platform-wide and then refined it: more blur, bouncier Quick Settings, predictive back in Quick Settings, a slide-in lock-screen media player and redrawn icons in A17 QPR1, then user-picked custom accent colours with four intensity styles in A17 QPR2. Android 17 did not introduce a new motion system. It extended M3E's spring physics to more surfaces.

### Cited Findings
**Timeline**
- M3E was announced 2025-05-13 for Android 16 and Wear OS 6, with Pixel availability "later this year" — [blog.google](https://blog.google/products/android/material-3-expressive-android-wearos-launch/)
- A16 QPR1, the first Pixel release with M3E, reached Pixels in early September 2025 (the 9to5Google article is dated 2025-09-03) with the September Pixel Drop, for Pixel 6 and newer — [9to5Google](https://9to5google.com/2025/09/03/android-16-qpr1-pixel/)
- A16 QPR2 shipped 2025-12-02. It brought lock-screen widgets to phones, an expanded dark theme, custom icon shapes and forced icon theming, and a tabbed widget panel. Source is search-result summaries; the article itself was not fetched — [9to5Google](https://9to5google.com/2025/12/02/android-16-qpr2-pixel/), [Android Authority](https://www.androidauthority.com/android-16-qpr2-features-3621204/)
- **Android 17 stable rolled out 2026-06-16 to Pixel 6 and later**, with the June 2026 Pixel Drop. Android Authority describes it as bringing "platform-wide Material 3 Expressive changes" that Pixels had previously received through Android 16 QPR releases — [Android Authority](https://www.androidauthority.com/android-17-stable-rollout-features-3675016/). A search-result summary also mentioned a "June 25" date; the Android Authority article itself says June 16.
- **Android 17 UI additions:**
  - **App Bubbles:** long-press an app icon to open a floating window; a bubble bar appears in the taskbar on large screens.
  - **Expanded Dark Theme:** the system inverts apps that still look light, with per-app exclusions.
  - **Pixel Launcher:** option to hide app names on the home screen.
  - **Location dialog:** redesigned so "Precise" and "Approximate" look clearly different.
  - **Live Updates:** completed.
  - **Volume:** a separate Assistant volume slider.
  - **Privacy:** a persistent indicator appears when a non-system app accesses location.

  Source: [Android Authority](https://www.androidauthority.com/android-17-stable-rollout-features-3675016/)
- **A17 QPR1 shipped 2026-09-15** with the September 2026 Pixel Drop, for Pixel 6 and newer:
  - **Quick Settings motion:** tiles overshoot and ease back into place in response to swipe speed, and QS animations have "more bounce" overall.
  - **QS predictive back:** a back swipe previews the destination.
  - **Lock-screen media player:** slides up into view on power press or tap instead of appearing static.
  - **Blur:** stronger, more opaque system blur in the app drawer, volume sidebar, power menu and app pop-ups ("not fully frosted").
  - **Notification dots:** gained a Dynamic Color outline.
  - **Icons:** default system app icons were redrawn.
  - **Settings:** section titles got more spacing.

  Source: [9to5Google](https://9to5google.com/2026/09/15/every-single-new-feature-in-android-17-qpr1-video/)
- QS bounce origin: in A17 QPR1 Beta 3 (May 2026), pulling down Quick Settings gained the bouncy animation the notification shade already had. Contents follow the "inertia of your swipe," overshoot slightly and settle — [9to5Google](https://9to5google.com/2026/05/19/android-17-qpr1-beta-3-has-a-bouncy-new-animation-for-quick-settings-video/)
- Blur history in the A17 betas: blur first appeared visibly in Android 17 Beta 3. The widget picker gained a real-time blur background, and app-launch transitions blur the wallpaper as the app opens; previously the wallpaper stayed static. Volume, power menu and launcher-menu blur appeared first in Canary 2605 — [Gadget Hacks](https://android.gadgethacks.com/news/android-17-blurry-aesthetic-explained-beta-changes-and-open-questions/)
- **A17 QPR2 shipped 2026-11-10**, about a month early:
  - **Custom colours:** a "rainbow hue slider" picks any system accent colour, with four intensity styles (Neutral, Soft, Bright, Bold).
  - **Wallpapers:** compatible collections switch between light and dark versions with the system theme.
  - **Status bar:** a settings page chooses all, priority or no notification icons, and individual indicators can be hidden.
  - **Quick Settings:** brightness can be adjusted even when an app has locked it to maximum, and there is a new Auracast Voice Broadcast tile.
  - **Large screens:** a window handle at the top of apps switches between full-screen, split and bubble.
  - **Keyboard:** keyboard vibration is customisable.

  Source: [Beebom](https://gadgets.beebom.com/news/android-17-qpr2-stable-update-pixel-phones-features)
- November 2026 Pixel Drop (2026-11-10). It is mostly AI features. The UI-relevant ones:
  - Gemini-generated custom widgets made from a natural-language prompt (Pixel 10 and 11).
  - "Custom icon styles" applied across all home-screen icons (Pixel 6a and newer).
  - Rambler voice typing shows an "AI glow bar" above the keyboard.
  - HiLight glow for messages from favourite contacts on Pixel 11 Pro.

  Source: [blog.google](https://blog.google/products-and-platforms/devices/pixel/november-2026-pixel-drop/)
- One report says Android 17 brings "springier, more natural animations powered by physics-based motion," new icon shapes and blur. "Motion Assist" adds animated dots at the screen edges that move with vehicle motion, to reduce motion sickness. Its rollout is limited and not formally announced. UNVERIFIED: search snippets only — [Digital Trends](https://www.digitaltrends.com/phones/android-17-just-added-the-pixel-feature-my-motion-sick-self-has-been-waiting-for/), [TechRepublic](https://techrepublic.com/article/news-android-17-motion-assist-pixel-phones/)

### Inferences
- The 2026 trend is consolidation, not reinvention. Springs, blur and shape morph spread from the shade into Quick Settings, launcher, volume and power menu. Personalisation went deeper: an arbitrary hue slider with intensity styles in place of preset palettes. For a web design system, the transferable lessons are one spring vocabulary applied everywhere, and theming exposed as hue plus intensity rather than fixed themes.
- QPR2's "intensity styles" (Neutral, Soft, Bright, Bold) look like a user-facing control over chroma in the dynamic-color (HCT) pipeline. A web equivalent is a single `--accent-hue` plus a chroma or intensity token. This mapping is my inference, not documented.

### Gaps
- No Google primary source (an Android Developers blog or release notes) was found that lists Android 17 motion-specific changes with values. All Android 17 motion observations come from reviews.
- Android 17 "Gemini Intelligence" UI (glow and boot logo) and the Pixel 11 launch-day UI (around Aug 2026) were not researched in detail.
- Whether A17 QPR2's custom colours change the dynamic-color algorithm or just the seed hue is unknown.

## 2. The M3 Expressive motion physics system (motion schemes, spatial vs effects springs, published values)

### Takeaway
M3E replaces easing-plus-duration with **spring specs** organised as a "motion scheme." There are two schemes, **standard** and **expressive**. Each has six tokens: **{fast, default, slow} × {spatial, effects}**. *Spatial* springs drive position, size, shape and bounds. In the expressive scheme they are underdamped, so they overshoot. *Effects* springs drive color and opacity and are always critically damped (damping 1.0), so they never overshoot. The exact values are published in AOSP source (below) and can be ported to the web with a spring solver or a CSS `linear()` approximation.

### Cited Findings
- `MotionScheme` "provides all the FiniteAnimationSpecs for a MaterialTheme," with built-in `standard()` and `expressive()` schemes; added in Compose Material3 1.5.0 — [Android Developers: MotionScheme](https://developer.android.com/reference/kotlin/androidx/compose/material3/MotionScheme)
- Expressive is "Material's recommended motion scheme for prominent UI elements and hero interactions… a visually engaging motion feel." Standard is "for utilitarian UI elements and recurring interactions… a linear motion feel." — [MotionScheme reference](https://developer.android.com/reference/kotlin/androidx/compose/material3/MotionScheme)
- Spatial specs are "designed to be applied to animations that may change the shape or bounds of the component. For color or alpha animations use the effects equivalent which ensures a 'non-spatial' motion." Effects specs are for "animations that do not change the shape or bounds of the component. For example, color animation." — [MotionScheme reference](https://developer.android.com/reference/kotlin/androidx/compose/material3/MotionScheme)
- Token names: `DefaultSpatial`, `FastSpatial`, `SlowSpatial`, `DefaultEffects`, `FastEffects`, `SlowEffects` — [AOSP MotionSchemeKeyTokens.kt](https://android.googlesource.com/platform/frameworks/support/+/androidx-main/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/tokens/MotionSchemeKeyTokens.kt)
- **Expressive scheme values** (Compose `spring(dampingRatio, stiffness)`, mass 1) — [AOSP ExpressiveMotionTokens.kt](https://android.googlesource.com/platform/frameworks/support/+/androidx-main/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/tokens/ExpressiveMotionTokens.kt)

  | Token | Damping ratio | Stiffness |
  |---|---|---|
  | FastSpatial | 0.6 | 800 |
  | DefaultSpatial | 0.8 | 380 |
  | SlowSpatial | 0.8 | 200 |
  | FastEffects | 1.0 | 3800 |
  | DefaultEffects | 1.0 | 1600 |
  | SlowEffects | 1.0 | 800 |

- **Standard scheme values** — [AOSP StandardMotionTokens.kt](https://android.googlesource.com/platform/frameworks/support/+/androidx-main/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/tokens/StandardMotionTokens.kt)

  | Token | Damping ratio | Stiffness |
  |---|---|---|
  | FastSpatial | 0.9 | 1400 |
  | DefaultSpatial | 0.9 | 700 |
  | SlowSpatial | 0.9 | 300 |
  | FastEffects | 1.0 | 3800 |
  | DefaultEffects | 1.0 | 1600 |
  | SlowEffects | 1.0 | 800 |

- Effects tokens are identical across both schemes, so only spatial motion changes character between standard and expressive — same two sources as above.
- Legacy duration and easing tokens still exist and are still used inside some components. For example, the wavy progress indicator animates progress with `tween(DurationLong2, EasingLinear)`.
  - **Durations:** Short1–4 = 50/100/150/200 ms; Medium1–4 = 250/300/350/400; Long1–4 = 450/500/550/600; ExtraLong1–4 = 700/800/900/1000.
  - **Easings:**
    - `EasingEmphasizedCubicBezier` (0.2, 0, 0, 1)
    - `EasingEmphasizedDecelerate` (0.05, 0.7, 0.1, 1)
    - `EasingEmphasizedAccelerate` (0.3, 0, 0.8, 0.15)
    - `EasingStandard` (0.2, 0, 0, 1)
    - `EasingStandardDecelerate` (0, 0, 0, 1)
    - `EasingStandardAccelerate` (0.3, 0, 1, 1)
    - `EasingLegacy` (0.4, 0, 0.2, 1)

  Sources: [AOSP MotionTokens.kt](https://android.googlesource.com/platform/frameworks/support/+/androidx-main/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/tokens/MotionTokens.kt), [AOSP WavyProgressIndicator.kt](https://android.googlesource.com/platform/frameworks/support/+/androidx-main/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/WavyProgressIndicator.kt)
- Google's own sample app (Androidify) opts into `MaterialExpressiveTheme`, where `MotionScheme.expressive()` is the default, and pulls themed motion tokens "wherever possible" for consistency — [Android Developers Blog, May 2025](https://android-developers.googleblog.com/2025/05/androidify-building-delightful-ui-with-compose.html)
- Blog announcement framing: springy motion for dismissing apps in Recents, the volume slider, and notifications reacting to drag. The shade pull-down is animated and its background is blurred "to suggest depth" — [blog.google](https://blog.google/products/android/material-3-expressive-android-wearos-launch/)

### Inferences
These are my calculations from the published values, assuming mass = 1 and a 1% settle threshold. They are not Google-published durations.

| Spring | Approx. settle time | Peak overshoot |
|---|---|---|
| Expressive FastSpatial (ζ 0.6, k 800) | ~270 ms | ~9.5% |
| Expressive DefaultSpatial (ζ 0.8, k 380) | ~295 ms | ~1.5% |
| Expressive SlowSpatial (ζ 0.8, k 200) | ~405 ms | ~1.5% |
| Standard FastSpatial (ζ 0.9, k 1400) | ~140 ms | ~0.15% |
| Standard DefaultSpatial (ζ 0.9, k 700) | ~195 ms | ~0.15% |
| Standard SlowSpatial (ζ 0.9, k 300) | ~295 ms | ~0.15% |
| FastEffects (ζ 1.0, k 3800) | ~110 ms | none |
| DefaultEffects (ζ 1.0, k 1600) | ~165 ms | none |
| SlowEffects (ζ 1.0, k 800) | ~235 ms | none |

- Web port options:
  - **Option A:** generate CSS `linear(...)` easing strings by sampling the spring and pair each with its computed duration, exposed as tokens such as `--motion-spatial-fast-expressive`.
  - **Option B:** use a JS spring (for example, Motion's `spring({ stiffness, damping })`). Motion's `damping` is an absolute coefficient, not a ratio, so convert with `c = 2·ζ·√(k·m)`. For expressive FastSpatial that gives c ≈ 33.9.
- Enterprise-SaaS fit: the standard scheme (ζ 0.9, effectively no visible overshoot) maps well to "calm" utilitarian UI. Expressive FastSpatial, with ~10% overshoot, should be reserved for hero or press feedback. This mirrors Google's own split: "utilitarian/recurring" vs "hero."
- The spatial/effects split is the most transferable rule. Never let color or opacity overshoot; only geometry gets bounce.

### Gaps
- m3.material.io motion spec pages are JS-rendered and could not be fetched. The designer-facing token names (e.g., `md.sys.motion.spring.fast.spatial.damping`) and any guidance text on when to choose fast, default or slow are not captured here.
- Compose's spring `visibilityThreshold` per token was not extracted.

## 3. Shape morphing and the new expressive components

### Takeaway
M3E ships a **35-shape library** (`MaterialShapes`, built on `androidx.graphics.shapes` `RoundedPolygon` and `Morph`). Shape changes are used as state feedback:
- Buttons and toggle buttons morph between round and square corners on press or check.
- Connected button groups sharpen inner corners on press.
- In standard button groups, the pressed button widens by 15% and steals width from its neighbours.
- The loading indicator morphs through 7 shapes, one every 650 ms, while rotating.
- Wavy progress uses a 3 dp-amplitude sine wave that flattens near 0% and 100%.

The new components are split buttons, the FAB menu, floating toolbars, the short navigation bar and the wide navigation rail.

### Cited Findings
- **MaterialShapes (35):**
  - Circle, Square, Slanted, Arch, Fan, Arrow, SemiCircle, Oval, Pill, Triangle, Diamond, ClamShell
  - Pentagon, Gem, Sunny, VerySunny, Cookie4Sided, Cookie6Sided, Cookie7Sided, Cookie9Sided, Cookie12Sided, Ghostish
  - Clover4Leaf, Clover8Leaf, Burst, SoftBurst, Boom, SoftBoom, Flower, Puffy, PuffyDiamond, PixelCircle, PixelTriangle, Bun, Heart

  These are normalized `RoundedPolygon`s usable alone or "as part of a Morph." The API is still `@ExperimentalMaterial3ExpressiveApi` — [AOSP MaterialShapes.kt](https://android.googlesource.com/platform/frameworks/support/+/androidx-main/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/MaterialShapes.kt)
- **Button group "squish":**
  - `ButtonGroupDefaults.ExpandedRatio = 0.15f`: the pressed child expands "by 15% of its width" and the amount is taken from its neighbours. `0f` disables the effect; `1f` makes the pressed child 200% wide.
  - Middle items take width from both sides: `value · min(expandedRatio · width / 2, prevPadding, nextPadding)`. First and last items take only from their single neighbour.
  - Compression is capped by the neighbour's content end-padding (`compressionLimit`).
  - The animation spec is the **FastSpatial** motion-scheme token.
  - On release, the node waits until the press animation exceeds 0.75, then animates back to 0, with a 1000 ms max wait. A quick tap therefore still shows a visible squish.

  Source: [AOSP ButtonGroup.kt](https://android.googlesource.com/platform/frameworks/support/+/androidx-main/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/ButtonGroup.kt)
- **Connected button group shapes:**
  - Outer corners are full (pill).
  - Inner corners use `CornerValueSmall` at rest and `CornerValueExtraSmall` when pressed, so the pressed segment's inner corners get sharper.
  - A checked segment becomes fully rounded (`CornerFull`, `SelectedInnerCornerCornerSizePercent = 50`).
  - Gap between segments is `BetweenSpace = 2dp`; container height is 40dp (small).

  Sources: [AOSP ButtonGroup.kt](https://android.googlesource.com/platform/frameworks/support/+/androidx-main/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/ButtonGroup.kt), [AOSP ConnectedButtonGroupSmallTokens.kt](https://android.googlesource.com/platform/frameworks/support/+/androidx-main/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/tokens/ConnectedButtonGroupSmallTokens.kt)
- **Loading indicator:**
  - Indeterminate mode cycles through 7 polygons: SoftBurst → Cookie9Sided → Pentagon → Pill → Sunny → Cookie4Sided → Oval.
  - A morph starts every **650 ms** (`MorphIntervalMillis`), each driven by `spring(dampingRatio 0.6, stiffness 200)` and adding **+90° rotation**.
  - A global linear rotation of 360° per **4666 ms** runs on top.
  - Determinate mode morphs Circle (pre-rotated 18°) → SoftBurst as progress increases, rotating `-progress·180°`.
  - Size: active shape **38 dp** in a **48×48 dp** container. The contained variant uses a primaryContainer full-round background with an onPrimaryContainer shape.

  Sources: [AOSP LoadingIndicator.kt](https://android.googlesource.com/platform/frameworks/support/+/androidx-main/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/LoadingIndicator.kt), [AOSP LoadingIndicatorTokens.kt](https://android.googlesource.com/platform/frameworks/support/+/androidx-main/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/tokens/LoadingIndicatorTokens.kt)
- **Wavy progress (linear):**
  - Wave amplitude **3 dp**; wavelength **40 dp** determinate, **20 dp** indeterminate.
  - Stroke 4 dp, track 4 dp, container height 10 dp.
  - **4 dp gap** between the active indicator and the track (`TrackActiveSpace`).
  - 4 dp stop dot at the track end; round caps.
  - The wave travels one wavelength per second.
  - Amplitude is 0 when progress is ≤10% or ≥95%, and full otherwise. It ramps up with `tween(500 ms, Standard)` and down with `tween(500 ms, EmphasizedAccelerate)`, so the bar straightens as it nears completion.
  - Progress value changes animate with `tween(500 ms, linear)`. Default linear width is 240 dp.

  Sources: [AOSP WavyProgressIndicator.kt](https://android.googlesource.com/platform/frameworks/support/+/androidx-main/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/WavyProgressIndicator.kt), [AOSP LinearProgressIndicatorTokens.kt](https://android.googlesource.com/platform/frameworks/support/+/androidx-main/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/tokens/LinearProgressIndicatorTokens.kt)
- **Other new Compose components:**
  - `SplitButtonLayout`: two buttons, with `SplitButtonShapes`.
  - `Horizontal/VerticalFloatingToolbar`: with `FloatingToolbarScrollBehavior` and `FloatingToolbarExitDirection`, so the toolbar exits on scroll.
  - `FloatingActionButtonMenu` + `ToggleFloatingActionButton`: the toggle FAB "animates its container size, corner radius, and color when toggled."
  - `LoadingIndicator` / `ContainedLoadingIndicator`.
  - `Linear/CircularWavyProgressIndicator`.
  - `ToggleButton` with `ToggleButtonShapes`: separate default, pressed and checked shapes.
  - `ShortNavigationBar`.
  - `WideNavigationRail` / `ModalWideNavigationRail`.
  - `MaterialExpressiveTheme` with `expressiveLightColorScheme()`.

  Source: [Compose material3 package summary](https://developer.android.com/reference/kotlin/androidx/compose/material3/package-summary)
- **System-UI shape morphs (A16 QPR1):**
  - Selected Quick Settings tiles morph from pills to rounded rectangles.
  - The media player's pause button is rectangular and the play button is pill-shaped, so the shape encodes state.
  - Settings toggles show a check or X in the handle.
  - The lock-screen clock offers round or sharp styles plus a thickness slider.

  Source: [9to5Google](https://9to5google.com/2025/09/03/android-16-qpr1-pixel/)
- Androidify sample: `MaterialShapes.Cookie9Sided` clips the camera button, and a morphing shape is used inside a shared-element transition — [Android Developers Blog](https://android-developers.googleblog.com/2025/05/androidify-building-delightful-ui-with-compose.html)

### Inferences
- The "squish" can be reproduced in CSS with flex. Give the pressed item `flex-grow` (or a width delta of 15% of its base width) and shrink its neighbours by the same amount, capped at their inline padding. Animate with the expressive FastSpatial spring (a `linear()` easing of about 270 ms) on `:active`/pointerdown, and hold until at least 75% of the animation has played before reversing.
- A shape-state toggle (rounded rest → sharper pressed → full-round checked) is cheap in CSS through `border-radius` transitions using spatial springs. Morphing arbitrary polygons (cookie → pill) needs SVG path interpolation (e.g., flubber) or `clip-path: shape()` / `path()` with matching vertex counts. That level is likely overkill for enterprise SaaS outside loading states.
- Wavy progress is a strong candidate for a web `<Progress>` variant, with an SVG sine path, `stroke-dashoffset` travel and amplitude driven by progress. The flatten-at-ends rule (0–10% and 95–100%) is a good subtle detail to copy.

### Gaps
- Exact numeric values for `CornerValueSmall`, `CornerValueExtraSmall` and other `ShapeTokens` were not fetched. M3's general scale is commonly cited as ExtraSmall 4 dp / Small 8 dp, but that is UNVERIFIED here.
- Circular wavy indicator token values, FAB menu stagger timings and floating-toolbar dimensions were not extracted.
- No primary source was found for "expressive list/carousel behaviors" in phone UI. The Wear OS 6 announcement mentions lists that "animate to create a sense of depth as you scroll," following the display curve — [blog.google](https://blog.google/products/android/material-3-expressive-android-wearos-launch/)

## 4. System micro-interactions (haptics, notification physics, quick settings, volume, lock screen, predictive back, Live Updates)

### Takeaway
The hallmark M3E micro-interaction is **coupled physics with neighbour reaction plus a haptic at the threshold**. When you drag a notification, its neighbours move slightly; when it snaps off, the phone gives a haptic rumble. The other surfaces follow the same pattern:
- Volume and brightness sliders are springy, and the volume slider shows a media waveform.
- Quick Settings tiles resize and morph, and since A17 QPR1 they overshoot according to swipe velocity.
- The shade is blurred.
- Predictive back previews the destination with a 90% scale and fade-through.
- Live Updates bring progress-centric notifications.

### Cited Findings
- Notification dismissal: "neighboring notifications subtly move in response to your drag," and snapping one off the stack triggers a haptic rumble. Recents dismissal and the volume slider have "springy, responsive" motion. The shade background is blurred for depth — [blog.google](https://blog.google/products/android/material-3-expressive-android-wearos-launch/)
- A16 QPR1 shipping behaviour: when one notification is swiped, the others react to the drag. Each notification shows the app's real icon. Tapping a call chip opens the notification — [9to5Google](https://9to5google.com/2025/09/03/android-16-qpr1-pixel/)
- Quick Settings (A16 QPR1):
  - Tiles can be resized to icon-only.
  - A page holds up to 16 tiles (4×4); the first swipe shows 8 tiles with notifications.
  - Selected tiles morph from pills to rounded rectangles.
  - Bluetooth and Modes tiles toggle when you tap their left icon.

  Source: [9to5Google](https://9to5google.com/2025/09/03/android-16-qpr1-pixel/)
- Quick Settings (A17 QPR1): tiles "overshoot and ease back into place, responding to swipe speed." There is a predictive back gesture inside QS — [9to5Google](https://9to5google.com/2026/09/15/every-single-new-feature-in-android-17-qpr1-video/). The bounce matches the notification shade's existing inertia-following overshoot — [9to5Google](https://9to5google.com/2026/05/19/android-17-qpr1-beta-3-has-a-bouncy-new-animation-for-quick-settings-video/)
- Volume (A16 QPR1): a new M3 slider (also used for brightness), with a waveform at the bottom while media plays. Bars and indicators are thicker system-wide — [9to5Google](https://9to5google.com/2025/09/03/android-16-qpr1-pixel/)
- Lock screen:
  - **A16 QPR1:** day, date and weather move below the large clock, or to its right when notifications are present. Round or sharp clock with a thickness slider. A compact or full notification list. Segmented Wi-Fi and cellular icons — [9to5Google](https://9to5google.com/2025/09/03/android-16-qpr1-pixel/)
  - **A17 QPR1:** the media player slides up on wake instead of appearing statically, and multiple media apps are grouped — [9to5Google](https://9to5google.com/2026/09/15/every-single-new-feature-in-android-17-qpr1-video/)
- Live Updates: progress notifications from delivery, rideshare and navigation apps appear as "glanceable, prominent updates" (e.g., an Uber Eats tracker) — [blog.google](https://blog.google/products/android/material-3-expressive-android-wearos-launch/). They arrived in A16 QPR1 and were completed in A17 — [Android Authority](https://www.androidauthority.com/android-17-stable-rollout-features-3675016/)
- **Predictive back** published motion spec. Full-screen surfaces:

  | Parameter | Start | End |
  |---|---|---|
  | Exit scale | 100% | 90% |
  | Enter scale | 110% | 100% |
  | Exit fade | 100% | 0% at the 35% progress threshold |
  | Enter fade | 0% | 100%, starting at 35% |

  - Commit interpolator: (0.1, 0.1, 0, 1).
  - Gesture progress should be fed through `STANDARD_DECELERATE` / `PathInterpolator(0, 0, 0, 1)`.
  - Shared-element preview: X shift `((screen width / 20) − 8) dp`, Y shift `((available height / 20) − 8) dp`, minimum scale 90%, and an 8 dp edge margin.
  - On a fling, the surface first animates toward the maximum preview state, absorbing the velocity, then commits.
  - On cancel, it "swiftly" springs back.
  - A "subtle overshoot to absorb spring tension" is recommended.

  Source: [Android Developers predictive back design](https://developer.android.com/design/ui/mobile/guides/patterns/predictive-back)
- Apps targeting Android 16 get predictive back system animations (back-to-home, cross-task, cross-activity) by default. Source is a search snippet — [Android Authority](https://www.androidauthority.com/android-16-predictive-back-three-button-navigation-3566000)
- A17 QPR2 added customisable keyboard vibration — [Beebom](https://gadgets.beebom.com/news/android-17-qpr2-stable-update-pixel-phones-features)

### Inferences
- Web transfer, ordered by value for enterprise SaaS:
  1. **Swipe-to-dismiss toasts and list rows** with neighbour reflow on springs: siblings translate by a small fraction of the drag (e.g., 5–10%), plus a threshold "snap" cue. The web has no haptic API on desktop; `navigator.vibrate` exists only on Android Chrome.
  2. **Drag-to-close for sheets and drawers** using the predictive-back parameters: scale to 0.9 with progress, use a decelerate curve on the progress, fade-through at 35%, and spring back on cancel.
  3. **Sliders** whose thumb or track springs with FastSpatial.
  4. **Panels whose open overshoot scales with gesture velocity.** Only meaningful for touch or trackpad drags; keyboard opens should use the standard scheme.
- The pattern of threshold feedback (haptic or visual) at the moment of commit is important. On the web it can be a brief scale "tick" or a color step on the dragged item when it crosses the dismiss threshold.

### Gaps
- No published haptic primitive mapping (e.g., which `HapticFeedbackConstants` or `VibrationEffect` primitives the shade uses) was found.
- The notification "neighbour displacement" magnitude and spring values are not published in any source found; SystemUI source was not inspected.
- Live Updates visual spec (chip in the status bar, progress-style template, segment/point API) was not detailed beyond the announcement.

## 5. Typography and emphasis

### Takeaway
M3E adds an **"Emphasized" twin for each of the 15 baseline type styles**, giving 30 styles in Compose Material3 1.5.0. In current AOSP tokens, the emphasized twin changes **weight only**: Regular → Medium for display, headline, title-large and body; Medium → Bold for title-medium/small and label. Size, line height and tracking stay the same. Variable-font axes (Google Sans Flex, Roboto Flex) are part of the expressive story, but no published "axis animation" spec was found.

### Cited Findings
- The Typography class has `displayLargeEmphasized` … `labelSmallEmphasized` (15 emphasized styles), added in 1.5.0. Emphasized versions "add dynamism and personality to the baseline styles… creating clearer division of content and drawing users' eyes to relevant material." — [Android Developers: Typography](https://developer.android.com/reference/kotlin/androidx/compose/material3/Typography)
- Token values:
  - Display L/M/S = 57/64, 45/52, 36/44 (size/line height).
  - Headline L/M/S = 32/40, 28/36, 24/32.
  - Title L/M/S = 22/28, 16/24, 14/20.
  - Body L/M/S = 16/24, 14/20, 12/16.
  - Label L/M/S = 14/20, 12/16, 11/16.
  - Emphasized twins differ only in weight, as described above.
  - The emphasized block carries a "TODO update with the generated tokens once available" comment, so the values may be provisional.

  Source: [AOSP TypeScaleTokens.kt](https://android.googlesource.com/platform/frameworks/support/+/androidx-main/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/tokens/TypeScaleTokens.kt)
- Wear OS M3E: the default type scale is Roboto Flex, "utilizing variable font axes for more expression" — [Android Developers: Wear design language](https://developer.android.com/design/ui/wear/guides/get-started/design-language). Fast Company reported that Google's new default typeface is Google Sans Flex Rounded, which replaces hard terminals with smooth tips. Snippet only, UNVERIFIED — [Fast Company](https://www.fastcompany.com/91333562/google-maximalist-new-material-design-kit)

### Inferences
- A web "emphasized" type variant is trivial: one extra weight step per role, e.g., `--type-body-md-emphasized-weight: 500`. It suits enterprise SaaS well, for example key numbers in tables or active nav labels, without changing the type rhythm.
- With a variable font, `font-weight` can be transitioned on state changes such as selection, but this causes width reflow. Use `font-variation-settings` with fixed-width (grade, GRAD) axes, or reserve the bold width, to avoid layout shift. This is my recommendation; no Google spec was found.

### Gaps
- No primary source was found for official variable-axis values (wght, GRAD, ROND, wdth) in M3E, or for animated axis changes in Pixel system UI such as the clock thickness slider.
- The m3.material.io typography page could not be fetched.

## 6. Google's research claims and accessibility guidance (reduced motion, "Remove animations", blur)

### Takeaway
Google backs M3E with **46 studies and more than 18,000 participants**. It claims key UI elements were spotted **up to 4× faster** and the age gap disappeared (users 45+ were as fast as younger users). It also publishes explicit caveats: expressive design can hurt usability when it breaks familiar patterns, and a "strong minority" prefer calmer UI. On accessibility, Android's system "Remove animations" sets animator duration scale to 0. No `MotionScheme` reduced-motion API was documented. Android 17 reportedly added a "reduce blur" setting.

### Cited Findings
- **Scale:** 46 studies, "hundreds of designs," more than 18,000 participants worldwide. Methods were eye tracking, surveys, focus groups, experiments and usability testing; the work spanned about three years from 2022 — [design.google](https://design.google/library/expressive-material-design-google-research)
- **Usability:** key UI elements were spotted "up to four times faster" (eye tracking across 10 apps). In an email case study, the enlarged Send button was spotted 4× faster. Users 45+ located key elements as fast as younger users. The tested levers were size (bigger buttons), color (secondary color for emphasis) and containment (high-contrast containers); shape and motion were named but not separately measured — [design.google](https://design.google/library/expressive-material-design-google-research)
- **Preference:** expressive design was preferred across all ages, up to 87% among 18–24-year-olds. Ratings rose for "modernity" (+34%), subculture perception (+32%) and rebelliousness (+30%) — [design.google](https://design.google/library/expressive-material-design-google-research)
- **Caveats:**
  - Context matters; banking is cited as a place where expressive may not fit.
  - A scattered album-art playlist redesign scored lower on usability.
  - Removing text labels from email actions reduced usability.
  - "When basic interaction paradigms are broken, expressive design can lead to poor usability or negative sentiment."
  - A strong minority preferred calmer designs.
  - Unfamiliarity reduced both preference and usability.

  Source: [design.google](https://design.google/library/expressive-material-design-google-research)
- **Remove animations:** Android's toggle sets `ANIMATOR_DURATION_SCALE` to 0, so animations end right after they start. Apps commonly read that setting as a proxy, defaulting to 1 if it is missing — [dev.to (Eeva-Jonna Panula)](https://dev.to/eevajonnapanula/android-animations-and-reduced-motion-2em2) (search snippet). Wear Compose exposes `LocalReduceMotion` — [Android Developers](https://developer.android.com/reference/kotlin/androidx/wear/compose/foundation/ReduceMotion). The `MotionScheme` reference documents no reduced-motion handling — [MotionScheme reference](https://developer.android.com/reference/kotlin/androidx/compose/material3/MotionScheme)
- **Blur:** Android Authority reportedly covered a "reduce blur effects" setting added to address readability problems with M3E blur. Which surfaces it covers is unconfirmed (via Gadget Hacks) — [Gadget Hacks](https://android.gadgethacks.com/news/android-17-blurry-aesthetic-explained-beta-changes-and-open-questions/)

### Inferences
- For an enterprise SaaS kit, the research supports the parts of M3E that measured well: larger primary actions, emphasis color and high-contrast containment. Its own caveats argue against playful shape and motion in dense, task-focused (banking-like) contexts. This supports the standard scheme as the default with expressive as opt-in.
- The web reduced-motion mapping should mirror Android's behaviour. Under `prefers-reduced-motion: reduce`, spatial springs collapse to instant or very short tweens. Effects (opacity/color) cross-fades can stay short, which is a common accessibility practice and not a Google statement. Also add a "reduce transparency/blur" path through `prefers-reduced-transparency` where supported, mirroring Android 17's reduce-blur setting.

### Gaps
- No official M3E page on reduced-motion handling for springs was retrievable (m3.material.io is not fetchable as text).
- The Android Authority article on the "reduce blur" setting was not fetched directly, so its release and exact name are UNVERIFIED.
- Google's research article has no explicit date; it is likely May 2025 (I/O 2025 tagging).

## 7. Web availability (Material Web, Compose-only, published JS/CSS spring values)

### Takeaway
M3E is **not available as an official Google web library**. Material Web Components (`@material/web`) has been in **maintenance mode** since mid-2024 and has no Expressive support. M3E is first-class only in Jetpack Compose (Material3 1.4 and 1.5, partly `@ExperimentalMaterial3ExpressiveApi`), with Flutter and community ports. The usable "spec" for the web is therefore the AOSP token source: spring ζ/k pairs, shape polygons, dp values. Teams must write their own spring-to-CSS conversion.

### Cited Findings
- Google's MWC repo states MWC is "currently in maintenance mode… pending new maintainers"; Material engineers were reassigned to support Google's internal Wiz framework — [GitHub discussion #5642](https://github.com/material-components/material-web/discussions/5642), [9to5Google (June 2024)](https://9to5google.com/2024/06/25/material-web-components/)
- Community M3E web ports exist and are not Google-maintained: the material-esm fork ("Material 3 Expressive is in progress") and matraic/m3e (`@m3e/web`) — search results: [material-esm README](https://cdn.jsdelivr.net/gh/material-esm/material@3.0.6/README.md), [awesome.ecosyste.ms m3e](https://awesome.ecosyste.ms/projects/github.com%2Fmatraic%2Fm3e)
- In Compose, `MotionScheme`, `MaterialExpressiveTheme`, emphasized typography and the new components were added in Material3 1.5.0. Google's Androidify sample used 1.4.0-alpha10 — [MotionScheme reference](https://developer.android.com/reference/kotlin/androidx/compose/material3/MotionScheme), [Android Developers Blog](https://android-developers.googleblog.com/2025/05/androidify-building-delightful-ui-with-compose.html)
- The shape library is built on `androidx.graphics.shapes` (`RoundedPolygon`, `Morph`, `toShape()`/`toPath()`) — [Compose material3 package summary](https://developer.android.com/reference/kotlin/androidx/compose/material3/package-summary), [AOSP MaterialShapes.kt](https://android.googlesource.com/platform/frameworks/support/+/androidx-main/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/MaterialShapes.kt)

### Inferences
- For UIx: treat AOSP `ExpressiveMotionTokens.kt` and `StandardMotionTokens.kt` as the canonical numbers (sections 2 and 3). Generate CSS `linear()` easings and durations at build time from (ζ, k), and check them in visual tests. Do not depend on any Google web package for this.
- The cubic easings in `MotionTokens.kt` remain valid CSS `cubic-bezier()` fallbacks for browsers without `linear()` support.

### Gaps
- No Google-published JS or CSS spring implementation, and no official web export of M3 Expressive design tokens (e.g., Material Theme Builder CSS output including springs), was found.
- Whether Material Theme Builder's web export currently includes motion tokens was not verified.
