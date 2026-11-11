---
"@tensor_1/tokens": minor
---

Two quiet states (TENSOR HAR-2974). **Drawer:** while `.uix-drawer__body` scrolls on below the footer, a soft edge (`--uix-border-strong` fading up over 16 px) sits on its last visible line. It is drawn in CSS only, as a viewport-fixed edge under a surface cover that travels with the content, so a body that does not scroll, or is scrolled to the end, shows none. **Switch:** the off track carries a 1 px `--uix-text-muted` ring. Its `--uix-bg-active` fill alone was 1.3:1 on a light surface, so an off switch read as disabled. The ring clears 3:1 against the surface and the track in every theme and mode (`tests/drawer-edge-switch-off.test.mjs`).
