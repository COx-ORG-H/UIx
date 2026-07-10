/**
 * uix tree engine — framework-agnostic helpers for the Tree component. Pure functions
 * (no DOM), so the same core drives the React Tree and the vanilla styleguide and is
 * unit-tested (see tree-engine.test.mjs). Virtualization reuses the table engine's
 * `virtualWindow` / `shouldVirtualize` over the flattened, visible node list.
 */

/** Minimal node shape the flattener needs: a stable id and optional children. */
export interface TreeNodeLike {
  id: string;
  children?: TreeNodeLike[];
}

/** One visible node in depth-first order, carrying the ARIA facts a (possibly
 *  virtualized) treeitem needs: a 1-based level plus set-size / position among its
 *  siblings, so a screen reader knows the full count even when only a window renders. */
export interface FlatTreeNode<T> {
  node: T;
  level: number;      // 1-based (aria-level)
  setSize: number;    // sibling count under the same parent (aria-setsize)
  posInSet: number;   // 1-based position among siblings (aria-posinset)
  hasChildren: boolean;
  expanded: boolean;
  parentId: string | null;
}

/**
 * Flatten a tree to the linear, depth-first list of *visible* nodes — every node whose
 * ancestors are all expanded. Collapsed subtrees are omitted (so they cost nothing to
 * render or virtualize). Each entry carries aria level / setsize / posinset.
 */
export function flattenVisibleTree<T extends TreeNodeLike>(
  nodes: readonly T[],
  expanded: ReadonlySet<string>,
): FlatTreeNode<T>[] {
  const out: FlatTreeNode<T>[] = [];
  const walk = (siblings: readonly T[], level: number, parentId: string | null): void => {
    const setSize = siblings.length;
    siblings.forEach((node, i) => {
      const kids = node.children as T[] | undefined;
      const hasChildren = Array.isArray(kids) && kids.length > 0;
      const isExpanded = expanded.has(node.id);
      out.push({ node, level, setSize, posInSet: i + 1, hasChildren, expanded: isExpanded, parentId });
      if (hasChildren && isExpanded) walk(kids as T[], level + 1, node.id);
    });
  };
  walk(nodes, 1, null);
  return out;
}
