---
"@tensor_1/tokens": minor
"@tensor_1/react": minor
---

`FilterEditor` enum presets (HAR-1505; TENSOR change calendar state scope).

- **`FilterField.presets`:** named selections (`FilterPreset { id, label, values }`) shown as toggle chips (`aria-pressed`) in a labelled group above the search box and options. Activating one replaces the selection with its values. The preset equal to the selection (as a set) is pressed, and editing the options un-presses it. No native `<select>`.
- **`matchFilterPreset(field, value)`** returns that preset. `summarizeFilter` returns its label, using the new optional `preset` summary label (default `'{label}'`, which also accepts `{field}`).
- **Labels:** an optional `labels.presets` (default "Presets") names the group. `UixLabelsProvider` gains a `filterEditor` entry for every `FilterEditor` word, and an explicit `labels` prop still wins.
- **Tokens:** `.uix-filter-editor__presets` in `components/table-toolbar`.
