---
"@tensor_1/tokens": minor
"@tensor_1/react": minor
---

Remediate every S1–S4 finding from the 2026-07 in-depth accessibility audit. Sortable headers are real buttons, the rich select and CommandPalette follow the APG combobox pattern with `aria-activedescendant`, Inbox is a keyboard listbox, and rail-mode nav items keep their accessible names. React: named dialogs with `h2` titles and attribute pass-through, `useDialog(open, onClose?)` releases the scroll lock on a native Esc, WCAG 1.4.13 tooltips, Toast announcer and focus hand-off, a complete Tabs pattern with the new `TabPanel` export, virtual-Tree focus lifecycle and typeahead, Kanban Alt+Arrow moves, Field auto label association, non-hard-disabled loading buttons, a live-region and naming pass over the feedback family, and a skip link in AppShell. Tokens/CSS: a `forced-colors.css` layer for Windows High Contrast, a global `[hidden]` guard, focus-visible reveals for hover-revealed controls, 24px minimum targets, and the type scale moved from px to rem. Two new automated gates scan overlays in their OPEN state and assert keyboard operability.
