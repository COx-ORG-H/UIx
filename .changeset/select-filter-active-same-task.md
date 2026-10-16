---
"@tensor_1/react": patch
---

`Select` (searchable): the narrowed list now has its active option from the moment it renders. The active option used to be pulled back into the filtered list one task after each keystroke, so in between the filter field named no option: a screen reader heard the active option drop and return on every keystroke, and an Enter that arrived in that window (fast typing, paste then Enter, a slow device) closed the list without choosing anything. The same gap followed every async load that changed the list.
