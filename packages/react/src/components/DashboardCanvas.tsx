"use client";

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { CSSProperties, HTMLAttributes, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import { cx } from '../cx.js';
import { fillLabel } from '../fill-label.js';
import { GripVerticalIcon, Maximize2Icon } from '../icons/components.js';
import {
  canvasMoveTarget,
  canvasReadingOrder,
  canvasResizeTarget,
  DASHBOARD_CANVAS_COLUMNS,
  normalizeCanvas,
  placeCanvasItem,
} from '../dashboard-canvas-model.js';
import type {
  DashboardCanvasDirection,
  DashboardCanvasItem,
  DashboardCanvasPlacement,
  DashboardCanvasResize,
} from '../dashboard-canvas-model.js';

/** Every word the canvas renders. `{label}` is the item's name; the others are grid units. */
export interface DashboardCanvasLabels {
  /** The region's accessible name. */
  region: string;
  /** The move handle's name. */
  move: string;
  /** The resize handle's name. */
  resize: string;
  /** How the handles work, read with each handle (`aria-describedby`). */
  instructions: string;
  /** Announced after a move. `{col}` and `{row}` count from 1. */
  moved: string;
  /** Announced after a resize. */
  resized: string;
  /** Announced when a step would leave the canvas or pass the item's size limit. */
  atEdge: string;
  /** Announced when Escape drops a drag. */
  cancelled: string;
}

export const DEFAULT_DASHBOARD_CANVAS_LABELS: DashboardCanvasLabels = {
  region: 'Dashboard layout',
  move: 'Move {label}',
  resize: 'Resize {label}',
  instructions: 'Arrow keys move or resize one step. Escape cancels a drag.',
  moved: '{label}: column {col}, row {row}',
  resized: '{label}: {w} columns wide, {h} rows tall',
  atEdge: '{label} cannot go further that way',
  cancelled: 'Move cancelled',
};

/** Space between items: `sm` --uix-space-3, `md` --uix-space-4, `lg` --uix-space-6. */
export type DashboardCanvasGap = 'sm' | 'md' | 'lg';

/** What changed, for the product's save and its journey event. */
export interface DashboardCanvasChange {
  readonly id: string;
  readonly kind: 'move' | 'resize';
  readonly source: 'pointer' | 'keyboard';
}

export interface DashboardCanvasProps<T extends DashboardCanvasItem> extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange' | 'children'> {
  /** The layout. Overlaps and out-of-range values are settled before rendering. */
  items: readonly T[];
  /** One cell's content: a widget, a card. Its last child takes the spare height. */
  renderItem: (item: T) => ReactNode;
  /** The item's name in labels and announcements. Default: its id. */
  itemLabel?: (item: T) => string;
  /**
   * Edit mode: each item gets a move handle and a resize handle, both draggable and both
   * operable with the arrow keys. Off, the canvas is a plain layout and server-renderable.
   */
  editable?: boolean;
  /** The next layout, once per drop or key press. The canvas never keeps its own copy. */
  onLayoutChange?: (items: T[], change: DashboardCanvasChange) => void;
  /** Height of one row, any CSS length. Default `--uix-dashboard-canvas-row` (5rem). */
  rowHeight?: string;
  /** Default `md`. */
  gap?: DashboardCanvasGap;
  labels?: Partial<DashboardCanvasLabels>;
}

interface Drag {
  readonly id: string;
  readonly kind: 'move' | 'resize';
  readonly pointerId: number;
  readonly startX: number;
  readonly startY: number;
  readonly origin: DashboardCanvasPlacement;
  readonly colPitch: number;
  readonly rowPitch: number;
  stop: () => void;
}

const DRAG_THRESHOLD = 4;

/**
 * The pitch of one column and one row in pixels: track size plus the gap after it. The column
 * gap is read from the resolved tracks, not from `column-gap`: the CSS caps it with
 * `min(gap, 100% / 12)`, which the computed style reports unresolved.
 */
function measure(grid: HTMLElement): { colPitch: number; rowPitch: number } {
  const style = getComputedStyle(grid);
  const width = grid.clientWidth - (Number.parseFloat(style.paddingLeft) || 0) - (Number.parseFloat(style.paddingRight) || 0);
  const tracks = style.gridTemplateColumns.split(' ').map((track) => Number.parseFloat(track)).filter(Number.isFinite);
  const trackSum = tracks.reduce((sum, track) => sum + track, 0);
  const columnGap = tracks.length > 1 ? Math.max(0, (width - trackSum) / (tracks.length - 1)) : 0;
  const colPitch = (width + columnGap) / DASHBOARD_CANVAS_COLUMNS;
  const rowGap = Number.parseFloat(style.rowGap) || 0;
  const rowTrack = Number.parseFloat(style.gridAutoRows) || 80;
  return { colPitch, rowPitch: rowTrack + rowGap };
}

/**
 * A free dashboard layout (TENSOR HAR-1823): twelve columns, rows of one fixed height, and each
 * item at its own `{ col, row, w, h }` in grid units. In edit mode a person drags an item by its
 * move handle and resizes it by the corner handle; both snap to the grid, push what they land
 * on downwards, and report one new layout per drop. Both handles also take the arrow keys, and
 * the pure functions behind them (`moveCanvasItem`, `resizeCanvasItem`) are exported for the
 * product's own item menu, so dragging is never the only way (WCAG 2.5.7).
 *
 * Below 36rem of its own width the canvas is one column in reading order (row by row, left to
 * right), each item keeping its height, and the handles step aside: the item menu remains.
 *
 * Owns interaction, never persistence: the product stores `items` and passes them back.
 *
 * ```tsx
 * <DashboardCanvas
 *   items={layout}
 *   editable={editing}
 *   itemLabel={(item) => titles[item.id]}
 *   renderItem={(item) => <Widget id={item.id} />}
 *   onLayoutChange={(next) => save(next)}
 * />
 * ```
 */
export function DashboardCanvas<T extends DashboardCanvasItem>({
  items,
  renderItem,
  itemLabel = (item) => item.id,
  editable = false,
  onLayoutChange,
  rowHeight,
  gap = 'md',
  labels: labelOverrides,
  className,
  style,
  ...props
}: DashboardCanvasProps<T>) {
  const labels = { ...DEFAULT_DASHBOARD_CANVAS_LABELS, ...labelOverrides };
  const instructionsId = useId();
  const gridRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const [preview, setPreview] = useState<{ id: string; placement: DashboardCanvasPlacement } | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const layout = useMemo(() => normalizeCanvas(items), [items]);
  const order = useMemo(() => new Map(canvasReadingOrder(layout).map((item, index) => [item.id, index])), [layout]);

  // Keep the latest props for the window listeners a drag installs.
  const live = useRef({ layout, onLayoutChange, labels, itemLabel });
  live.current = { layout, onLayoutChange, labels, itemLabel };

  useEffect(() => () => dragRef.current?.stop(), []);

  const describe = (item: T, kind: 'move' | 'resize'): string =>
    kind === 'move'
      ? fillLabel(labels.moved, { label: itemLabel(item), col: item.col + 1, row: item.row + 1 })
      : fillLabel(labels.resized, { label: itemLabel(item), w: item.w, h: item.h });

  const commit = (id: string, placement: DashboardCanvasPlacement, kind: 'move' | 'resize', source: 'pointer' | 'keyboard') => {
    const state = live.current;
    const next = placeCanvasItem(state.layout, id, placement);
    const placed = next.find((item) => item.id === id);
    if (!placed) return;
    state.onLayoutChange?.(next, { id, kind, source });
    setAnnouncement(describe(placed, kind));
  };

  const onHandleKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>, item: T, kind: 'move' | 'resize') => {
    const keys: Record<string, DashboardCanvasDirection> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
    const resizes: Record<string, DashboardCanvasResize> = { ArrowRight: 'wider', ArrowLeft: 'narrower', ArrowDown: 'taller', ArrowUp: 'shorter' };
    if (event.key === 'Escape' && dragRef.current) {
      event.preventDefault();
      dragRef.current.stop();
      dragRef.current = null;
      setPreview(null);
      setAnnouncement(labels.cancelled);
      return;
    }
    if (!(event.key in keys)) return;
    event.preventDefault();
    const target = kind === 'move' ? canvasMoveTarget(item, keys[event.key]!) : canvasResizeTarget(item, resizes[event.key]!);
    if (!target) {
      setAnnouncement(fillLabel(labels.atEdge, { label: itemLabel(item) }));
      return;
    }
    commit(item.id, target, kind, 'keyboard');
  };

  const onHandlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>, item: T, kind: 'move' | 'resize') => {
    if (event.button !== 0 || dragRef.current || !gridRef.current) return;
    const { colPitch, rowPitch } = measure(gridRef.current);
    const origin: DashboardCanvasPlacement = { col: item.col, row: item.row, w: item.w, h: item.h };
    let moved = false;
    let last: DashboardCanvasPlacement = origin;
    const targetFor = (move: PointerEvent): DashboardCanvasPlacement => {
      const dc = Math.round((move.clientX - drag.startX) / colPitch);
      const dr = Math.round((move.clientY - drag.startY) / rowPitch);
      return kind === 'move'
        ? { ...origin, col: origin.col + dc, row: origin.row + dr }
        : { ...origin, w: origin.w + dc, h: origin.h + dr };
    };
    const onMove = (move: PointerEvent) => {
      if (move.pointerId !== drag.pointerId) return;
      if (!moved && Math.hypot(move.clientX - drag.startX, move.clientY - drag.startY) < DRAG_THRESHOLD) return;
      moved = true;
      const placed = placeCanvasItem(live.current.layout, item.id, targetFor(move)).find((candidate) => candidate.id === item.id);
      if (!placed) return;
      last = { col: placed.col, row: placed.row, w: placed.w, h: placed.h };
      setPreview({ id: item.id, placement: last });
    };
    const finish = (drop: boolean) => {
      drag.stop();
      dragRef.current = null;
      setPreview(null);
      const changed = last.col !== origin.col || last.row !== origin.row || last.w !== origin.w || last.h !== origin.h;
      if (drop && moved && changed) commit(item.id, last, kind, 'pointer');
    };
    const onUp = (up: PointerEvent) => { if (up.pointerId === drag.pointerId) finish(true); };
    const onCancel = (cancel: PointerEvent) => { if (cancel.pointerId === drag.pointerId) finish(false); };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    const drag: Drag = {
      id: item.id,
      kind,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      origin,
      colPitch,
      rowPitch,
      stop: () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onCancel);
      },
    };
    dragRef.current = drag;
  };

  const placementStyle = (placement: DashboardCanvasPlacement, readingIndex: number): CSSProperties =>
    ({
      '--uix-dashboard-canvas-col': placement.col + 1,
      '--uix-dashboard-canvas-row-start': placement.row + 1,
      '--uix-dashboard-canvas-w': placement.w,
      '--uix-dashboard-canvas-h': placement.h,
      '--uix-dashboard-canvas-order': readingIndex,
    }) as CSSProperties;

  const rootStyle = (rowHeight ? { ...style, '--uix-dashboard-canvas-row': rowHeight } : style) as CSSProperties | undefined;

  return (
    <div
      {...props}
      ref={gridRef}
      role="region"
      aria-label={labels.region}
      className={cx(
        'uix-dashboard-canvas',
        gap === 'sm' && 'uix-dashboard-canvas--gap-sm',
        gap === 'lg' && 'uix-dashboard-canvas--gap-lg',
        editable && 'uix-dashboard-canvas--editing',
        preview && 'uix-dashboard-canvas--dragging',
        className,
      )}
      style={rootStyle}
    >
      {layout.map((item) => {
        const name = itemLabel(item);
        const dragging = preview?.id === item.id;
        return (
          <div
            key={item.id}
            className={cx('uix-dashboard-canvas__item', dragging && 'uix-dashboard-canvas__item--dragging')}
            style={placementStyle(item, order.get(item.id) ?? 0)}
            data-canvas-id={item.id}
          >
            {renderItem(item)}
            {editable ? (
              <>
                <button
                  type="button"
                  className="uix-dashboard-canvas__handle uix-dashboard-canvas__move"
                  aria-label={fillLabel(labels.move, { label: name })}
                  aria-describedby={instructionsId}
                  onKeyDown={(event) => onHandleKeyDown(event, item, 'move')}
                  onPointerDown={(event) => onHandlePointerDown(event, item, 'move')}
                >
                  <GripVerticalIcon aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="uix-dashboard-canvas__handle uix-dashboard-canvas__resize"
                  aria-label={fillLabel(labels.resize, { label: name })}
                  aria-describedby={instructionsId}
                  onKeyDown={(event) => onHandleKeyDown(event, item, 'resize')}
                  onPointerDown={(event) => onHandlePointerDown(event, item, 'resize')}
                >
                  <Maximize2Icon aria-hidden="true" />
                </button>
              </>
            ) : null}
          </div>
        );
      })}
      {preview ? (
        <div
          className="uix-dashboard-canvas__preview"
          style={placementStyle(preview.placement, order.get(preview.id) ?? 0)}
          aria-hidden="true"
        />
      ) : null}
      {editable ? (
        <span id={instructionsId} className="uix-visually-hidden">
          {labels.instructions}
        </span>
      ) : null}
      <span className="uix-visually-hidden" role="status" aria-live="polite">
        {announcement}
      </span>
    </div>
  );
}
