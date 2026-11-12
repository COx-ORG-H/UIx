---
"@tensor_1/tokens": minor
---

Off switch and drawer footer (TENSOR HAR-2974). **Switch:** the off track carries a 1 px `--uix-text-muted` ring. Its `--uix-bg-active` fill alone was 1.3:1 on a light surface, so an off switch read as disabled. The ring clears 3:1 against the surface and the track in every theme and mode (`tests/drawer-edge-switch-off.test.mjs`).

**Drawer footer:** its actions wrap (`flex-wrap: wrap; align-items: center`), so a product passes kit Buttons straight into `footer` with no wrapper of its own. Actions that do not fit on one line, such as a long German "Abbrechen" beside "Speichern" in a narrow drawer, move to a second line instead of running past the drawer's edge.
