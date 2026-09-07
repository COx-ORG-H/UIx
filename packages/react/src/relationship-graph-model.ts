export interface RelationshipGraphNode {
  id: string;
  label: string;
  type?: string;
  description?: string;
  x?: number;
  y?: number;
}

export interface RelationshipGraphEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  label?: string;
}

export interface PositionedRelationshipNode extends RelationshipGraphNode {
  x: number;
  y: number;
  depth: number;
}

export interface BoundedRelationshipGraph {
  nodes: RelationshipGraphNode[];
  edges: RelationshipGraphEdge[];
  omittedNodeCount: number;
}

export function boundRelationshipGraph(
  nodes: RelationshipGraphNode[],
  edges: RelationshipGraphEdge[],
  maxNodes = 40,
): BoundedRelationshipGraph {
  const boundedNodes = nodes.slice(0, Math.max(1, maxNodes));
  const ids = new Set(boundedNodes.map((node) => node.id));
  return {
    nodes: boundedNodes,
    edges: edges.filter((edge) => ids.has(edge.source) && ids.has(edge.target)),
    omittedNodeCount: Math.max(0, nodes.length - boundedNodes.length),
  };
}

export function relationshipNeighbors(nodeId: string, edges: RelationshipGraphEdge[]): string[] {
  const result: string[] = [];
  for (const edge of edges) {
    if (edge.source === nodeId) result.push(edge.target);
    else if (edge.target === nodeId) result.push(edge.source);
  }
  return [...new Set(result)];
}

export function layoutRelationshipGraph(
  nodes: RelationshipGraphNode[],
  edges: RelationshipGraphEdge[],
  rootId = nodes[0]?.id,
): PositionedRelationshipNode[] {
  if (nodes.length === 0) return [];
  const root = nodes.some((node) => node.id === rootId) ? rootId! : nodes[0]!.id;
  const depth = new Map<string, number>([[root, 0]]);
  const queue = [root];
  while (queue.length) {
    const current = queue.shift()!;
    for (const neighbor of relationshipNeighbors(current, edges)) {
      if (!depth.has(neighbor) && nodes.some((node) => node.id === neighbor)) {
        depth.set(neighbor, (depth.get(current) ?? 0) + 1);
        queue.push(neighbor);
      }
    }
  }
  let disconnectedDepth = Math.max(0, ...depth.values()) + 1;
  nodes.forEach((node) => { if (!depth.has(node.id)) depth.set(node.id, disconnectedDepth); });
  const groups = new Map<number, RelationshipGraphNode[]>();
  nodes.forEach((node) => {
    const level = depth.get(node.id)!;
    groups.set(level, [...(groups.get(level) ?? []), node]);
  });
  const maxDepth = Math.max(1, ...groups.keys());
  return nodes.map((node) => {
    const level = depth.get(node.id)!;
    if (node.x !== undefined && node.y !== undefined) return { ...node, x: node.x, y: node.y, depth: level };
    if (level === 0) return { ...node, x: 50, y: 50, depth: 0 };
    const peers = groups.get(level)!;
    const index = peers.findIndex((peer) => peer.id === node.id);
    const angle = (Math.PI * 2 * index) / peers.length - Math.PI / 2;
    const radius = 16 + (level / maxDepth) * 26;
    return {
      ...node,
      x: Number((50 + Math.cos(angle) * radius).toFixed(3)),
      y: Number((50 + Math.sin(angle) * radius).toFixed(3)),
      depth: level,
    };
  });
}

export function traverseRelationshipNode(nodes: RelationshipGraphNode[], currentId: string | undefined, direction: -1 | 1): string | undefined {
  if (nodes.length === 0) return undefined;
  const current = Math.max(0, nodes.findIndex((node) => node.id === currentId));
  return nodes[(current + direction + nodes.length) % nodes.length]?.id;
}
