---
"@tensor_1/tokens": minor
"@tensor_1/react": minor
---

The motion contract and its gate (HAR-2578, motion rollout work package 1, part A). The canonical vocabulary is the docs Foundations → Motion page.

- **New tokens (additive):** exit durations `--uix-dur-exit-fast` (80 ms), `--uix-dur-exit` (110 ms), `--uix-dur-exit-slow` (160 ms), about two-thirds of each enter; `--uix-delay-tooltip` (400 ms) and `--uix-delay-tooltip-skip` (300 ms); loop durations `--uix-loop-spin` (600 ms), `--uix-loop-progress` (1200 ms), `--uix-loop-shimmer` (1400 ms), `--uix-loop-ping` (1600 ms), `--uix-loop-blink` (1100 ms), `--uix-loop-pulse` (2000 ms); `--uix-dur-highlight` (2400 ms). No value of an existing token changed. `--uix-ease-in-out` keeps `cubic-bezier(.77,0,.175,1)`; the spec's unshipped `.4,0,.2,1` was corrected to it. `--uix-ease-in` stays for compatibility but must not be used: an accelerating exit reads as lag.
- **Gate `check-motion.mjs` in `test:contract`:** fails on a raw time value, `transition: all`, an ease-in curve, an animated layout property (width, height, inset, margin, padding, grid tracks, box-shadow), an infinite or moving animation with no `prefers-reduced-motion` rule for its selector, and a `:hover` that moves or reveals outside `@media (hover: hover) and (pointer: fine)`. Every raw time in the kit is now a token.
- **Reduced motion keeps feedback:** under `prefers-reduced-motion: reduce` transitions keep only fades and colour changes (transform and layout glide drop out), instead of every transition being cut. Spinner, Button loading, Skeleton, indeterminate Progress, SaveStatus, a running Flow node and Heartbeat pulse slowly (`uix-pulse`) instead of freezing. Product keyframes still end at once.
- **`useReducedMotion()` and `prefersReducedMotion()`** (new exports) for motion that JavaScript drives.
- **`Modal instant`** opens and closes with no animation (`[data-uix-instant]`); `CommandPalette` marks the dialog or popover it sits in itself, so a palette in a plain `Modal` no longer animates for 240 ms. `[data-uix-cmdk-dialog]` still works.
- **Hover gating:** card lift, kanban lift, the avatar edit overlay, the inline-edit pencil, view-menu grips and the legacy `[data-uix-tip]` move or reveal on hover only on a fine pointer. **Table row actions, the pin, the id-cell arrow, the cell-edit pencil, the sidebar star and the favourites menu trigger are now visible at rest on touch screens**; on a fine pointer they still reveal on hover or keyboard focus.
- **No layout animation:** `Meter` and `Progress` move on `transform` (the React components set `--val`; a legacy inline `width` still works, without motion). The AppShell nav tiers and sidebar nav groups switch instantly instead of animating grid tracks. Box-shadow changes step instead of animating (focus rings appear instantly). `.uix-arrival` fades an outline instead of a box-shadow.
- **Toast exit** runs at `--uix-dur-exit` with ease-out instead of ease-in.
- PR template: a Motion line. Spec §5.9 corrected (no more ease-in exits).
