---
"@tensor_1/react": minor
"@tensor_1/tokens": minor
---

**Sidebar actions and search, `AccountMenu`, the nav-tier hotkey and the phone nav tier** (HAR-1371, batch e7; MOTUS C-2 / B-A13 / B-A15, TENSOR B15 / B31):

- `Sidebar actions` (`.uix-sidebar__actions`): controls beside the brand (a mode toggle, a "…" `Menu`, collapse-all); hidden in the rail. `Sidebar search={{ label, shortcut, onActivate }}` (`.uix-sidebar__search`): a search row that opens your search or command palette and shows its keys (`KbdCombo`, `aria-keyshortcuts`); showing the keys does not bind them. `Sidebar footer` (`.uix-sidebar__foot`): a slot pinned to the bottom. In the rail the search row and the account trigger are centred icon buttons that keep their names.
- `AccountMenu user={{ name, sub, avatar, status }} items={…}` (`.uix-account-menu`): the avatar (photo, your node, or the initials, hidden from assistive tech), the name and a second line as the trigger of a `Menu`; `collapsed` for the rail; `placement` (default `top-start`); words through `labels` or `UixLabelsProvider` `accountMenu.menu`. Also `accountInitials()` and `DEFAULT_ACCOUNT_MENU_LABELS`.
- `AppShell navHotkey="["` switches the sidebar between `full` and `rail` (not while typing in a field or with Ctrl/⌘/Alt), instantly. `AppShell` keeps the tier itself when `nav` is not set (`defaultNav`), and reports it through `onNavChange`; `navTierStorageKey` remembers it in `localStorage`, applied before the first paint (and reported once, so your `Sidebar nav` can follow).
- `AppShell phoneNav="drawer"` (`[data-phone-nav]`): at 40rem and under the sidebar column goes and a menu button (`.uix-shell__nav-button`, at the start of the topbar or the top of main) opens the sidebar in a start-side `Drawer`; Escape closes it and returns focus, following a link closes it. Words: `openNavLabel` / `navigationLabel` or `appShell.openNav` / `appShell.navigation`.

All additive; a shell without these props renders as before.
