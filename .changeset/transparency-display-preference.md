---
"@tensor_1/react": minor
"@tensor_1/tokens": minor
---

A transparency display preference: `standard | reduce | system`, the kit's answer to iOS "Reduce Transparency" and One UI "Reduce transparency and blur".

- `DisplayPreferences` gets a sixth row, Transparency (Standard / Reduce / System), between Motion and Density. `useDisplayPreferences` and `displayPreferencesScript()` write `<html data-transparency="reduce">` the way they write the other axes, before the first paint. The default is `system`, which follows `prefers-reduced-transparency: reduce`. Only Chromium reports that query, so the in-app choice is the one that works everywhere. Labels: `transparency`, `transparencyStandard`, `transparencyReduce` (and the shared `system`), also through `UixLabelsProvider`.
- Under `data-transparency="reduce"`, every blur the kit draws is gone. `--uix-scrim-blur`, `--uix-arrive-blur` and `--uix-swap-blur` resolve to `0px`, and the progress overlay (`.uix-overlay-progress`) stops blurring and turns firmer (60 % → 85 % of the page colour). The modal and drawer scrim (`--uix-scrim`) goes from .5 to .6 black, so the layer still stands apart from a page that is now sharp. `blurIn` draws nothing, and it clears a running blur when the setting comes on. Rows still fade and move in.
- `data-contrast="more"` implies reduced transparency, in the stylesheet and in the new `prefersReducedTransparency()` / `useReducedTransparency()`, without rewriting the stored transparency choice.
- New exports: `TransparencyPreference`, `prefersReducedTransparency`, `useReducedTransparency`. `DisplayPreferenceValues` has a required `transparency` field. A stored value from before this release parses as `system`. `SystemDisplayPreferences.reducedTransparency` is optional.

The setting is binary on purpose: there is no intensity slider. Nothing changes for a page that does not set the attribute.
