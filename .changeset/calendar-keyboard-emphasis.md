---
"@tensor_1/tokens": minor
"@tensor_1/react": minor
---

`SchedulingCalendar`: one tab stop per view with a keyboard model for days and items, item emphasis, and `List roving` (HAR-1527).

- **One tab stop per view.** The month grid, the Week/Day time grid and the agenda are each a single tab stop. Item buttons are no longer tab stops of their own (`tabIndex="-1"`); they are reached from their day.
- **Month.** Arrows, Home and End move between days as before. **Enter on a day with items now moves focus into them** (ArrowUp/ArrowDown, Home and End between them; Enter calls `onSelectEntry`; Esc returns to the day). Space or a click on the day number still calls `onSelectDate`, and so does Enter on a day with no items. A bar that covers several days is reached from any of them, and Esc returns to the day it was entered from.
- **Week/Day time grid.** The tab stop is a day head; ArrowLeft/ArrowRight move between days and Enter goes into the day's items and windows. On an item Enter selects it, or confirms a pending move; Esc drops a pending move, and with none pending now returns to the day head.
- **Agenda.** ArrowUp/ArrowDown, Home and End walk the rows, the window notes and "open day", including rows a long agenda has not mounted yet.
- **Announcements.** A day button's accessible name is `days[date].label` when given.
- **`entry.emphasis: 'highlight' | 'dim'`** sets `data-highlight` / `data-dim` on the item in every view: a heavier edge and weight, or quieter text. Neither changes a hue.
- **`List roving`**: the list is one tab stop (`role="list"`, items `role="listitem"`); ArrowUp/ArrowDown, Home and End move between items, Enter and Space activate the focused one, and focus stays on the same item across re-renders with the same keys. Without `roving` the list is unchanged.
- **Tokens:** emphasis rules in `components/scheduling-calendar`, roving focus rules in `components/list`.

Behaviour to check when upgrading: code or tests that pressed Tab to reach a calendar item, or Enter on a day number to call `onSelectDate`, need the new keys (arrows after Enter; Space for the day).
