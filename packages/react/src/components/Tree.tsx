"use client";

import { useCallback, useRef, useState } from 'react';
import type { ReactNode, HTMLAttributes, KeyboardEvent, FocusEvent, MouseEvent } from 'react';
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
  selectable: boolean;
  tabbableId?: string;
  onToggle: (id: string) => void;
  onSelect?: (id: string) => void;
  onFocusNode: (id: string) => void;
  level?: number;
}

/**
 * One tree node. ARIA lives on the `<li role="treeitem">` — including aria-expanded,
 * aria-selected (valid here, was invalid on the old `<button>`), and aria-level — with the
 * child list as `role="group"`. The treeitem itself is the focusable element (roving tabindex),
 * so the row is a plain, presentational span (UIX-FIX-04).
 */
function TreeNode({ node, expanded, selected, selectable, tabbableId, onToggle, onSelect, onFocusNode, level = 1 }: TreeNodeProps) {
  const hasChildren = Array.isArray(node.children) && node.children.length > 0;
  const isExpanded = expanded.has(node.id);

  return (
    <li
      role="treeitem"
      aria-level={level}
      aria-expanded={hasChildren ? isExpanded : undefined}
      aria-selected={selectable ? selected === node.id : undefined}
      data-id={node.id}
      tabIndex={tabbableId === node.id ? 0 : -1}
      className="uix-tree__item"
      onFocus={(e: FocusEvent<HTMLLIElement>) => { if (e.target === e.currentTarget) onFocusNode(node.id); }}
      onClick={(e: MouseEvent<HTMLLIElement>) => {
        e.stopPropagation(); // act on the clicked node only, not its ancestors
        if (hasChildren) onToggle(node.id);
        onSelect?.(node.id);
        onFocusNode(node.id);
      }}
    >
      <span className="uix-tree__row">
        <span className="uix-tree__toggle">{hasChildren && <ChevronIcon />}</span>
        {node.icon && <span aria-hidden="true">{node.icon}</span>}
        <span className="uix-tree__label">{node.label}</span>
      </span>
      {hasChildren && isExpanded && (
        <ul role="group" className="uix-tree__group">
          {node.children!.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              expanded={expanded}
              selected={selected}
              selectable={selectable}
              tabbableId={tabbableId}
              onToggle={onToggle}
              onSelect={onSelect}
              onFocusNode={onFocusNode}
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
  const rootRef = useRef<HTMLUListElement>(null);
  const [focusedId, setFocusedId] = useState<string | undefined>(undefined);
  const selectable = selected !== undefined || onSelect != null;

  const handleToggle = useCallback((id: string) => {
    if (!controlledExpanded) {
      setInternalExpanded((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    }
    onToggle?.(id);
  }, [controlledExpanded, onToggle]);

  // Roving tabindex: exactly one treeitem is tab-focusable — the last-focused, else the selected,
  // else the first root node — so Tab enters the tree once and arrow keys move within it.
  const tabbableId = focusedId ?? selected ?? nodes[0]?.id;

  const treeItems = () => Array.from(rootRef.current?.querySelectorAll<HTMLElement>('[role="treeitem"]') ?? []);
  const focusItem = (el?: HTMLElement | null) => { if (el) { el.focus(); setFocusedId(el.dataset.id); } };

  const onKeyDown = (e: KeyboardEvent<HTMLUListElement>) => {
    const cur = (e.target as HTMLElement).closest<HTMLElement>('[role="treeitem"]');
    if (!cur || !rootRef.current?.contains(cur)) return;
    const list = treeItems();          // rendered items, in DOM (visible) order
    const idx = list.indexOf(cur);
    const id = cur.dataset.id as string;
    const exp = cur.getAttribute('aria-expanded'); // 'true' | 'false' | null (leaf)
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); focusItem(list[Math.min(idx + 1, list.length - 1)]); break;
      case 'ArrowUp': e.preventDefault(); focusItem(list[Math.max(idx - 1, 0)]); break;
      case 'Home': e.preventDefault(); focusItem(list[0]); break;
      case 'End': e.preventDefault(); focusItem(list[list.length - 1]); break;
      case 'ArrowRight':
        e.preventDefault();
        if (exp === 'false') handleToggle(id);                                             // expand
        else if (exp === 'true') focusItem(cur.querySelector<HTMLElement>(':scope > [role="group"] > [role="treeitem"]')); // into first child
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (exp === 'true') handleToggle(id);                                              // collapse
        else focusItem(cur.parentElement?.closest<HTMLElement>('[role="treeitem"]'));      // up to parent
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (exp !== null) handleToggle(id);
        onSelect?.(id);
        setFocusedId(id);
        break;
      default:
        break;
    }
  };

  return (
    <ul ref={rootRef} className={cx('uix-tree', className)} role="tree" onKeyDown={onKeyDown} {...props}>
      {nodes.map((node) => (
        <TreeNode
          key={node.id}
          node={node}
          expanded={expanded}
          selected={selected}
          selectable={selectable}
          tabbableId={tabbableId}
          onToggle={handleToggle}
          onSelect={onSelect}
          onFocusNode={setFocusedId}
          level={1}
        />
      ))}
    </ul>
  );
}
