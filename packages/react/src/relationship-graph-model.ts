/**
 * A colour that a node or an edge shares with a legend item (HAR-1639). Colour is never the only
 * signal: say the same thing in the node's text, the edge's `description` or its `variant`.
 */
export type RelationshipGraphTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'accent';

export interface RelationshipGraphNode {
  id: string;
  label: string;
  type?: string;
  description?: string;
  /** Layered layout: the node's border and edge mark take this tone (HAR-1639). */
  tone?: RelationshipGraphTone;
  x?: number;
  y?: number;
  /** Layered layout: the node's column. Omitted → BFS distance from the root along source→target. */
  depth?: number;
}

/** Where an edge's arrowhead sits: at the target (default), at the source, or nowhere. */
export type RelationshipGraphArrow = 'forward' | 'backward' | 'none';

export interface RelationshipGraphEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  label?: string;
  /** Layered layout: arrowhead placement (default `forward`). */
  arrow?: RelationshipGraphArrow;
  /** Layered layout: always draw this edge's label, whatever the label policy. */
  emphasis?: boolean;
  /**
   * `dashed` draws the line dashed, e.g. an expected relation that is missing (HAR-1639). Default
   * `solid`; a lateral or cycle edge is dashed either way.
   */
  variant?: 'solid' | 'dashed';
  /** The line and arrowhead take this tone (HAR-1639). */
  tone?: RelationshipGraphTone;
  /**
   * Said to assistive technology with the relationship, on both nodes it joins, e.g. "expected,
   * missing" (HAR-1639). The drawn line itself is decoration; the nodes carry the relationship.
   */
  description?: string;
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

/* ── Layered layout (ADR-0003) ───────────────────────────────────────────────
 * Columns are distances from the root; each node is drawn once; big leaf
 * fan-outs collapse into cluster items; barycenter sweeps reduce crossings.
 * Pure and deterministic: the same input always yields the same geometry. */

/**
 * `forward` steps one column right; `skip` goes right across more than one column; `lateral`
 * stays in its column; `back` goes left without closing a loop; `cycle` goes left and closes one
 * (HAR-1639: only a cycle is flagged as one, and only lateral and cycle edges are dashed).
 */
export type LayeredEdgeKind = 'forward' | 'skip' | 'lateral' | 'back' | 'cycle';

export interface LayeredLayoutOptions {
  rootId?: string;
  /** Minimum sibling group size that collapses into a cluster. Default 6; 0 disables. */
  clusterThreshold?: number;
  expandedClusterIds?: ReadonlySet<string>;
  density?: 'compact' | 'standard';
}

export interface RelationshipGraphCluster {
  id: string;
  parentId: string;
  depth: number;
  type?: string;
  edgeType?: string;
  edgeLabel?: string;
  members: RelationshipGraphNode[];
}

export interface LayeredItem {
  /** Node id, or cluster id for a collapsed cluster. */
  id: string;
  kind: 'node' | 'cluster';
  node?: RelationshipGraphNode;
  cluster?: RelationshipGraphCluster;
  depth: number;
  /** Position within its column (0-based, top to bottom). */
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Forward parents / children as item ids, in column order. */
  parents: string[];
  children: string[];
  /** Set on the first member of an expanded cluster: the group its collapse control belongs to. */
  expandedGroup?: RelationshipGraphCluster;
  /** True when a cycle edge touches this node (HAR-1639: no longer set by skip, lateral or back edges). */
  inCycle: boolean;
  /** Edges (any kind) touching this item. */
  degree: number;
}

export interface RoutedEdge {
  id: string;
  /** Item ids (a cluster id when the edge enters a collapsed cluster). */
  source: string;
  target: string;
  kind: LayeredEdgeKind;
  /** Original edge ids drawn by this path (several for a cluster). */
  edgeIds: string[];
  type?: string;
  label?: string;
  arrow: RelationshipGraphArrow;
  emphasis: boolean;
  /** The first underlying edge's `variant`, `tone` and `description`. */
  variant: 'solid' | 'dashed';
  tone?: RelationshipGraphTone;
  description?: string;
  path: string;
  labelX: number;
  labelY: number;
  /** Arrowhead tip and the direction it points in (radians, 0 = pointing right). */
  arrowX: number;
  arrowY: number;
  arrowAngle: number;
  /** Label policy `auto` shows this label without interaction. */
  autoLabel: boolean;
  /**
   * The label is said once by the target column's header (`LayeredColumn.edgeLabel`), so the
   * edge itself never draws it under `edgeLabels="auto"` (HAR-1387: 197 of 200 labels on a
   * 300-node map read "depends on").
   */
  columnLabel: boolean;
  /**
   * One of a busy node's forward edges, drawn as a bus: along a shared trunk in the column gap
   * and a short stub into the target, so a fan-out reads as one line, not a black fan (HAR-1387).
   */
  bus: boolean;
  /** The label wrapped to fit the column gap (at most two lines). */
  labelLines: string[];
}

export interface LayeredColumn {
  depth: number;
  x: number;
  /** Underlying nodes in the column, cluster members included. */
  count: number;
  /**
   * The relation most forward edges into this column share, when the column takes more than a
   * few of them: the header says it once and those edges draw no label (HAR-1387).
   */
  edgeLabel?: string;
}

export interface LayeredLayout {
  rootId: string | undefined;
  items: LayeredItem[];
  edges: RoutedEdge[];
  clusters: RelationshipGraphCluster[];
  columns: LayeredColumn[];
  /** Node id → id of the item that currently draws it (itself, or its cluster). */
  itemOf: Record<string, string>;
  width: number;
  height: number;
  nodeWidth: number;
  nodeHeight: number;
  headerHeight: number;
}

const LAYERED_GEOMETRY = {
  standard: { nodeWidth: 176, nodeHeight: 76, columnGap: 96, rowGap: 12 },
  compact: { nodeWidth: 160, nodeHeight: 60, columnGap: 80, rowGap: 8 },
} as const;
const LAYERED_PADDING = 16;
const LAYERED_HEADER = 28;
const GROUP_HEADER = 28;
const AUTO_LABEL_MAX_FANOUT = 4;
/** Average glyph advance of the meta type size (12.5 px, the kit's small text), used to wrap edge
 *  labels into the column gap and to size their chips before they are measured. */
const LABEL_CHAR_WIDTH = 6.3;
/** An edge label's chip: padding around the text, and its line height (meta at 1.2). */
const LABEL_PAD_X = 6;
const LABEL_PAD_Y = 3;
const LABEL_LINE = 15;
/** A busy node's trunk stands this far out from the node, so each stub into a target is a straight
 *  run long enough to carry its label on a chip (the labels used to sit on the trunk's bends). */
const BUS_INSET = 8;
/** The arrowhead's length at the end of a stub. */
const ARROW_LENGTH = 9;
const LABEL_MAX_LINES = 2;

/** Word-wrap a label into at most two lines that fit `width`; overlong words end in an ellipsis. */
export function wrapEdgeLabel(label: string, width: number): string[] {
  const max = Math.max(4, Math.floor(width / LABEL_CHAR_WIDTH));
  const clip = (word: string): string => (word.length > max ? `${word.slice(0, max - 1)}…` : word);
  const words = label.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  let placed = 0;
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= max) {
      current = next;
      placed += 1;
      continue;
    }
    if (current) lines.push(current);
    current = '';
    if (lines.length === LABEL_MAX_LINES) break;
    current = clip(word);
    placed += 1;
  }
  if (current && lines.length < LABEL_MAX_LINES) lines.push(current);
  // Words left over: the last line says so (a word cut short already ends in an ellipsis).
  if (placed < words.length && lines.length > 0) {
    const last = lines[lines.length - 1]!;
    if (!last.endsWith('…')) lines[lines.length - 1] = last.length < max ? `${last}…` : `${last.slice(0, max - 1)}…`;
  }
  return lines;
}

export interface LayeredEdgeClassification {
  depthById: Map<string, number>;
  kindById: Map<string, LayeredEdgeKind>;
}

const drawableEdge = (edge: RelationshipGraphEdge, ids: ReadonlySet<string>): boolean =>
  ids.has(edge.source) && ids.has(edge.target) && edge.source !== edge.target;

/**
 * Column (depth) for every node and a kind for every drawable edge.
 * Supplied `node.depth` wins; otherwise BFS from the root along source→target.
 * Nodes the BFS cannot reach go to a trailing column. Self-loops and edges with
 * a missing endpoint get no kind and are not drawn.
 */
export function classifyLayeredEdges(
  nodes: RelationshipGraphNode[],
  edges: RelationshipGraphEdge[],
  rootId: string | undefined = nodes[0]?.id,
): LayeredEdgeClassification {
  const ids = new Set(nodes.map((node) => node.id));
  const root = rootId !== undefined && ids.has(rootId) ? rootId : nodes[0]?.id;
  const outgoing = new Map<string, string[]>();
  for (const edge of edges) {
    if (!drawableEdge(edge, ids)) continue;
    const list = outgoing.get(edge.source);
    if (list) list.push(edge.target);
    else outgoing.set(edge.source, [edge.target]);
  }
  const bfs = new Map<string, number>();
  if (root !== undefined) {
    bfs.set(root, 0);
    const queue = [root];
    for (let head = 0; head < queue.length; head += 1) {
      const current = queue[head]!;
      for (const next of outgoing.get(current) ?? []) {
        if (!bfs.has(next)) {
          bfs.set(next, bfs.get(current)! + 1);
          queue.push(next);
        }
      }
    }
  }
  const depthById = new Map<string, number>();
  let deepest = 0;
  for (const node of nodes) {
    const supplied = node.depth !== undefined && Number.isFinite(node.depth) ? Math.max(0, Math.floor(node.depth)) : undefined;
    const depth = supplied ?? bfs.get(node.id);
    if (depth === undefined) continue;
    depthById.set(node.id, depth);
    deepest = Math.max(deepest, depth);
  }
  for (const node of nodes) if (!depthById.has(node.id)) depthById.set(node.id, deepest + 1);

  const forwardOut = new Map<string, string[]>();
  const kindById = new Map<string, LayeredEdgeKind>();
  const backEdges: RelationshipGraphEdge[] = [];
  for (const edge of edges) {
    if (!drawableEdge(edge, ids)) continue;
    const from = depthById.get(edge.source)!;
    const to = depthById.get(edge.target)!;
    if (to === from + 1) {
      kindById.set(edge.id, 'forward');
      const list = forwardOut.get(edge.source);
      if (list) list.push(edge.target);
      else forwardOut.set(edge.source, [edge.target]);
    } else if (to > from + 1) {
      kindById.set(edge.id, 'skip');
    } else if (to < from) {
      backEdges.push(edge);
    } else {
      kindById.set(edge.id, 'lateral');
    }
  }
  // A back edge closes a cycle when its head reaches its tail through forward edges.
  for (const edge of backEdges) {
    const limit = depthById.get(edge.source)!;
    const seen = new Set<string>([edge.target]);
    const stack = [edge.target];
    let closes = false;
    while (stack.length > 0 && !closes) {
      const current = stack.pop()!;
      for (const next of forwardOut.get(current) ?? []) {
        if (next === edge.source) {
          closes = true;
          break;
        }
        if (!seen.has(next) && depthById.get(next)! < limit) {
          seen.add(next);
          stack.push(next);
        }
      }
    }
    kindById.set(edge.id, closes ? 'cycle' : 'back');
  }
  return { depthById, kindById };
}

export function clusterIdFor(parentId: string, type: string | undefined, edgeType: string | undefined): string {
  return `cluster:${parentId}:${type ?? ''}:${edgeType ?? ''}`;
}

/**
 * A bus edge: right from the source to the trunk, along it to the target's row, right into the
 * target, with small rounded corners. Every edge of one fan-out shares the first two segments.
 */
function busPath(startX: number, startY: number, trunk: number, endX: number, endY: number): string {
  const dy = endY - startY;
  if (Math.abs(dy) < 1) return `M${round1(startX)} ${round1(startY)} H${round1(endX)}`;
  const r = Math.min(8, Math.abs(dy) / 2, trunk - startX, endX - trunk);
  const dir = Math.sign(dy);
  return `M${round1(startX)} ${round1(startY)} H${round1(trunk - r)} Q${round1(trunk)} ${round1(startY)} ${round1(trunk)} ${round1(startY + dir * r)}`
    + ` V${round1(endY - dir * r)} Q${round1(trunk)} ${round1(endY)} ${round1(trunk + r)} ${round1(endY)} H${round1(endX)}`;
}

const mean = (values: number[]): number => values.reduce((sum, value) => sum + value, 0) / values.length;
const round1 = (value: number): number => Math.round(value * 10) / 10;

/** Layered, clustered, crossing-reduced layout for `RelationshipGraph layout="layered"`. */
export function layoutLayeredGraph(
  nodes: RelationshipGraphNode[],
  edges: RelationshipGraphEdge[],
  options: LayeredLayoutOptions = {},
): LayeredLayout {
  const { nodeWidth, nodeHeight, columnGap, rowGap } = LAYERED_GEOMETRY[options.density ?? 'standard'];
  const threshold = options.clusterThreshold ?? 6;
  const expanded = options.expandedClusterIds ?? new Set<string>();
  const rootId = options.rootId !== undefined && nodes.some((node) => node.id === options.rootId) ? options.rootId : nodes[0]?.id;
  if (nodes.length === 0) {
    return {
      rootId, items: [], edges: [], clusters: [], columns: [], itemOf: {},
      width: 0, height: 0, nodeWidth, nodeHeight, headerHeight: LAYERED_HEADER,
    };
  }

  const { depthById, kindById } = classifyLayeredEdges(nodes, edges, rootId);
  const drawable = edges.filter((edge) => kindById.has(edge.id));

  const forwardParents = new Map<string, RelationshipGraphEdge[]>();
  const forwardChildCount = new Map<string, number>();
  const inCycle = new Set<string>();
  // Touched by any edge that is not a plain forward step: never folded into a cluster, which
  // routes forward edges only.
  const crossLinked = new Set<string>();
  const nodeDegree = new Map<string, number>();
  for (const edge of drawable) {
    nodeDegree.set(edge.source, (nodeDegree.get(edge.source) ?? 0) + 1);
    nodeDegree.set(edge.target, (nodeDegree.get(edge.target) ?? 0) + 1);
    if (kindById.get(edge.id) === 'forward') {
      const list = forwardParents.get(edge.target);
      if (list) list.push(edge);
      else forwardParents.set(edge.target, [edge]);
      forwardChildCount.set(edge.source, (forwardChildCount.get(edge.source) ?? 0) + 1);
    } else {
      crossLinked.add(edge.source);
      crossLinked.add(edge.target);
      if (kindById.get(edge.id) === 'cycle') {
        inCycle.add(edge.source);
        inCycle.add(edge.target);
      }
    }
  }

  // ── Clusters: leaf siblings grouped by (parent, node type, edge type) ──
  const groups = new Map<string, RelationshipGraphCluster>();
  if (threshold > 0) {
    for (const node of nodes) {
      if (node.id === rootId || crossLinked.has(node.id) || (forwardChildCount.get(node.id) ?? 0) > 0) continue;
      const parents = forwardParents.get(node.id) ?? [];
      if (parents.length !== 1) continue;
      const via = parents[0]!;
      const id = clusterIdFor(via.source, node.type, via.type);
      const group = groups.get(id);
      if (group) {
        group.members.push(node);
        continue;
      }
      const created: RelationshipGraphCluster = { id, parentId: via.source, depth: depthById.get(node.id)!, members: [node] };
      if (node.type !== undefined) created.type = node.type;
      if (via.type !== undefined) created.edgeType = via.type;
      const edgeLabel = via.label ?? via.type;
      if (edgeLabel !== undefined) created.edgeLabel = edgeLabel;
      groups.set(id, created);
    }
  }
  const clusterById = new Map<string, RelationshipGraphCluster>();
  const itemOf: Record<string, string> = {};
  const expandedGroupOf = new Map<string, RelationshipGraphCluster>();
  for (const group of groups.values()) {
    if (group.members.length < threshold) continue;
    if (expanded.has(group.id)) {
      for (const member of group.members) expandedGroupOf.set(member.id, group);
      continue;
    }
    clusterById.set(group.id, group);
    for (const member of group.members) itemOf[member.id] = group.id;
  }
  for (const node of nodes) if (itemOf[node.id] === undefined) itemOf[node.id] = node.id;

  // ── Items per column in input order (a cluster sits where its first member was) ──
  const columnsByDepth = new Map<number, LayeredItem[]>();
  const itemById = new Map<string, LayeredItem>();
  for (const node of nodes) {
    const id = itemOf[node.id]!;
    if (itemById.has(id)) continue;
    const cluster = clusterById.get(id);
    const depth = depthById.get(node.id)!;
    const item: LayeredItem = {
      id, kind: cluster ? 'cluster' : 'node', depth, index: 0, x: 0, y: 0,
      width: nodeWidth, height: nodeHeight, parents: [], children: [],
      inCycle: cluster ? false : inCycle.has(node.id),
      degree: cluster ? cluster.members.length : (nodeDegree.get(node.id) ?? 0),
    };
    if (cluster) item.cluster = cluster;
    else item.node = node;
    itemById.set(id, item);
    const column = columnsByDepth.get(depth);
    if (column) column.push(item);
    else columnsByDepth.set(depth, [item]);
  }

  for (const edge of drawable) {
    if (kindById.get(edge.id) !== 'forward') continue;
    const from = itemById.get(itemOf[edge.source]!)!;
    const to = itemById.get(itemOf[edge.target]!)!;
    if (!from.children.includes(to.id)) from.children.push(to.id);
    if (!to.parents.includes(from.id)) to.parents.push(from.id);
  }

  // ── Ordering: barycenter sweeps down, up, down ──
  const depths = [...columnsByDepth.keys()].sort((a, b) => a - b);
  const position = new Map<string, number>();
  const reindex = (column: LayeredItem[]): void => {
    column.forEach((item, index) => {
      item.index = index;
      position.set(item.id, index);
    });
  };
  for (const depth of depths) reindex(columnsByDepth.get(depth)!);
  const groupOfItem = (item: LayeredItem): RelationshipGraphCluster | undefined =>
    item.node ? expandedGroupOf.get(item.node.id) : undefined;
  const sweep = (depth: number, neighbours: (item: LayeredItem) => string[]): void => {
    const keyed = columnsByDepth.get(depth)!.map((item) => {
      const around = neighbours(item)
        .map((id) => position.get(id))
        .filter((value): value is number => value !== undefined);
      return { item, key: around.length > 0 ? mean(around) : item.index, tie: item.index };
    });
    keyed.sort((a, b) => a.key - b.key || a.tie - b.tie);
    // Expanded cluster members stay contiguous, anchored where the first one sorted.
    const ordered: LayeredItem[] = [];
    const placed = new Set<string>();
    for (const { item } of keyed) {
      if (placed.has(item.id)) continue;
      const group = groupOfItem(item);
      for (const candidate of group ? keyed.map((entry) => entry.item).filter((other) => groupOfItem(other) === group) : [item]) {
        if (placed.has(candidate.id)) continue;
        ordered.push(candidate);
        placed.add(candidate.id);
      }
    }
    columnsByDepth.set(depth, ordered);
    reindex(ordered);
  };
  const inner = depths.slice(1);
  for (const depth of inner) sweep(depth, (item) => item.parents);
  for (const depth of [...inner].reverse()) sweep(depth, (item) => item.children);
  for (const depth of inner) sweep(depth, (item) => item.parents);

  // ── Placement: aim at the parents' mean centre, push down to avoid overlap ──
  const top = LAYERED_PADDING + LAYERED_HEADER;
  const columns: LayeredColumn[] = [];
  let width = 0;
  let height = 0;
  for (const depth of depths) {
    const column = columnsByDepth.get(depth)!;
    const x = LAYERED_PADDING + depth * (nodeWidth + columnGap);
    let cursor = top;
    let count = 0;
    const ledGroups = new Set<RelationshipGraphCluster>();
    for (const item of column) {
      const parentCentres = item.parents
        .map((id) => itemById.get(id)!)
        .filter((parent) => parent.depth < depth)
        .map((parent) => parent.y + parent.height / 2);
      const group = groupOfItem(item);
      const leadsGroup = group !== undefined && !ledGroups.has(group);
      if (group) ledGroups.add(group);
      const floor = cursor + (leadsGroup ? GROUP_HEADER : 0);
      const target = parentCentres.length > 0 ? mean(parentCentres) - item.height / 2 : floor;
      item.x = x;
      item.y = round1(Math.max(target, floor));
      if (leadsGroup) item.expandedGroup = group;
      cursor = item.y + item.height + rowGap;
      count += item.cluster ? item.cluster.members.length : 1;
      width = Math.max(width, x + item.width);
      height = Math.max(height, item.y + item.height);
    }
    columns.push({ depth, x, count });
  }
  const byPosition = (a: string, b: string): number => (position.get(a) ?? 0) - (position.get(b) ?? 0);
  for (const item of itemById.values()) {
    item.children.sort(byPosition);
    item.parents.sort(byPosition);
  }

  // ── Edge routing ──
  const routed = new Map<string, RoutedEdge>();
  for (const edge of drawable) {
    const kind = kindById.get(edge.id)!;
    const from = itemById.get(itemOf[edge.source]!)!;
    const to = itemById.get(itemOf[edge.target]!)!;
    const key = from.kind === 'cluster' || to.kind === 'cluster' ? `${from.id}->${to.id}` : edge.id;
    const existing = routed.get(key);
    if (existing) {
      existing.edgeIds.push(edge.id);
      continue;
    }
    let startX: number;
    let startY: number;
    let endX: number;
    let endY: number;
    let path: string;
    let labelX: number;
    let labelY: number;
    let startAngle: number;
    let endAngle: number;
    if (kind === 'skip') {
      // Across more than one column: down into a channel under every item of the columns it
      // crosses, along it, and up into the target, so it never runs behind a node and never reads
      // as a chain through the columns between (HAR-1639).
      startX = from.x + from.width;
      startY = from.y + from.height / 2;
      endX = to.x;
      endY = to.y + to.height / 2;
      let floor = Math.max(startY, endY);
      for (const item of itemById.values()) if (item.depth > from.depth && item.depth < to.depth) floor = Math.max(floor, item.y + item.height);
      const channel = floor + 18;
      const half = columnGap / 2;
      path = `M${round1(startX)} ${round1(startY)} C${round1(startX + half)} ${round1(startY)} ${round1(startX + half)} ${round1(channel)} ${round1(startX + half)} ${round1(channel)} L${round1(endX - half)} ${round1(channel)} C${round1(endX - half)} ${round1(channel)} ${round1(endX - half)} ${round1(endY)} ${round1(endX)} ${round1(endY)}`;
      labelX = (startX + endX) / 2;
      labelY = channel;
      startAngle = Math.PI;
      endAngle = 0;
      height = Math.max(height, channel + 8);
    } else if (kind === 'forward' && from.children.length > AUTO_LABEL_MAX_FANOUT) {
      // A busy node's fan-out: one trunk at the middle of the column gap, a stub into each target.
      startX = from.x + from.width;
      startY = from.y + from.height / 2;
      endX = to.x;
      endY = to.y + to.height / 2;
      const trunk = startX + BUS_INSET;
      path = busPath(startX, startY, trunk, endX, endY);
      // on the straight stub: between the trunk's corner and the arrowhead
      labelX = (trunk + 8 + endX - ARROW_LENGTH) / 2;
      labelY = endY;
      startAngle = Math.PI;
      endAngle = 0;
    } else if (kind === 'forward') {
      startX = from.x + from.width;
      startY = from.y + from.height / 2;
      endX = to.x;
      endY = to.y + to.height / 2;
      const bend = Math.max(columnGap / 2, 24);
      path = `M${round1(startX)} ${round1(startY)} C${round1(startX + bend)} ${round1(startY)} ${round1(endX - bend)} ${round1(endY)} ${round1(endX)} ${round1(endY)}`;
      labelX = (startX + endX) / 2;
      labelY = (startY + endY) / 2;
      startAngle = Math.PI;
      endAngle = 0;
    } else if (from.depth === to.depth) {
      startX = from.x + from.width;
      startY = from.y + from.height / 2;
      endX = to.x + to.width;
      endY = to.y + to.height / 2;
      const bulge = Math.min(columnGap - 8, 20 + Math.abs(endY - startY) * 0.1);
      path = `M${round1(startX)} ${round1(startY)} C${round1(startX + bulge)} ${round1(startY)} ${round1(endX + bulge)} ${round1(endY)} ${round1(endX)} ${round1(endY)}`;
      labelX = startX + bulge * 0.75;
      labelY = (startY + endY) / 2;
      startAngle = Math.PI;
      endAngle = Math.PI;
    } else {
      startX = from.x + from.width / 2;
      startY = from.y + from.height;
      endX = to.x + to.width / 2;
      endY = to.y + to.height;
      const dip = 28 + Math.abs(endX - startX) * 0.12;
      const low = Math.max(startY, endY) + dip;
      path = `M${round1(startX)} ${round1(startY)} C${round1(startX)} ${round1(low)} ${round1(endX)} ${round1(low)} ${round1(endX)} ${round1(endY)}`;
      labelX = (startX + endX) / 2;
      labelY = low - dip * 0.25;
      startAngle = -Math.PI / 2;
      endAngle = -Math.PI / 2;
      height = Math.max(height, low);
    }
    const arrow = edge.arrow ?? 'forward';
    const atStart = arrow === 'backward';
    const entry: RoutedEdge = {
      id: key,
      source: from.id,
      target: to.id,
      kind,
      edgeIds: [edge.id],
      arrow,
      emphasis: edge.emphasis === true,
      variant: edge.variant === 'dashed' ? 'dashed' : 'solid',
      path,
      labelX: round1(labelX),
      labelY: round1(labelY),
      arrowX: round1(atStart ? startX : endX),
      arrowY: round1(atStart ? startY : endY),
      arrowAngle: atStart ? startAngle : endAngle,
      labelLines: [],
      columnLabel: false,
      bus: kind === 'forward' && from.children.length > AUTO_LABEL_MAX_FANOUT,
      autoLabel:
        to.kind !== 'cluster' &&
        (edge.emphasis === true || (kind === 'forward' && from.children.length <= AUTO_LABEL_MAX_FANOUT)),
    };
    if (edge.type !== undefined) entry.type = edge.type;
    if (edge.tone !== undefined) entry.tone = edge.tone;
    if (edge.description !== undefined) entry.description = edge.description;
    const label = edge.label ?? edge.type;
    if (label !== undefined) entry.label = label;
    routed.set(key, entry);
  }

  // A column that takes more than a few forward edges says their common relation once, in its
  // header; only the edges that differ from it keep a label of their own (HAR-1387).
  const intoColumn = new Map<number, RoutedEdge[]>();
  for (const entry of routed.values()) {
    if (entry.kind !== 'forward' || entry.label === undefined) continue;
    const depth = itemById.get(entry.target)!.depth;
    const list = intoColumn.get(depth);
    if (list) list.push(entry);
    else intoColumn.set(depth, [entry]);
  }
  for (const [depth, entries] of intoColumn) {
    if (entries.length <= AUTO_LABEL_MAX_FANOUT) continue;
    const counts = new Map<string, number>();
    for (const entry of entries) counts.set(entry.label!, (counts.get(entry.label!) ?? 0) + 1);
    let dominant: string | undefined;
    let most = 1;
    for (const [label, count] of counts) if (count > most) { dominant = label; most = count; }
    if (dominant === undefined) continue;
    const column = columns.find((candidate) => candidate.depth === depth);
    if (column) column.edgeLabel = dominant;
    for (const entry of entries) {
      if (entry.emphasis) continue;
      if (entry.label === dominant) {
        entry.columnLabel = true;
        entry.autoLabel = false;
      } else if (itemById.get(entry.target)!.kind !== 'cluster') {
        entry.autoLabel = true;
      }
    }
  }

  // One auto label per (source, label): siblings drawn from the same node would
  // otherwise stack the same words at the source's side.
  const seenLabels = new Set<string>();
  for (const entry of routed.values()) {
    if (entry.label === undefined) continue;
    // A chip fits its straight run: the stub of a bus, the column gap otherwise.
    const run = entry.bus ? columnGap - BUS_INSET - 8 - ARROW_LENGTH : columnGap - 8;
    entry.labelLines = wrapEdgeLabel(entry.label, run - 2 * LABEL_PAD_X);
    if (!entry.autoLabel || entry.emphasis || entry.kind !== 'forward') continue;
    const key = `${entry.source}|${entry.label}`;
    if (seenLabels.has(key)) entry.autoLabel = false;
    else seenLabels.add(key);
  }

  return {
    rootId,
    items: depths.flatMap((depth) => columnsByDepth.get(depth)!),
    edges: [...routed.values()],
    clusters: [...clusterById.values()],
    columns,
    itemOf,
    width: round1(width + LAYERED_PADDING),
    height: round1(height + LAYERED_PADDING + 8),
    nodeWidth,
    nodeHeight,
    headerHeight: LAYERED_HEADER,
  };
}

/** An edge label's box on the stage, for `separateEdgeLabels`. */
export interface EdgeLabelBox {
  id: string;
  /** Centre of the label. */
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Where a label is drawn after `separateEdgeLabels`, or that it is left out. */
export interface PlacedEdgeLabel {
  x: number;
  y: number;
  hidden: boolean;
}

/** The chip a wrapped edge label takes, from its lines (the meta type size, as `wrapEdgeLabel` assumes). */
export function edgeLabelSize(lines: readonly string[]): { width: number; height: number } {
  const longest = lines.reduce((max, line) => Math.max(max, line.length), 0);
  return { width: longest * LABEL_CHAR_WIDTH + 2 * LABEL_PAD_X, height: Math.max(1, lines.length) * LABEL_LINE + 2 * LABEL_PAD_Y };
}

/**
 * Moves edge labels apart where they would be drawn over each other (HAR-1639: two labels on top
 * of each other in a dense layered column). Labels are taken top to bottom; one that overlaps a
 * label already placed moves down just below it. A label that would have to move further than
 * `maxShift` from its edge is left out instead (the relationship is still in the nodes'
 * descriptions and in the list). Deterministic: the same boxes give the same placement.
 */
export function separateEdgeLabels(boxes: readonly EdgeLabelBox[], options: { gap?: number; maxShift?: number } = {}): Map<string, PlacedEdgeLabel> {
  const gap = options.gap ?? 2;
  const maxShift = options.maxShift ?? 48;
  const placed: Array<{ left: number; right: number; top: number; bottom: number }> = [];
  const result = new Map<string, PlacedEdgeLabel>();
  const ordered = [...boxes].sort((a, b) => a.y - b.y || a.x - b.x || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  for (const box of ordered) {
    const left = box.x - box.width / 2;
    const right = box.x + box.width / 2;
    let top = box.y - box.height / 2;
    // Moving down can run into a label placed further down: check again until nothing overlaps.
    for (let guard = 0; guard <= placed.length; guard += 1) {
      const hit = placed.find((other) => left < other.right && other.left < right && top < other.bottom + gap && other.top - gap < top + box.height);
      if (!hit) break;
      top = hit.bottom + gap;
    }
    const shift = top - (box.y - box.height / 2);
    if (shift > maxShift) {
      result.set(box.id, { x: box.x, y: box.y, hidden: true });
      continue;
    }
    placed.push({ left, right, top, bottom: top + box.height });
    result.set(box.id, { x: box.x, y: round1(top + box.height / 2), hidden: false });
  }
  return result;
}

export type LayeredNavigationKey = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight' | 'Home' | 'End';

/** Keyboard traversal over a layered layout: ←/→ along forward edges, ↑/↓ within a column. */
export function layeredNeighbor(
  layout: LayeredLayout,
  currentId: string | undefined,
  key: LayeredNavigationKey,
): string | undefined {
  const root = layout.rootId !== undefined ? layout.itemOf[layout.rootId] : layout.items[0]?.id;
  const current = layout.items.find((item) => item.id === currentId);
  if (!current) return root ?? layout.items[0]?.id;
  const column = layout.items.filter((item) => item.depth === current.depth);
  switch (key) {
    case 'ArrowUp':
      return column[current.index - 1]?.id;
    case 'ArrowDown':
      return column[current.index + 1]?.id;
    case 'ArrowRight':
      return current.children[0];
    case 'ArrowLeft':
      return current.parents[0];
    case 'Home':
      return root;
    case 'End':
      return column[column.length - 1]?.id;
    default:
      return undefined;
  }
}
