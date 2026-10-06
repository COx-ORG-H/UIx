---
"@tensor_1/tokens": minor
"@tensor_1/react": minor
---

New `TextDiff`, a two-way diff of two texts (HAR-1368; TENSOR C11 knowledge-article version diff).

- **Line diff:** a Myers diff. Removed and added lines are paired by similarity, so a renumbered list still lines up, with the changed words marked inside each pair.
- **Word diff:** compares prose word by word.
- **Views and folding:** split (stacks in narrow containers) or unified. `context` folds long unchanged runs, and focus moves to the first revealed line.
- **Not colour alone:** changes are `<del>`/`<ins>` with a −/+ sign and spoken words.
- **Large input:** a `maxTokens` limit, and a `maxEdits` budget past which the changed middle shows as one replacement.
- **Model:** `diffText`, `diffTokens`, `textDiffRows`, `tokenizeText`.
- **Tokens:** a new `components/text-diff` module.
