---
"@tensor_1/react": minor
"@tensor_1/tokens": minor
---

`useViewTransition()`: an occasional surface morphs between two states (the smartphone-OS study, Tier 2 item 8: spatial continuity).

- `start(update, { parts, scope, className })` wraps the browser's View Transitions API. `update` runs in `flushSync` while the old picture is held. `parts` is read before and after the update and pairs elements by key, so a list row can open into its detail. Only the parts are named, for one transition, and the hook gives back whatever name was there. With `scope`, engines with element-scoped transitions (Chromium 147+) run it on that element; others use the document. Also exported: `viewTransitionSupported()`, `VIEW_TRANSITION_ATTR`, `VIEW_TRANSITION_CLASS`.
- The kit's motion layer times kit transitions only (`[data-uix-view-transition]`): the box glides on `--uix-ease-glide` over `--uix-dur-glide` (280 ms), and the two pictures swap in `--uix-dur` (160 ms) and never scale. The root takes no picture, so the rest of the page changes at once instead of cross-fading. The held picture lets the pointer through, so a click elsewhere mid-morph lands; the morphing part takes clicks again once it settles.
- The update simply runs, with no transition, from the keyboard (`keyboardInitiated()`), under reduced motion (the OS or `data-motion="reduce"`), on a hidden page and in a browser without the API. A second start ends the running one.
- `DataWorkspace`: Maximize picked with the pointer grows the workspace into the window and shrinks it back. Escape and the keyboard stay instant.
- `DashboardCanvas`: after a pointer drop, the cards that moved glide to their new places, on the canvas itself where the engine can. Arrow-key steps stay instant.

Consumers: with the API present, a pointer Maximize or a pointer drop now calls `onMaximizedChange` / `onLayoutChange` one frame later (once the browser holds the old picture), and the morph ends within 280 ms. A real-browser test that reads the new state right after the click or drop should wait for it, for example until no `[data-uix-view-transition]` is left. jsdom has no API, so unit tests are unchanged.
