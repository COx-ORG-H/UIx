---
"@tensor_1/react": minor
"@tensor_1/tokens": minor
---

**The display-preference contract** (HAR-1372, batch e8; MOTUS C-4 / B-A12, TENSOR A7 / B14): theme, contrast, text size, motion and density, owned by UIx instead of every product.

- Tokens (`components/display-preferences.css`, in the bundle and in `@tensor_1/tokens/components/display-preferences`): `<html data-contrast="more">` re-points `--uix-text-hushed`, `--uix-text-muted`, `--uix-border` and `--uix-border-strong` to stronger mixes of the theme's own text and surface (muted and hushed text >= 7:1, hairlines >= 3:1, light and dark); `data-text-scale="sm|lg|xl"` scales the rem type ramp (93.75 / 112.5 / 125 %); `data-density="compact|comfortable"` re-points `--uix-row-h` and `--uix-control-h`; `data-motion="reduce"` applies the reduced-motion policy (`motion.css`, and the pulse that replaces each looping indicator) without the OS setting. No new `--uix-*` names; nothing changes without an attribute.
- React: `useDisplayPreferences({ storageKey, defaults, apply })` (stored in `localStorage`, follows `prefers-color-scheme` / `prefers-contrast` for `system`, other tabs and other users of the hook in the tab; writes the attributes on `<html>` with every transition suspended for that frame, so nothing fades between themes); `ThemeSwitcher` (light / dark / system radio group over `Segmented`, `display="icons"`); `DisplayPreferences` (the five settings as labelled radio groups, `settings` to pick some); `displayPreferencesScript(storageKey, defaults)`, an inline head script that applies the stored choice before the first paint; the pure model (`parseDisplayPreferences`, `resolveDisplayAttributes`, `applyDisplayAttributes`, `readSystemDisplayPreferences`, `DEFAULT_DISPLAY_PREFERENCES`, `DISPLAY_PREFERENCE_OPTIONS`). Words: `labels` or `UixLabelsProvider` `displayPreferences`.
- `useReducedMotion` / `prefersReducedMotion` also answer true for `<html data-motion="reduce">`.
