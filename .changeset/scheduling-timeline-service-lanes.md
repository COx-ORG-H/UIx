---
"@tensor_1/tokens": minor
"@tensor_1/react": minor
---

`SchedulingTimeline`: service lanes in collapsible groups, windows drawn once and limited to their lanes, proposal-based moves, resize off by default, virtualised rows, sub-ticks, and a neutral colour map (HAR-1521).

- **Groups.** `groups` (`id`, `label`, `meta`, `laneIds`, `collapsed`, `summary`) puts lanes into collapsible blocks in the order given; a lane no group names is drawn after them. A collapsed group is one row with `summary.count` and `summary.markers`, which the consumer supplies. `onToggleGroup(id)` hands the state to the consumer; without it a group opens and closes itself.
- **Windows once, scope-true.** An overlay is one element whatever the number of rows (2.x drew one per lane). `laneIds` limits it to the rows of those lanes with a clip; unset, it covers every row. Windows are neutral: `pattern`, and `kindLabel`, the name and `scopeLabel` as visible text. `onSelectOverlay` makes each window a named button. Point `markers` take `laneIds` too, and are one line each.
- **Moves are proposals.** `onProposeMove(id, { start, end, adjusted })`: drag a bar, or press Shift and an arrow key to build a pending move, Enter to send it and Escape to drop it. A press that travels under 4 px is a click; Enter with nothing pending selects. The timeline never moves the bar. On a week or month axis a step is a calendar day, so the wall-clock time is kept across a clock change. `onMoveItem` is unchanged: one call for every key press and every drop.
- **Resize is off unless asked for.** `onResizeItem(id, { start, end })` is the only way to move the end of a bar (Alt+Shift and an arrow key). **Behaviour change:** in 2.33 that chord called `onMoveItem`; without `onResizeItem` it now does nothing and no hint offers it. Pass the same function as `onResizeItem` to keep it.
- **Stacking without a generic flag.** `flagOverlaps={false}` keeps the sub-rows and drops the hatch and the default words for bars that share time; the consumer says what clashes through `markers`. The default is `true`, as before.
- **Items take the calendar's item API:** `band` (only `high` is filled), `status` (a line style), `markers` (shape or icon plus text), `accessibleName`, and `data-item-id` / `data-band` / `data-status` on the bar. Bar text is cut at a word, and a bar is at least 24 × 24 px.
- **Long timelines.** Above `virtualizeAbove` rows (default 150) only the rows near the viewport are mounted; arrow keys still reach every bar. `maxHeight` makes the lanes scroll inside the timeline under a fixed axis.
- **Axis.** `subTicks` (local hours) draws minor ticks inside each day of a `day` axis; on an `hour` axis an hour that occurs twice shows its UTC offset. `notice` sits above the axis and `columnNotes` puts a note on the column of a day.
- **One packer.** `layoutLane` places bars with `packLanes` (uncapped) and takes `{ flagOverlaps }`. A zero-length bar now takes a sub-row of its own next to a bar that starts at the same instant; 2.33 drew one over the other.
- **Colour (visible change).** Every colour is one `--timeline-*` name at the top of `scheduling-timeline.css`. Bars are no longer tinted by `state`, windows by `kind`, and the now-line and the point markers are neutral; the two problem states keep a marker with their word, and the kinds are told apart by pattern.
- **Row heights.** With `groups`, `laneIds` or a virtual window, rows have a fixed height and a lane label that does not fit is cut with an ellipsis. A timeline that uses none of them keeps rows that grow with their label.
- **Deprecated, still working in 2.x:** `SchedulingTimelineOverlayKind`, `overlay.kind`, `item.state` and the `states` / `overlays` labels. `overlay.kind` is now optional.
- **New labels** (translate them): `statuses`, `overlay`, `moveKeysHint`, `resizeHint`, `proposeHint`, `moveProposed`, `moveCancelled`, `gapForward`, `groupSummary`. A timeline with `onMoveItem` and no `onResizeItem` reads `moveKeysHint` where it read `moveHint`.
- **New exports:** `SchedulingTimelineGroup`, `timelineSubTicks`, `timelineStepDelta`, `TimelineSubTick`, `LayoutLaneOptions`. `TimelineTick` gains `offsetLabel`.
- **Docs:** the timeline specimen on the SchedulingCalendar page is rendered from the component (`packages/react/scripts/render-scheduling-timeline-specimen.mjs`).
