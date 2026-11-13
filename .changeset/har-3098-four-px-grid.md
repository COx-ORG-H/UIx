---
"@tensor_1/tokens": minor
---

HAR-2985, HAR-3092, HAR-3098 — the kit's own spacing sits on the 4 px grid.

- Every field with an icon uses one geometry: the icon sits `--uix-space-3` in (`--uix-space-4` at lg), is `--uix-icon-md` wide (`--uix-icon-lg` at lg), and the text padding is that inset, the icon and `--uix-space-2` — 40 px, 48 px at lg — in `InputGroup`, `SearchSuggest` and the editorial `SearchBar`, so fields stacked in a form line their icons and text up. Like every kit padding it sits inside the field's 1 px border. A trailing icon mirrors it. A small `InputGroup` (`Input size="sm"`) gets a 16 px icon `--uix-space-2` in, with its text at 32 px; before, it took the 20 px icon of the default size. Before, five fields used three insets (10, 12, 14 px), three icon sizes (17, 20, 24 px) and four gaps, with text at 36–44 px. The large `SearchBar` icon goes from 17 px to the lg icon size.
- A button's icon-to-label gap is `--uix-space-2` (8 px) at every size but xs (`--uix-space-1`, a 24 px button with a 16 px icon). It was `.5em`: 7 px, 6.25 px on a small button.
- The sidebar favourites heading's gap and the empty state's inset are `--uix-space-2` (they were 6 px).
