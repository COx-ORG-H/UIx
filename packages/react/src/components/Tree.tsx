"use client";

import { useId, useMemo, useState } from 'react';
import type { CSSProperties, ReactNode, HTMLAttributes } from 'react';
import { cx } from '../cx.js';
import { flattenVisibleTree } from '../tree-engine.js';
import type { FlatTreeNode } from '../tree-engine.js';
import { virtualWindow, shouldVirtualize } from '../table-engine.js';

const ChevronIcon = () => (
  <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2 4l4 4 4-4" />
  </svg>
);

export interface TreeNodeData {
  id: string;
  label: ReactNode;
  icon?: ReactNode;
  children?: TreeNodeData[];
}

export interface TreeNodeProps {
  node: TreeNodeData;
  expanded: Set<string>;
  selected?: string;
  onToggle: (id: string) => void;
  onSelect?: (id: string) => void;
  level?: number;
}

/* ── nested render (default; all siblings in the DOM inside role=group) ────────── */
function TreeNode({ node, expanded, selected, onToggle, onSelect, level = 0 }: TreeNodeProps) {
  const hasChildren = Array.isArray(node.children) && node.children.length > 0;
  const isExpanded = expanded.has(node.id);
  const rowId = useId();

  return (
    <li
      role="treeitem"
      aria-level={level + 1}
      aria-selected={selected === node.id}
      aria-expanded={hasChildren ? isExpanded : undefined}
      aria-labelledby={rowId}
    >
      <button
        id={rowId}
        type="button"
        className="uix-tree__row"
        onClick={() => {
          if (hasChildren) onToggle(node.id);
          onSelect?.(node.id);
        }}
      >
        <span className="uix-tree__toggle">
          {hasChildren && <ChevronIcon />}
        </span>
        {node.icon && <span aria-hidden="true">{node.icon}</span>}
        {node.label}
      </button>
      {hasChildren && isExpanded && (
        <ul role="group">
          {node.children!.map((child) => (
            <TreeNode key={child.id} node={child} expanded={expanded} selected={selected} onToggle={onToggle} onSelect={onSelect} level={level + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

/* ── flat render (virtualized; only the window is in the DOM, so aria-setsize /
      aria-posinset carry the full sibling counts) ────────────────────────────── */
interface TreeRowProps {
  flat: FlatTreeNode<TreeNodeData>;
  selected?: string;
  rowHeight: number;
  onToggle: (id: string) => void;
  onSelect?: (id: string) => void;
}
function TreeRow({ flat, selected, rowHeight, onToggle, onSelect }: TreeRowProps) {
  const { node, level, setSize, posInSet, hasChildren, expanded } = flat;
  const rowId = useId();
  return (
    <li
      role="treeitem"
      aria-level={level}
      aria-setsize={setSize}
      aria-posinset={posInSet}
      aria-selected={selected === node.id}
      aria-expanded={hasChildren ? expanded : undefined}
      aria-labelledby={rowId}
      style={{ height: rowHeight }}
    >
      <button
        id={rowId}
        type="button"
        className="uix-tree__row"
        style={{ paddingInlineStart: `calc(var(--uix-space-2) + ${level - 1} * var(--uix-space-5))` }}
        onClick={() => {
          if (hasChildren) onToggle(node.id);
          onSelect?.(node.id);
        }}
      >
        <span className="uix-tree__toggle">
          {hasChildren && <ChevronIcon />}
        </span>
        {node.icon && <span aria-hidden="true">{node.icon}</span>}
        {node.label}
      </button>
    </li>
  );
}

export interface TreeProps extends Omit<HTMLAttributes<HTMLUListElement>, 'onSelect' | 'onChange'> {
  nodes: TreeNodeData[];
  expanded?: Set<string>;
  defaultExpanded?: Set<string>;
  selected?: string;
  onToggle?: (id: string) => void;
  onSelect?: (id: string) => void;
  /** Virtualize the render window past this many *visible* rows. `true` uses the default
   *  threshold (100); a number sets the threshold; `false` (default) disables. Needs `height`. */
  virtualize?: boolean | number;
  /** Fixed row height in px used for the virtualization math (default 32). */
  rowHeight?: number;
  /** Scroll-viewport height for the virtualized list (px). Required to virtualize. */
  height?: number;
  /** Extra rows rendered above/below the window (default 8). */
  overscan?: number;
}

/**
 * Accessible tree. Renders nested `role=group` subtrees by default. Pass `virtualize`
 * + `height` and, above the threshold, it flattens the visible nodes and renders only a
 * windowed slice as flat `treeitem`s (with `aria-setsize`/`aria-posinset`) — a 5k-node
 * CMDB/org tree then keeps only the visible window in the DOM. Expand/collapse, selection,
 * and the FIX-04 ARIA semantics are preserved in both modes.
 */
export function Tree({
  nodes, expanded: controlledExpanded, defaultExpanded, selected,
  onToggle, onSelect, virtualize = false, rowHeight = 32, height, overscan = 8,
  className, style, ...props
}: TreeProps) {
  const [internalExpanded, setInternalExpanded] = useState<Set<string>>(defaultExpanded ?? new Set());
  const expanded = controlledExpanded ?? internalExpanded;
  const [scrollTop, setScrollTop] = useState(0);

  function handleToggle(id: string) {
    if (!controlledExpanded) {
      setInternalExpanded((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    }
    onToggle?.(id);
  }

  const flat = useMemo(() => flattenVisibleTree(nodes, expanded), [nodes, expanded]);
  const threshold = typeof virtualize === 'number' ? virtualize : 100;
  const virtual = virtualize !== false && typeof height === 'number' && shouldVirtualize(flat.length, threshold);

  if (virtual) {
    const win = virtualWindow(scrollTop, height, rowHeight, flat.length, overscan);
    // Fixed-height scroll viewport (a plain div) wraps the role=tree; the tree's
    // padding spacers create the scroll extent while it directly owns its treeitems.
    return (
      <div
        className="uix-tree-viewport"
        style={{ ...style, height, overflowY: 'auto' }}
        onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
      >
        <ul
          className={cx('uix-tree', className)}
          role="tree"
          data-virtual=""
          style={{ paddingTop: win.padTop, paddingBottom: win.padBottom }}
          {...props}
        >
          {flat.slice(win.start, win.end).map((f) => (
            <TreeRow key={f.node.id} flat={f} selected={selected} rowHeight={rowHeight} onToggle={handleToggle} onSelect={onSelect} />
          ))}
        </ul>
      </div>
    );
  }

  return (
    <ul className={cx('uix-tree', className)} role="tree" style={style} {...props}>
      {nodes.map((node) => (
        <TreeNode key={node.id} node={node} expanded={expanded} selected={selected} onToggle={handleToggle} onSelect={onSelect} />
      ))}
    </ul>
  );
}
