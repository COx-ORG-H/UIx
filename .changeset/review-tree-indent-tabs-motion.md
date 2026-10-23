---
"@tensor_1/react": patch
"@tensor_1/tokens": patch
---

**`Tree` indents its levels again**: `.uix-tree ul { padding: 0 }` beat `.uix-tree__group`'s indent, so every nested row of a non-virtual tree sat at the same x as its parent (levels 5+ kept their guide line). The group rule is now scoped under `.uix-tree`. Found while checking HAR-1828's org chart in a browser.

**`Tabs` (line)**: the underline moves at once while the keyboard is in the tab row (arrow keys switch tabs many times a minute); a pointer choice keeps the short slide, and reduced motion has none.
