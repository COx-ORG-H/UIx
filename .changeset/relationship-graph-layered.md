---
"@tensor_1/tokens": minor
"@tensor_1/react": minor
---

`RelationshipGraph` gains an opt-in `layout="layered"` mode (ADR-0003), with no new dependency and no token change.
- **Layout:** columns by distance from `rootId` (or a supplied `node.depth`), each node drawn once, lateral and cycle edges classified and marked, and leaf fan-outs collapsed into expandable clusters (`clusterThreshold`, `expandedClusterIds`, `onToggleCluster`).
- **Rendering:** crossing-reduced ordering, edge labels (`edgeLabels`, `edge.emphasis`), arrowheads that can point back along the real relationship (`edge.arrow`), and HTML node buttons with `renderNode` / `renderCluster` slots and a full `nodeAriaLabel`.
- **Interaction:** pan (drag, pinch, buttons), Ctrl/⌘-wheel zoom, Fit and Reset, structural arrow-key traversal, and controllable focus (`focusId`, `onFocusChange`). `dimmedNodeIds`, `height` and `showList` are also new.
- **Localisation:** every string in both modes is now localisable through `labels` (`RelationshipGraphLabels`, `DEFAULT_RELATIONSHIP_GRAPH_LABELS`). The English defaults are unchanged.
- **Model exports:** `layoutLayeredGraph`, `classifyLayeredEdges`, `layeredNeighbor` and `clusterIdFor`.
