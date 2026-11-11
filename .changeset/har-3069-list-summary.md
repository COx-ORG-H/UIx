---
"@tensor_1/react": minor
"@tensor_1/tokens": minor
---

ListSummary (HAR-3069): a long list of names (roles, teams, recipients) reads as a count, the first few names and the words for the rest ("and 13 more"), with one button that shows the whole list in place and hides it again (`aria-expanded`, `aria-controls`). A list only one name longer than `max` is shown whole. Every word is a prop. The toggle is underlined and has a 24 px hit area that leaves the line height alone (`.uix-list-summary`, `list-summary.css`). Built for TENSOR's works-council monitoring table, where up to 16 roles per row made every row 5 to 7 lines tall.
