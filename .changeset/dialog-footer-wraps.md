---
"@tensor_1/react": patch
---

ConfirmDialog and PromptDialog: the footer buttons wrap. A long confirm label (a 35-character German "Auf nicht schwerwiegend herabstufen") breaks onto a second line at 320 px instead of starting outside the dialog (HAR-2541).
