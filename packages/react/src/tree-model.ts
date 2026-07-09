/**
 * uix tree model — framework-agnostic, dependency-free tree flattening + keyboard nav.
 *
 * Pure functions (no DOM, no React): flatten a nested tree into the linear list of *visible*
 * rows (respecting expansion) so it can be virtualized with the table engine's virtualWindow,
 * and resolve a keyboard key into a navigation decision. Both the plain and the virtualized
 * <Tree> render paths use these, so the two behave identically and keyboard nav works even for
 * rows that are scrolled out of the virtual window (UIX-FIX-05). Unit-tested (tree-model.test.mjs).
 */

/** Minimal shape a node must have; the concrete node (label, icon, …) rides along as `T`. */
export interface TreeLike<T> { id: string; children?: T[]; }

export interface FlatNode<T> {
  node: T;
  /** 1-based depth, for aria-level. */
  level: number;
  /** number of siblings at this level (this node's parent's child count), for aria-setsize. */
  setsize: number;
  /** 1-based index among those siblings, for aria-posinset. */
  posinset: number;
  hasChildren: boolean;
  isExpanded: boolean;
}

/**
 * Flatten a nested tree into the visible rows, in DOM/reading order. A node's children follow
 * it immediately and are included only when the node is in `expanded`.
 */
export function flattenTree<T extends TreeLike<T>>(
  nodes: readonly T[],
  expanded: ReadonlySet<string>,
  level = 1,
): FlatNode<T>[] {
  const out: FlatNode<T>[] = [];
  const setsize = nodes.length;
  nodes.forEach((node, i) => {
    const hasChildren = Array.isArray(node.children) && node.children.length > 0;
    const isExpanded = hasChildren && expanded.has(node.id);
    out.push({ node, level, setsize, posinset: i + 1, hasChildren, isExpanded });
    if (isExpanded) out.push(...flattenTree(node.children as T[], expanded, level + 1));
  });
  return out;
}

/** A decision produced by a key press — any subset may be set. */
export interface TreeNavAction {
  /** move focus (roving tabindex) to this node id. */
  focusId?: string;
  /** toggle this node's expansion. */
  toggleId?: string;
  /** select this node id. */
  selectId?: string;
}

/**
 * Resolve a key press against the flattened, visible node list — the single source of truth for
 * both render paths. Mirrors the WAI-ARIA tree pattern: Up/Down move by row, Right expands then
 * descends, Left collapses then ascends to the parent, Home/End jump, Enter/Space select (and
 * toggle a parent). Returns an empty action for unhandled keys or an unknown current id.
 */
export function treeNav<T extends TreeLike<T>>(
  flat: readonly FlatNode<T>[],
  currentId: string | undefined,
  key: string,
): TreeNavAction {
  const idx = flat.findIndex((f) => f.node.id === currentId);
  if (idx < 0) return {};
  const cur = flat[idx];
  const focusAt = (i: number): TreeNavAction => {
    const clamped = Math.max(0, Math.min(flat.length - 1, i));
    return { focusId: flat[clamped]?.node.id };
  };
  switch (key) {
    case 'ArrowDown': return focusAt(idx + 1);
    case 'ArrowUp': return focusAt(idx - 1);
    case 'Home': return focusAt(0);
    case 'End': return focusAt(flat.length - 1);
    case 'ArrowRight':
      if (cur.hasChildren && !cur.isExpanded) return { toggleId: cur.node.id };  // expand
      if (cur.hasChildren && cur.isExpanded) return focusAt(idx + 1);            // into first child (next row)
      return {};
    case 'ArrowLeft':
      if (cur.hasChildren && cur.isExpanded) return { toggleId: cur.node.id };   // collapse
      for (let i = idx - 1; i >= 0; i--) {                                       // up to parent
        if (flat[i].level === cur.level - 1) return { focusId: flat[i].node.id };
      }
      return {};
    case 'Enter':
    case ' ':
      return cur.hasChildren
        ? { toggleId: cur.node.id, selectId: cur.node.id }
        : { selectId: cur.node.id };
    default:
      return {};
  }
}
