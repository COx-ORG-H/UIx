---
"@tensor_1/react": minor
"@tensor_1/tokens": minor
---

**`Inset`** (HAR-1818; MOTUS UXR-05b): a bordered, sunken well inside a card body for a preview or a specimen (a rendered header, an image crop, a code sample), over the new `.uix-inset` class in `card.css`. A `--uix-border` hairline, `--uix-radius-md`, `--uix-bg-subtle` and `--uix-space-4` padding; `padding="sm"` (`.uix-inset--sm`, `--uix-space-3`) for a dense card and `tone="surface"` (`.uix-inset--surface`) for a well on a panel that is already subtle. It has no shadow and no card semantics, so it replaces a `Card` nested in a `Card` and local "preview box" CSS. The content's layout is the consumer's. The Card reference page shows it in both themes.
