---
"@tensor_1/tokens": minor
---

Two quiet states (TENSOR HAR-2974). **Drawer:** while `.uix-drawer__body` scrolls on below the footer, the footer casts a soft `--uix-border-strong` shadow up onto the body's last visible line. The body's own scroll timeline (`scroll-timeline: --uix-drawer-body`) removes it in the last 4 % of the scroll, and a body that does not scroll shows none. It behaves the same under reduced motion (checked in Chromium) and is absent where scroll timelines are not supported. It is a `box-shadow`, under a `motion-allow`, because a pseudo-element beside the buttons hides them from axe-core's contrast check. Nothing paints behind the text, so contrast scans can still measure it. **Switch:** the off track carries a 1 px `--uix-text-muted` ring. Its `--uix-bg-active` fill alone was 1.3:1 on a light surface, so an off switch read as disabled. The ring clears 3:1 against the surface and the track in every theme and mode (`tests/drawer-edge-switch-off.test.mjs`).
