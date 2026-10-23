---
"@tensor_1/react": minor
"@tensor_1/tokens": minor
---

Lists that move visibly, the success outcome, sliding tab and segment indicators (motion rollout WP2: HAR-2586, HAR-2588, HAR-2589).

- `MotionList` (`items`, `getKey`, `renderItem`, `as`): items enter (rise 8 px + fade), leave (fade in place, then the rest glide up) and re-sort (FLIP glide), never on first render; focus stays on a moved item, moves to the next item when the focused one leaves, and is never pulled in from outside. New stylesheet `components/list-motion.css` (`.uix-motion-list`, `[data-uix-entering]`, `[data-uix-exiting]`, `[data-uix-moving]`).
- `useDeferredReorder(items, getKey)` → `{ items, held, listProps }`: a live re-sort waits while a mouse is over the list or keyboard focus is inside it.
- `SuccessState` (`title`, `headingLevel`, `reference`, `referenceLabel`, `next`, `nextTitle`, `action`, `focusOnMount`, `variant`): a mark that draws once, the title focused on mount on a page, what happens next and the next action. Classes `.uix-success*` in `states.css`.
- Tabs (line, pill) and Segmented: the selection mark slides on a click and jumps from the keyboard; `useSlidingIndicator`. Both render a hidden `.uix-tabs__indicator` / `.uix-segmented__indicator` first child (decorative, `aria-hidden`); the options' own marks show until it is placed, in forced colours, and in Segmented's link mode.
- CollapsibleSection: opening fades the body in on `::details-content`; an already open section, a keyboard open and closing are instant.
- All of it follows the in-app reduced-motion choice (`data-motion="reduce"`) as well as the OS setting.
