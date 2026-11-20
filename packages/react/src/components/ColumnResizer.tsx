"use client";

/* The column-resize grip of a DataWorkspace header (roadmap #11). Internal: DataWorkspace renders
 * one in each resizable header and owns the widths; this file owns the gestures.
 *
 * - Pointer: drag the grip. The width follows the pointer once per frame (a draft the grid draws)
 *   and is committed once, on release; Escape or a cancelled pointer puts the width back.
 * - Keyboard (the APG window splitter, vertical): the grip is a focusable `separator` with
 *   aria-valuenow / min / max in px. ← / → (or Alt + ← / →) step 8 px, Shift steps to the next
 *   stop of the column-width scale, Home / End go to the floor and the cap; the width is committed
 *   on key up, so a held key commits once. Enter opens the width popover.
 * - A single pointer without dragging (WCAG 2.5.7): a click on the grip opens a popover with the
 *   width as a number, − / + to the next stop of the scale, Fit to content and Default width.
 * - Double-click: fit to the widest content on screen.
 */
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react';
import { clampWidth, columnWidthForKey, stepColumnWidth } from '../table-engine.js';
import { fillLabel } from '../fill-label.js';
import { MinusIcon, PlusIcon } from '../icons/components.js';
import { Button } from './Button.js';
import { NumberInput } from './NumberInput.js';
import { Popover } from './Popover.js';

export interface ColumnResizerLabels {
  /** The grip (a separator): `{column}`. */
  resizeColumn: string;
  /** The width popover and its field: `{column}`. */
  columnWidth: string;
  /** The unit after the field. */
  columnWidthUnit: string;
  narrower: string;
  wider: string;
  fitColumn: string;
  defaultColumnWidth: string;
  /** The grip's description: how to resize it by pointer, key and click. */
  resizeHint: string;
}

export interface ColumnResizerProps {
  /** The column's name in words. */
  name: string;
  /** The width set for the column (a draft while resizing), or undefined for its default. */
  width: number | undefined;
  min: number;
  max: number;
  /** Before the first change of a gesture (the grid may fix every column's width it shows). */
  onBegin: () => void;
  /** A live width while the gesture runs, or `null` to drop it (cancelled). */
  onDraft: (width: number | null) => void;
  /** The gesture's end: the new width, or `null` for the column's default. */
  onCommit: (width: number | null) => void;
  /** The width that fits the column's widest content on screen. */
  fit: () => number;
  labels: ColumnResizerLabels;
  popoverId: string;
}

/** A layout effect in the browser, an effect on the server (no warning there). */
const useIsomorphicLayoutEffect = typeof document !== 'undefined' ? useLayoutEffect : useEffect;

/** A press that moves less than this is a click, not a drag. */
const DRAG_THRESHOLD = 3;
/** How long a click waits for a second one (a double-click fits) before it opens the popover. */
const DOUBLE_CLICK_MS = 220;

const KEYS = new Set(['ArrowLeft', 'ArrowRight', 'Home', 'End']);

export function ColumnResizer({ name, width, min, max, onBegin, onDraft, onCommit, fit, labels, popoverId }: ColumnResizerProps) {
  const ref = useRef<HTMLSpanElement>(null);
  /** The header's drawn width, for a column without a set width (its default, or the slack it takes). */
  const [drawn, setDrawn] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const [open, setOpen] = useState(false);
  const gesture = useRef<{ startX: number; startWidth: number; moved: boolean; pointerId: number; last: number | null; frame: number } | null>(null);
  /** The width a key gesture is drafting, committed on key up. */
  const keyed = useRef<number | null>(null);
  /** The last press was a drag: its click is not a click. */
  const dragged = useRef(false);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Escape while dragging, wherever focus is: put the width back. */
  const escape = useRef<((event: KeyboardEvent) => void) | null>(null);

  const header = () => ref.current?.closest('th') ?? null;
  const measure = () => {
    const th = header();
    const w = th && typeof th.getBoundingClientRect === 'function' ? th.getBoundingClientRect().width : 0;
    return w > 0 ? clampWidth(w, min, max) : null;
  };
  const rtl = () => {
    const el = ref.current;
    return !!el && typeof getComputedStyle === 'function' && getComputedStyle(el).direction === 'rtl';
  };
  const current = () => width ?? measure() ?? drawn ?? min;
  // the drawn width after every render with a new width (and on mount): aria-valuenow stays true
  useIsomorphicLayoutEffect(() => { setDrawn(measure()); }, [width, min, max]);
  useEffect(() => () => {
    if (clickTimer.current) clearTimeout(clickTimer.current);
    if (escape.current) window.removeEventListener('keydown', escape.current, true);
  }, []);

  const value = clampWidth(width ?? drawn ?? min, min, max);

  // ── pointer ─────────────────────────────────────────────────────────────────────────────
  const onPointerDown = (event: ReactPointerEvent<HTMLSpanElement>) => {
    if (event.button !== 0 || gesture.current) return;
    event.preventDefault(); // no text selection; the header's sort button is not pressed
    event.stopPropagation();
    dragged.current = false;
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* not capturable (a synthetic event) */ }
    escape.current = (key: KeyboardEvent) => {
      if (key.key !== 'Escape') return;
      // the drag takes this Escape, not a maximized workspace or a dialog around the table
      key.preventDefault();
      key.stopPropagation();
      endPointer(false);
    };
    window.addEventListener('keydown', escape.current, true);
    gesture.current = { startX: event.clientX, startWidth: current(), moved: false, pointerId: event.pointerId, last: null, frame: 0 };
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLSpanElement>) => {
    const g = gesture.current;
    if (!g || event.pointerId !== g.pointerId) return;
    const dx = (event.clientX - g.startX) * (rtl() ? -1 : 1);
    if (!g.moved) {
      if (Math.abs(dx) < DRAG_THRESHOLD) return;
      g.moved = true;
      setDragging(true);
      onBegin();
    }
    g.last = clampWidth(g.startWidth + dx, min, max);
    if (typeof requestAnimationFrame !== 'function') { onDraft(g.last); return; }
    if (g.frame) return; // one draft per frame
    let ran = false;
    const frame = requestAnimationFrame(() => {
      ran = true;
      g.frame = 0;
      if (gesture.current === g && g.last != null) onDraft(g.last);
    });
    if (!ran) g.frame = frame;
  };
  const endPointer = (commit: boolean) => {
    const g = gesture.current;
    if (!g) return;
    gesture.current = null;
    if (escape.current) { window.removeEventListener('keydown', escape.current, true); escape.current = null; }
    if (g.frame && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(g.frame);
    try { ref.current?.releasePointerCapture(g.pointerId); } catch { /* already released */ }
    setDragging(false);
    if (!g.moved) return;
    dragged.current = true;
    if (commit && g.last != null) onCommit(g.last);
    else onDraft(null);
  };

  // ── keyboard ────────────────────────────────────────────────────────────────────────────
  const onKeyDown = (event: ReactKeyboardEvent<HTMLSpanElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openPopover();
      return;
    }
    if (event.ctrlKey || event.metaKey) return;
    const from = keyed.current ?? current();
    const next = columnWidthForKey(from, event, { min, max, rtl: rtl() });
    if (next == null) return;
    event.preventDefault();
    event.stopPropagation();
    if (keyed.current == null) onBegin();
    keyed.current = next;
    onDraft(next);
  };
  const commitKeys = () => {
    if (keyed.current == null) return;
    const next = keyed.current;
    keyed.current = null;
    onCommit(next);
  };
  const onKeyUp = (event: ReactKeyboardEvent<HTMLSpanElement>) => {
    if (KEYS.has(event.key)) commitKeys();
  };

  // ── click: the popover; double-click: fit ───────────────────────────────────────────────
  const onClick = (event: ReactMouseEvent<HTMLSpanElement>) => {
    event.stopPropagation();
    if (dragged.current) { dragged.current = false; return; }
    if (clickTimer.current) { clearTimeout(clickTimer.current); clickTimer.current = null; }
    if (event.detail >= 2) {
      hidePopover();
      onBegin();
      onCommit(fit());
      return;
    }
    clickTimer.current = setTimeout(() => { clickTimer.current = null; openPopover(); }, DOUBLE_CLICK_MS);
  };

  const popover = () => (typeof document !== 'undefined' ? document.getElementById(popoverId) : null);
  const openPopover = () => {
    const el = popover();
    setDrawn(measure());
    setOpen(true);
    try { if (el && !el.matches(':popover-open')) el.showPopover(); } catch { /* not connected */ }
  };
  const hidePopover = () => {
    const el = popover();
    try { if (el?.matches(':popover-open')) el.hidePopover(); } catch { /* not open */ }
  };
  useEffect(() => {
    const el = popover();
    if (!el) return;
    const onToggle = (event: Event) => {
      const opened = (event as Event & { newState?: string }).newState === 'open';
      setOpen(opened);
      // the form takes focus as it mounts (it may render after this event, from a click's timer);
      // on close, focus that was in it goes back to the grip
      if (!opened && (el.contains(document.activeElement) || document.activeElement === document.body)) ref.current?.focus();
    };
    el.addEventListener('toggle', onToggle);
    return () => el.removeEventListener('toggle', onToggle);
  }, [popoverId]);

  const column = { column: name };
  const hintId = useId();
  return (
    <>
      <span
        ref={ref}
        className="uix-table__resize"
        data-resize=""
        data-drag={dragging ? '' : undefined}
        role="separator"
        aria-orientation="vertical"
        aria-label={fillLabel(labels.resizeColumn, column)}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-describedby={hintId}
        aria-controls={popoverId}
        title={labels.resizeHint}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={() => endPointer(true)}
        onPointerCancel={() => endPointer(false)}
        onLostPointerCapture={() => { if (gesture.current) endPointer(true); }}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        onBlur={commitKeys}
        onFocus={() => setDrawn(measure())}
        onClick={onClick}
      />
      {/* hidden: a description by reference only, never part of the column header's name */}
      <span id={hintId} hidden>{labels.resizeHint}</span>
      <Popover
        id={popoverId} anchor={ref} placement="bottom-end" role="dialog" aria-label={fillLabel(labels.columnWidth, column)} className="uix-col-resize"
        // Escape closes this popover only: not a maximized workspace around it (its window listener skips a handled key)
        onKeyDown={(event) => {
          if (event.key !== 'Escape') return;
          event.preventDefault();
          event.stopPropagation();
          hidePopover();
        }}
      >
        {open && (
          <WidthForm
            name={name} value={value} min={min} max={max} labels={labels}
            onApply={(next, close) => { onBegin(); onCommit(next); if (close) hidePopover(); }}
            onFit={() => { onBegin(); onCommit(fit()); hidePopover(); }}
            onReset={() => { onCommit(null); hidePopover(); }}
            onClose={hidePopover}
          />
        )}
      </Popover>
    </>
  );
}

interface WidthFormProps {
  name: string;
  value: number;
  min: number;
  max: number;
  labels: ColumnResizerLabels;
  /** A width set in the form; `close` after Enter. */
  onApply: (width: number, close: boolean) => void;
  onFit: () => void;
  onReset: () => void;
  onClose: () => void;
}

/** The popover's form: the width as a number (Enter or leaving the field applies it), − / +, fit, default. */
function WidthForm({ name, value, min, max, labels, onApply, onFit, onReset, onClose }: WidthFormProps) {
  const [text, setText] = useState<number>(value);
  const cancelled = useRef(false);
  // a width set elsewhere (a step, a drag) shows in the field
  useEffect(() => { setText(value); }, [value]);
  const fieldId = useId();
  const unitId = useId();
  const field = useRef<HTMLInputElement>(null);
  useEffect(() => { field.current?.focus(); field.current?.select(); }, []);
  const apply = (close: boolean) => {
    if (cancelled.current) { cancelled.current = false; return; }
    if (!Number.isFinite(text)) { setText(value); return; }
    const next = clampWidth(text, min, max);
    setText(next);
    if (next !== value) onApply(next, close);
    else if (close) onClose();
  };
  const step = (direction: 1 | -1) => onApply(stepColumnWidth(value, direction, { min, max, coarse: true }), false);
  return (
    <div className="uix-col-resize__form">
      <label className="uix-field__label" htmlFor={fieldId}>{fillLabel(labels.columnWidth, { column: name })}</label>
      <div className="uix-col-resize__row">
        <Button size="sm" variant="secondary" icon aria-label={labels.narrower} disabled={value <= min} onClick={() => step(-1)}><MinusIcon size="sm" aria-hidden="true" /></Button>
        <NumberInput
          ref={field} id={fieldId} size="sm" className="uix-col-resize__field" min={min} max={max} step={1} inputMode="numeric"
          value={text} onValueChange={setText}
          onKeyDown={(event) => {
            if (event.key === 'Enter') { event.preventDefault(); apply(true); }
            else if (event.key === 'Escape') { cancelled.current = true; setText(value); }
          }}
          onBlur={() => apply(false)}
          aria-describedby={unitId}
        />
        <span className="uix-col-resize__unit" id={unitId}>{labels.columnWidthUnit}</span>
        <Button size="sm" variant="secondary" icon aria-label={labels.wider} disabled={value >= max} onClick={() => step(1)}><PlusIcon size="sm" aria-hidden="true" /></Button>
      </div>
      <div className="uix-col-resize__actions">
        <Button size="sm" variant="ghost" onClick={onFit}>{labels.fitColumn}</Button>
        <Button size="sm" variant="ghost" onClick={onReset}>{labels.defaultColumnWidth}</Button>
      </div>
    </div>
  );
}
