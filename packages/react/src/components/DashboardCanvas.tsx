"use client";

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { CSSProperties, FocusEvent as ReactFocusEvent, HTMLAttributes, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import { cx } from '../cx.js';
import { settleDrop } from '../hooks/useKeyboardGrab.js';
import { useViewTransition } from '../hooks/useViewTransition.js';
import { fillLabel } from '../fill-label.js';
import { useUixLabels } from '../labels-context.js';
import { ArrowDownIcon, ArrowLeftIcon, ArrowRightIcon, ArrowUpIcon, GripVerticalIcon, Maximize2Icon, XIcon } from '../icons/components.js';
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
  /** The move handle's name, also the name of its step buttons' group. */
  move: string;
  /** The resize handle's name, also the name of its step buttons' group. */
  resize: string;
  /** How the handles work, read with each handle (`aria-describedby`). */
  instructions: string;
  /** The move step buttons (a press on the move handle shows them). */
  moveUp: string;
  moveDown: string;
  moveLeft: string;
  moveRight: string;
  /** The resize step buttons (a press on the resize handle shows them). */
  narrower: string;
  wider: string;
  shorter: string;
  taller: string;
  /** The button in the middle of the step buttons that puts them away. */
  closeSteps: string;
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
  instructions: 'Press for buttons that move or resize one step; the arrow keys do the same. Escape cancels a drag.',
  moveUp: 'Move up',
  moveDown: 'Move down',
  moveLeft: 'Move left',
  moveRight: 'Move right',
  narrower: 'Narrower',
  wider: 'Wider',
  shorter: 'Shorter',
  taller: 'Taller',
  closeSteps: 'Done',
  moved: '{label}: column {col}, row {row}',
  resized: '{label}: {w} columns wide, {h} rows tall',
  atEdge: '{label} cannot go further that way',
  cancelled: 'Move cancelled',
};

/** Space between items: `sm` --uix-space-3, `md` --uix-space-4, `lg` --uix-space-6. */
export type DashboardCanvasGap = 'sm' | 'md' | 'lg';

/**
 * What changed, for the product's save and its journey event. `source`: `pointer` a drag,
 * `keyboard` an arrow key on a handle, `buttons` a step button (a press on a handle shows them).
 */
export interface DashboardCanvasChange {
  readonly id: string;
  readonly kind: 'move' | 'resize';
  readonly source: 'pointer' | 'keyboard' | 'buttons';
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
   * operable with the arrow keys. A press on a handle (click, tap, Enter or Space) shows four
   * step buttons beside it that move or resize the item one cell each (WCAG 2.5.7). Off, the
   * canvas is a plain layout and server-renderable.
   */
  editable?: boolean;
  /** The next layout, once per drop or key press. The canvas never keeps its own copy. */
  onLayoutChange?: (items: T[], change: DashboardCanvasChange) => void;
  /** Height of one row, any CSS length. Default `--uix-dashboard-canvas-row` (5rem). */
  rowHeight?: string;
  /** Default `md`. */
  gap?: DashboardCanvasGap;
  /** Each word defaults to `UixLabelsProvider` `dashboardCanvas`, then to English. */
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

type Step = DashboardCanvasDirection | DashboardCanvasResize;
/** The step buttons of each handle, in the order they sit: top, left, right, bottom (a cross). */
const STEPS: Record<'move' | 'resize', readonly Step[]> = {
  move: ['up', 'left', 'right', 'down'],
  resize: ['shorter', 'narrower', 'wider', 'taller'],
};
const OPPOSITE: Record<Step, Step> = {
  up: 'down', down: 'up', left: 'right', right: 'left',
  wider: 'narrower', narrower: 'wider', taller: 'shorter', shorter: 'taller',
};
const STEP_LABEL: Record<Step, keyof DashboardCanvasLabels> = {
  up: 'moveUp', down: 'moveDown', left: 'moveLeft', right: 'moveRight',
  wider: 'wider', narrower: 'narrower', taller: 'taller', shorter: 'shorter',
};
const STEP_ICON: Record<Step, typeof ArrowUpIcon> = {
  up: ArrowUpIcon, down: ArrowDownIcon, left: ArrowLeftIcon, right: ArrowRightIcon,
  shorter: ArrowUpIcon, taller: ArrowDownIcon, narrower: ArrowLeftIcon, wider: ArrowRightIcon,
};
const isMove = (step: Step): step is DashboardCanvasDirection => step === 'up' || step === 'down' || step === 'left' || step === 'right';
const stepTarget = (item: DashboardCanvasItem, step: Step): DashboardCanvasPlacement | null =>
  isMove(step) ? canvasMoveTarget(item, step) : canvasResizeTarget(item, step);

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
 * on downwards, and report one new layout per drop. Both handles also take the arrow keys, and a
 * press on a handle without dragging (click, tap, Enter, Space) shows four step buttons beside it
 * that move or resize the item one cell per press and stay open for the next, so dragging is
 * never the only way (WCAG 2.5.7). Escape, Done or a press elsewhere puts them away. The pure
 * functions behind them (`moveCanvasItem`, `resizeCanvasItem`) are exported for a product's own
 * item menu.
 *
 * Below 36rem of its own width the canvas is one column in reading order (row by row, left to
 * right), each item keeping its height, and the handles step aside: the item menu remains.
 *
 * After a pointer drop, the cards that moved glide to their new places on the glide spring
 * (`useViewTransition`, scoped to the canvas where the browser can); arrow-key steps, reduced
 * motion and a browser without view transitions jump. The morph shows the layout the product passes
 * back while `onLayoutChange` runs; one that saves first and passes `items` later gets the jump.
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
  const labels = { ...DEFAULT_DASHBOARD_CANVAS_LABELS, ...useUixLabels().dashboardCanvas, ...labelOverrides };
  const instructionsId = useId();
  const stepsId = useId();
  /** The handle whose step buttons are shown. */
  const [steps, setSteps] = useState<{ id: string; kind: 'move' | 'resize' } | null>(null);
  /** The step button to focus after a step re-renders the canvas (or its opposite, at an edge). */
  const stepFocus = useRef<Step | null>(null);
  /** A drag just ended on a handle: the click that follows is not a press. */
  const suppressClick = useRef(false);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const morph = useViewTransition();
  const [preview, setPreview] = useState<{ id: string; kind: 'move' | 'resize'; placement: DashboardCanvasPlacement } | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const layout = useMemo(() => normalizeCanvas(items), [items]);
  const order = useMemo(() => new Map(canvasReadingOrder(layout).map((item, index) => [item.id, index])), [layout]);

  // Keep the latest props for the window listeners a drag installs.
  const live = useRef({ layout, onLayoutChange, labels, itemLabel });
  live.current = { layout, onLayoutChange, labels, itemLabel };

  useEffect(() => () => dragRef.current?.stop(), []);

  // A widget dropped by the pointer settles where it lands, once the new layout is on screen
  // (HAR-2590). Keyboard steps stay instant.
  // Only once the consumer's layout puts the widget where it was dropped; a layout that never
  // arrives (no onLayoutChange, a refused move) gets no landing.
  const settle = useRef<{ id: string; col: number; row: number; layout: unknown } | null>(null);
  useEffect(() => {
    const pending = settle.current;
    if (!pending || preview) return;
    const item = layout.find((entry) => entry.id === pending.id);
    if (!item || item.col !== pending.col || item.row !== pending.row) {
      if (layout !== pending.layout) settle.current = null;
      return;
    }
    settle.current = null;
    settleDrop(Array.from(gridRef.current?.children ?? []).find((el) => (el as HTMLElement).dataset.canvasId === pending.id) as HTMLElement | undefined);
  });

  const describe = (item: T, kind: 'move' | 'resize'): string =>
    kind === 'move'
      ? fillLabel(labels.moved, { label: itemLabel(item), col: item.col + 1, row: item.row + 1 })
      : fillLabel(labels.resized, { label: itemLabel(item), w: item.w, h: item.h });

  const commit = (id: string, placement: DashboardCanvasPlacement, kind: 'move' | 'resize', source: DashboardCanvasChange['source']) => {
    const state = live.current;
    const next = placeCanvasItem(state.layout, id, placement);
    const placed = next.find((item) => item.id === id);
    if (!placed) return;
    // a pointer move lands; a resize never lifted, so it does not
    if (source === 'pointer' && kind === 'move') settle.current = { id, col: placed.col, row: placed.row, layout: state.layout };
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
    if (event.key === 'Escape' && steps?.id === item.id && steps.kind === kind) {
      event.preventDefault();
      event.stopPropagation();
      setSteps(null);
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
      if (!moved) setSteps(null);
      moved = true;
      const placed = placeCanvasItem(live.current.layout, item.id, targetFor(move)).find((candidate) => candidate.id === item.id);
      if (!placed) return;
      last = { col: placed.col, row: placed.row, w: placed.w, h: placed.h };
      setPreview({ id: item.id, kind, placement: last });
    };
    const finish = (drop: boolean) => {
      drag.stop();
      dragRef.current = null;
      setPreview(null);
      if (moved) {
        suppressClick.current = true;
        setTimeout(() => { suppressClick.current = false; }, 0);
      }
      const changed = last.col !== origin.col || last.row !== origin.row || last.w !== origin.w || last.h !== origin.h;
      if (!(drop && moved && changed)) return;
      // A pointer drop is an occasional edit, so the cards it pushes travel to their new places
      // instead of jumping (a view transition, scoped to the canvas where the browser can).
      // Keyboard steps stay instant.
      const grid = gridRef.current;
      const cards = () => Array.from(grid?.children ?? [], (el) => [(el as HTMLElement).dataset.canvasId ?? '', el] as const)
        .filter(([id]) => id !== '');
      morph(() => commit(item.id, last, kind, 'pointer'), { scope: grid, parts: cards });
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

  // The step buttons go away when the item they belong to does, or edit mode ends.
  const stepsItem = steps ? layout.find((item) => item.id === steps.id) : undefined;
  useEffect(() => {
    if (steps && (!editable || !stepsItem)) setSteps(null);
  }, [steps, editable, stepsItem]);

  const handleOf = (id: string, kind: 'move' | 'resize') =>
    Array.from(gridRef.current?.children ?? []).find((el) => (el as HTMLElement).dataset.canvasId === id)
      ?.querySelector<HTMLElement>(`.uix-dashboard-canvas__${kind}`) ?? null;
  const closeSteps = (refocus: boolean) => {
    const open = steps;
    setSteps(null);
    if (refocus && open) handleOf(open.id, open.kind)?.focus();
  };

  // While shown: Escape puts them away (focus back on the handle), a press outside them too.
  useEffect(() => {
    if (!steps) return undefined;
    const pad = () => document.getElementById(stepsId);
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target || pad()?.contains(target) || handleOf(steps.id, steps.kind)?.contains(target)) return;
      setSteps(null);
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps, stepsId]);

  // After a step the canvas re-renders (an item that changes place in the layout is re-inserted,
  // which drops focus): focus the button that was pressed, or its opposite once it is at an edge.
  useEffect(() => {
    const want = stepFocus.current;
    stepFocus.current = null;
    if (!want || !steps) return;
    const pad = document.getElementById(stepsId);
    const button = (step: Step) => pad?.querySelector<HTMLButtonElement>(`[data-step="${step}"]`);
    const el = [button(want), button(OPPOSITE[want])].find((candidate) => candidate && !candidate.disabled)
      ?? pad?.querySelector<HTMLButtonElement>('.uix-dashboard-canvas__steps-done');
    if (el && document.activeElement !== el) el.focus();
  });

  const onStep = (item: T, kind: 'move' | 'resize', step: Step) => {
    const target = stepTarget(item, step);
    stepFocus.current = step;
    if (!target) {
      setAnnouncement(fillLabel(labels.atEdge, { label: itemLabel(item) }));
      return;
    }
    commit(item.id, target, kind, 'buttons');
  };

  const onHandleClick = (item: T, kind: 'move' | 'resize') => {
    if (suppressClick.current) return;
    if (steps?.id === item.id && steps.kind === kind) { closeSteps(false); return; }
    stepFocus.current = null;
    setSteps({ id: item.id, kind });
  };

  // Shown by a click, Enter or Space: focus goes to the first button that can step.
  useEffect(() => {
    if (!steps) return;
    const pad = document.getElementById(stepsId);
    if (!pad || pad.contains(document.activeElement)) return;
    const first = Array.from(pad.querySelectorAll<HTMLButtonElement>('button')).find((button) => !button.disabled);
    first?.focus();
    // only when a pad opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps?.id, steps?.kind, stepsId]);

  const onStepsBlur = (event: ReactFocusEvent<HTMLSpanElement>) => {
    // Focus left for another control on the page: put them away. (A button re-inserted by a step,
    // or one that turned disabled, blurs with no new target; they stay.)
    const to = event.relatedTarget as Node | null;
    if (!to || !steps) return;
    if (event.currentTarget.contains(to) || handleOf(steps.id, steps.kind)?.contains(to)) return;
    setSteps(null);
  };

  // A span, not a div: the item's last <div> is the widget, which takes the spare height (CSS).
  const renderSteps = (item: T, kind: 'move' | 'resize') => (
    <span
      id={stepsId}
      role="group"
      aria-label={fillLabel(kind === 'move' ? labels.move : labels.resize, { label: itemLabel(item) })}
      className={cx('uix-dashboard-canvas__steps', `uix-dashboard-canvas__steps--${kind}`)}
      onBlur={onStepsBlur}
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return;
        event.preventDefault();
        event.stopPropagation();
        closeSteps(true);
      }}
    >
      {STEPS[kind].map((step) => {
        const Icon = STEP_ICON[step];
        return (
          <button
            key={step}
            type="button"
            className="uix-dashboard-canvas__step"
            data-step={step}
            aria-label={labels[STEP_LABEL[step]]}
            disabled={!stepTarget(item, step)}
            onClick={() => onStep(item, kind, step)}
          >
            <Icon aria-hidden="true" />
          </button>
        );
      })}
      <button type="button" className="uix-dashboard-canvas__step uix-dashboard-canvas__steps-done" aria-label={labels.closeSteps} onClick={() => closeSteps(true)}>
        <XIcon aria-hidden="true" />
      </button>
    </span>
  );

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
        // A widget in the pointer's hand is lifted (the kit's drag affordance, HAR-2755) while the
        // dashed preview shows where it lands; a resize is not picked up, so it only dims.
        const lifted = dragging && preview.kind === 'move';
        return (
          <div
            key={item.id}
            className={cx('uix-dashboard-canvas__item', dragging && 'uix-dashboard-canvas__item--dragging')}
            data-uix-drag={lifted ? 'lifted' : undefined}
            data-steps={editable && steps?.id === item.id ? steps.kind : undefined}
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
                  aria-expanded={steps?.id === item.id && steps.kind === 'move'}
                  aria-controls={steps?.id === item.id && steps.kind === 'move' ? stepsId : undefined}
                  onKeyDown={(event) => onHandleKeyDown(event, item, 'move')}
                  onPointerDown={(event) => onHandlePointerDown(event, item, 'move')}
                  onClick={() => onHandleClick(item, 'move')}
                >
                  <GripVerticalIcon aria-hidden="true" />
                </button>
                {steps?.id === item.id && steps.kind === 'move' ? renderSteps(item, 'move') : null}
                <button
                  type="button"
                  className="uix-dashboard-canvas__handle uix-dashboard-canvas__resize"
                  aria-label={fillLabel(labels.resize, { label: name })}
                  aria-describedby={instructionsId}
                  aria-expanded={steps?.id === item.id && steps.kind === 'resize'}
                  aria-controls={steps?.id === item.id && steps.kind === 'resize' ? stepsId : undefined}
                  onKeyDown={(event) => onHandleKeyDown(event, item, 'resize')}
                  onPointerDown={(event) => onHandlePointerDown(event, item, 'resize')}
                  onClick={() => onHandleClick(item, 'resize')}
                >
                  <Maximize2Icon aria-hidden="true" />
                </button>
                {steps?.id === item.id && steps.kind === 'resize' ? renderSteps(item, 'resize') : null}
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
