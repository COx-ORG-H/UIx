---
"@tensor_1/tokens": minor
---

Two quiet states (TENSOR HAR-2974). **Drawer:** while `.uix-drawer__body` scrolls on below the footer, a soft edge (`--uix-border-strong` fading up over 16 px, drawn by the footer's `::before`) sits on the body's last visible line. The body's own scroll timeline (`scroll-timeline: --uix-drawer-body`) fades it out at the end, and a body that does not scroll shows none. It is opacity only, behaves the same under reduced motion (checked in Chromium), and is absent where scroll timelines are not supported. Nothing paints behind the text, so contrast scans can still measure it. **Switch:** the off track carries a 1 px `--uix-text-muted` ring. Its `--uix-bg-active` fill alone was 1.3:1 on a light surface, so an off switch read as disabled. The ring clears 3:1 against the surface and the track in every theme and mode (`tests/drawer-edge-switch-off.test.mjs`).
