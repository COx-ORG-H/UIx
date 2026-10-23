---
"@tensor_1/react": minor
"@tensor_1/tokens": minor
---

Drag affordances shared by every draggable thing (motion rollout WP2: HAR-2590). New stylesheet `components/drag.css`: `[data-uix-drag="lifted"]` (pointer: lift, scale 1.02, deeper shadow), `[data-uix-drag="grabbed"]` (keyboard: dashed ring, no motion), `[data-uix-drop-target]`, `.uix-drop-line` and `[data-uix-settle]` (the landing). Reduced motion (OS or `data-motion="reduce"`) keeps the states and drops the scale and the landing.

- `SortableList` rows lift while dragged and settle when dropped; `DashboardCanvas` widgets settle where a pointer drag drops them (keyboard steps stay instant).
- `Kanban`: `KanbanCard dragging`, `KanbanColumn dropTarget`, new `KanbanDropLine`.
- `settleDrop(el)` and `useKeyboardGrab({ label, onMove, onDrop, onCancel, labels })` (Space/Enter pick up and drop, arrows move, Escape or leaving puts back, every step said politely), with `DEFAULT_KEYBOARD_GRAB_LABELS` and the types `GrabDirection`, `KeyboardGrabLabels`, `UseKeyboardGrabOptions`, `UseKeyboardGrabResult`.
