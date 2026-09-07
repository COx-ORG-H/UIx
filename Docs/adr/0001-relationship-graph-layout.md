# ADR-0001: Use an internal bounded layout for RelationshipGraph

**Status:** Accepted

**Date:** 2026-09-07

**Decision owners:** UIx maintainers
**Scope:** `@tensor_1/react` `RelationshipGraph`

## Context

Phase 46.9 requires an interactive node-link component with pan/zoom, typed edges, bounded neighbor expansion, selection, conflict/path highlighting, compact/standard density, keyboard traversal, and an equivalent accessible list. It explicitly asks UIx to investigate Cytoscape.js, d3-force, or a smaller alternative and to record tree-shaking and bundle-size impact before adoption.

UIx is a general-purpose component library whose main React entry currently has no mandatory runtime dependency beyond React. The component is required to render bounded neighborhoods, not arbitrary whole-dataset graph analytics. Consumers may already own layout data, and the accessible representation and UI controls must be authored by UIx regardless of layout engine.

## Decision

Implement a small deterministic layout in `packages/react/src/relationship-graph-model.ts` and render it with SVG in `RelationshipGraph`.

- Bound input with `maxNodes` before layout; retain edges whose endpoints remain in the bounded node set.
- Honor optional consumer-supplied normalized `x`/`y` positions.
- Place remaining nodes deterministically by breadth level/ring and stable input order. The same input always yields the same coordinates, which makes server rendering and visual regression stable.
- Keep pan/zoom transform state in the React component and expose labelled buttons plus keyboard node traversal.
- Always render an equivalent relationship list/tree with selection, expansion, and detail actions.
- Export the pure bounding/layout helpers so consumers and tests can reason about the exact model.

No new runtime package is added.

## Alternatives considered

### Cytoscape.js 3.34.2

Cytoscape.js supplies a complete graph model, analysis API, renderer, layouts, and interaction system. The npm artifact was approximately 5,699,134 bytes unpacked when checked on 2026-09-07. It has no runtime dependencies, but its package entry exposes the full library rather than the narrow deterministic layout this component needs. Even with consumer bundler optimization, UIx would own a large optional capability in its primary component surface, while still writing custom accessible equivalents and bounded data orchestration.

Rejected for this phase because capability and distribution cost exceed the bounded-neighborhood requirement. Reconsider for a separate optional graph entry if consumers need large-graph analytics, pluggable layout algorithms, compound nodes, or canvas rendering.

Sources: [Cytoscape.js documentation](https://js.cytoscape.org/), [cytoscape on npm](https://www.npmjs.com/package/cytoscape).

### d3-force 3.0.0

`d3-force` is modular ESM with `sideEffects: false`, so modern bundlers can tree-shake unused exports. Its npm artifact was approximately 89,551 bytes unpacked when checked on 2026-09-07, and it brings `d3-dispatch`, `d3-quadtree`, and `d3-timer`. The simulation normally owns mutable node positions and a timer/tick lifecycle; the official docs recommend workers for expensive static layouts.

Rejected because a force simulation adds runtime lifecycle, convergence, dependency, hydration, and visual-determinism costs without satisfying accessibility or UI interaction requirements. The phase's bounded data can use a stable O(n + e) layout.

Sources: [d3-force documentation](https://d3js.org/d3-force/), [d3-force package metadata](https://github.com/d3/d3-force/blob/main/package.json), [d3-force on npm](https://www.npmjs.com/package/d3-force).

### force-graph 1.51.4 and similar renderer wrappers

The inspected npm artifact was approximately 6,462,516 bytes unpacked and depended on d3-force-3d plus rendering, drag, zoom, tween, scale, tooltip, and utility packages. These wrappers optimize for a canvas graph experience rather than a small tokenized SVG component with a first-class accessible equivalent.

Rejected for greater cost and less control over UIx semantics.

## Tree-shaking and package impact

The internal helper is a side-effect-free TypeScript module. UIx's ESM build emits modules per file with `bundle: false`; consumers importing individual ESM symbols can tree-shake unused RelationshipGraph code. The CJS compatibility entry remains bundled by existing policy, so the phase will record its measured delta in the PR. There is no transitive dependency or installation cost for consumers that do not render the graph.

## Consequences

Positive:

- deterministic SSR/hydration and visual snapshots;
- no new runtime or supply-chain dependency;
- exact control of tokens, focus, keyboard behavior, and accessible representation;
- bounded work and predictable runtime cost.

Negative:

- the layout is intentionally simple and will not optimize edge crossings like a mature engine;
- UIx owns the small geometry helper and its tests;
- consumers needing sophisticated graph analysis must supply positions or use a future optional adapter.

## Revisit triggers

Supersede this ADR if a real consumer demonstrates one of the following with bounded-layout fixtures: more than the component's supported neighborhood size, compound/hypergraph semantics, continuous physics, automatic crossing minimization that materially affects task completion, or canvas/WebGL rendering. Any dependency adoption must live behind an optional export, include measured minified/gzip/Brotli deltas, prove tree-shaking with a smoke consumer, and preserve the same accessible list contract.
