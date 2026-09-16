# @tensor_1/react

Thin React wrappers over the UIx v2 CSS component library — every component is driven by the [`@tensor_1/tokens`](https://www.npmjs.com/package/@tensor_1/tokens) `--uix-*` contract.

## Install

```sh
npm i @tensor_1/react @tensor_1/tokens
```
Peer deps: `react` / `react-dom` (`^18` or `^19`). Install `echarts` only when using a chart entry.

## Use

Load the token CSS once (see [`@tensor_1/tokens`](https://www.npmjs.com/package/@tensor_1/tokens)), then import components:

```tsx
import { Button, Card } from "@tensor_1/react";

export default function Example() {
  return (
    <Card>
      <Button>Save</Button>
    </Card>
  );
}
```

Charts (ECharts) live behind a separate entry so they stay out of the main bundle:

```tsx
import { Chart } from "@tensor_1/react/chart";
```

For common line, bar, and pie charts, the tree-shaken preset avoids shipping the complete ECharts build:

```tsx
import { Chart } from "@tensor_1/react/chart/preset";
```

Both chart entries also export `ChartMetric`, `ChartLegend`, and `ChartLegendItem` for consistent analytical card
chrome. `Chart` supports `headerAction`, `footer`, `loading`, `empty`, and an accessible table equivalent. For
workflow surfaces, the main entry exports `Pipeline`/`PipelineStage` (compact or detailed operational rail) and
`Flow`/`FlowNode` (consumer-owned graph geometry with explicit text states).

Large fixed-height tables can use `useVirtualRows(rows, { rowHeight })`; attach its `containerRef` to
`TableWrap` and render the returned row window between spacer rows.

## UIX-V3 capability components

Phase 46.9 adds eleven controlled, domain-neutral components:

- Authoring: `RuleBuilder` and `BuilderCanvas`.
- Time: `SchedulingCalendar` and `DateRangePicker`.
- Relationships and review: `RelationshipGraph` and `MatchReview`.
- Configuration: `MetricInput`, `LicensePositionBar`, `BrandProfiles` (also
  `BrandProfileEditor`), `DiffViewer`, and `ColorPicker`.

Their serializable helpers are exported from the main entry as well: immutable
rule-tree operations, calendar/time-zone helpers, bounded graph layout and
traversal, three-way JSON diffing, metric parsing/stepping, color conversion and
contrast checks, plus brand-profile apply/restore helpers. No graph or date
runtime dependency is required.

### RelationshipGraph layouts

`RelationshipGraph` has two layouts:
- `radial` (the default): a small neighbourhood ringed around the selection.
- `layered` (ADR-0003): reads left to right by distance from `rootId`.

Layered mode draws shared nodes once, marks cycles, collapses leaf fan-outs into clusters and labels edges. It adds structural keyboard traversal (←/→ along edges, ↑/↓ in a column, Home, End), pan and Ctrl/⌘-wheel zoom.

```tsx
<RelationshipGraph
  layout="layered"
  rootId={root.id}
  nodes={nodes}            // { id, label, type?, description?, depth? }
  edges={edges}            // { id, source, target, type?, label?, arrow?, emphasis? }
  labels={translatedLabels} // Partial<RelationshipGraphLabels>
  renderNode={(node) => <MyNodeBody node={node} />}
  nodeAriaLabel={(node) => `${node.label}, ${riskText(node)}`}
  onSelect={openPeek}
  height="clamp(360px, 60vh, 640px)"
/>
```

Rules the component cannot enforce for you:

- **Whatever `renderNode` / `renderCluster` shows must also be in the accessible name.** Pass `nodeAriaLabel` whenever the node body carries meaning beyond `label`, `type` and `description`.
- **Keep the equivalent list.** `showList={false}` is allowed only when the same labelled region renders a complete equivalent: every node, its relations and its state.
- **Dimming is not a signal.** `dimmedNodeIds` must be accompanied by text that says what is dimmed and why.
- **Localise everything.** Every visible and announced string comes from `labels`; the English defaults live in `DEFAULT_RELATIONSHIP_GRAPH_LABELS`.

Ships **ESM + CJS + types**, with per-file `"use client"` so it's safe under React Server Components. Part of the **[UIx v2 styleguide](https://github.com/COx-ORG-H/UIx)**.
