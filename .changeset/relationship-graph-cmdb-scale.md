---
"@tensor_1/react": minor
"@tensor_1/tokens": patch
---

**`RelationshipGraph` at CMDB topology sizes** (HAR-1387; TENSOR B30 / A6 topology). The layered layout stays (no force layout); what kept the 300- and 600-node maps from reading is fixed, each measured on the 300/600-item harness (six levels, cross, lateral and back edges, a few cycles):

- **Repeated labels.** A column that takes more than four forward edges says their most common relation once, in its header ("1 hop · 53 · depends on"); only edges that differ keep a label. Hover and focus labels follow the real focus, not the roving tab stop the root holds on load. Drawn labels at 300 nodes: 200 (197 "depends on") → 0. New: `LayeredColumn.edgeLabel`, `RoutedEdge.columnLabel`.
- **Black fan-out.** A node with more than four forward children routes them as a bus — a trunk in the middle of the column gap, a stub into each target (`RoutedEdge.bus`, `data-bus`) — and edge strokes are opaque, mixed into the map surface, so fifty edges on one trunk stay one grey line. Active edges are drawn last.
- **Map chrome.** The hint and the zoom level sit on `--uix-surface` with a hairline border; a focused item scrolls clear of the footer.
- **Flag.** An item flagged "cycle" (`data-flag`) keeps its name clear of the flag.
- **Descriptions and list.** A node's description names five relationships, then "and N more, listed in the relationship list" (new label `moreRelations`); the hub's went from 2,890 to 298 characters. The list's button names only the node; its neighbours are a `<ul>` beside it under `connectedHeading`, eight until "Show all N" / "Show fewer" (`showAllRelations`, `showFewerRelations`). `connectedTo` is no longer read; a consumer that translated it keeps its words as the heading.
- **Warning tone.** The warning graph tone uses `--uix-warning-text`: `--uix-warning-border` was 2.9:1 on the map, under 3:1.
- **Dragging.** Every pointer move of a drag re-rendered every item, edge and list row (95th-percentile frame 100 ms at 300 nodes, 450 ms at 600). A pan or a zoom now only moves the stage (p95 16.7 ms at 600 nodes on the same machine).
