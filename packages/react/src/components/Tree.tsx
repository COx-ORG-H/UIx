"use client";

import { useId, useState } from 'react';
import type { ReactNode, HTMLAttributes } from 'react';
import { cx } from '../cx.js';

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

function TreeNode({ node, expanded, selected, onToggle, onSelect, level = 0 }: TreeNodeProps) {
  const hasChildren = Array.isArray(node.children) && node.children.length > 0;
  const isExpanded = expanded.has(node.id);
  const rowId = useId();

  // The tree semantics live on the treeitem (the <li>), not the button — `aria-selected`
  // is invalid on a button, and `role="tree"` requires `treeitem` children in `group`s.
  // `aria-labelledby` scopes the item's name to its row so it doesn't swallow the subtree.
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
            <TreeNode
              key={child.id}
              node={child}
              expanded={expanded}
              selected={selected}
              onToggle={onToggle}
              onSelect={onSelect}
              level={level + 1}
            />
          ))}
        </ul>
      )}
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
}

export function Tree({ nodes, expanded: controlledExpanded, defaultExpanded, selected, onToggle, onSelect, className, ...props }: TreeProps) {
  const [internalExpanded, setInternalExpanded] = useState<Set<string>>(defaultExpanded ?? new Set());
  const expanded = controlledExpanded ?? internalExpanded;

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

  return (
    <ul className={cx('uix-tree', className)} role="tree" {...props}>
      {nodes.map((node) => (
        <TreeNode
          key={node.id}
          node={node}
          expanded={expanded}
          selected={selected}
          onToggle={handleToggle}
          onSelect={onSelect}
        />
      ))}
    </ul>
  );
}
