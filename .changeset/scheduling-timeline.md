---
"@tensor_1/tokens": minor
"@tensor_1/react": minor
---

New `SchedulingTimeline`: lanes of bars on a time axis (HAR-1364; TENSOR C8, the change day/week timeline, rollout Gantt rows and licence-renewal markers).

- **Props:** `lanes`, `items` (`laneId`, `title`, `start`, `end`, `state`, `meta`, `movable`), `range`, `scale` (`hour`/`day`/`week`/`month`), `timeZone`, `locale`, `overlays` (`freeze`/`maintenance`/`blackout`, all lanes or one), `markers`, `now`, `weekStartsOn`, `tickWidth`, `step`, `formatTick`, `formatInstant`, `renderItem`, `onSelectItem`, `onMoveItem`, `loading`/`error`/`onRetry`, and `labels` (also through `UixLabelsProvider` as `schedulingTimeline`).
- **Bars:** overlapping bars stack and are hatched. Bars move by drag or Shift+arrow keys, and their end changes with Alt+Shift+arrow keys; moves snap to the step and are announced.
- **Keyboard and screen readers:** one tab stop with arrow and Home/End navigation. Windows and markers are listed for screen readers.
- **Pure model:** `timelineTicks` (wall-clock ticks in a zone, DST-safe), `placeSpan`, `layoutLane`, `shiftSpan`, `snapToStep`, `pixelsToMs`, `defaultTimelineStep`.
- **Tokens:** new `components/scheduling-timeline` stylesheet.

Fix: the `SchedulingCalendar` grid is now the containing block for visually hidden text (entry states, badge words). Before, a hidden word could escape the grid's scroller and widen the page on a phone.
