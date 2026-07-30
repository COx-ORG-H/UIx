"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode, HTMLAttributes, KeyboardEvent, FocusEvent, MouseEvent, CSSProperties } from 'react';
import { cx } from '../cx.js';
import { flattenTree, treeNav } from '../tree-model.js';
import type { FlatNode } from '../tree-model.js';
import { virtualWindow, shouldVirtualize } from '../table-engine.js';

const ChevronIcon = () => (
  <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2 4l4 4 4-4" />
  </svg>
);

export interface TreeNodeData {
  id: string;
  label: ReactNode;
  /** Plain-text label for keyboard typeahead when `label` is not a string (UIX-A11Y-2). */
  typeaheadLabel?: string;
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
  /**
   * Virtualize a large tree — render only the rows in view (UIX-FIX-05). Defaults to auto
   * (on past the engine's `shouldVirtualize` threshold of visible rows). When on, the tree is
   * flattened to a scrollable list of `maxHeight` with fixed-height rows; a11y is preserved via
   * `aria-level` / `aria-setsize` / `aria-posinset` instead of nested `role="group"`s.
   */
  virtualize?: boolean;
  /** Fixed row height (px) used for virtualization. Default 32. */
  rowHeight?: number;
  /** Scroll-viewport height (px) when virtualizing. Default 384. */
  maxHeight?: number;
}

export function Tree({
  nodes, expanded: controlledExpanded, defaultExpanded, selected, onToggle, onSelect,
  virtualize, rowHeight = 32, maxHeight = 384, className, ...props
}: TreeProps) {
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

  // The visible rows, flattened once — drives both the virtualization decision and its window.
  const flat = useMemo(() => flattenTree(nodes, expanded), [nodes, expanded]);
  const useVirtual = virtualize ?? shouldVirtualize(flat.length);

  // Roving tabindex: exactly one treeitem is tab-focusable — the last-focused, else the selected,
  // else the first root node — so Tab enters the tree once and arrow keys move within it.
  const tabbableId = focusedId ?? selected ?? nodes[0]?.id;

  if (useVirtual) {
    return (
      <VirtualTreeView
        flat={flat} rowHeight={rowHeight} maxHeight={maxHeight}
        selectable={selectable} selected={selected} tabbableId={tabbableId}
        onToggle={handleToggle} onSelect={onSelect} focusedId={focusedId} setFocusedId={setFocusedId}
        className={className} {...props}
      />
    );
  }

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
        // Single printable char, no modifiers → typeahead over the visible rows (UIX-A11Y-2).
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          const act = treeNav(flat, id, e.key);
          if (act.focusId !== undefined) {
            e.preventDefault();
            focusItem(rootRef.current?.querySelector<HTMLElement>(`[role="treeitem"][data-id="${CSS.escape(act.focusId)}"]`));
          }
        }
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

interface VirtualTreeViewProps extends Omit<HTMLAttributes<HTMLUListElement>, 'onSelect'> {
  flat: FlatNode<TreeNodeData>[];
  rowHeight: number;
  maxHeight: number;
  selectable: boolean;
  selected?: string;
  tabbableId?: string;
  onToggle: (id: string) => void;
  onSelect?: (id: string) => void;
  focusedId?: string;
  setFocusedId: (id: string | undefined) => void;
}

/**
 * Virtualized tree: a flat, scrollable list rendering only the rows in the window computed by the
 * table engine's virtualWindow, with spacer rows preserving the scrollbar. The nested `role="group"`
 * structure is replaced by a flat list where each treeitem carries `aria-level` / `aria-setsize` /
 * `aria-posinset` — a valid WAI-ARIA representation. Keyboard nav uses the pure `treeNav` over the
 * full flat list (so it works for rows outside the window), scrolling the target into view before
 * moving focus (UIX-FIX-05).
 */
function VirtualTreeView({
  flat, rowHeight, maxHeight, selectable, selected, tabbableId, onToggle, onSelect, focusedId, setFocusedId, className, ...props
}: VirtualTreeViewProps) {
  const scrollRef = useRef<HTMLUListElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const pendingFocus = useRef(false);
  const hadFocus = useRef(false);
  const win = virtualWindow(scrollTop, maxHeight, rowHeight, flat.length);
  const rows = flat.slice(win.start, win.end);

  // UIX-A11Y-2: if the tabbable row is scrolled outside the window, no rendered treeitem
  // has tabIndex 0 and the tree drops out of the tab order — promote the first rendered
  // row (its onFocus then adopts it as the roving-tabbable row).
  const windowHasTabbable = tabbableId != null && rows.some((f) => f.node.id === tabbableId);

  // Focus the target once it's rendered into the window (after a keyboard move + any scroll).
  useEffect(() => {
    if (!pendingFocus.current || focusedId == null) return;
    const el = scrollRef.current?.querySelector<HTMLElement>(`[role="treeitem"][data-id="${CSS.escape(focusedId)}"]`);
    if (el) { el.focus(); pendingFocus.current = false; }
  }, [focusedId, win.start, win.end]);

  // UIX-A11Y-2: when the focused row is scroll-evicted it unmounts silently (no blur event
  // fires on removal) and focus drops to <body>. `hadFocus` stays true in that case — a real
  // blur to elsewhere clears it below — so park focus on the scroll container; the keydown
  // handler falls back to `focusedId`, so the next arrow key resumes at the last active row.
  useEffect(() => {
    if (!hadFocus.current || pendingFocus.current) return;
    const active = document.activeElement;
    if (active === document.body || active == null) scrollRef.current?.focus({ preventScroll: true });
  });

  const moveTo = (id: string) => {
    const i = flat.findIndex((f) => f.node.id === id);
    if (i < 0) return;
    const top = i * rowHeight;
    let next = scrollTop;
    if (top < scrollTop) next = top;                                   // above the window → scroll up
    else if (top + rowHeight > scrollTop + maxHeight) next = top + rowHeight - maxHeight; // below → scroll down
    if (next !== scrollTop) { if (scrollRef.current) scrollRef.current.scrollTop = next; setScrollTop(next); }
    pendingFocus.current = true;
    setFocusedId(id);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLUListElement>) => {
    if (e.key.length === 1 && (e.ctrlKey || e.metaKey || e.altKey)) return; // not typeahead
    const curId = (e.target as HTMLElement).closest<HTMLElement>('[role="treeitem"]')?.dataset.id ?? focusedId;
    const act = treeNav(flat, curId, e.key);
    if (act.focusId === undefined && act.toggleId === undefined && act.selectId === undefined) return;
    e.preventDefault();
    if (act.toggleId !== undefined) onToggle(act.toggleId);
    if (act.selectId !== undefined) { onSelect?.(act.selectId); if (act.focusId === undefined) { pendingFocus.current = true; setFocusedId(act.selectId); } }
    if (act.focusId !== undefined) moveTo(act.focusId);
  };

  return (
    <ul
      ref={scrollRef}
      className={cx('uix-tree', 'uix-tree--virtual', className)}
      role="tree"
      tabIndex={-1}
      style={{ maxHeight, overflow: 'auto' }}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
      onKeyDown={onKeyDown}
      onFocus={() => { hadFocus.current = true; }}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) hadFocus.current = false; }}
      {...props}
    >
      {win.padTop > 0 && <li role="presentation" aria-hidden="true" style={{ height: win.padTop }} />}
      {rows.map((f, i) => {
        const rowStyle: CSSProperties = { height: rowHeight, paddingLeft: `calc(${f.level - 1} * var(--uix-space-5))` };
        return (
          <li
            key={f.node.id}
            role="treeitem"
            aria-level={f.level}
            aria-setsize={f.setsize}
            aria-posinset={f.posinset}
            aria-expanded={f.hasChildren ? f.isExpanded : undefined}
            aria-selected={selectable ? selected === f.node.id : undefined}
            data-id={f.node.id}
            tabIndex={tabbableId === f.node.id || (!windowHasTabbable && i === 0) ? 0 : -1}
            className="uix-tree__item"
            onFocus={(e: FocusEvent<HTMLLIElement>) => { if (e.target === e.currentTarget) setFocusedId(f.node.id); }}
            onClick={(e: MouseEvent<HTMLLIElement>) => {
              e.stopPropagation();
              if (f.hasChildren) onToggle(f.node.id);
              onSelect?.(f.node.id);
              setFocusedId(f.node.id);
            }}
          >
            <span className="uix-tree__row" style={rowStyle}>
              <span className="uix-tree__toggle">{f.hasChildren && <ChevronIcon />}</span>
              {f.node.icon && <span aria-hidden="true">{f.node.icon}</span>}
              <span className="uix-tree__label">{f.node.label}</span>
            </span>
          </li>
        );
      })}
      {win.padBottom > 0 && <li role="presentation" aria-hidden="true" style={{ height: win.padBottom }} />}
    </ul>
  );
}
