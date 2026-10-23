---
"@tensor_1/tokens": patch
"@tensor_1/react": patch
---

**Segmented: the selected option is a visible boundary** (review of HAR-1372): its lifted fill was only 1.05:1 (dark) and 1.09:1 (light) against the track, so the selected option now also draws an inset `--uix-text-muted` hairline (4.9:1 light, 7:1 dark on the track; WCAG 1.4.11). The weight stays, so selecting never shifts the options beside it. Visible change for every `Segmented` / `.uix-segmented` (ThemeSwitcher, DisplayPreferences, view toggles).
