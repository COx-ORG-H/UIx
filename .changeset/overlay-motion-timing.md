---
"@tensor_1/tokens": minor
"@tensor_1/react": minor
---

Overlay timing (HAR-2578, motion rollout work package 1, part B), on the tokens part A added.

- **New tokens (additive) for the feedback kit:** `--uix-dur-change` (1200 ms, a change tint on the row or field that changed), `--uix-delay-pending` (300 ms before a pending indicator shows), `--uix-hold-pending` (500 ms it then stays at least), `--uix-hold-result` (1500 ms an in-place result holds).

- **Exits are faster than enters.** Modal, Drawer and Peek enter at `--uix-dur-slow` (240 ms) and leave at `--uix-dur-exit-slow` (160 ms); popovers, menus, Select and tooltips enter at `--uix-dur-fast` (120 ms) and leave at `--uix-dur-exit-fast` (80 ms). Every exit is ease-out. The closed state's rule carries the exit duration, the open state's the enter.
- **Popovers, menus, Select and SearchSuggest grow from their trigger:** `scale(.95)` plus opacity about the anchor point. `useAnchoredPosition` writes that point as `--uix-anchor-origin` on the overlay (`transform-origin: var(--uix-anchor-origin)`); the old `--uix-lift` slide away from the anchor is gone. Its placement check now accounts for a scale about that origin.
- **Keyboard-opened overlays do not animate.** A Modal, Drawer, Peek, Popover, Menu or Select opened or closed right after a key press (Enter on a button, ↓ on a menu trigger, Escape) carries `[data-uix-key-opened]`, which `motion.css` treats like `[data-uix-instant]`.
- **Tooltip delay group.** A `Tooltip` waits `--uix-delay-tooltip` (400 ms) before it opens on hover. While one is open, and for `--uix-delay-tooltip-skip` (300 ms) after the last one closed, a neighbour opens at once with no fade, and the bubble it replaces goes at once (two never overlap). Keyboard focus still opens it at once.
- **Toasts move on transitions:** they enter from the toaster's edge and leave toward it (`--uix-dur-slow` in, `--uix-dur-exit` out) and turn around if updated mid-exit. When a toast arrives or leaves, the others glide to their new place (`--uix-dur`, `--uix-ease-out`, so the one making room clears the newcomer early). A toast with a close action can be swiped away: past a third of its width, or flung faster than 0.11 px/ms, it flies out and closes; a slow, short drag snaps back. `toast-store` removes a leaving toast after the CSS `--uix-dur-exit`; `TOAST_LEAVE_MS` (its fallback) is now 110.
- **SearchSuggest** enters once per opening: a list that hides and reappears between result sets while the user types comes back in place (`[data-settled]`) instead of replaying its enter.
- **Bulk bar** enters on a transition from `@starting-style` instead of a keyframe.
