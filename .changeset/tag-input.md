---
"@tensor_1/react": minor
"@tensor_1/tokens": minor
---

**`TagInput`** (HAR-1377): several short tags in one field, over the existing `.uix-taginput` / `.uix-tag` CSS. Enter or a comma adds a chip, a paste of "a, b, c" adds three; a duplicate (ignoring case and accents), a `validate` refusal or one past `maxTags` keeps the text and says why; `suggestions` open in a top-layer list once the person types or presses ArrowDown (Enter adds the active one, Escape closes it); Backspace in the empty field reaches the last chip, ArrowLeft / ArrowRight move between chips, Backspace or Delete removes one and focus stays with the tags (the field is the only tab stop); each change is announced politely. Works in `Field`; `name` submits one hidden value per tag; words via `labels` or the new `UixLabelsProvider` group `tagInput`. CSS: `.uix-taginput-field`, `.uix-taginput__message`, `.uix-taginput__popup`, the invalid and disabled states, and a long tag wraps inside its chip.
