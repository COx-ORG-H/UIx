---
'@tensor_1/tokens': minor
'@tensor_1/react': minor
---

Motion, rebuilt natively from a study of animate-ui (operator decisions 2026-11-08). No animate-ui code and no animation library: springs are CSS `linear()` curves on UIx tokens, and the rest is CSS plus small React hooks.

- **Tokens:** `--uix-ease-glide` / `--uix-dur-glide` (a spring with no overshoot, 280 ms, reads as ~175 ms) for marks that move between items; `--uix-ease-pop` / `--uix-dur-pop` (a 3 % overshoot) for a control growing from its trigger; `--uix-stagger-rows` (30 ms); `--uix-scrim-blur` (4 px). `--uix-ease-spring` stays for compatibility.
- **One gliding hover mark** in Sidebar, Menu and Select lists (`useHoverGlide`): a single `aria-hidden` `.uix-glide` layer, cut to the pointer's row with `clip-path`. Pointer only; a key press hides it. **Markup:** the sidebar `<nav>`, the menu popover and the select listbox gain an `aria-hidden` `.uix-glide` span as their first child; the sidebar also gains a hidden `.uix-sidebar__mark`. Exact-markup snapshots of these components need updating.
- **Sidebar:** the current-page tint slides to a clicked row (as Tabs); a group's rows arrive staggered from the inline end; expanding from the rail, labels clear in from a 2 px blur. The width still changes at once.
- **Select and Menu:** the list grows from `.9`; its rows arrive top to bottom, 30 ms apart, 8 px in from the inline end, clearing from a blur (not when opened from the keyboard). The picked option's check draws itself; the trigger's new value rises in (never on first render).
- **Tooltip:** grows from `.9` on the pop spring. In a delay group the bubble glides to a neighbour within 320 px, its background resizing and its text clipped and clearing from a blur. **Markup:** the bubble's content is wrapped in `.uix-tooltip__content`; `getByRole('tooltip')` text is unchanged. The bubble is `overflow: visible` (the UA's popover `overflow: auto` made it 10 px taller for a frame mid-glide, so it landed too high).
- **Drawer:** side drawers float `--uix-drawer-gap` (8 px) in from the screen edges with `--uix-radius-lg` corners; the bottom sheet stays edge to edge. The panel arrives on the glide spring and fades (so reduced motion still shows it arriving); the scrim and its blur grow in. Touch and pen can drag it toward its edge to close (past a third, or a fling); with `dirty` it settles back and asks first; the mouse keeps close, Escape and the backdrop.
- **Modal:** the scrim's blur grows in with the dim.
- **Checkbox:** the tick draws itself (stroke over `pathLength` 1); the radio dot pops on the calmer `--uix-ease-pop`.
- **Animated icons:** `animate` on any icon (`<DownloadIcon animate />`): hovering its control plays one short motion (arrow nudge, plus/close quarter turn, gear one tooth, refresh half turn, bell tip, send lift, download/upload arrow, bin lid, copy sheet, star pop); a check draws itself on appear. Adds `data-icon` and `data-animate` only when set. Hover only; never under reduced motion.
- **Step entrance:** `.uix-anim-step-forward` / `.uix-anim-step-back` for a panel keyed by its step (16 px from the way the person is going, mirrored in RTL).
- **Gates:** `check-motion` passes with every new loop/moving rule behind reduced motion; `motion-glide-dom.test.mjs` and `tests/a11y/motion-glide.spec.mjs` (both themes) prove the glide, the tooltip landing, the staggered rows, the floating drawer, the icons and that keyboard and reduced motion get none of it.
