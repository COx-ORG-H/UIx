"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, FocusEvent, HTMLAttributes, KeyboardEvent, MouseEvent, PointerEvent } from 'react';
import { cx } from '../cx.js';
import { fillLabel } from '../fill-label.js';
import { useUixLabels } from '../labels-context.js';
import { Avatar } from './Avatar.js';
import { Button } from './Button.js';

/** One person (or position) in an {@link OrgChart}. */
export interface OrgChartNode {
  id: string;
  /** The person's name; also the card's accessible name. */
  name: string;
  /** Job title, under the name. */
  title?: string;
  team?: string;
  location?: string;
  /** Photo URL. Without one the card shows {@link OrgChartNode.initials}, else the name's initials. */
  photo?: string;
  initials?: string;
  /** A short marker on the card, such as "You". */
  badge?: string;
  /**
   * How many people report directly to this one. A count above 0 shows the count on the card and
   * makes the person expandable before {@link OrgChartNode.children} is known.
   */
  reportCount?: number;
  /** The direct reports, when known. Otherwise `loadChildren` loads them on the first expand. */
  children?: OrgChartNode[];
}

/** The words of an {@link OrgChart}. `{count}` and `{percent}` are filled in. */
export interface OrgChartLabels {
  /** The row in place of reports that are loading. */
  loading: string;
  /** The row in place of reports that could not be loaded. */
  error: string;
  /** The action in that row. Enter, Space or a click on the row runs it. */
  retry: string;
  /** Read after the person: one direct report. */
  reportsOne: string;
  /** Read after the person: `{count}` direct reports. */
  reportsMany: string;
  /** The report count's tooltip while the reports are hidden. */
  expand: string;
  /** The report count's tooltip while the reports are shown. */
  collapse: string;
  /** The zoom toolbar's group name. */
  toolbar: string;
  zoomIn: string;
  zoomOut: string;
  /** Fit the chart's width into the frame. */
  fit: string;
  /** The current zoom, shown on the reset button: `{percent}`. */
  zoomLevel: string;
  /** The reset button's name; it should start with the visible level. `{percent}`. */
  resetZoom: string;
}

export const DEFAULT_ORG_CHART_LABELS: OrgChartLabels = {
  loading: 'Loading…',
  error: 'Could not load.',
  retry: 'Retry',
  reportsOne: '{count} direct report',
  reportsMany: '{count} direct reports',
  expand: 'Show reports',
  collapse: 'Hide reports',
  toolbar: 'Zoom',
  zoomIn: 'Zoom in',
  zoomOut: 'Zoom out',
  fit: 'Fit',
  zoomLevel: '{percent}%',
  resetZoom: '{percent}, reset to 100%',
};

export interface OrgChartProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onSelect' | 'onToggle' | 'children'> {
  /** The top of the chart: the people without a manager, or wherever the chart should start. */
  nodes: OrgChartNode[];
  /** Expanded people (controlled). Expanding one whose reports are not known loads them. */
  expanded?: ReadonlySet<string>;
  /** Expanded people at first render (uncontrolled). */
  defaultExpanded?: ReadonlySet<string>;
  /** A person was expanded or collapsed, by a click on the report count or by the keyboard. */
  onToggle?: (id: string, expanded: boolean) => void;
  /** The chosen person: highlighted, and the tree's entry point for the Tab key. */
  selected?: string | null;
  /** A card was clicked, or Enter pressed on it: open the person. */
  onSelect?: (id: string) => void;
  /**
   * Loads a person's direct reports the first time they are expanded, for a chart that grows on
   * demand. While it runs a loading row stands in for the reports; a rejection shows an error row
   * whose Enter, Space or click retries. The result is kept for the life of the chart.
   */
  loadChildren?: (node: OrgChartNode) => Promise<OrgChartNode[]>;
  /**
   * Bring this person into view and focus them once they are rendered: the target of a search.
   * Expand their reporting line first (`expanded`); the chart waits until the card exists.
   */
  revealId?: string | null;
  /** Called once the {@link OrgChartProps.revealId} person has been scrolled to and focused. */
  onReveal?: (id: string) => void;
  /**
   * Stack a row of people who have no reports of their own in one column under their manager,
   * instead of side by side. Default true: a team of eight then takes one card's width.
   */
  stackLeaves?: boolean;
  /** Start at this zoom (0.25–1.5), or `'fit'` to fit the chart's width into the frame. Default 1. */
  defaultZoom?: number | 'fit';
  /** Words of the chart. Default: `UixLabelsProvider` `orgChart`, then English. */
  labels?: Partial<OrgChartLabels>;
}

const ZOOM_STEPS = [0.25, 0.33, 0.5, 0.67, 0.8, 0.9, 1, 1.1, 1.25, 1.5];
const MIN_ZOOM = ZOOM_STEPS[0] as number;
const MAX_ZOOM = ZOOM_STEPS[ZOOM_STEPS.length - 1] as number;
const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
/** The next zoom step above (`dir` 1) or below (`dir` -1) `zoom`. */
export const orgChartZoomStep = (zoom: number, dir: 1 | -1): number => {
  if (dir > 0) return ZOOM_STEPS.find((s) => s > zoom + 0.001) ?? MAX_ZOOM;
  return [...ZOOM_STEPS].reverse().find((s) => s < zoom - 0.001) ?? MIN_ZOOM;
};

/** "Mira Kovač" → "MK"; one word → its first letter. */
export const orgChartInitials = (name: string): string => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  const first = words[0] as string;
  const last = words.length > 1 ? (words[words.length - 1] as string) : '';
  return (Array.from(first)[0] ?? '').concat(last ? (Array.from(last)[0] ?? '') : '').toUpperCase();
};

/* A person waiting for their reports gets one synthetic row in their place, so the arrow keys
 * reach "loading" and "failed" like any person, and Enter on the failed row retries. */
const LOADING = '::uix-loading';
const FAILED = '::uix-error';
const syntheticOf = (id: string): { parent: string; kind: 'loading' | 'error' } | null =>
  (id.endsWith(LOADING) ? { parent: id.slice(0, -LOADING.length), kind: 'loading' }
    : id.endsWith(FAILED) ? { parent: id.slice(0, -FAILED.length), kind: 'error' } : null);

const isExpandable = (node: OrgChartNode, known: OrgChartNode[] | undefined) =>
  known ? known.length > 0 : (node.reportCount ?? 0) > 0;

const ChevronIcon = () => (
  <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2 4l4 4 4-4" />
  </svg>
);
const PlusIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" aria-hidden="true"><path d="M8 3v10M3 8h10" /></svg>
);
const MinusIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" aria-hidden="true"><path d="M3 8h10" /></svg>
);
const FitIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2 6V2h4M14 6V2h-4M2 10v4h4M14 10v4h-4" />
  </svg>
);
/** useLayoutEffect in the browser (measure before paint), useEffect on the server. */
const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

const Ring = () => <span className="uix-spinner uix-spinner--sm" aria-hidden="true" />;

interface RenderContext {
  expanded: ReadonlySet<string>;
  loaded: ReadonlyMap<string, OrgChartNode[]>;
  failed: ReadonlySet<string>;
  loading: ReadonlySet<string>;
  lazy: boolean;
  selectable: boolean;
  selected?: string | null;
  tabbableId?: string;
  stackLeaves: boolean;
  labels: OrgChartLabels;
  chartId: string;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
  onFocusItem: (id: string) => void;
}

function StatusItem({ parent, kind, level, ctx }: { parent: string; kind: 'loading' | 'error'; level: number; ctx: RenderContext }) {
  const id = parent + (kind === 'error' ? FAILED : LOADING);
  return (
    <li
      role="treeitem"
      aria-level={level}
      aria-setsize={1}
      aria-posinset={1}
      data-id={id}
      tabIndex={ctx.tabbableId === id ? 0 : -1}
      className="uix-org-chart__item"
      onFocus={(e: FocusEvent<HTMLLIElement>) => { if (e.target === e.currentTarget) ctx.onFocusItem(id); }}
      onClick={(e: MouseEvent<HTMLLIElement>) => { e.stopPropagation(); ctx.onSelect(id); ctx.onFocusItem(id); }}
    >
      {kind === 'error' ? (
        <span className="uix-org-chart__status uix-org-chart__status--error">
          {ctx.labels.error} <span className="uix-org-chart__retry">{ctx.labels.retry}</span>
        </span>
      ) : (
        <span className="uix-org-chart__status"><Ring />{ctx.labels.loading}</span>
      )}
    </li>
  );
}

function OrgChartItem({ node, level, size, pos, ctx }: { node: OrgChartNode; level: number; size: number; pos: number; ctx: RenderContext }) {
  const known = node.children ?? ctx.loaded.get(node.id);
  const expandable = isExpandable(node, known);
  const open = expandable && ctx.expanded.has(node.id);
  const count = node.reportCount ?? known?.length ?? 0;
  const nameId = `${ctx.chartId}-${node.id}-name`;
  const descId = `${ctx.chartId}-${node.id}-desc`;
  const reportsText = count > 0 ? fillLabel(count === 1 ? ctx.labels.reportsOne : ctx.labels.reportsMany, { count }) : '';
  const waiting = open && !known && ctx.lazy;
  const status: 'loading' | 'error' | null = waiting ? (ctx.failed.has(node.id) ? 'error' : 'loading') : null;
  const children = open && known && known.length > 0 ? known : null;
  const stack = ctx.stackLeaves && children !== null && children.every((c) => !isExpandable(c, c.children ?? ctx.loaded.get(c.id)));

  return (
    <li
      role="treeitem"
      aria-level={level}
      aria-setsize={size}
      aria-posinset={pos}
      aria-expanded={expandable ? open : undefined}
      aria-selected={ctx.selectable ? ctx.selected === node.id : undefined}
      aria-busy={ctx.loading.has(node.id) || undefined}
      aria-labelledby={nameId}
      aria-describedby={descId}
      data-id={node.id}
      tabIndex={ctx.tabbableId === node.id ? 0 : -1}
      className="uix-org-chart__item"
      onFocus={(e: FocusEvent<HTMLLIElement>) => { if (e.target === e.currentTarget) ctx.onFocusItem(node.id); }}
      onClick={(e: MouseEvent<HTMLLIElement>) => {
        e.stopPropagation(); // the clicked person only, not their managers
        ctx.onSelect(node.id);
        ctx.onFocusItem(node.id);
      }}
    >
      <div className="uix-org-chart__node">
        <Avatar size="lg" src={node.photo}>{node.initials ?? orgChartInitials(node.name)}</Avatar>
        <span className="uix-org-chart__body">
          <span className="uix-org-chart__name" id={nameId}>{node.name}</span>
          <span id={descId} className="uix-org-chart__desc">
            {node.title ? <span className="uix-org-chart__title">{node.title}</span> : null}
            {node.team || node.location ? (
              <span className="uix-org-chart__meta">
                {node.team ? <span>{node.team}</span> : null}
                {node.location ? <span>{node.location}</span> : null}
              </span>
            ) : null}
            {reportsText ? <span className="uix-visually-hidden">{reportsText}</span> : null}
          </span>
          {node.badge ? <span className="uix-org-chart__badge">{node.badge}</span> : null}
        </span>
        {expandable ? (
          // A pointer target for showing the reports without opening the person. Keyboard users
          // toggle with Space or the arrow keys on the item, so it stays out of the tab order, and
          // the item's aria-expanded carries its state.
          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            title={open ? ctx.labels.collapse : ctx.labels.expand}
            className="uix-org-chart__toggle"
            onClick={(e: MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); ctx.onToggle(node.id); ctx.onFocusItem(node.id); }}
          >
            <ChevronIcon />
            {count > 0 ? count : null}
          </button>
        ) : null}
      </div>
      {status ? (
        <ul role="group" className="uix-org-chart__group">
          <StatusItem parent={node.id} kind={status} level={level + 1} ctx={ctx} />
        </ul>
      ) : children ? (
        <ul role="group" className="uix-org-chart__group" data-stack={stack ? '' : undefined}>
          {children.map((child, i) => (
            <OrgChartItem key={child.id} node={child} level={level + 1} size={children.length} pos={i + 1} ctx={ctx} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

/**
 * An org chart over `.uix-org-chart` (HAR-1807): managers above their direct reports, joined by
 * lines, each person a card with photo or initials, name, title, team, location and their number
 * of direct reports. Reports load on expand (`loadChildren`); a person can be revealed by id for
 * search. The frame zooms (buttons, and Fit for the chart's width), pans by dragging its
 * background, and scrolls. Below 48rem of its own width it becomes an indented vertical tree.
 *
 * A WAI-ARIA tree with one tab stop. In the chart: ↑ manager, ↓ first report (expanding them
 * first), ← → the previous and next person on the same level; in a stacked column ↑ ↓ move along
 * the column. In the list: the tree keys (↑ ↓ visible order, → expand / first report, ← collapse /
 * manager). Both: Home / End, Enter opens the person (`onSelect`), Space shows or hides reports.
 */
export function OrgChart({
  nodes, expanded: controlledExpanded, defaultExpanded, onToggle, selected, onSelect,
  loadChildren, revealId, onReveal, stackLeaves = true, defaultZoom = 1, labels: labelOverrides,
  className, 'aria-label': ariaLabel, 'aria-labelledby': ariaLabelledby, ...props
}: OrgChartProps) {
  const labels: OrgChartLabels = { ...DEFAULT_ORG_CHART_LABELS, ...useUixLabels().orgChart, ...labelOverrides };
  const chartId = useId().replace(/:/g, '');
  const [internalExpanded, setInternalExpanded] = useState<ReadonlySet<string>>(() => defaultExpanded ?? new Set());
  const expanded = controlledExpanded ?? internalExpanded;
  const treeRef = useRef<HTMLUListElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [focusedId, setFocusedId] = useState<string | undefined>(undefined);
  const selectable = selected !== undefined || onSelect != null;

  // ── reports loaded on expand ──
  const [loaded, setLoaded] = useState<ReadonlyMap<string, OrgChartNode[]>>(() => new Map());
  const [failed, setFailed] = useState<ReadonlySet<string>>(() => new Set());
  const [loading, setLoading] = useState<ReadonlySet<string>>(() => new Set());
  const inFlight = useRef(new Set<string>());
  const loadRef = useRef(loadChildren);
  loadRef.current = loadChildren;
  /** After a synthetic row went away while it had focus: the item to focus instead. */
  const refocus = useRef<string | null>(null);

  const load = useCallback((node: OrgChartNode) => {
    const run = loadRef.current;
    if (!run || inFlight.current.has(node.id)) return;
    inFlight.current.add(node.id);
    setFailed((prev) => { if (!prev.has(node.id)) return prev; const next = new Set(prev); next.delete(node.id); return next; });
    setLoading((prev) => new Set(prev).add(node.id));
    const settle = (apply: () => void, focusNext: string) => {
      inFlight.current.delete(node.id);
      const active = typeof document !== 'undefined' ? (document.activeElement as HTMLElement | null) : null;
      if (active?.dataset?.id === node.id + LOADING || active?.dataset?.id === node.id + FAILED) refocus.current = focusNext;
      setLoading((prev) => { const next = new Set(prev); next.delete(node.id); return next; });
      apply();
    };
    run(node).then(
      (children) => settle(() => setLoaded((prev) => new Map(prev).set(node.id, children)), node.id),
      () => settle(() => setFailed((prev) => new Set(prev).add(node.id)), node.id + FAILED),
    );
  }, []);

  // Load every expanded person whose reports are still unknown and on screen: a click, a key,
  // `defaultExpanded` and a controlled `expanded` (a revealed reporting line) alike.
  useEffect(() => {
    if (!loadChildren) return;
    const visit = (list: OrgChartNode[]) => {
      for (const node of list) {
        if (!expanded.has(node.id)) continue;
        const known = node.children ?? loaded.get(node.id);
        if (known) visit(known);
        else if ((node.reportCount ?? 0) > 0 && !failed.has(node.id)) load(node);
      }
    };
    visit(nodes);
  }, [nodes, expanded, loaded, failed, loadChildren, load]);

  const itemEl = useCallback((id: string) =>
    treeRef.current?.querySelector<HTMLElement>(`[role="treeitem"][data-id="${CSS.escape(id)}"]`) ?? null, []);

  useEffect(() => {
    const id = refocus.current;
    if (id == null) return;
    refocus.current = null;
    setFocusedId(id);
    itemEl(id)?.focus();
  }, [loaded, failed, loading, itemEl]);

  const findNode = useCallback((id: string, list: OrgChartNode[] = nodes): OrgChartNode | undefined => {
    for (const node of list) {
      if (node.id === id) return node;
      const inside = findNode(id, node.children ?? loaded.get(node.id) ?? []);
      if (inside) return inside;
    }
    return undefined;
  }, [nodes, loaded]);

  const toggle = useCallback((id: string) => {
    const opening = !expanded.has(id);
    // Collapsing a manager whose report holds focus: focus moves up to the manager.
    if (!opening) {
      const el = itemEl(id);
      const active = typeof document !== 'undefined' ? document.activeElement : null;
      if (el && active && active !== el && el.contains(active)) { el.focus(); setFocusedId(id); }
    }
    if (!controlledExpanded) {
      setInternalExpanded((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    }
    onToggle?.(id, opening);
  }, [expanded, controlledExpanded, onToggle, itemEl]);

  const retry = useCallback((parentId: string) => {
    const parent = findNode(parentId);
    if (!parent) return;
    // The error row gives way to the loading row: focus follows it.
    refocus.current = parent.id + LOADING;
    setFailed((prev) => { const next = new Set(prev); next.delete(parent.id); return next; });
    load(parent);
  }, [findNode, load]);

  const select = useCallback((id: string) => {
    const synthetic = syntheticOf(id);
    if (!synthetic) { onSelect?.(id); return; }
    if (synthetic.kind === 'error') retry(synthetic.parent);
  }, [onSelect, retry]);

  // ── focus: one tab stop ──
  const rendered = useMemo(() => {
    const ids = new Set<string>();
    const visit = (list: OrgChartNode[]) => {
      for (const node of list) {
        ids.add(node.id);
        if (!expanded.has(node.id)) continue;
        const known = node.children ?? loaded.get(node.id);
        if (known) visit(known);
        else if (loadChildren && (node.reportCount ?? 0) > 0) ids.add(node.id + (failed.has(node.id) ? FAILED : LOADING));
      }
    };
    visit(nodes);
    return ids;
  }, [nodes, expanded, loaded, failed, loadChildren]);
  const tabbableId = (focusedId && rendered.has(focusedId) ? focusedId : undefined)
    ?? (selected && rendered.has(selected) ? selected : undefined)
    ?? nodes[0]?.id;

  // ── reveal a person (search) ──
  const revealed = useRef<string | null>(null);
  useEffect(() => {
    if (!revealId) { revealed.current = null; return; }
    if (revealed.current === revealId) return;
    const el = itemEl(revealId);
    if (!el) return;
    revealed.current = revealId;
    el.scrollIntoView?.({ block: 'center', inline: 'center' });
    el.focus({ preventScroll: true });
    setFocusedId(revealId);
    onReveal?.(revealId);
  });

  // ── zoom and pan ──
  const [zoom, setZoom] = useState(() => (typeof defaultZoom === 'number' ? clampZoom(defaultZoom) : 1));
  const fit = useCallback(() => {
    const viewport = viewportRef.current;
    const tree = treeRef.current;
    if (!viewport || !tree) return;
    const cs = getComputedStyle(viewport);
    const room = viewport.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0);
    const width = tree.getBoundingClientRect().width / zoom; // the chart's width at 100%
    if (!(room > 0) || !(width > 0)) return;
    setZoom(clampZoom(Math.min(1, room / width)));
  }, [zoom]);
  // A chart that starts at 'fit', and one wider than its frame starts centred on the top.
  const settledLayout = useRef(false);
  useIsoLayoutEffect(() => {
    if (settledLayout.current || nodes.length === 0) return;
    settledLayout.current = true;
    if (defaultZoom === 'fit') fit();
    const viewport = viewportRef.current;
    if (viewport && viewport.scrollWidth > viewport.clientWidth) viewport.scrollLeft = (viewport.scrollWidth - viewport.clientWidth) / 2;
  }, [nodes.length]);

  const pan = useRef<{ x: number; y: number; left: number; top: number; id: number } | null>(null);
  const [panning, setPanning] = useState(false);
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    // Drag the background with a mouse or pen to pan; touch scrolls natively, and a press on a
    // card stays a click.
    if (e.button !== 0 || e.pointerType === 'touch') return;
    if ((e.target as HTMLElement).closest('.uix-org-chart__node, .uix-org-chart__status')) return;
    const viewport = viewportRef.current;
    if (!viewport || layoutOf(viewport) === 'list') return;
    pan.current = { x: e.clientX, y: e.clientY, left: viewport.scrollLeft, top: viewport.scrollTop, id: e.pointerId };
    viewport.setPointerCapture?.(e.pointerId);
    setPanning(true);
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const p = pan.current;
    const viewport = viewportRef.current;
    if (!p || !viewport || e.pointerId !== p.id) return;
    viewport.scrollLeft = p.left - (e.clientX - p.x);
    viewport.scrollTop = p.top - (e.clientY - p.y);
  };
  const endPan = (e: PointerEvent<HTMLDivElement>) => {
    if (!pan.current || e.pointerId !== pan.current.id) return;
    viewportRef.current?.releasePointerCapture?.(e.pointerId);
    pan.current = null;
    setPanning(false);
  };

  // ── keyboard ──
  const focusItem = (el?: HTMLElement | null) => { if (el) { el.focus(); setFocusedId(el.dataset.id); } };
  const onKeyDown = (e: KeyboardEvent<HTMLUListElement>) => {
    const cur = (e.target as HTMLElement).closest<HTMLElement>('[role="treeitem"]');
    const tree = treeRef.current;
    if (!cur || !tree?.contains(cur) || e.altKey || e.ctrlKey || e.metaKey) return;
    const items = Array.from(tree.querySelectorAll<HTMLElement>('[role="treeitem"]'));
    const idx = items.indexOf(cur);
    const id = cur.dataset.id as string;
    const state = cur.getAttribute('aria-expanded'); // 'true' | 'false' | null
    const parent = cur.parentElement?.closest<HTMLElement>('[role="treeitem"]') ?? null;
    const firstChild = cur.querySelector<HTMLElement>(':scope > [role="group"] > [role="treeitem"]');
    const sameLevel = (dir: 1 | -1) => {
      const level = cur.getAttribute('aria-level');
      const row = items.filter((el) => el.getAttribute('aria-level') === level);
      return row[row.indexOf(cur) + dir];
    };
    const sibling = (dir: 1 | -1) => (dir > 0 ? cur.nextElementSibling : cur.previousElementSibling) as HTMLElement | null;
    const list = viewportRef.current ? layoutOf(viewportRef.current) === 'list' : false;
    const stacked = cur.parentElement?.hasAttribute('data-stack') ?? false;
    const synthetic = syntheticOf(id);
    let handled = true;
    switch (e.key) {
      case 'Home': focusItem(items[0]); break;
      case 'End': focusItem(items[items.length - 1]); break;
      case 'Enter': select(id); setFocusedId(id); break;
      case ' ':
        if (synthetic) select(id);
        else if (state !== null) toggle(id);
        else select(id);
        setFocusedId(id);
        break;
      default:
        if (list) {
          switch (e.key) {
            case 'ArrowDown': focusItem(items[Math.min(idx + 1, items.length - 1)]); break;
            case 'ArrowUp': focusItem(items[Math.max(idx - 1, 0)]); break;
            case 'ArrowRight': if (state === 'false') toggle(id); else if (state === 'true') focusItem(firstChild); break;
            case 'ArrowLeft': if (state === 'true') toggle(id); else focusItem(parent); break;
            default: handled = false;
          }
        } else {
          switch (e.key) {
            case 'ArrowUp': focusItem(stacked ? (sibling(-1) ?? parent) : parent); break;
            case 'ArrowDown':
              if (stacked && sibling(1) && state !== 'true') focusItem(sibling(1));
              else if (state === 'false') toggle(id);
              else if (state === 'true') focusItem(firstChild);
              break;
            case 'ArrowRight': focusItem(sameLevel(1)); break;
            case 'ArrowLeft': focusItem(sameLevel(-1)); break;
            default: handled = false;
          }
        }
    }
    if (handled) e.preventDefault();
  };

  const ctx: RenderContext = {
    expanded, loaded, failed, loading, lazy: Boolean(loadChildren), selectable, selected, tabbableId,
    stackLeaves, labels, chartId, onToggle: toggle, onSelect: select, onFocusItem: setFocusedId,
  };
  const percent = fillLabel(labels.zoomLevel, { percent: Math.round(zoom * 100) });

  return (
    <div className={cx('uix-org-chart', className)} {...props}>
      <div className="uix-org-chart__toolbar" role="toolbar" aria-label={labels.toolbar}>
        <Button type="button" variant="ghost" size="sm" icon aria-label={labels.zoomOut} title={labels.zoomOut}
          disabled={zoom <= MIN_ZOOM} onClick={() => setZoom((z) => orgChartZoomStep(z, -1))}><MinusIcon /></Button>
        <Button type="button" variant="ghost" size="sm" className="uix-org-chart__level"
          aria-label={fillLabel(labels.resetZoom, { percent })} onClick={() => setZoom(1)}>{percent}</Button>
        <Button type="button" variant="ghost" size="sm" icon aria-label={labels.zoomIn} title={labels.zoomIn}
          disabled={zoom >= MAX_ZOOM} onClick={() => setZoom((z) => orgChartZoomStep(z, 1))}><PlusIcon /></Button>
        <Button type="button" variant="ghost" size="sm" onClick={fit}><FitIcon />{labels.fit}</Button>
      </div>
      <div
        ref={viewportRef}
        className="uix-org-chart__viewport"
        data-panning={panning ? '' : undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPan}
        onPointerCancel={endPan}
      >
        <div className="uix-org-chart__canvas">
          <ul
            ref={treeRef}
            role="tree"
            aria-label={ariaLabel}
            aria-labelledby={ariaLabelledby}
            className="uix-org-chart__tree"
            style={{ '--org-chart-zoom': zoom } as CSSProperties}
            onKeyDown={onKeyDown}
          >
            {nodes.map((node, i) => (
              <OrgChartItem key={node.id} node={node} level={1} size={nodes.length} pos={i + 1} ctx={ctx} />
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/** Which layout the stylesheet picked for this chart's width (`--org-chart-layout`). */
function layoutOf(viewport: HTMLElement): 'chart' | 'list' {
  if (typeof getComputedStyle !== 'function') return 'chart';
  return getComputedStyle(viewport).getPropertyValue('--org-chart-layout').trim() === 'list' ? 'list' : 'chart';
}
