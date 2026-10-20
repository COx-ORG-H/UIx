"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent, ReactNode } from 'react';
import { boundRelationshipGraph, layeredNeighbor, layoutLayeredGraph } from '../relationship-graph-model.js';
import type { LayeredItem, LayeredLayout, LayeredNavigationKey, RoutedEdge } from '../relationship-graph-model.js';
import { cx } from '../cx.js';
import { Maximize2Icon, Minimize2Icon, MinusIcon, PlusIcon, RotateCcwIcon, ScanIcon } from '../icons/components.js';
import { useKbdPlatform } from './Kbd.js';
import type { ResolvedRelationshipGraphProps } from './RelationshipGraph.js';
import { EquivalentRelationshipList } from './RelationshipGraphList.js';
import { Tooltip } from './Tooltip.js';

const EMPTY_IDS: ReadonlySet<string> = new Set<string>();
const MIN_ZOOM = 0.4;
const MAX_ZOOM = 1.5;
/** The initial view never shrinks text below this to make a graph "fit". */
const READABLE_ZOOM = 0.75;
const ZOOM_STEP = 1.2;
const PAN_STEP = 64;
const FOCUS_MARGIN = 24;
/** How long the "Ctrl + scroll to zoom" hint stays after a plain wheel over the map. */
const HINT_MS = 1600;
const NAV_KEYS: readonly string[] = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];

interface View { x: number; y: number; zoom: number }
interface Size { width: number; height: number }

const clampZoom = (zoom: number): number => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));

function initialView(layout: LayeredLayout, size: Size): View {
  if (size.width === 0 || size.height === 0 || layout.width === 0) return { x: 0, y: 0, zoom: 1 };
  const fit = Math.min(size.width / layout.width, size.height / layout.height);
  if (fit < READABLE_ZOOM) return { x: 0, y: 0, zoom: READABLE_ZOOM };
  const zoom = Math.min(fit, 1);
  return { x: (size.width - layout.width * zoom) / 2, y: Math.max(0, (size.height - layout.height * zoom) / 2), zoom };
}

function fitView(layout: LayeredLayout, size: Size): View {
  if (size.width === 0 || layout.width === 0) return { x: 0, y: 0, zoom: 1 };
  const zoom = clampZoom(Math.min(size.width / layout.width, size.height / layout.height, 1));
  return { x: (size.width - layout.width * zoom) / 2, y: Math.max(0, (size.height - layout.height * zoom) / 2), zoom };
}

const arrowPoints = '0,0 -8,-4.5 -8,4.5';

/** `RelationshipGraph layout="layered"` (ADR-0003). Internal — reached through RelationshipGraph. */
export function LayeredRelationshipGraph({
  nodes, edges, selectedId, onSelect, onExpandNeighbors, onOpenDetails, maxNodes = 400,
  density = 'standard', highlightedNodeIds = EMPTY_IDS, conflictedNodeIds = EMPTY_IDS,
  highlightedEdgeIds = EMPTY_IDS, conflictedEdgeIds = EMPTY_IDS, legend = [], className, labels,
  rootId, renderNode, nodeAriaLabel, renderCluster, clusterThreshold, expandedClusterIds,
  onToggleCluster, dimmedNodeIds = EMPTY_IDS, edgeLabels = 'auto', showList = true, height,
  focusId, onFocusChange, controls = 'full', initialView: initialViewMode = 'readable',
}: ResolvedRelationshipGraphProps) {
  const hintId = useId();
  const viewportHintId = useId();
  const compact = controls === 'compact';
  const bounded = useMemo(() => boundRelationshipGraph(nodes, edges, maxNodes), [nodes, edges, maxNodes]);
  const [localExpanded, setLocalExpanded] = useState<ReadonlySet<string>>(EMPTY_IDS);
  const expanded = expandedClusterIds ?? localExpanded;
  const layout = useMemo(
    () => layoutLayeredGraph(bounded.nodes, bounded.edges, {
      ...(rootId !== undefined ? { rootId } : {}),
      ...(clusterThreshold !== undefined ? { clusterThreshold } : {}),
      expandedClusterIds: expanded,
      density,
    }),
    [bounded, rootId, clusterThreshold, expanded, density],
  );
  const itemById = useMemo(() => new Map(layout.items.map((item) => [item.id, item])), [layout]);
  // The first view, and the one Reset (and `0`) returns to.
  const startView = useCallback(
    (forLayout: LayeredLayout, forSize: Size): View =>
      initialViewMode === 'fit' ? fitView(forLayout, forSize) : initialView(forLayout, forSize),
    [initialViewMode],
  );

  const viewportRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef(new Map<string, HTMLButtonElement>());
  const fullscreenButtonRef = useRef<HTMLButtonElement>(null);
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });
  const [view, setView] = useState<View>({ x: 0, y: 0, zoom: 1 });
  const [animate, setAnimate] = useState(false);
  const [localFocus, setLocalFocus] = useState<string | undefined>(undefined);
  const [hoverId, setHoverId] = useState<string | undefined>(undefined);
  const [fullscreen, setFullscreen] = useState(false);
  const [wheelHint, setWheelHint] = useState(false);
  const viewRef = useRef(view);
  viewRef.current = view;
  const layoutRef = useRef(layout);
  layoutRef.current = layout;
  const fullscreenRef = useRef(fullscreen);
  fullscreenRef.current = fullscreen;
  const compactRef = useRef(compact);
  compactRef.current = compact;
  const pendingFocus = useRef<string | undefined>(undefined);
  const initialisedFor = useRef<string | undefined>(undefined);
  const refitOnResize = useRef(false);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const modifier = useKbdPlatform() === 'mac' ? '⌘' : 'Ctrl';

  const rootItemId = layout.rootId !== undefined ? layout.itemOf[layout.rootId] : layout.items[0]?.id;
  const requestedFocus = focusId !== undefined ? (layout.itemOf[focusId] ?? focusId) : localFocus;
  const focusedId = requestedFocus !== undefined && itemById.has(requestedFocus) ? requestedFocus : rootItemId;
  const selectedItemId = selectedId !== undefined ? layout.itemOf[selectedId] : undefined;
  const activeIds = useMemo(
    () => new Set([hoverId, selectedItemId].filter((id): id is string => id !== undefined)),
    [hoverId, selectedItemId],
  );

  // Viewport size.
  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;
    const measure = () => setSize({ width: element.clientWidth, height: element.clientHeight });
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Initial view once per root (a cluster toggle or data refresh must not jump the view).
  useEffect(() => {
    if (size.width === 0) return;
    const key = `${layout.rootId ?? ''}`;
    if (initialisedFor.current === key) return;
    initialisedFor.current = key;
    setView(startView(layout, size));
  }, [layout, size, startView]);

  // Entering or leaving full screen resizes the viewport: show the start view at the new size.
  useEffect(() => {
    if (!refitOnResize.current || size.width === 0) return;
    refitOnResize.current = false;
    setAnimate(false);
    setView(startView(layoutRef.current, size));
  }, [size, startView]);

  // Full screen covers the page, so the page behind it must not scroll.
  useEffect(() => {
    if (!fullscreen) return;
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = 'hidden';
    return () => { root.style.overflow = previous; };
  }, [fullscreen]);

  useEffect(() => () => clearTimeout(hintTimer.current), []);

  const moveView = useCallback((next: View, smooth: boolean) => {
    setAnimate(smooth);
    setView(next);
  }, []);

  const ensureVisible = useCallback((id: string, smooth: boolean) => {
    const element = viewportRef.current;
    const item = layoutRef.current.items.find((candidate) => candidate.id === id);
    if (!element || !item) return;
    const { x, y, zoom } = viewRef.current;
    const width = element.clientWidth;
    const heightPx = element.clientHeight;
    const left = item.x * zoom + x;
    const top = item.y * zoom + y;
    const right = left + item.width * zoom;
    const bottom = top + item.height * zoom;
    let nextX = x;
    let nextY = y;
    if (left < FOCUS_MARGIN) nextX += FOCUS_MARGIN - left;
    else if (right > width - FOCUS_MARGIN) nextX -= right - (width - FOCUS_MARGIN);
    if (top < FOCUS_MARGIN) nextY += FOCUS_MARGIN - top;
    else if (bottom > heightPx - FOCUS_MARGIN) nextY -= bottom - (heightPx - FOCUS_MARGIN);
    if (nextX !== x || nextY !== y) moveView({ x: nextX, y: nextY, zoom }, smooth);
  }, [moveView]);

  const focusItem = useCallback((id: string) => {
    setLocalFocus(id);
    onFocusChange?.(id);
    requestAnimationFrame(() => {
      itemRefs.current.get(id)?.focus({ preventScroll: true });
      ensureVisible(id, true);
    });
  }, [ensureVisible, onFocusChange]);

  // Controlled focus, and focus requested before a layout change (cluster toggle).
  useEffect(() => {
    const wanted = pendingFocus.current;
    if (wanted !== undefined && itemById.has(wanted)) {
      pendingFocus.current = undefined;
      focusItem(wanted);
    }
  }, [itemById, focusItem]);
  // Moves focus when the requested id changes (or its item first appears) after
  // mount — never on first render, so a page load does not steal focus.
  const controlledTarget = focusId !== undefined ? (layout.itemOf[focusId] ?? focusId) : undefined;
  const controlledPresent = controlledTarget !== undefined && itemById.has(controlledTarget);
  const controlledKey = `${controlledTarget ?? ''}|${controlledPresent}`;
  const lastControlledKey = useRef(controlledKey);
  useEffect(() => {
    if (lastControlledKey.current === controlledKey) return;
    lastControlledKey.current = controlledKey;
    if (!controlledPresent || controlledTarget === undefined) return;
    requestAnimationFrame(() => {
      itemRefs.current.get(controlledTarget)?.focus({ preventScroll: true });
      ensureVisible(controlledTarget, true);
    });
  }, [controlledKey, controlledTarget, controlledPresent, ensureVisible]);

  // Ctrl/⌘ + wheel zooms around the pointer; a plain wheel scrolls the page (in full
  // screen there is no page to scroll, so it zooms). With the compact controls, a plain
  // wheel over the map says how to zoom instead of doing nothing visible.
  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey && !fullscreenRef.current) {
        if (compactRef.current) {
          setWheelHint(true);
          clearTimeout(hintTimer.current);
          hintTimer.current = setTimeout(() => setWheelHint(false), HINT_MS);
        }
        return;
      }
      event.preventDefault();
      const rect = element.getBoundingClientRect();
      const px = event.clientX - rect.left;
      const py = event.clientY - rect.top;
      const current = viewRef.current;
      const zoom = clampZoom(current.zoom * Math.exp(-event.deltaY * 0.002));
      const ratio = zoom / current.zoom;
      setAnimate(false);
      setView({ zoom, x: px - (px - current.x) * ratio, y: py - (py - current.y) * ratio });
    };
    element.addEventListener('wheel', onWheel, { passive: false });
    return () => element.removeEventListener('wheel', onWheel);
  }, []);

  // Drag to pan; two pointers pinch to zoom.
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchDistance = useRef<number | undefined>(undefined);
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if ((event.target as Element).closest('button')) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    pinchDistance.current = undefined;
    setAnimate(false);
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const previous = pointers.current.get(event.pointerId);
    if (!previous) return;
    const current = { x: event.clientX, y: event.clientY };
    pointers.current.set(event.pointerId, current);
    const all = [...pointers.current.values()];
    if (all.length >= 2) {
      const [a, b] = all as [{ x: number; y: number }, { x: number; y: number }];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      const rect = event.currentTarget.getBoundingClientRect();
      const mx = (a.x + b.x) / 2 - rect.left;
      const my = (a.y + b.y) / 2 - rect.top;
      if (pinchDistance.current !== undefined && pinchDistance.current > 0) {
        const base = viewRef.current;
        const zoom = clampZoom(base.zoom * (distance / pinchDistance.current));
        const ratio = zoom / base.zoom;
        setView({ zoom, x: mx - (mx - base.x) * ratio, y: my - (my - base.y) * ratio });
      }
      pinchDistance.current = distance;
      return;
    }
    const dx = current.x - previous.x;
    const dy = current.y - previous.y;
    setView((value) => ({ ...value, x: value.x + dx, y: value.y + dy }));
  };
  const onPointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);
    pinchDistance.current = undefined;
  };

  const zoomBy = (factor: number) => {
    const current = viewRef.current;
    const zoom = clampZoom(current.zoom * factor);
    const ratio = zoom / current.zoom;
    const cx0 = size.width / 2;
    const cy0 = size.height / 2;
    moveView({ zoom, x: cx0 - (cx0 - current.x) * ratio, y: cy0 - (cy0 - current.y) * ratio }, true);
  };
  const panBy = (dx: number, dy: number) => moveView({ ...viewRef.current, x: viewRef.current.x + dx, y: viewRef.current.y + dy }, true);
  const resetView = () => moveView(startView(layout, size), true);

  const toggleFullscreen = () => {
    const next = !fullscreenRef.current;
    refitOnResize.current = true;
    setFullscreen(next);
    // Entering puts the keyboard on the map; leaving returns it to the toggle (WCAG 2.4.3).
    requestAnimationFrame(() => (next ? viewportRef.current : fullscreenButtonRef.current)?.focus({ preventScroll: true }));
  };

  // The compact map's keyboard. Arrow keys pan only when the map itself has focus (a
  // focused item's arrows move between items); + − 0 and Escape work from anywhere in it.
  const onViewportKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!compact || event.altKey || event.ctrlKey || event.metaKey) return;
    const onMap = event.target === event.currentTarget;
    if (onMap && event.key === 'ArrowLeft') panBy(PAN_STEP, 0);
    else if (onMap && event.key === 'ArrowRight') panBy(-PAN_STEP, 0);
    else if (onMap && event.key === 'ArrowUp') panBy(0, PAN_STEP);
    else if (onMap && event.key === 'ArrowDown') panBy(0, -PAN_STEP);
    else if (event.key === '+' || event.key === '=') zoomBy(ZOOM_STEP);
    else if (event.key === '-' || event.key === '_') zoomBy(1 / ZOOM_STEP);
    else if (event.key === '0') resetView();
    else if (event.key === 'Escape' && fullscreen) toggleFullscreen();
    else return;
    event.preventDefault();
  };

  const toggleCluster = (clusterId: string, focusAfter: string) => {
    const isExpanded = expanded.has(clusterId);
    pendingFocus.current = focusAfter;
    if (expandedClusterIds === undefined) {
      setLocalExpanded((previous) => {
        const next = new Set(previous);
        if (isExpanded) next.delete(clusterId);
        else next.add(clusterId);
        return next;
      });
    }
    onToggleCluster?.(clusterId, !isExpanded);
  };

  const activate = (item: LayeredItem) => {
    if (item.cluster) {
      toggleCluster(item.cluster.id, item.cluster.members[0]?.id ?? item.id);
      return;
    }
    if (item.node) {
      setLocalFocus(item.id);
      onFocusChange?.(item.id);
      onSelect?.(item.node);
    }
  };

  const onItemKeyDown = (event: KeyboardEvent<HTMLButtonElement>, item: LayeredItem) => {
    if (NAV_KEYS.includes(event.key)) {
      event.preventDefault();
      const next = layeredNeighbor(layout, item.id, event.key as LayeredNavigationKey);
      if (next !== undefined) focusItem(next);
    }
  };

  const labelFor = (item: LayeredItem): string => {
    if (item.cluster) {
      const cluster = item.cluster;
      return `${labels.cluster(cluster.members.length, cluster.type, cluster.edgeLabel)}, ${labels.expandCluster}`;
    }
    const node = item.node!;
    const conflict = conflictedNodeIds.has(node.id) ? labels.conflict : undefined;
    if (nodeAriaLabel) return [nodeAriaLabel(node), item.inCycle ? labels.cycle : undefined, conflict].filter(Boolean).join(', ');
    return [node.label, node.type, node.description, labels.relationships(item.degree), item.inCycle ? labels.cycle : undefined, conflict]
      .filter(Boolean)
      .join(', ');
  };

  const showLabel = (edge: RoutedEdge): boolean => {
    if (edgeLabels === 'never' || edge.label === undefined) return false;
    if (edgeLabels === 'always') return true;
    return edge.autoLabel || activeIds.has(edge.source) || activeIds.has(edge.target) || focusedId === edge.source || focusedId === edge.target;
  };

  const viewportStyle = (height !== undefined ? { '--uix-relationship-graph-height': height } : {}) as CSSProperties;
  const stageStyle: CSSProperties = {
    width: layout.width,
    height: layout.height,
    transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`,
  };
  const zoomPercent = Math.round(view.zoom * 100);

  // One icon control of the compact cluster: a named button, its words in a tooltip.
  const control = (
    label: string,
    icon: ReactNode,
    onClick: () => void,
    { disabled = false, keys, ref }: { disabled?: boolean; keys?: readonly string[]; ref?: typeof fullscreenButtonRef } = {},
  ) => (
    <Tooltip label={label} placement="top" {...(keys ? { shortcut: keys } : {})}>
      <button ref={ref} type="button" className="uix-relationship-graph__control" aria-label={label} onClick={onClick} disabled={disabled}>
        {icon}
      </button>
    </Tooltip>
  );

  return <section
    className={cx(
      'uix-relationship-graph',
      'uix-relationship-graph--layered',
      compact && 'uix-relationship-graph--map',
      fullscreen && 'uix-relationship-graph--fullscreen',
      density === 'compact' && 'uix-relationship-graph--compact',
      className,
    )}
    aria-label={labels.graph}
  >
    {controls === 'full' && <div className="uix-relationship-graph__toolbar" role="group" aria-label={labels.controls}>
      <button type="button" onClick={() => zoomBy(ZOOM_STEP)} disabled={view.zoom >= MAX_ZOOM}>{labels.zoomIn}</button>
      <button type="button" onClick={() => zoomBy(1 / ZOOM_STEP)} disabled={view.zoom <= MIN_ZOOM}>{labels.zoomOut}</button>
      <button type="button" onClick={() => moveView(fitView(layout, size), true)}>{labels.fit}</button>
      <button type="button" onClick={resetView}>{labels.reset}</button>
      <button type="button" onClick={() => panBy(PAN_STEP, 0)} aria-label={labels.panLeft}>{labels.left}</button>
      <button type="button" onClick={() => panBy(0, PAN_STEP)} aria-label={labels.panUp}>{labels.up}</button>
      <button type="button" onClick={() => panBy(0, -PAN_STEP)} aria-label={labels.panDown}>{labels.down}</button>
      <button type="button" onClick={() => panBy(-PAN_STEP, 0)} aria-label={labels.panRight}>{labels.right}</button>
      <span aria-live="polite">{labels.zoomLevel(zoomPercent)}</span>
    </div>}
    {bounded.omittedNodeCount > 0 && <p className="uix-relationship-graph__bounded" role="status">{labels.bounded(bounded.nodes.length, bounded.omittedNodeCount)}</p>}
    <p id={hintId} className="uix-visually-hidden">{labels.keyboardHint}</p>
    {compact && <p id={viewportHintId} className="uix-visually-hidden">{labels.viewportKeyboardHint}</p>}
    <div
      ref={viewportRef}
      className="uix-relationship-graph__viewport"
      style={viewportStyle}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      {...(compact
        ? {
            tabIndex: 0,
            role: 'group',
            'aria-label': labels.graph,
            'aria-describedby': viewportHintId,
            onKeyDown: onViewportKeyDown,
          }
        : {})}
    >
      <div className="uix-relationship-graph__stage" style={stageStyle} data-animate={animate || undefined} onTransitionEnd={() => setAnimate(false)}>
        <svg className="uix-relationship-graph__edges" width={layout.width} height={layout.height} aria-hidden="true" focusable="false">
          {layout.edges.map((edge) => {
            const active = activeIds.has(edge.source) || activeIds.has(edge.target) || edge.edgeIds.some((id) => highlightedEdgeIds.has(id));
            const angle = (edge.arrowAngle * 180) / Math.PI;
            return <g
              key={edge.id}
              className="uix-relationship-graph__link"
              data-kind={edge.kind}
              data-active={active || undefined}
              data-emphasis={edge.emphasis || undefined}
              data-conflicted={edge.edgeIds.some((id) => conflictedEdgeIds.has(id)) || undefined}
              data-dimmed={(dimmedNodeIds.has(edge.source) && dimmedNodeIds.has(edge.target)) || undefined}
            >
              <path d={edge.path} />
              {edge.arrow !== 'none' && <polygon points={arrowPoints} transform={`translate(${edge.arrowX} ${edge.arrowY}) rotate(${angle})`} />}
              {showLabel(edge) && <text x={edge.labelX} y={edge.labelY} textAnchor="middle" dominantBaseline="middle">
                {(edge.kind === 'cycle' ? [...edge.labelLines, labels.cycle] : edge.labelLines).map((line, index, lines) => (
                  <tspan key={index} x={edge.labelX} dy={index === 0 ? `${-(lines.length - 1) * 0.55}em` : '1.1em'}>{line}</tspan>
                ))}
              </text>}
            </g>;
          })}
        </svg>
        {layout.columns.map((column) => <div
          key={column.depth}
          className="uix-relationship-graph__column"
          aria-hidden="true"
          style={{ left: column.x, width: layout.nodeWidth }}
        >{labels.column(column.depth, column.count)}</div>)}
        <div role="group" aria-roledescription={labels.roleDescription} aria-label={labels.graphSummary(bounded.nodes.length, bounded.edges.length)} aria-describedby={hintId}>
          {layout.items.map((item) => {
            const selected = item.id === selectedItemId;
            const dimmed = item.node ? dimmedNodeIds.has(item.node.id) : item.cluster!.members.every((member) => dimmedNodeIds.has(member.id));
            const body = item.cluster
              ? (renderCluster?.(item.cluster) ?? <>
                  <span className="uix-relationship-graph__item-label">{labels.cluster(item.cluster.members.length, item.cluster.type, item.cluster.edgeLabel)}</span>
                  <span className="uix-relationship-graph__item-meta">{labels.expandCluster}</span>
                </>)
              : (renderNode?.(item.node!, { selected, dimmed }) ?? <>
                  <span className="uix-relationship-graph__item-label">{item.node!.label}</span>
                  {(item.node!.type || item.node!.description) && <span className="uix-relationship-graph__item-meta">{[item.node!.type, item.node!.description].filter(Boolean).join(' · ')}</span>}
                </>);
            return <button
              key={item.id}
              ref={(element) => {
                if (element) itemRefs.current.set(item.id, element);
                else itemRefs.current.delete(item.id);
              }}
              type="button"
              className="uix-relationship-graph__item"
              data-kind={item.kind}
              data-node-id={item.id}
              data-selected={selected || undefined}
              data-dimmed={dimmed || undefined}
              data-highlighted={(item.node && highlightedNodeIds.has(item.node.id)) || undefined}
              data-conflicted={(item.node && conflictedNodeIds.has(item.node.id)) || undefined}
              data-root={item.id === rootItemId || undefined}
              style={{ left: item.x, top: item.y, width: item.width, height: item.height }}
              tabIndex={item.id === focusedId ? 0 : -1}
              aria-label={labelFor(item)}
              {...(item.cluster ? { 'aria-expanded': false } : { 'aria-pressed': selected })}
              onClick={() => activate(item)}
              onKeyDown={(event) => onItemKeyDown(event, item)}
              onFocus={() => {
                if (item.id === focusedId) return;
                setLocalFocus(item.id);
                onFocusChange?.(item.id);
              }}
              onPointerEnter={() => setHoverId(item.id)}
              onPointerLeave={() => setHoverId((current) => (current === item.id ? undefined : current))}
            >
              {body}
              {item.inCycle && <span className="uix-relationship-graph__item-flag" aria-hidden="true">{labels.cycle}</span>}
            </button>;
          })}
        </div>
        {layout.items.filter((item) => item.expandedGroup).map((item) => {
          const group = item.expandedGroup!;
          return <button
            key={`collapse:${group.id}`}
            type="button"
            className="uix-relationship-graph__collapse"
            aria-expanded="true"
            style={{ left: item.x, top: item.y - 26, width: item.width }}
            onClick={() => toggleCluster(group.id, group.id)}
          >{labels.collapseCluster(group.members.length, group.type)}</button>;
        })}
      </div>
      {compact && <>
        <p className="uix-relationship-graph__hint" aria-hidden="true">{labels.navigationHint(modifier)}</p>
        {wheelHint && <p className="uix-relationship-graph__toast" role="status">{labels.navigationHint(modifier)}</p>}
        <div className="uix-relationship-graph__controls" role="group" aria-label={labels.controls}>
          <span className="uix-relationship-graph__zoom-level" aria-live="polite">{labels.zoomLevel(zoomPercent)}</span>
          <div className="uix-relationship-graph__control-cluster">
            {control(labels.zoomIn, <PlusIcon aria-hidden="true" />, () => zoomBy(ZOOM_STEP), { disabled: view.zoom >= MAX_ZOOM, keys: ['+'] })}
            {control(labels.zoomOut, <MinusIcon aria-hidden="true" />, () => zoomBy(1 / ZOOM_STEP), { disabled: view.zoom <= MIN_ZOOM, keys: ['−'] })}
            {control(labels.fit, <ScanIcon aria-hidden="true" />, () => moveView(fitView(layout, size), true))}
            {control(labels.reset, <RotateCcwIcon aria-hidden="true" />, resetView, { keys: ['0'] })}
            {control(
              fullscreen ? labels.exitFullscreen : labels.fullscreen,
              fullscreen ? <Minimize2Icon aria-hidden="true" /> : <Maximize2Icon aria-hidden="true" />,
              toggleFullscreen,
              { ref: fullscreenButtonRef, ...(fullscreen ? { keys: ['Esc'] } : {}) },
            )}
          </div>
        </div>
      </>}
    </div>
    {legend.length > 0 && <ul className="uix-relationship-graph__legend" aria-label={labels.legend}>{legend.map((entry) => <li key={entry.id} data-type={entry.id}>{entry.label}</li>)}</ul>}
    {showList && <EquivalentRelationshipList
      nodes={bounded.nodes}
      edges={bounded.edges}
      selectedId={selectedId}
      labels={labels}
      onSelect={(id) => { const node = bounded.nodes.find((candidate) => candidate.id === id); if (node) onSelect?.(node); }}
      onExpandNeighbors={onExpandNeighbors}
      onOpenDetails={onOpenDetails}
    />}
  </section>;
}
