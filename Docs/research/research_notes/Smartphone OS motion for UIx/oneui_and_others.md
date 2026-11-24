# Samsung One UI 7 → 9 and peer phone OSes (Nothing OS 4, HyperOS 3, ColorOS 16 / OxygenOS 16): visual, motion and micro-interaction inventory for UIx

Research date: 2026-11-20. Scope: phone UI patterns a React + CSS enterprise design system could reproduce. Camera and AI features are left out unless they carry a UI interaction pattern. Each item is labelled with the release that introduced it. **[UNVERIFIED]** marks leak-only, single-source or vendor-only claims.

Source-quality note: Samsung has never published a detailed motion changelog for One UI 7 through 9. Almost all specific animation claims come from reviewers, leakers or community posts, and the official Samsung newsroom pages I reached only carry rollout dates and AI-feature lists. The one place Samsung publishes concrete motion numbers is its developer design guidelines (Key question 5). OPPO, OnePlus, Xiaomi and Nothing performance numbers are vendor figures. I found no independent benchmarks.

## Key Question 1 — Current One UI version, and what One UI 7 → 8 → 8.5 → 9 changed (animation, blur, Now Bar / Now Brief, icons and widgets, quick panel, lock screen, reachability)

### Takeaway
The current stable release is **One UI 9** (Android 17). It shipped preinstalled on the Galaxy Z Fold 8 / Fold 8 Ultra / Flip 8 on 2026-07-22 and reached the Galaxy S26 from about 2026-09-16. It is a light, incremental update: quick-panel modularity, a media-player redesign and some continued translucency. The big visual moves were **One UI 7**, with reworked non-linear app motion, a separate quick panel, the Now Bar and a vertical app drawer, and **One UI 8.5**, with edge blur instead of hard scroll cutoffs, blurred lock-screen notifications, deeper icons, floating in-app menus, a bottom-anchored settings search and a freely resizable quick-panel grid. One UI 8 mainly wired Android 16 Live Updates into the Now Bar.

### Cited Findings

**Version status / timeline**
- One UI 9 stable (Android 17) launched preinstalled on the Galaxy Z Fold 8, Fold 8 Ultra and Flip 8 on 2026-07-22. The devices went on sale 2026-08-07 — [SamMobile](https://www.sammobile.com/news/stable-one-ui-9-arrives-with-galaxy-z-fold-8-flip-8/); [Android Authority](https://www.androidauthority.com/samsung-one-ui-9-stable-3690019/); [Beebom](https://gadgets.beebom.com/news/samsung-officially-releases-stable-one-ui-9-update-with-galaxy-z-fold-8-series)
- Samsung's press release on the One UI 9 rollout to existing devices starts with the Galaxy S26 series. Its date appears as 2026-09-16 in one version and 2026-09-18 in another, so the sources conflict slightly — [Samsung Newsroom Malaysia](https://news.samsung.com/my/samsung-begins-official-rollout-of-one-ui-9-bringing-the-latest-galaxy-experiences-to-more-devices) (as summarised by search)
- The first One UI 9 public beta came out in mid-May 2026 (2026-05-13/14) for the Galaxy S26 series in Germany, South Korea, the UK and the US — [9to5Google changelog](https://9to5google.com/2026/05/13/samsung-one-ui-9-android-17-changelog/); [SamMobile](https://www.sammobile.com/news/look-one-ui-9-design-changes-new-features/)
- The One UI 8.5 official rollout started in Korea on 2026-05-06, with the Galaxy S25 first and other regions after. One UI 8.5 debuted on the Galaxy S26, and the beta was announced in December 2025 — [Samsung Newsroom Global](https://news.samsung.com/global/samsungs-one-ui-8.5-official-rollout-starts-may-6); [Android Authority](https://www.androidauthority.com/samsung-galaxy-s25-one-ui-8-5-stable-rollout-3661337/); [Samsung Newsroom UK beta](https://news.samsung.com/uk/samsung-launches-one-ui-8-5-beta-for-next-level-ease-of-use)
- One UI 9.5 "full Liquid Glass look" is **[UNVERIFIED rumour]**. Only a Digital Trends headline surfaced and I did not read the article — [Digital Trends](https://www.digitaltrends.com/phones/samsung-may-be-going-in-for-the-full-liquid-glass-look-in-oneui-9-5/)

**One UI 7 (beta Dec 2024; launched with Galaxy S25, early 2025)**
- **App open/close motion:** Samsung replaced stuttering open/close animations with "non-linear app animations that respond better to your finger movements". The reviewer judged them to rival Pixel and iPhone smoothness, and list scrolling and app opening felt more fluid than in One UI 6 — [Android Authority hands-on, 2024-12-07](https://www.androidauthority.com/samsung-one-ui-7-beta-hands-on-3506502/)
- Samsung SDC 2024 demo: animations have "more bounce and fluidity" and transitions are smoother than in One UI 6.1.1 — [SamMobile, Oct 2024](https://www.sammobile.com/news/one-ui-7-0-animations-transitions-video/). Beebom describes a "faster and bouncy effect" on app transitions and quick settings — [Beebom review](https://beebom.com/samsung-one-ui-7-review)
- **"Interruptible" is not documented.** A leaked pre-release clip described "non-linear and parallel" widget/app animations, but no Samsung or reviewer source I found confirms One UI 7 animations are interruptible — [Neowin leak](https://www.neowin.net/amp/this-may-be-how-smooth-app-switching-animations-in-one-ui-7-could-look-like); [Android Authority](https://www.androidauthority.com/samsung-one-ui-7-beta-hands-on-3506502/)
- Reception was mixed: Digital Trends reported a subreddit full of stutter complaints during the beta, and Samsung said there was "still work to be done" — [Digital Trends](https://qa2.www.digitaltrends.com/mobile/one-ui-7-animations-samsung-get-better). A Samsung Community user called the quick panel animation "stiff and forced" — [Samsung Community](https://us.community.samsung.com/t5/Discussions/The-One-UI-7-Fluidity-PLEASE-READ/td-p/3101149)
- **Split notification shade / quick panel:** A swipe down from the left or middle opens notifications only, without the brightness slider or toggles. A swipe from the right opens Quick Settings. Quick Settings shows two toggle rows plus an expandable list. Brightness and volume sliders share a row, and a long press on a slider shows extra options. Users can switch back to the combined layout. Media controls moved into Quick Settings only — [Android Authority](https://www.androidauthority.com/samsung-one-ui-7-beta-hands-on-3506502/)
- **App drawer:** It changed from paginated horizontal pages to a vertical scroll list with the search bar at the bottom, and it remembers scroll position when reopened — [Android Authority](https://www.androidauthority.com/samsung-one-ui-7-beta-hands-on-3506502/)
- **Folders and widgets:** Large folder previews let a tap on an app icon inside the preview open the app directly, while a tap on corner dots expands the folder. First-party widgets resize adaptively, and many let users change background shape — [Android Authority](https://www.androidauthority.com/samsung-one-ui-7-beta-hands-on-3506502/)
- **Now Bar (lock screen / AOD):** It sits between the lock-screen shortcuts and shows the charging animation, timers, recordings and media. Media expands to a full-screen player, and an expanded player stays on the AOD until collapsed. Multiple live activities stack, and timers and recordings show as a compact pill by the selfie camera. Call controls were missing in the beta, and usefulness depends on third-party adoption — [Android Authority](https://www.androidauthority.com/samsung-one-ui-7-beta-hands-on-3506502/). Press framed it as Samsung's take on Dynamic Island — [PhoneArena](https://www.phonearena.com/news/one-ui-7-makes-samsungs-new-and-existing-phones-better-than-your-iphone-and-pixel_id165612)
- **Rationale (secondary):** One UI 7 was "a bold re-imagination… focusing on simplicity and striking the perfect balance between form and function" — [SamMobile opinion](https://sammobile.com/opinion/now-bar-isnt-just-a-feature-in-one-ui-7-0-its-a-bold-philosophy). I could not fetch Samsung's own One UI 7 launch newsroom post, which timed out.
- **Camera (interaction pattern only):** Secondary controls collapse into a menu opened by a button next to zoom. In Pro Video, pull distance on a zoom bar sets zoom *speed*, a rate-control slider — [Android Authority](https://www.androidauthority.com/samsung-one-ui-7-beta-hands-on-3506502/)

**One UI 8 (Android 16; 2025)**
- **Now Bar + Android 16 Live Updates:** One UI 8 integrates Android 16 Live Updates into the Now Bar. A beta-3 developer flag, "Live notifications for all apps", made compatible third-party Live Updates appear in the status bar and Now Bar — [SamMobile](https://www.sammobile.com/news/one-ui-8-now-bar-integrates-android-16-live-updates/); [Android Authority](https://www.androidauthority.com/one-ui-8-live-updates-support-3573794). Samsung said 15 more apps would support the Now Bar by the end of 2025 — [SamMobile](https://www.sammobile.com/news/15-more-apps-will-support-now-bar-on-one-ui-8/)
- **The progress-style notification API was not used** as of July 2025, per SamMobile. Community reports from September and October 2025 say third-party coverage stayed thin, with Uber and Swiggy missing and only Zomato working — [SamMobile](https://www.sammobile.com/news/one-ui-8-now-bar-integrates-android-16-live-updates/); [Samsung Community](https://r2.community.samsung.com/t5/Tech-Talk/Live-Notifications-in-Now-Bar-Here-s-What-to-Expect-with-One-UI/m-p/19430773)

**One UI 8.5 (debuted on Galaxy S26, early 2026; stable for older devices 2026-05-06)**
- **Scroll-edge blur:** Menus use a soft blur at the top and bottom edges instead of a hard cutoff, and content runs to the screen edges. Transitions are "softer" throughout — [SamMobile S26 Ultra piece (labelled Sponsored)](https://www.sammobile.com/news/one-ui-8-5-samsung-galaxy-s26-ultra-biggest-changes/)
- **Floating in-app menus:** In Gallery, Phone and My Files, menus float above content instead of docking to a bottom bar — [SamMobile](https://www.sammobile.com/news/one-ui-8-5-samsung-galaxy-s26-ultra-biggest-changes/)
- **Settings:** Fewer subheadings, and **the search bar moved to the bottom of the screen for one-handed use** — [SamMobile](https://www.sammobile.com/news/one-ui-8-5-samsung-galaxy-s26-ultra-biggest-changes/)
- **Quick Panel:** Toggles can be resized, reordered and removed. Removed toggles go to a separate "available controls" list for re-adding. Contextual toggles also appear, such as an Audio Eraser toggle with a slider shown only during video playback — [SamMobile](https://www.sammobile.com/news/one-ui-8-5-samsung-galaxy-s26-ultra-biggest-changes/)
- **Lock-screen notification blur:** The unread-notification list gets a blur backing so text stays readable over busy wallpapers. The stated problem is that on One UI 8, notifications are hard to read unless the wallpaper is plain. New curvy, gradient clock styles were added, including one vertical style. This comes from a leaked internal build dated 2025-09-25 — [9to5Google](https://9to5google.com/2025/09/25/samsungs-one-ui-8-5-lock-screen-refresh-has-blurred-notifications-new-clock-styles/). A community post lists "transparent blur effects and floating elements" as part of the refresh — [Samsung Community](https://r2.community.samsung.com/t5/Tablets/One-UI-8-5-Android-16/td-p/22340545)
- **Icons:** The shipped icons have "more depth and color" — [SamMobile](https://www.sammobile.com/news/one-ui-8-5-samsung-galaxy-s26-ultra-biggest-changes/). Early leaks showed 3D icons with shadows and highlights, and a later build toned them down toward the flatter One UI 8 look — [SamMobile](https://www.sammobile.com/news/samsung-one-ui-8-5-3d-app-icons-reduced/); [9to5Google](https://9to5google.com/2025/10/02/samsung-one-ui-8-5-3d-icons-liquid-glass/)
- **Name "Ambient Design":** Only Beebom says Samsung called the One UI 8.5 visual overhaul "Ambient Design". No Samsung source I found uses the term — **[UNVERIFIED]** — [Beebom](https://gadgets.beebom.com/news/samsung-officially-releases-stable-one-ui-9-update-with-galaxy-z-fold-8-series)
- **Blur performance (beta):** Ice Universe reported that enabling the blur option makes animations lock up and stutter, especially during transitions — [Android Authority](https://www.androidauthority.com/p-3608214). Community users say quick-settings toggle animations were removed and live blur was dropped "in the name of performance" — [Samsung Community](https://r2.community.samsung.com/t5/Questions/Why-are-quick-settings-animations-removed/m-p/22156228). These are user reports, not Samsung statements.
- **Home/launcher motion:** The January 2026 beta improved app launch from home, folder close and recents switching — [SammyFans](https://www.sammyfans.com/2026/01/06/samsung-one-ui-8-5-home-app-january-2026/amp/). Samsung's Home Up module (Good Lock) gives users extra animation controls — [Notebookcheck](https://www.notebookcheck.net/Samsung-Galaxy-S24-and-Galaxy-S25-get-new-animations-via-official-Home-Up-app.956519.0.html). LockStar added dynamic unlock transition effects instead of a static unlock — [Android Authority](https://www.androidauthority.com/samsung-lockstar-custom-unlock-animations-3632333/)
- **Now Brief:** A morning summary that combines calendar, reservations, weather and details from messages — [SamMobile](https://www.sammobile.com/news/one-ui-8-5-samsung-galaxy-s26-ultra-biggest-changes/)
- **Notification Highlights:** Summarises long chats and moves the notifications you check most to the top of the panel after a few days of learning — [SamMobile](https://www.sammobile.com/news/one-ui-8-5-samsung-galaxy-s26-ultra-biggest-changes/)
- Reviewer verdict: "None of these are functional revolutions, but together they make the interface feel more polished and modern." The piece is labelled Sponsored — [SamMobile](https://www.sammobile.com/news/one-ui-8-5-samsung-galaxy-s26-ultra-biggest-changes/)

**One UI 9 (beta May 2026; stable 2026-07-22)**
- **Quick panel decoupling:** The brightness slider, volume slider and media player are resizable. The Sound Mode and Display (dark) Mode buttons are split from their sliders and can be moved or removed — [9to5Google](https://9to5google.com/2026/05/13/samsung-one-ui-9-android-17-changelog/); [SamMobile](https://www.sammobile.com/news/look-one-ui-9-design-changes-new-features/)
- **Tile visual:** Tile icons no longer sit in a "circle within a circle", and **active tiles fill the whole button**. The border around the volume and brightness sliders is gone. The media player can be a 2×2 square — [Android Authority hands-on, 2026-05-19](https://www.androidauthority.com/samsung-one-ui-9-beta-hands-on-3667318/)
- **Media player redesign:** Centred title, larger playback buttons and scrub bar, artist name removed — [Android Authority](https://www.androidauthority.com/samsung-one-ui-9-beta-hands-on-3667318/). A leak says the seek bar takes its colour from the album art — **[UNVERIFIED leak]**, via search summary of [SamMobile](https://www.sammobile.com/news/look-one-ui-9-design-changes-new-features/)
- **Widgets:** Tipsters say home-screen widgets look more iOS-like, with an improved blur behind them — **[UNVERIFIED, single tipster source]** — [SammyFans](https://www.sammyfans.com/2026/05/16/one-ui-9-beta-makes-home-screen-widgets-look-more-like-ios/amp/)
- **Translucency:** Beebom says One UI 9 "streamlines the translucent look across the UI". Samsung itself only mentions "optimized layouts and screens" — [Beebom](https://gadgets.beebom.com/news/samsung-officially-releases-stable-one-ui-9-update-with-galaxy-z-fold-8-series)
- **Privacy indicator pattern:** A blue indicator appears at the top of the screen when an app uses location, and tapping it in the quick panel names the app. Precise-location prompts offer Approximate or Precise, with a blue check on the current choice — [9to5Google](https://9to5google.com/2026/05/13/samsung-one-ui-9-android-17-changelog/); [SamMobile](https://www.sammobile.com/news/look-one-ui-9-design-changes-new-features/)
- **Clock:** The alarm screen shows the time larger, with the alarm label above it — [SamMobile](https://www.sammobile.com/news/one-ui-9-slight-changes-alarms-timer-design/)
- **Recents/DeX:** Desktop previews sit at the top of Recents for one-tap desktop switching. Split-screen multitasking handles can be hidden — [9to5Google](https://9to5google.com/2026/05/13/samsung-one-ui-9-android-17-changelog/); [Android Authority](https://www.androidauthority.com/samsung-one-ui-9-beta-hands-on-3667318/)
- **Samsung Notes "Tape":** Covers part of a note and reveals it on demand, a progressive-disclosure / spoiler pattern — [9to5Google](https://9to5google.com/2026/05/13/samsung-one-ui-9-android-17-changelog/)
- Verdicts: "much smaller" than usual and "pretty light"; "no reason to rush" — [Android Authority](https://www.androidauthority.com/samsung-one-ui-9-beta-hands-on-3667318/)

### Inferences
- Samsung's direction from 7 to 9 is **modular, user-composable control surfaces** (resize, reorder, remove, restore from a tray), **content-to-edge with feathered (blurred) scroll edges**, and **moving primary controls downward** (app drawer search, settings search, floating bottom menus). All three carry over to web dashboards: CSS `mask-image` fades at scroll edges, a "restore removed widgets" tray, and bottom-anchored command/search on touch layouts.
- "Active tile fills the whole button" (One UI 9) is a high-contrast selected state: the fill covers the entire hit target rather than a small inner icon chip. That maps directly to toggle-button and segmented-control selected states.
- Blur caused real performance regressions, including beta stutter, removed live blur and removed toggle animations. A web system should treat backdrop blur as an optional, degradable layer, not a structural one.

### Gaps
- I found no Samsung statement that One UI 7 animations are "interruptible". The brief's premise is not confirmed by any source here, only "non-linear", "respond to finger", "bounce" and a leaker's "parallel".
- No durations or curves were published for One UI 7–9 system animations beyond the generic developer guideline in Key question 5.
- One UI 8 stable date and its non-Now-Bar visual changes were not researched in depth. I believe it was September 2025 but did not verify it.
- I could not access Samsung's official One UI 7 newsroom post (timeout) or a full One UI 9 changelog of design items.
- The One UI 9 widget blur and album-art seek bar come from leaks only.

## Key Question 2 — Interruptible / parallel animations at other OEMs (OPPO, OnePlus, Xiaomi, Nothing)

### Takeaway
OnePlus OxygenOS 15 introduced **"Parallel Processing"** for home-screen animations, and OxygenOS 16 extended it as **Parallel Processing 2.0**. The stated behaviour is that a new animation starts before the previous one finishes, so animations "complement each other instead of canceling out". This is the closest documented match to "interruptible / retargetable" motion. OPPO's ColorOS 16 wording is different: its marketing presents the Luminous Rendering Engine as moving *from* a parallel *to* a "unified seamless architecture", with tap-origin animations ("follow the rhythm of your touch"). Xiaomi claims 100+ tuned animations. Every number is a vendor figure. Reviewers call it smooth but subjective, and early versions were "subtle at best".

### Cited Findings
- **OxygenOS 16 Parallel Processing 2.0:** It "allows new animations to begin before previous actions complete", with the stated goal of a more fluid system. Announced 2025-10-16 on the OnePlus 15, with rollout to OnePlus 13, Pad 3 and Open from November 2025 — [Engadget](https://www.engadget.com/oxygenos-16-has-new-lock-screen-customization-options-and-a-novel-gemini-integration-184958404.html)
- OxygenOS 15 introduced parallel processing for home-screen animations. Version 2.0 extends it to App Drawer and Shelf transitions and to 3-button-navigation-bar animations — search summary of [Android Authority](https://www.androidauthority.com/oxygenos-16-features-3607625/) and [Beebom](https://gadgets.beebom.com/guides/best-oxygenos-16-features)
- Yahoo: it ensures animations "complement each other instead of canceling out" — search summary of [Yahoo Tech](https://tech.yahoo.com/phones/articles/oxygenos-16-better-upgrade-expected-155827060.html). GSMArena called the OxygenOS 15 effect subtle and treats 16 as an evolution — [GSMArena hands-on](https://m.gsmarena.com/oxygenos_16_handson_review-news-69940.php). Gizbot says it is faster and more natural but that parts are "half baked" — [Gizbot](https://www.gizbot.com/features/oxygenos-16-hands-on-whats-new-whats-better-and-what-still-feels-half-baked-119807.html)
- OxygenOS 16.0.7 added a "blanket-like" pull-down: items in the quick settings and notification panel flow and then settle as it is pulled, a staggered follow-through — search summary of [91mobiles](https://www.91mobiles.com/reviews/oxygenos-16-0-7-update-overview/)
- **ColorOS 16 (OPPO, Oct 2025):**
  - "Seamless Animation" builds on ColorOS 15 and covers app open from Home and the App Drawer, gesture app switching and widget transitions.
  - Redesigned Gallery, Weather and Notes animations "follow the rhythm of your touch": they start at the tap point and return smoothly, so the response feels "instant and natural".
  - "Aqua Dynamics": the interface moves with the finger while scrolling.
  - "Flux Home Screen": a long press resizes icons and folders, and the surrounding layout reflows smoothly.
  - Source: [OPPO Newsroom](https://www.oppo.com/en/newsroom/stories/oppo-find-x9-series-coloros-16-smooth/)
- **Luminous Rendering Engine:**
  - It revamps the Android rendering framework to "break down barriers between system modules", enabling "independent rendering for smooth visuals and instant responses" — [OPPO Newsroom](https://www.oppo.com/en/newsroom/stories/oppo-find-x9-series-coloros-16-smooth/)
  - OPPO's ColorOS 16 page describes an evolution "from a parallel to a unified seamless architecture" — search summary of [OPPO ColorOS 16 page](https://www.oppo.com/en/coloros16/)
  - Vendor numbers: 40% better tap responsiveness and 52% better scrolling stability. Trinity Engine Dynamic Frame Sync gives up to 37% more stability and 13% less power in heavy multitasking, and "anticipates animation needs and prepares resources in advance". OPPO gives no baseline or method — [OPPO Newsroom](https://www.oppo.com/en/newsroom/stories/oppo-find-x9-series-coloros-16-smooth/)
  - OPPO's page does **not** mention parallel/interruptible animations, velocity, blur or haptics — [OPPO Newsroom](https://www.oppo.com/en/newsroom/stories/oppo-find-x9-series-coloros-16-smooth/)
- **HyperOS 3 (Xiaomi, announced Aug 2025):** Xiaomi says it tuned 100+ system animations for responsiveness and cut app-launch latency by 20%. Both are company figures — search summaries of [Beebom](https://gadgets.beebom.com/news/xiaomi-hyperos-3-announced) and [Gizmochina](https://www.gizmochina.com/2025/08/28/hyperos-3-is-here-super-dynamic-island-new-ai/), which returned 403 when fetched. HyperOS 3.1 reportedly gave the island smoother transitions — [DEV Community first look](https://dev.to/logicverse_2025/xiaomi-hyperos-31-first-look-major-ui-upgrades-and-smart-features-jf4) (low-quality source)
- **Nothing OS 4.0 (stable from 2025-11-21 on Phone (3)):** Animations were reworked across the OS. Touch responses, swipes and gestures have "greater depth", and app open/close comes with a subtle **background scaling** effect, where the content behind recedes. A later Nothing Launcher update smoothed app and widget opening further — search summaries of [Techloy](https://www.techloy.com/nothing-os-4-0-rolls-out-with-major-ui-upgrades-and-a-smoother-android-experience/) and [9to5Google](https://9to5google.com/2025/11/21/nothing-begins-android-16-rollout-with-live-updates-in-glyph-redesign-new-features/). All eligible devices had 4.0 by March 2026, and Phone (4a) ships with Nothing OS 4.1 — [91mobiles](https://www.91mobiles.com/hub/nothing-os-4-roundup-release-timeline-eligible-phones-features/)

### Inferences
- In web terms, "Parallel Processing" means **retargetable animations**: when a new interaction starts mid-animation, the new animation starts from the element's *current* rendered state instead of waiting or snapping back. In CSS, transitions already retarget from the current computed value. Keyframe animations do not, so WAAPI or spring libraries need `commitStyles`/`getComputedStyle` hand-off. UIx should prefer transitions or springs for interactive surfaces such as drawers, popovers and accordions, so that rapid toggles reverse smoothly.
- "Start at the tap point" (ColorOS 16) maps to `transform-origin` set from pointer coordinates for popovers, menus and expand-from-card transitions.
- Nothing OS 4's "background scaling" is the same as One UI's guideline that the previous layer "dims or blurs into the background" (Key question 5). For web, that means a modal or drawer opening with the underlying page at about 0.98 scale, dimmed. Note: this is my reconstruction, and no vendor gave a scale value.

### Gaps
- No OEM gave curves, durations, spring parameters or velocity-handoff details. "Velocity-aware" is never explicitly claimed in the sources I read, apart from "moves with your finger" (Aqua Dynamics) and "non-linear… respond to finger movements" (One UI 7).
- No independent frame-time or latency measurements were found for any of these claims.
- The ColorOS "parallel → unified" wording comes from a search summary of the OPPO page, not a direct fetch. Its exact meaning is unclear.

## Key Question 3 — Micro-interactions: haptics, pressed states, progress/live notifications, dynamic blur, depth, Glyph/lighting feedback

### Takeaway
The transferable micro-interaction patterns are these:
- **Ongoing-activity surfaces** that live in a compact pill, expand on demand and stack: Samsung Now Bar, Xiaomi Super Island, Android 16 Live Updates, and Nothing Glyph Progress.
- **Blur used as a legibility backing** behind text over busy content, rather than as decoration.
- **Restrained, semantically distinct haptics:** two quick pulses for an error, and a switch-like directional pulse.
- **Bound feedback at limits:** a haptic tick when volume hits max or min.

### Cited Findings
- **Now Bar stacking / expand:** A compact pill expands to a full player, multiple activities stack, and an expanded state persists on the AOD until the user collapses it (One UI 7) — [Android Authority](https://www.androidauthority.com/samsung-one-ui-7-beta-hands-on-3506502/). Live Updates are integrated (One UI 8) — [SamMobile](https://www.sammobile.com/news/one-ui-8-now-bar-integrates-android-16-live-updates/)
- **Xiaomi Super Island / HyperIsland (HyperOS 3):** It sits at the top of the screen and expands for rides, music and timers. Reviewers call it fluid but a near "1:1 copy" of Dynamic Island. Futurezone found the media player inconsistent: black in the island, grey on the lock screen — search summaries of [Futurezone](https://futurezone.at/produkte/xiaomi-hyperos-3-ausprobiert-user-interface-betriebssystem-android-test-review-welche-modelle-design/403102982) and [Ximitime](https://ximitime.com/xiaomi-hyperos-3-dynamic-island-review-63893/). Liquid-glass-style translucency appears only in limited places, mainly the launcher search bar and settings — search summary of [Gizchina](https://www.gizchina.com/editorial/hyperos-3-an-interesting-new-direction-or-just-iOS-wearing-sunglasses) and [Touchit](https://touchit.sk/xiaomi-hyperos-3-co-sa-zmenilo-a-ako-vnimam-aktualizaciu/814776/)
- **Nothing Glyph (Nothing OS 4.0):** "Glyph Progress" works with any Android 16 app that supports Live Updates, showing live progress on the rear light. Flip to Glyph lets the user choose vibrate or silent. A subtle haptic fires when volume reaches its maximum or minimum — search summaries of [Android Central](https://www.androidcentral.com/phones/nothing-phones/nothing-os-4-arrives-for-the-phone-3-with-exclusive-features-refined-glyph-interface-and-more) and [9to5Google](https://9to5google.com/2025/11/21/nothing-begins-android-16-rollout-with-live-updates-in-glyph-redesign-new-features/)
- **Nothing "Extra Dark Mode" (4.0):** Nothing says it "deepens blacks, improves contrast, and reduces power use across the system". It is an option inside the Dark theme setting, covers first-party apps first (Essential Space, Launcher), and wider support is planned — search summary of [9to5Google](https://9to5google.com/2025/11/21/nothing-begins-android-16-rollout-with-live-updates-in-glyph-redesign-new-features/)
- **Blur as a legibility backing:** One UI 8.5 lock-screen notifications get blur so text stays readable over busy wallpapers — [9to5Google](https://9to5google.com/2025/09/25/samsungs-one-ui-8-5-lock-screen-refresh-has-blurred-notifications-new-clock-styles/). One UI 8.5 menus use blurred top and bottom scroll edges — [SamMobile](https://www.sammobile.com/news/one-ui-8-5-samsung-galaxy-s26-ultra-biggest-changes/)
- **Samsung haptic guideline (One UI design system):**
  - Haptics should be "crisp and refined" to avoid overstimulation, use realistic sensations rather than "simple buzzing", and match the accompanying visual motion in timing.
  - Examples: a gentle click on touch; distinct haptics for special keyboard keys (Delete, Space, Function); ticks while scrolling a time picker; a failed fingerprint gives "two quick vibrations"; for switches, "direction and duration of the vibrations make it feel like a real physical switch".
  - The guideline gives no intensity or duration values.
  - Source: [Samsung Developers — Haptic](https://developer.samsung.com/one-ui/sound-and-haptic/haptic.html)
- **Pressed states:** Samsung's motion guideline only says One UI gives "immediate responses to even the most subtle touches", with no press-scale or press-colour values — [Samsung Developers — Motion basics](https://developer.samsung.com/one-ui/motion/basic.html). The One UI 9 quick-panel active tile fills the whole button — [Android Authority](https://www.androidauthority.com/samsung-one-ui-9-beta-hands-on-3667318/)
- **Contextual controls:** One UI 8.5 shows an Audio Eraser toggle and slider in the Quick Panel only during video playback — [SamMobile](https://www.sammobile.com/news/one-ui-8-5-samsung-galaxy-s26-ultra-biggest-changes/)

### Inferences
- For enterprise web, the "Now Bar / island" pattern carries over as a **persistent background-task tray**: exports, imports and long jobs in a compact pill that expands to a detail panel and stacks multiple jobs. That fits a toast/progress component better than one-shot toasts.
- The Samsung haptic rules translate to web **feedback-semantics rules**: error feedback is a distinct double pulse (on the web, a short shake or double flash; `navigator.vibrate` support is limited), and feedback stays synced with the visual motion. Restraint is the main lesson.
- Volume-limit haptics correspond to boundary feedback on sliders and steppers, such as a subtle bump or resistance when hitting min/max. That is a web-reproducible pattern.

### Gaps
- Samsung published no press-state animation values (scale or opacity).
- I found no detailed reviewer analysis of Glyph Progress behaviour, such as fill direction or animation.
- HyperOS 3 Super Island interaction details (drag-to-share, multi-island behaviour) could not be confirmed because the Gizmochina fetch returned 403.

## Key Question 4 — Accessibility and reduce-motion handling

### Takeaway
Samsung offers a binary **"Remove animations"** switch under Accessibility → Vision enhancements, which removes animations entirely rather than slowing them. Users can also pair it with a "Reduce transparency and blur" option, according to a community source. One UI 9 added accessibility conveniences: Text spotlight, Select to speak, mouse keys and a "What's new" entry. I found no documented reduce-motion handling for ColorOS, OxygenOS, HyperOS or Nothing OS.

### Cited Findings
- **"Remove animations"** sits under Accessibility → Vision enhancements on Galaxy S25, S26 and Fold devices and turns off on-screen animations to help with viewing issues — [AT&T device support (S25)](https://www.att.com/device-support/article/139872/samsung/s25/)
- A user reports the toggle removes animation completely, and says they wanted only to slow it, using the Developer-options animation scales as a workaround — [Samsung Community](https://r2.community.samsung.com/t5/Galaxy-A/Reduce-Animation/m-p/8991582)
- **"Reduce transparency and blur"** in the same Vision enhancements menu is mentioned in a January 2025 community tip as a performance aid on budget phones — **[UNVERIFIED label: community post only]** — [Samsung Community](https://r2.community.samsung.com/t5/Tech-Talk/Boost-your-Device/m-p/17945371)
- Older One UI (Android 9 era) labelled it "Reduce animations" under Advanced features, so naming has changed across versions — [PhoneArena](https://www.phonearena.com/news/Samsungs-One-UI-Android-Pie-update_id111190)
- **One UI 9 accessibility:**
  - A "What's new" menu in Accessibility.
  - **Text spotlight:** tap text to enlarge it in its own window, with adjustable font size and colours.
  - Physical-keyboard shortcuts open Accessibility settings.
  - Mouse keys gain speed and acceleration controls.
  - "Replace swipe with single tap" moves to Dexterity and interaction.
  - **Select to speak:** reads a selected item without full TalkBack.
  - TalkBack updates are unified with Google and ship via the Play Store.
  - Source: [9to5Google](https://9to5google.com/2026/05/13/samsung-one-ui-9-android-17-changelog/)
- Samsung's design principle "Comfort" names Dark mode, a high-contrast keyboard and adjustable font sizes and styles — [Samsung Developers — One UI](https://developer.samsung.com/one-ui/index.html)

### Inferences
- Samsung's choice of a removal switch over speed scaling mirrors `prefers-reduced-motion: reduce`. The community complaint shows users also want an intermediate "slower or less" option. A web system could honour `reduce` by swapping movement for opacity cross-fades, rather than cutting all feedback.
- Pairing "reduce transparency and blur" with reduced motion mirrors `prefers-reduced-transparency`. UIx blur layers should fall back to opaque surfaces under that media query, and also under low-power or performance constraints, given the One UI 8.5 blur stutter reports.
- "Text spotlight" (One UI 9) suggests an "enlarge this text" affordance for dense data tables, such as truncated cells. This is speculative as a web pattern.

### Gaps
- I found no official Samsung support page confirming the current "Reduce transparency and blur" label.
- I found no sources on reduce-motion or transparency settings in ColorOS 16, OxygenOS 16, HyperOS 3 or Nothing OS 4.
- I found no source on whether the Now Bar, blur or Parallel Processing behave differently when animations are removed.

## Key Question 5 — Samsung design-language docs with transferable principles

### Takeaway
Samsung publishes a One UI Design System on Samsung Developers. It has four core principles: **Focus**, a **viewing area at top and interaction area below** (reachability), **Comfort**, and **Responsiveness**. A motion section gives concrete, reproducible values: the default **"One UI Basic Path Interpolator" [0.22, 0.25, 0.00, 1.00]**, durations of **100 ms minimum and 500 ms maximum**, rules for when to use linear, ease-in and ease-out, cross-fade sequencing rules for images and text, and a "previous layer dims or blurs into the background" depth rule.

### Cited Findings
- **Principles:**
  - **Focus:** "Focus on the task at hand."
  - **Viewing and interaction areas:** the screen splits into "a viewing area at the top and an interaction area below" so that interaction stays within reach.
  - **Reachability:** elements stay within reach at any screen size, with content and functions added or removed per device.
  - **Comfort:** "Be visibly comfortable."
  - **Responsiveness:** "Make things responsive."
  - Source: [Samsung Developers — One UI Design System](https://developer.samsung.com/one-ui/index.html)
- **Motion principles:** Motion emphasises depth and the relationships between elements. Rules stay consistent so results are predictable. **When a new interface opens, the previous one dims or blurs into the background.** Motion should show context and preview interactions, and lively animation should draw attention "without demanding it" — [Samsung Developers — Motion basics](https://developer.samsung.com/one-ui/motion/basic.html)
- **Easing:** The default "One UI Basic Path Interpolator (One UI basic motion values) [0.22, 0.25, 0.00, 1.00]" accelerates quickly and then slows gradually. **Linear** is for transparency changes and should be avoided for movement, rotation or scale. **Ease-in** is for elements leaving or fading out. **Ease-out** should be avoided for elements leaving. **Ease-in-out** should be avoided when the duration is short relative to the distance moved. The page gives no numbers for the non-basic curves — [Samsung Developers — Motion basics](https://developer.samsung.com/one-ui/motion/basic.html)
- **Durations:** 100 ms is "the minimum recognizable length". Animations "should never exceed 500 ms to avoid interfering with subsequent tasks", and the exact duration scales with object size and travel — [Samsung Developers — Motion basics](https://developer.samsung.com/one-ui/motion/basic.html)
- **Cross-fade rules:** For **images**, the new image starts fading in before the old one is gone, to avoid a background flash or "glare". For **text**, the old text fully disappears before the new text fades in, to protect readability. The lock-to-home transition uses zoom, and AOD elements move aside to reveal the lock screen — [Samsung Developers — Motion basics](https://developer.samsung.com/one-ui/motion/basic.html)
- A section titled "Non-interrupted motion and interaction" exists but covers context and preview motion, not rules for interrupting animations — [Samsung Developers — Motion basics](https://developer.samsung.com/one-ui/motion/basic.html)
- Further guideline pages exist for motion intro, layout (basic, grid), haptics, and large-screen/foldable design — [Samsung Developers — One UI landing](https://developer.samsung.com/one-ui)

### Inferences
- Samsung's [0.22, 0.25, 0.00, 1.00] is an Android PathInterpolator control-point pair (x1, y1, x2, y2). It maps directly to CSS `cubic-bezier(0.22, 0.25, 0, 1)`, a strong ease-out with a long tail similar to "emphasized decelerate". UIx can compare it against its own motion-contract tokens.
- The 100–500 ms band and "never exceed 500 ms" are good CI-checkable bounds for a motion token linter.
- The image-overlap versus text-sequential cross-fade rule is directly reproducible. Image or skeleton-to-content swaps overlap their opacity, while label and text swaps are sequential (out, then in). This prevents unreadable mid-fade text in button labels, counters and status chips.
- "Viewing area top / interaction area bottom" carries over to web mostly for touch and tablet layouts: bottom-anchored primary actions and search, and large collapsible headers. Desktop enterprise apps gain less.

### Gaps
- The page gives no numeric values for linear, ease-in, ease-out or ease-in-out, no per-component durations, and no spring or press-state specs.
- I did not fetch the Samsung motion intro, layout or grid pages, so details on collapsing headers (the "viewing area" large title that collapses on scroll) are not sourced here.
- I found no design.samsung.com essay specific to One UI 7–9 visual language in this pass.
