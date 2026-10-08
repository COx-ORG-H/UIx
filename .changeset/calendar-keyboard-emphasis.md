---
"@tensor_1/tokens": minor
"@tensor_1/react": minor
---

`SchedulingCalendar`: one tab stop per view with a keyboard model for days and items, item emphasis, and `List roving` (HAR-1527).

- **One tab stop per view.** The month grid, the Week/Day time grid and the agenda are each a single tab stop. Item buttons are no longer tab stops of their own (`tabIndex="-1"`); they are reached from their day.
- **Month.** Arrows, Home and End move between days as before. **Enter on a day with items now moves focus into them** (ArrowUp/ArrowDown, Home and End between them; Enter calls `onSelectEntry`; Esc returns to the day). Space or a click on the day number still calls `onSelectDate`, and so does Enter on a day with no items. A bar that covers several days is reached from any of them, and Esc returns to the day it was entered from.
- **Week/Day time grid.** The tab stop is a day head; ArrowLeft/ArrowRight move between days and Enter goes into the day's items and windows. On an item Enter selects it, or confirms a pending move; Esc drops a pending move, and with none pending now returns to the day head.
- **Agenda** (grouped, and the flat one without `agendaGroups`). ArrowUp/ArrowDown, Home and End walk the rows, the window notes and "open day", including rows a long agenda has not mounted yet. A step is counted in rows, so it crosses days with no row; a step that is still waiting for its row is given up when focus leaves.
- **The keys act on the calendar's own items only.** A field or link rendered inside a cell or an item keeps its keys. A row's "+N" is reached from the day it opens. An item reached with the pointer takes the tab stop to its day. A move not yet sent is dropped, and announced as cancelled, when the arrow keys leave the item.
- **Announcements.** A day button, and the day head of the time grid, is named with the date and `days[date].label`, through the new `labels.dayName` (`'{date}, {label}'`). Before, the time-grid head was named with the label alone; a consumer whose labels already say the date sets `dayName: '{label}'`.
- **`entry.emphasis: 'highlight' | 'dim'`** sets `data-highlight` / `data-dim` on the item in every view: a heavier edge in the text colour and a heavier weight, or quieter text. Neither changes a hue, the line style of the state or the band's leading edge. With forced colours a highlighted title is underlined and dimmed text is grey.
- **`List roving`**: the items of the list are one tab stop (`role="list"`, items `role="listitem"`); ArrowUp/ArrowDown, Home and End move between items, Enter and Space activate the focused one, and focus stays on the same item across re-renders with the same keys. A control inside an item keeps its own tab stop. Items may be wrapped, or rendered later by a child. Without `roving` the list is unchanged.
- **Tokens:** emphasis rules in `components/scheduling-calendar`, roving focus rules in `components/list`.

Behaviour to check when upgrading: code or tests that pressed Tab to reach a calendar item, or Enter on a day number to call `onSelectDate`, need the new keys (arrows after Enter; Space for the day). Esc on an item now returns to its day (month and time grid) and is not passed on. A day's accessible name now starts with the date (see `labels.dayName`).
