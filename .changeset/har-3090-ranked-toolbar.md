---
"@tensor_1/react": minor
"@tensor_1/tokens": minor
---

HAR-3090 — the table toolbar ranks its controls. `DataWorkspace` leads with search, then the filter chips and "+ Filter", then the saved view with Save changes (`.uix-toolbar__lead`); the end (`.uix-toolbar__end`) holds View, now with a columns icon beside its word, one "More" menu and the product's own actions. "More" is the new `ToolbarMore` (the kit `Menu` behind a quiet trigger, word from `labels.more` / `UixLabelsProvider` `toolbar.more`): DataWorkspace puts Save as, the product's new `toolbarMenu` items (group by, export) and Maximize (a checkbox item) there. Products that draw their own toolbar compose `ToolbarMore` with the two zone classes. UIx ADR-0005 has an addendum. Maximize and Save as are no longer buttons in the row: tests that clicked them open "More" first (MOTUS's workspace e2e test does). `labels.restore` is no longer shown (Maximize carries its state as checked); an unset `labels.more` takes the provider's `toolbar.more`, so a product that translates only that gets it in the workspace too.
