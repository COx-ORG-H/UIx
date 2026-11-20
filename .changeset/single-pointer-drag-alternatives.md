---
"@tensor_1/react": minor
"@tensor_1/tokens": minor
---

WCAG 2.5.7 Dragging Movements: every drag in the kit also works with single clicks (enterprise UX study, roadmap #19). `KanbanCard` with `onMove` now has a ⋯ Move menu (Move up, Move down, Move left, Move right); with `moveColumns`, `column` and `onMoveTo` the menu lists the columns instead of left and right. `disabledMoves` greys out the ends, `itemId` lets focus follow a card into its new column, `moveLabel` names it, and `moveMenu={false}` opts out where the product's own card menu already has the moves. A press on a `DashboardCanvas` move or resize handle (click, tap, Enter, Space) without dragging shows four step buttons beside it that move or resize the widget one cell per press; `onLayoutChange` reports them as `source: 'buttons'`, and the default `instructions` say so. New label namespaces in `UixLabelsProvider`: `kanban`, `dashboardCanvas` and `viewMenu` (ViewMenu's column rows). The Accessibility docs page gains a table of every drag in the kit and its click path, with the gaps still open.
