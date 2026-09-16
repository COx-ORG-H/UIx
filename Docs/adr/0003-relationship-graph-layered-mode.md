# ADR-0003: Layered layout mode for RelationshipGraph

**Status:** Accepted

**Date:** 2026-09-16

**Decision owners:** UIx maintainers
**Scope:** `@tensor_1/react` `RelationshipGraph`, `relationship-graph-model.ts`, `relationship-graph.css`
**Extends:** [ADR-0001](./0001-relationship-graph-layout.md) (internal bounded layout, no runtime dependency)

## Context

TENSOR's CMDB "CI Impact & Dependencies" view (Linear HAR-136) has to show what depends on a configuration item, and what it depends on, readably at five hops and with more than a hundred connected items. It must show shared dependencies once, surface cycles, carry relationship types on edges, collapse big fan-outs, and be fully operable by keyboard and screen reader in English and German.

`RelationshipGraph` as released in 2.16.0 cannot carry that:
- its radial ring layout has a 40-node default;
- it cuts labels at 16 characters;
- its arrow keys walk input order rather than structure;
- every visible and announced string is fixed English;
- there is no slot for product content on a node.

ADR-0001 named "automatic crossing minimization that materially affects task completion" and "more than the component's supported neighborhood size" as revisit triggers. This is that consumer.

## Decision

Add an opt-in `layout="layered"` mode. It stays internal and adds no dependency, as ADR-0001 decided.

- **Model (pure, exported).** `layoutLayeredGraph`, `classifyLayeredEdges`, `layeredNeighbor` and `clusterIdFor`.
  - Columns are BFS distance from `rootId` along source→target, or a consumer-supplied `node.depth`.
  - Edges are classified as forward (next column), lateral, or cycle (a back edge whose head reaches its tail through forward edges).
  - Leaf siblings with one parent, no children and no lateral/cycle edges collapse into cluster items when the `(parent, node type, edge type)` group reaches `clusterThreshold` (default 6).
  - Columns are ordered by three barycenter sweeps (down, up, down) with input order as the stable tiebreak.
  - Placement aims each item at its parents' mean centre and pushes down to avoid overlap. Edges are routed as cubic Béziers (forward) or arcs (lateral/cycle) with label anchors and arrowheads.
  - The output is deterministic, and a 400-node / 1,500-edge graph lays out in well under 50ms.
- **Rendering.**
  - An SVG edge layer (`aria-hidden`) plus an HTML node layer of native `<button>`s in one transformed stage, so node text is crisp and themable and `renderNode` output is ordinary React.
  - Pan by pointer drag, pinch or buttons. Zoom with Ctrl/⌘ + wheel (a plain wheel scrolls the page and is never captured) or buttons; `Fit` and `Reset` restore the view.
  - The initial view never zooms below 75% to make a graph fit. Large graphs start at the root.
- **Keyboard.** One roving tab stop on a `role="group"` container.
  - ←/→ follow forward edges, ↑/↓ move within a column, Home returns to the root, End goes to the column's last item.
  - Enter/Space selects, or toggles a cluster.
  - The focused item auto-pans into view. `focusId` / `onFocusChange` make focus controllable (e.g. after a consumer re-roots the graph).
- **Localisation.** Every visible and announced string comes from `labels` (`RelationshipGraphLabels`), with the previous English as defaults. This applies to both modes, so radial-mode output is unchanged.
- **Consumer content.**
  - `renderNode` and `renderCluster` fill item bodies; a nullish return falls back to the default body.
  - Because a slot's content cannot reach a fixed accessible-name formula, `nodeAriaLabel` supplies the full accessible name. The README states that whatever `renderNode` shows must also be in `nodeAriaLabel`.
- **Edges.** `arrow` (`forward` | `backward` | `none`) keeps the real relationship direction visible when a consumer orients edges by reading direction. `emphasis` forces a label.
  - `edgeLabels="auto"` shows emphasised labels and forward labels on fan-outs of four or fewer, once per source and relationship. Lateral and cycle edges show their label only for the hovered, focused or selected item, because both ends already carry a cycle flag. Labels wrap to two lines that fit the column gap.
- **Equivalent list.** `showList` defaults to `true` in both modes. A consumer may turn it off **only** when it renders a complete equivalent (every node, its relations and state) in the same labelled region.
- **CSS.** New elements under `.uix-relationship-graph--layered` use existing tokens only; there is no contract change. The viewport height is `--uix-relationship-graph-height`.

## Alternatives considered

- **`@xyflow/react` 12.11.6** (59.9 KB min+gz, bundlephobia 2026-09-16). Strong pan/zoom and HTML nodes. However, its keyboard model moves nodes with arrow keys (an editing interaction, wrong for a read-only map), it needs a separate layout engine, and it would be UIx's first runtime graph dependency.
- **`@dagrejs/dagre` 3.1.1** (15.8 KB). Mature Sugiyama layering, but it computes its own ranks (consumers here already know distances), has no clustering, and is still a dependency for what three sweeps achieve on bounded, BFS-layered input.
- **`elkjs` 0.12.0** (433 KB). The best layouts, far too heavy for a component entry.
- **A TENSOR-only component.** Rejected by the product owner: UI mechanisms belong in UIx so every consumer gets them.

## Consequences

Positive:
- No dependency; deterministic geometry for SSR and visual snapshots; unit-testable layout.
- A localisable, structure-aware keyboard model.
- Radial consumers are unaffected.

Negative:
- Crossing reduction is heuristic; dense lateral structures can still cross.
- Tall columns of unclusterable nodes (siblings that each continue downstream) remain tall; navigation is by keyboard, pan, and the consumer's filters and list. There is no minimap.
- `showList={false}` relies on the consumer honouring the equivalent-list rule.

## Revisit triggers

- A consumer needs graphs beyond ~1,000 nodes, compound nodes, or orthogonal edge routing.
- Measured task failure caused by crossings that three sweeps do not resolve.
- A minimap or virtualised node layer becomes necessary for tall columns.
