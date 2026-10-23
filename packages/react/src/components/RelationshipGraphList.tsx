import { useId, useState } from 'react';
import { relationshipNeighbors } from '../relationship-graph-model.js';
import type { RelationshipGraphEdge, RelationshipGraphNode } from '../relationship-graph-model.js';
import type { RelationshipGraphLabels } from './RelationshipGraph.js';

/** A row names this many neighbours until "Show all N" (HAR-1387: a 300-node hub listed 53). */
const LISTED_NEIGHBOURS = 8;

/** The list every RelationshipGraph mode pairs with its picture (internal). */
export function EquivalentRelationshipList({
  nodes, edges, selectedId, labels, onSelect, onExpandNeighbors, onOpenDetails,
}: {
  nodes: RelationshipGraphNode[];
  edges: RelationshipGraphEdge[];
  selectedId: string | undefined;
  labels: RelationshipGraphLabels;
  onSelect: (id: string) => void;
  onExpandNeighbors: ((node: RelationshipGraphNode) => void) | undefined;
  onOpenDetails: ((node: RelationshipGraphNode) => void) | undefined;
}) {
  const id = useId();
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set());
  const labelById = new Map(nodes.map((node) => [node.id, node.label]));
  return <div className="uix-relationship-graph__list" role="region" aria-label={labels.list}>
    <h3>{labels.listHeading}</h3>
    <ul>{nodes.map((node, index) => {
      const neighbors = relationshipNeighbors(node.id, edges).map((neighbor) => labelById.get(neighbor) ?? neighbor);
      const all = open.has(node.id);
      const shown = all ? neighbors : neighbors.slice(0, LISTED_NEIGHBOURS);
      const headingId = `${id}-${index}`;
      // The node's button names the node; its neighbours are a list beside it, not part of that
      // name (HAR-1387: a hub's button name ran to thousands of characters).
      return <li key={node.id} data-selected={selectedId === node.id || undefined}>
        <div className="uix-relationship-graph__list-main">
          <button type="button" onClick={() => onSelect(node.id)} aria-pressed={selectedId === node.id}><strong>{node.label}</strong>{node.type && <span>{node.type}</span>}</button>
          {neighbors.length === 0
            ? <p className="uix-relationship-graph__list-none">{labels.noConnections}</p>
            : <div className="uix-relationship-graph__list-relations">
                <span id={headingId}>{labels.connectedHeading}</span>
                <ul aria-labelledby={headingId}>{shown.map((name, at) => <li key={at}>{name}</li>)}</ul>
                {neighbors.length > LISTED_NEIGHBOURS && <button
                  type="button"
                  className="uix-btn uix-btn--link uix-relationship-graph__list-more"
                  aria-expanded={all}
                  onClick={() => setOpen((previous) => {
                    const next = new Set(previous);
                    if (all) next.delete(node.id);
                    else next.add(node.id);
                    return next;
                  })}
                >{all ? labels.showFewerRelations : labels.showAllRelations(neighbors.length)}</button>}
              </div>}
        </div>
        <span className="uix-relationship-graph__list-actions">{onExpandNeighbors && <button type="button" onClick={() => onExpandNeighbors(node)}>{labels.expandNeighbors}</button>}{onOpenDetails && <button type="button" onClick={() => onOpenDetails(node)}>{labels.openDetails}</button>}</span>
      </li>;
    })}</ul>
  </div>;
}
