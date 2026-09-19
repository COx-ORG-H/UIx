"use client";

import { useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, ReactNode } from 'react';
import { boundRelationshipGraph, layoutRelationshipGraph, traverseRelationshipNode } from '../relationship-graph-model.js';
import type { RelationshipGraphCluster, RelationshipGraphEdge, RelationshipGraphNode } from '../relationship-graph-model.js';
import { cx } from '../cx.js';
import { LayeredRelationshipGraph } from './RelationshipGraphLayered.js';
import { EquivalentRelationshipList } from './RelationshipGraphList.js';

export interface RelationshipGraphLegendItem {
  id: string;
  label: string;
}

/** Every visible or announced string. Pass translations; English defaults fill the gaps. */
export interface RelationshipGraphLabels {
  graph: string;
  controls: string;
  list: string;
  listHeading: string;
  legend: string;
  panLeft: string;
  panRight: string;
  panUp: string;
  panDown: string;
  left: string;
  right: string;
  up: string;
  down: string;
  zoomIn: string;
  zoomOut: string;
  fit: string;
  reset: string;
  zoomLevel: (percent: number) => string;
  bounded: (shown: number, omitted: number) => string;
  graphSummary: (nodes: number, edges: number) => string;
  relationship: string;
  conflict: string;
  connectedTo: (names: string) => string;
  noConnections: string;
  expandNeighbors: string;
  openDetails: string;
  /** Layered column header, e.g. "2 hops · 14". */
  column: (depth: number, count: number) => string;
  cluster: (count: number, type: string | undefined, edgeLabel: string | undefined) => string;
  expandCluster: string;
  collapseCluster: (count: number, type: string | undefined) => string;
  cycle: string;
  relationships: (count: number) => string;
  roleDescription: string;
  keyboardHint: string;
  loading: string;
  retry: string;
  emptyTitle: string;
  emptyHint: string;
}

export const DEFAULT_RELATIONSHIP_GRAPH_LABELS: RelationshipGraphLabels = {
  graph: 'Relationship graph',
  controls: 'Graph view controls',
  list: 'Accessible relationship list',
  listHeading: 'Relationship list',
  legend: 'Relationship types',
  panLeft: 'Pan left',
  panRight: 'Pan right',
  panUp: 'Pan up',
  panDown: 'Pan down',
  left: 'Left',
  right: 'Right',
  up: 'Up',
  down: 'Down',
  zoomIn: 'Zoom in',
  zoomOut: 'Zoom out',
  fit: 'Fit',
  reset: 'Reset view',
  zoomLevel: (percent) => `Zoom ${percent}%`,
  bounded: (shown, omitted) => `Showing ${shown} nodes; ${omitted} outside this bounded neighborhood.`,
  graphSummary: (nodes, edges) => `Graph with ${nodes} nodes and ${edges} relationships`,
  relationship: 'Relationship',
  conflict: 'conflict',
  connectedTo: (names) => `Connected to ${names}`,
  noConnections: 'No visible connections',
  expandNeighbors: 'Expand neighbors',
  openDetails: 'Open details',
  column: (depth, count) => `${depth === 0 ? 'Start' : `${depth} ${depth === 1 ? 'hop' : 'hops'}`} · ${count}`,
  cluster: (count, type, edgeLabel) => `${count} × ${type ?? 'items'}${edgeLabel ? ` · ${edgeLabel}` : ''}`,
  expandCluster: 'Show all',
  collapseCluster: (count, type) => `Collapse ${count} ${type ?? 'items'}`,
  cycle: 'cycle',
  relationships: (count) => `${count} ${count === 1 ? 'relationship' : 'relationships'}`,
  roleDescription: 'relationship map',
  keyboardHint: 'Arrow keys move between connected items, Enter selects, Home returns to the start.',
  loading: 'Loading relationships…',
  retry: 'Try again',
  emptyTitle: 'No relationships to display.',
  emptyHint: 'Adjust the neighborhood or filters to include a node.',
};

export interface RelationshipGraphProps {
  nodes: RelationshipGraphNode[];
  edges: RelationshipGraphEdge[];
  selectedId?: string;
  onSelect?: (node: RelationshipGraphNode) => void;
  onExpandNeighbors?: (node: RelationshipGraphNode) => void;
  onOpenDetails?: (node: RelationshipGraphNode) => void;
  /** Node budget. Default 40 (radial) or 400 (layered). */
  maxNodes?: number;
  density?: 'compact' | 'standard';
  highlightedNodeIds?: ReadonlySet<string>;
  conflictedNodeIds?: ReadonlySet<string>;
  highlightedEdgeIds?: ReadonlySet<string>;
  conflictedEdgeIds?: ReadonlySet<string>;
  legend?: RelationshipGraphLegendItem[];
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  className?: string;
  /** `radial` (default) rings around the selection; `layered` reads left to right by distance from `rootId`. */
  layout?: 'radial' | 'layered';
  /** Layered: the column-0 node (default: the first node). */
  rootId?: string;
  labels?: Partial<RelationshipGraphLabels>;
  /** Layered: node body. Whatever it shows must also be in `nodeAriaLabel`. */
  renderNode?: (node: RelationshipGraphNode, state: { selected: boolean; dimmed: boolean }) => ReactNode;
  /** Layered: full accessible name for a node. */
  nodeAriaLabel?: (node: RelationshipGraphNode) => string;
  /** Layered: cluster body. Whatever it shows must also be in the cluster's accessible name. */
  renderCluster?: (cluster: RelationshipGraphCluster) => ReactNode;
  /** Layered: minimum leaf-sibling group that collapses into a cluster. Default 6; 0 disables. */
  clusterThreshold?: number;
  /** Layered: controlled set of expanded cluster ids. */
  expandedClusterIds?: ReadonlySet<string>;
  onToggleCluster?: (clusterId: string, expanded: boolean) => void;
  /** Layered: nodes drawn muted (state must also be stated in text by the consumer). */
  dimmedNodeIds?: ReadonlySet<string>;
  /** Layered: when edge labels show. `auto` = emphasised edges, small fan-outs, and edges of the active node. */
  edgeLabels?: 'auto' | 'always' | 'never';
  /** Render the built-in equivalent list. Set false ONLY when an equivalent list is rendered in the same region. */
  showList?: boolean;
  /** Layered: CSS length for the viewport height. */
  height?: string;
  /** Layered: controlled roving focus. */
  focusId?: string;
  onFocusChange?: (id: string) => void;
}

const EMPTY_IDS: ReadonlySet<string> = new Set<string>();
const EMPTY_LEGEND: RelationshipGraphLegendItem[] = [];

/* Radial geometry. The model works in a 0-100 space; these scale it to user units and
 * size the node box. They are the single source of truth for both the <rect>s and the
 * viewBox, so the two can never disagree. */
const RADIAL_SCALE_X = 6;
const RADIAL_SCALE_Y = 4;
const RADIAL_NODE_HALF_W = 55;
const RADIAL_NODE_HALF_H = 18;
const RADIAL_MARGIN = 12;

/** A viewBox that contains every node box. A fixed one clipped anything a consumer
 *  positioned outside it — and a clipped node is invisible, never an error. */
function radialViewBox(nodes: { x: number; y: number }[]): string {
  if (nodes.length === 0) return '0 0 600 400';
  const xs = nodes.map((node) => node.x * RADIAL_SCALE_X);
  const ys = nodes.map((node) => node.y * RADIAL_SCALE_Y);
  const minX = Math.min(...xs) - RADIAL_NODE_HALF_W - RADIAL_MARGIN;
  const maxX = Math.max(...xs) + RADIAL_NODE_HALF_W + RADIAL_MARGIN;
  const minY = Math.min(...ys) - RADIAL_NODE_HALF_H - RADIAL_MARGIN;
  const maxY = Math.max(...ys) + RADIAL_NODE_HALF_H + RADIAL_MARGIN;
  const round = (value: number) => Number(value.toFixed(2));
  // never narrower than the historical box, so an ordinary graph keeps its proportions
  const width = Math.max(round(maxX - minX), 600);
  const height = Math.max(round(maxY - minY), 400);
  return `${round(minX)} ${round(minY)} ${width} ${height}`;
}

/** Bounded, deterministic SVG relationship view with an equivalent accessible list. */
export function RelationshipGraph(props: RelationshipGraphProps) {
  const labels = useMemo(() => ({ ...DEFAULT_RELATIONSHIP_GRAPH_LABELS, ...props.labels }), [props.labels]);
  const stateClass = cx('uix-relationship-graph uix-relationship-graph--state', props.className);
  if (props.loading) return <div className={stateClass} role="status">{labels.loading}</div>;
  if (props.error) {
    return <div className={stateClass} role="alert"><p>{props.error}</p>{props.onRetry && <button type="button" className="uix-btn uix-btn--secondary" onClick={props.onRetry}>{labels.retry}</button>}</div>;
  }
  if (props.nodes.length === 0) return <div className={stateClass}><p>{labels.emptyTitle}</p><p>{labels.emptyHint}</p></div>;
  if (props.layout === 'layered') return <LayeredRelationshipGraph {...props} labels={labels} />;
  return <RadialRelationshipGraph {...props} labels={labels} />;
}

export type ResolvedRelationshipGraphProps = Omit<RelationshipGraphProps, 'labels'> & { labels: RelationshipGraphLabels };

function RadialRelationshipGraph({
  nodes, edges, selectedId, onSelect, onExpandNeighbors, onOpenDetails, maxNodes = 40,
  density = 'standard', highlightedNodeIds = EMPTY_IDS, conflictedNodeIds = EMPTY_IDS,
  highlightedEdgeIds = EMPTY_IDS, conflictedEdgeIds = EMPTY_IDS, legend = EMPTY_LEGEND,
  className, labels, showList = true,
}: ResolvedRelationshipGraphProps) {
  const bounded = useMemo(() => boundRelationshipGraph(nodes, edges, maxNodes), [nodes, edges, maxNodes]);
  const positioned = useMemo(() => layoutRelationshipGraph(bounded.nodes, bounded.edges, selectedId), [bounded, selectedId]);
  // TENSOR RX-125 (UIX-14): each legend type owns a chart colour (in legend
  // order), and the swatch and every edge of that type draw it — the legend
  // used to show one colour for every type, promising a mapping that did not exist.
  const typeColor = useMemo(
    () => new Map(legend.map((item, index) => [item.id, `var(--uix-chart-${(index % 8) + 1})`])),
    [legend],
  );
  const positionedById = useMemo(() => new Map(positioned.map((node) => [node.id, node])), [positioned]);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [focusedId, setFocusedId] = useState(selectedId ?? positioned[0]?.id);
  const svgRef = useRef<SVGSVGElement>(null);
  const select = (id: string) => { const node = bounded.nodes.find((item) => item.id === id); if (node) onSelect?.(node); };
  const focusNode = (id: string | undefined) => {
    if (!id) return;
    setFocusedId(id);
    requestAnimationFrame(() => svgRef.current?.querySelector<SVGGElement>(`[data-node-id="${id}"]`)?.focus());
  };
  const onNodeKeyDown = (event: KeyboardEvent<SVGGElement>, id: string) => {
    if (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(event.key)) {
      event.preventDefault();
      focusNode(traverseRelationshipNode(positioned, id, event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1));
    } else if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(id); }
  };
  const reset = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  return <section className={cx('uix-relationship-graph', `uix-relationship-graph--${density}`, className)} aria-label={labels.graph}>
    <div className="uix-relationship-graph__toolbar" aria-label={labels.controls}>
      <button type="button" onClick={() => setPan((value) => ({ ...value, x: value.x - 24 }))} aria-label={labels.panLeft}>{labels.left}</button>
      <button type="button" onClick={() => setPan((value) => ({ ...value, y: value.y - 24 }))} aria-label={labels.panUp}>{labels.up}</button>
      <button type="button" onClick={() => setPan((value) => ({ ...value, y: value.y + 24 }))} aria-label={labels.panDown}>{labels.down}</button>
      <button type="button" onClick={() => setPan((value) => ({ ...value, x: value.x + 24 }))} aria-label={labels.panRight}>{labels.right}</button>
      <button type="button" onClick={() => setZoom((value) => Math.min(2, Number((value + 0.2).toFixed(1))))} aria-label={labels.zoomIn}>{labels.zoomIn}</button>
      <button type="button" onClick={() => setZoom((value) => Math.max(0.5, Number((value - 0.2).toFixed(1))))} aria-label={labels.zoomOut}>{labels.zoomOut}</button>
      <button type="button" onClick={reset}>{labels.reset}</button>
      <span aria-live="polite">{labels.zoomLevel(Math.round(zoom * 100))}</span>
    </div>
    {bounded.omittedNodeCount > 0 && <p className="uix-relationship-graph__bounded" role="status">{labels.bounded(bounded.nodes.length, bounded.omittedNodeCount)}</p>}
    <div className="uix-relationship-graph__visual">
      <svg ref={svgRef} viewBox={radialViewBox(positioned)} role="group" aria-label={labels.graphSummary(bounded.nodes.length, bounded.edges.length)}>
        <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
          {bounded.edges.map((edge) => {
            const source = positionedById.get(edge.source)!;
            const target = positionedById.get(edge.target)!;
            return <line key={edge.id} x1={source.x * RADIAL_SCALE_X} y1={source.y * RADIAL_SCALE_Y} x2={target.x * RADIAL_SCALE_X} y2={target.y * RADIAL_SCALE_Y} className="uix-relationship-graph__edge" data-typed={(edge.type != null && typeColor.has(edge.type)) || undefined} style={edge.type != null && typeColor.has(edge.type) ? ({ '--uix-graph-type-color': typeColor.get(edge.type) } as CSSProperties) : undefined} data-highlighted={highlightedEdgeIds.has(edge.id) || undefined} data-conflicted={conflictedEdgeIds.has(edge.id) || undefined}><title>{edge.label ?? edge.type ?? labels.relationship}</title></line>;
          })}
          {positioned.map((node) => <g
            key={node.id} transform={`translate(${node.x * RADIAL_SCALE_X} ${node.y * RADIAL_SCALE_Y})`} role="button"
            aria-label={`${node.label}${node.type ? `, ${node.type}` : ''}${conflictedNodeIds.has(node.id) ? `, ${labels.conflict}` : ''}`}
            tabIndex={focusedId === node.id ? 0 : -1} data-node-id={node.id} className="uix-relationship-graph__node"
            data-selected={selectedId === node.id || undefined} data-highlighted={highlightedNodeIds.has(node.id) || undefined}
            data-conflicted={conflictedNodeIds.has(node.id) || undefined} onFocus={() => setFocusedId(node.id)}
            onKeyDown={(event) => onNodeKeyDown(event, node.id)} onClick={() => select(node.id)}
          >
            {/* The ring's node box is a fixed width, so a long label is still shortened on
                screen — but the whole label is now in <title>, so a pointer reads it and
                the group's aria-label announces it. Use layout="layered" when the labels
                matter more than the ring. */}
            <title>{node.label}</title>
            <rect x={-RADIAL_NODE_HALF_W} y={-RADIAL_NODE_HALF_H} width={RADIAL_NODE_HALF_W * 2} height={RADIAL_NODE_HALF_H * 2} rx="8" />
            <text textAnchor="middle" dominantBaseline="middle">{node.label.length > 16 ? `${node.label.slice(0, 15)}…` : node.label}</text>
          </g>)}
        </g>
      </svg>
    </div>
    {legend.length > 0 && <ul className="uix-relationship-graph__legend" aria-label={labels.legend}>{legend.map((item) => <li key={item.id} data-type={item.id} style={{ '--uix-graph-type-color': typeColor.get(item.id) } as CSSProperties}>{item.label}</li>)}</ul>}
    {showList && <EquivalentRelationshipList nodes={bounded.nodes} edges={bounded.edges} selectedId={selectedId} labels={labels} onSelect={select} onExpandNeighbors={onExpandNeighbors} onOpenDetails={onOpenDetails} />}
  </section>;
}
