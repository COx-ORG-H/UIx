"use client";

import { useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { boundRelationshipGraph, layoutRelationshipGraph, relationshipNeighbors, traverseRelationshipNode } from '../relationship-graph-model.js';
import type { RelationshipGraphEdge, RelationshipGraphNode } from '../relationship-graph-model.js';
import { cx } from '../cx.js';

export interface RelationshipGraphLegendItem {
  id: string;
  label: string;
}

export interface RelationshipGraphProps {
  nodes: RelationshipGraphNode[];
  edges: RelationshipGraphEdge[];
  selectedId?: string;
  onSelect?: (node: RelationshipGraphNode) => void;
  onExpandNeighbors?: (node: RelationshipGraphNode) => void;
  onOpenDetails?: (node: RelationshipGraphNode) => void;
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
}

const EMPTY_IDS: ReadonlySet<string> = new Set<string>();
const EMPTY_LEGEND: RelationshipGraphLegendItem[] = [];

/** Bounded, deterministic SVG relationship view with an equivalent accessible list. */
export function RelationshipGraph({
  nodes, edges, selectedId, onSelect, onExpandNeighbors, onOpenDetails, maxNodes = 40,
  density = 'standard', highlightedNodeIds = EMPTY_IDS, conflictedNodeIds = EMPTY_IDS,
  highlightedEdgeIds = EMPTY_IDS, conflictedEdgeIds = EMPTY_IDS, legend = EMPTY_LEGEND,
  loading, error, onRetry, className,
}: RelationshipGraphProps) {
  const bounded = useMemo(() => boundRelationshipGraph(nodes, edges, maxNodes), [nodes, edges, maxNodes]);
  const positioned = useMemo(() => layoutRelationshipGraph(bounded.nodes, bounded.edges, selectedId), [bounded, selectedId]);
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

  if (loading) return <div className={cx('uix-relationship-graph uix-relationship-graph--state', className)} role="status">Loading relationships…</div>;
  if (error) return <div className={cx('uix-relationship-graph uix-relationship-graph--state', className)} role="alert"><p>{error}</p>{onRetry && <button type="button" className="uix-btn uix-btn--secondary" onClick={onRetry}>Try again</button>}</div>;
  if (bounded.nodes.length === 0) return <div className={cx('uix-relationship-graph uix-relationship-graph--state', className)}><p>No relationships to display.</p><p>Adjust the neighborhood or filters to include a node.</p></div>;

  return <section className={cx('uix-relationship-graph', `uix-relationship-graph--${density}`, className)} aria-label="Relationship graph">
    <div className="uix-relationship-graph__toolbar" aria-label="Graph view controls">
      <button type="button" onClick={() => setPan((value) => ({ ...value, x: value.x - 24 }))} aria-label="Pan left">Left</button>
      <button type="button" onClick={() => setPan((value) => ({ ...value, y: value.y - 24 }))} aria-label="Pan up">Up</button>
      <button type="button" onClick={() => setPan((value) => ({ ...value, y: value.y + 24 }))} aria-label="Pan down">Down</button>
      <button type="button" onClick={() => setPan((value) => ({ ...value, x: value.x + 24 }))} aria-label="Pan right">Right</button>
      <button type="button" onClick={() => setZoom((value) => Math.min(2, Number((value + 0.2).toFixed(1))))} aria-label="Zoom in">Zoom in</button>
      <button type="button" onClick={() => setZoom((value) => Math.max(0.5, Number((value - 0.2).toFixed(1))))} aria-label="Zoom out">Zoom out</button>
      <button type="button" onClick={reset}>Reset view</button>
      <span aria-live="polite">Zoom {Math.round(zoom * 100)}%</span>
    </div>
    {bounded.omittedNodeCount > 0 && <p className="uix-relationship-graph__bounded" role="status">Showing {bounded.nodes.length} nodes; {bounded.omittedNodeCount} outside this bounded neighborhood.</p>}
    <div className="uix-relationship-graph__visual">
      <svg ref={svgRef} viewBox="0 0 600 400" role="group" aria-label={`Graph with ${bounded.nodes.length} nodes and ${bounded.edges.length} relationships`}>
        <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
          {bounded.edges.map((edge) => {
            const source = positionedById.get(edge.source)!;
            const target = positionedById.get(edge.target)!;
            return <line key={edge.id} x1={source.x * 6} y1={source.y * 4} x2={target.x * 6} y2={target.y * 4} className="uix-relationship-graph__edge" data-highlighted={highlightedEdgeIds.has(edge.id) || undefined} data-conflicted={conflictedEdgeIds.has(edge.id) || undefined}><title>{edge.label ?? edge.type ?? 'Relationship'}</title></line>;
          })}
          {positioned.map((node) => <g
            key={node.id} transform={`translate(${node.x * 6} ${node.y * 4})`} role="button"
            aria-label={`${node.label}${node.type ? `, ${node.type}` : ''}${conflictedNodeIds.has(node.id) ? ', conflict' : ''}`}
            tabIndex={focusedId === node.id ? 0 : -1} data-node-id={node.id} className="uix-relationship-graph__node"
            data-selected={selectedId === node.id || undefined} data-highlighted={highlightedNodeIds.has(node.id) || undefined}
            data-conflicted={conflictedNodeIds.has(node.id) || undefined} onFocus={() => setFocusedId(node.id)}
            onKeyDown={(event) => onNodeKeyDown(event, node.id)} onClick={() => select(node.id)}
          ><rect x="-55" y="-18" width="110" height="36" rx="8" /><text textAnchor="middle" dominantBaseline="middle">{node.label.length > 16 ? `${node.label.slice(0, 15)}…` : node.label}</text></g>)}
        </g>
      </svg>
    </div>
    {legend.length > 0 && <ul className="uix-relationship-graph__legend" aria-label="Relationship types">{legend.map((item) => <li key={item.id} data-type={item.id}>{item.label}</li>)}</ul>}
    <div className="uix-relationship-graph__list" role="region" aria-label="Accessible relationship list">
      <h3>Relationship list</h3>
      <ul>{bounded.nodes.map((node) => {
        const neighbors = relationshipNeighbors(node.id, bounded.edges).map((id) => bounded.nodes.find((item) => item.id === id)?.label ?? id);
        return <li key={node.id} data-selected={selectedId === node.id || undefined}>
          <button type="button" onClick={() => select(node.id)} aria-pressed={selectedId === node.id}><strong>{node.label}</strong>{node.type && <span>{node.type}</span>}<span>{neighbors.length ? `Connected to ${neighbors.join(', ')}` : 'No visible connections'}</span></button>
          <span className="uix-relationship-graph__list-actions">{onExpandNeighbors && <button type="button" onClick={() => onExpandNeighbors(node)}>Expand neighbors</button>}{onOpenDetails && <button type="button" onClick={() => onOpenDetails(node)}>Open details</button>}</span>
        </li>;
      })}</ul>
    </div>
  </section>;
}
