import { relationshipNeighbors } from '../relationship-graph-model.js';
import type { RelationshipGraphEdge, RelationshipGraphNode } from '../relationship-graph-model.js';
import type { RelationshipGraphLabels } from './RelationshipGraph.js';

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
  const labelById = new Map(nodes.map((node) => [node.id, node.label]));
  return <div className="uix-relationship-graph__list" role="region" aria-label={labels.list}>
    <h3>{labels.listHeading}</h3>
    <ul>{nodes.map((node) => {
      const neighbors = relationshipNeighbors(node.id, edges).map((id) => labelById.get(id) ?? id);
      return <li key={node.id} data-selected={selectedId === node.id || undefined}>
        <button type="button" onClick={() => onSelect(node.id)} aria-pressed={selectedId === node.id}><strong>{node.label}</strong>{node.type && <span>{node.type}</span>}<span>{neighbors.length ? labels.connectedTo(neighbors.join(', ')) : labels.noConnections}</span></button>
        <span className="uix-relationship-graph__list-actions">{onExpandNeighbors && <button type="button" onClick={() => onExpandNeighbors(node)}>{labels.expandNeighbors}</button>}{onOpenDetails && <button type="button" onClick={() => onOpenDetails(node)}>{labels.openDetails}</button>}</span>
      </li>;
    })}</ul>
  </div>;
}
