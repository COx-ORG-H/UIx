/* WCAG 2.2 SC 2.5.7 Dragging Movements (AA), shown on the Accessibility page: every place the kit
 * lets a person drag, and how the same thing is done with single clicks or taps and no drag. A
 * keyboard path does not count for 2.5.7 (it is 2.1.1); it is listed beside it. EN 301 549 V4.1.1
 * brings 2.5.7 in. Audited 2026-11 (enterprise UX study, roadmap #19); the clicks-only proof for
 * the first rows is tests/a11y/single-pointer.spec.mjs.
 * status: 'had' (a click path was already there), 'added' (added by the audit), 'gap' (none in
 * the kit yet: the product must provide it, follow-up open), 'other' (another piece of work). */

export const DRAG_ALTERNATIVES = [
  {
    component: 'SortableList', drag: 'Drag a row by its grip to a new place.',
    pointer: 'Move up and Move down buttons on every row, always shown. Focus stays on the button; at an end the other one takes it.',
    keyboard: 'Alt+↑ / Alt+↓ in a row; ↑ / ↓ on a focused grip.', status: 'had',
  },
  {
    component: 'ViewMenu column rows', drag: 'Drag a column by its grip to reorder the table.',
    pointer: 'The row\'s ⋯ menu: Move up, Move down. Focus returns to that row\'s ⋯ button. Words also from <code>UixLabelsProvider</code> <code>viewMenu</code>.',
    keyboard: 'The same ⋯ menu; ↑ / ↓ on a focused grip.', status: 'had',
  },
  {
    component: 'KanbanCard', drag: 'The product\'s card drag, within a column and between columns.',
    pointer: 'A ⋯ Move button on the card: Move up, Move down, and Move to a column (<code>moveColumns</code>, <code>onMoveTo</code>) or Move left / Move right. On whenever <code>onMove</code> or <code>onMoveTo</code> is given. Focus returns to the card\'s Move button, also in its new column (<code>itemId</code>).',
    keyboard: 'Alt+arrows on the card (<code>onMove</code>), or <code>useKeyboardGrab</code>.', status: 'added',
  },
  {
    component: 'DashboardCanvas (move)', drag: 'Drag a widget by its move handle.',
    pointer: 'Press the handle: four step buttons (↑ ← → ↓) beside it move the widget one cell per press and stay open; Done, Escape or a press elsewhere puts them away.',
    keyboard: 'Arrow keys on the focused handle.', status: 'added',
  },
  {
    component: 'DashboardCanvas (resize)', drag: 'Drag the corner handle.',
    pointer: 'Press the handle: Narrower, Wider, Shorter, Taller, one row or column per press, inside the widget\'s limits.',
    keyboard: 'Arrow keys on the focused handle.', status: 'added',
  },
  {
    component: 'BuilderCanvas', drag: 'Drag an item onto another to reorder.',
    pointer: 'Move up and Move down buttons on every item.', keyboard: 'The same buttons.', status: 'had',
  },
  {
    component: 'OrgChart', drag: 'Drag the background to pan.',
    pointer: 'The frame\'s scrollbars, and Zoom in, Zoom out and Fit.', keyboard: 'Arrow keys between people.', status: 'had',
  },
  {
    component: 'Drawer, Peek, Toast', drag: 'Swipe to dismiss.',
    pointer: 'The Close or Dismiss button.', keyboard: 'Escape (Drawer, Peek).', status: 'had',
  },
  {
    component: 'SavedViewMenu', drag: 'Drag a saved view by its grip within its section.',
    pointer: 'None in the kit yet. The product\'s <code>actions</code> ⋯ menu has to offer Move up and Move down.',
    keyboard: '↑ / ↓ on a focused grip.', status: 'gap',
  },
  {
    component: 'SchedulingTimeline, SchedulingCalendar time grid', drag: 'Drag a bar or an entry to a new time.',
    pointer: 'None in the kit yet. <code>onSelectItem</code> / <code>onSelectEntry</code> open the product\'s editor, which has to let the times be typed or picked.',
    keyboard: 'Shift+arrows, then Enter; Alt+Shift+arrows resize a bar.', status: 'gap',
  },
  {
    component: 'RelationshipGraph', drag: 'Drag to pan, pinch to zoom.',
    pointer: 'Zoom in, Zoom out, Fit and Reset. No pan buttons yet: a part of a large map can be out of reach without a drag.',
    keyboard: 'Arrow keys pan the focused map and move between nodes.', status: 'gap',
  },
  {
    component: 'DataWorkspace column resize', drag: 'Drag the grip at a header\'s end edge.',
    pointer: 'Click the grip without dragging: a width popover with a number field, − and + (the next stop of the column-width scale), Fit to content and Default width. A double-click fits too. Focus returns to the grip (roadmap #11, <code>onColumnWidthsChange</code>).',
    keyboard: '← / → on the focused grip (a separator), Shift for the scale, Home / End; Enter opens the popover.', status: 'added',
  },
];

export const DRAG_STATUS_LABELS = { had: 'In place', added: 'Added', gap: 'Gap', other: 'Elsewhere' };
