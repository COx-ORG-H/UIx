"use client";

/* The Week/Day time grid of SchedulingCalendar (HAR-1509, U3). Internal: it is rendered by
 * SchedulingCalendar and not exported. Geometry comes from real instants (a day column is as
 * long as its day), so no day length is written down here. Every move is a proposal handed to
 * the consumer: this file never applies, refuses or cancels one. */
import { memo, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { CSSProperties, FocusEvent as ReactFocusEvent, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import { zonedDateKey, zonedHourSlots, zonedTimeOfDay } from '../calendar-model.js';
import type { ZonedHourSlot } from '../calendar-model.js';
import { layoutDaySpans, layoutTimeGridDay, placesInTopLane, proposeMove } from '../scheduling-calendar-model.js';
import type { MoveProposal, PlacedDaySpan, TimeGridDayLayout, TimeGridSegment } from '../scheduling-calendar-model.js';
import { fillLabel } from '../fill-label.js';
import type {
  SchedulingCalendarDay, SchedulingCalendarEntry, SchedulingCalendarLabels, SchedulingCalendarOverlay, SchedulingDatePart, SchedulingMarker,
} from './SchedulingCalendar.js';

const HOUR_MS = 3_600_000;
const MINUTES_PER_HOUR = 60;
/** Text lines per hour: the stylesheet draws an hour 3rem tall and a line of item text 1rem tall. */
const LINES_PER_HOUR = 3;
/** Pointer travel (px) before a press becomes a drag. Below it the press is a click. */
const DRAG_THRESHOLD = 4;
const DEFAULT_STEP = 15;

export interface TimeGridEntryContext {
  /** Whole text lines that fit in the item: 0 shows the markers only. */
  availableLines: number;
}

interface MoveDelta { days: number; minutes: number }
/** A move on screen: pending from the keyboard, following the pointer, or sent and waiting for the consumer. */
interface Ghost { id: string; delta: MoveDelta; source: 'keys' | 'pointer' | 'sent'; proposal: MoveProposal }

export interface SchedulingTimeGridProps {
  view: 'week' | 'day';
  days: string[];
  timeZone: string;
  entries: SchedulingCalendarEntry[];
  overlays: SchedulingCalendarOverlay[];
  dayInfo?: Record<string, SchedulingCalendarDay>;
  labels: Required<SchedulingCalendarLabels>;
  gridLabel: string;
  dateText: (date: string, part: SchedulingDatePart) => string;
  formatInstant: (instant: string) => string;
  entryName: (entry: SchedulingCalendarEntry) => string;
  entryStatus: (entry: SchedulingCalendarEntry) => string;
  entryMarkers: (entry: SchedulingCalendarEntry) => SchedulingMarker[];
  overlayName: (overlay: SchedulingCalendarOverlay) => string;
  renderEntry?: (entry: SchedulingCalendarEntry, context?: TimeGridEntryContext) => ReactNode;
  renderMarker: (marker: SchedulingMarker, showLabel?: boolean) => ReactNode;
  onSelectEntry?: (entry: SchedulingCalendarEntry) => void;
  onSelectOverlay?: (overlay: SchedulingCalendarOverlay) => void;
  onSelectDate?: (date: string) => void;
  onShowMore?: (date: string, entries: SchedulingCalendarEntry[]) => void;
  now?: string;
  canMove: boolean;
  step: number;
  onProposeMove?: (id: string, proposal: MoveProposal) => void | Promise<unknown>;
  topLaneCrossMidnightMinutes: number;
  topLaneCap: number;
  windowLaneCap: number;
  maxLanes: number;
  emptyNote?: ReactNode;
  nothingToShow: boolean;
}

interface ItemHandlers {
  click: (entry: SchedulingCalendarEntry) => void;
  keyDown: (event: ReactKeyboardEvent<HTMLElement>, entry: SchedulingCalendarEntry) => void;
  blur: (entry: SchedulingCalendarEntry) => void;
  pointerDown: (event: ReactPointerEvent<HTMLElement>, entry: SchedulingCalendarEntry, column: number, top: boolean) => void;
}

const vars = (values: Record<string, number | string>): CSSProperties => values as CSSProperties;
const linesFor = (segment: TimeGridSegment) => Math.max(0, Math.floor(segment.lengthHours * LINES_PER_HOUR - 0.25));
const slotSignature = (slots: ZonedHourSlot[]) => slots.map((slot) => `${slot.label}${slot.offsetLabel ?? ''}`).join(' ');
/** The first of each id: a repeated id is drawn once, as a repeated React key would be. */
function uniqueById<T extends { id: string }>(items: readonly T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => (seen.has(item.id) ? false : (seen.add(item.id), true)));
}

interface GridItemProps {
  entry: SchedulingCalendarEntry;
  segment: TimeGridSegment;
  column: number;
  /** The start part of this continuation is on a day that is not on screen, so this part stands for the item. */
  alone: boolean;
  name: string;
  status: string;
  movable: boolean;
  hintId?: string;
  timeZone: string;
  continuesFrom: string;
  markers: SchedulingMarker[];
  renderEntry?: SchedulingTimeGridProps['renderEntry'];
  renderMarker: SchedulingTimeGridProps['renderMarker'];
  handlers: ItemHandlers;
}

/** One item part in a day column. The start part (or the whole item) is the button; a continuation beside its start part is decoration. */
const GridItem = memo(function GridItem({ entry, segment, column, alone, name, status, movable, hintId, timeZone, continuesFrom, markers, renderEntry, renderMarker, handlers }: GridItemProps) {
  const lines = linesFor(segment);
  const continuation = segment.part === 'continuation';
  const style = vars({
    '--uix-scheduling-calendar-offset': segment.offsetHours,
    '--uix-scheduling-calendar-length': segment.lengthHours,
    '--uix-scheduling-calendar-lane': segment.lane,
    '--uix-scheduling-calendar-lanes': segment.laneCount,
  });
  // A part that stands alone for an item begun on an earlier day says "from HH:MM" where the others say the start time.
  const custom = renderEntry?.(entry, { availableLines: lines });
  const text = custom
    ?? <>{!continuation && <><span className="uix-scheduling-calendar__time">{zonedTimeOfDay(entry.start, timeZone)}</span>{' '}</>}<span className="uix-scheduling-calendar__title">{entry.title}</span></>;
  // An item too short for one line shows its markers only: its own words are in the markup with
  // `data-room="none"`, which the stylesheet hides on a screen and shows on paper, where the item may grow.
  const noRoom = lines === 0 && (custom === undefined || custom === null) ? 'none' : undefined;
  const body = <>
    {continuation && <span className="uix-scheduling-calendar__tg-from" data-room={lines === 0 ? 'none' : undefined}>{continuesFrom}</span>}
    {(!continuation || alone) && text != null && text !== false && <span className="uix-scheduling-calendar__entry-text" data-room={noRoom}>{text}</span>}
    {markers.length > 0 && <span className="uix-scheduling-calendar__markers">{markers.map((marker) => <span key={marker.id}>{renderMarker(marker)}</span>)}</span>}
  </>;
  const shared = {
    className: 'uix-scheduling-calendar__entry uix-scheduling-calendar__tg-item',
    'data-highlight': entry.emphasis === 'highlight' || undefined,
    'data-dim': entry.emphasis === 'dim' || undefined,
    'data-band': entry.band ?? 'none',
    'data-status': status,
    'data-state': entry.state,
    'data-part': segment.part,
    'data-lines': Math.min(lines, 3),
    'data-movable': movable || undefined,
    style,
    onClick: () => handlers.click(entry),
    onPointerDown: movable ? (event: ReactPointerEvent<HTMLElement>) => handlers.pointerDown(event, entry, column, false) : undefined,
  };
  // Beside its start part the continuation repeats nothing to assistive technology: the start part carries the whole name.
  if (continuation && !alone) return <div {...shared} data-continuation-of={entry.id} aria-hidden="true">{body}</div>;
  return <button
    type="button"
    tabIndex={-1}
    {...shared}
    data-item-id={entry.id}
    aria-label={name}
    aria-describedby={movable ? hintId : undefined}
    onKeyDown={movable ? (event) => handlers.keyDown(event, entry) : undefined}
    onBlur={movable ? () => handlers.blur(entry) : undefined}
  >{body}</button>;
}, (previous, next) => previous.entry === next.entry && previous.column === next.column && previous.alone === next.alone && previous.name === next.name && previous.status === next.status
  && previous.movable === next.movable && previous.hintId === next.hintId && previous.timeZone === next.timeZone && previous.continuesFrom === next.continuesFrom
  && previous.renderEntry === next.renderEntry && previous.segment.part === next.segment.part && previous.segment.offsetHours === next.segment.offsetHours
  && previous.segment.lengthHours === next.segment.lengthHours && previous.segment.lane === next.segment.lane && previous.segment.laneCount === next.segment.laneCount);

/** Week (seven columns) or Day (one column) with an hour axis. */
export function SchedulingTimeGrid({
  view, days, timeZone, entries: givenEntries, overlays: givenOverlays, dayInfo, labels, gridLabel, dateText, formatInstant, entryName, entryStatus, entryMarkers, overlayName,
  renderEntry, renderMarker, onSelectEntry, onSelectOverlay, onSelectDate, onShowMore, now, canMove, step: givenStep, onProposeMove,
  topLaneCrossMidnightMinutes, topLaneCap, windowLaneCap, maxLanes, emptyNote, nothingToShow,
}: SchedulingTimeGridProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const hintId = useId();
  const [widthCap, setWidthCap] = useState(Infinity);
  const [ghost, setGhost] = useState<Ghost | null>(null);
  const [announcement, setAnnouncement] = useState('');
  // Keyboard model (HAR-1527): the grid is one tab stop, on a day head. The arrow keys move
  // between the day heads, Enter goes into a day's items, ArrowUp and ArrowDown move between
  // those, and Escape goes back to the day head. No item is a tab stop of its own.
  const [activeDay, setActiveDay] = useState(days[0]!);
  const enteredFrom = useRef<string | null>(null);
  const tabStop = days.includes(activeDay) ? activeDay : days[0]!;
  const moving = canMove && onProposeMove !== undefined;
  const step = Number.isFinite(givenStep) && givenStep > 0 ? givenStep : DEFAULT_STEP;
  const laneOptions = useMemo(() => ({ crossMidnightMinutes: topLaneCrossMidnightMinutes }), [topLaneCrossMidnightMinutes]);
  const entries = useMemo(() => uniqueById(givenEntries), [givenEntries]);
  const overlays = useMemo(() => uniqueById(givenOverlays), [givenOverlays]);

  // Fewer lanes when a lane would be narrower than an item showing "HH:MM" and six title characters (the probe).
  // The columns are replaced when the days are, so the observer follows the days.
  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof ResizeObserver === 'undefined') return undefined;
    const column = root.querySelector<HTMLElement>('[data-tg-column]');
    const probe = root.querySelector<HTMLElement>('.uix-scheduling-calendar__tg-probe');
    if (!column || !probe) return undefined;
    let frame = 0;
    const measure = () => {
      frame = 0;
      if (!column.isConnected) return;
      const lane = probe.getBoundingClientRect().width;
      const width = column.getBoundingClientRect().width;
      setWidthCap(lane > 0 && width > 0 ? Math.max(1, Math.floor(width / lane)) : Infinity);
    };
    const observer = new ResizeObserver(() => { if (!frame) frame = requestAnimationFrame(measure); });
    observer.observe(column);
    measure();
    return () => { observer.disconnect(); if (frame) cancelAnimationFrame(frame); };
  }, [days]);

  const lanes = Math.max(1, Math.min(maxLanes, widthCap));
  const entryById = useMemo(() => new Map(entries.map((entry) => [entry.id, entry])), [entries]);
  const overlayById = useMemo(() => new Map(overlays.map((overlay) => [overlay.id, overlay])), [overlays]);
  const columns = useMemo<TimeGridDayLayout[]>(() => days.map((date) => layoutTimeGridDay(entries, date, timeZone, { ...laneOptions, maxLanes: lanes })), [days, entries, timeZone, laneOptions, lanes]);
  const slots = useMemo(() => days.map((date) => zonedHourSlots(date, timeZone)), [days, timeZone]);
  const top = useMemo(() => layoutDaySpans(entries.filter((entry) => placesInTopLane(entry, timeZone, laneOptions)), days, { timeZone, laneCap: Math.max(0, topLaneCap) }), [entries, days, timeZone, laneOptions, topLaneCap]);
  const drawable = useMemo(() => overlays.filter((overlay) => new Date(overlay.end).getTime() >= new Date(overlay.start).getTime()), [overlays]);
  const strip = useMemo(() => layoutDaySpans(drawable, days, { timeZone, laneCap: Math.max(0, windowLaneCap) }), [drawable, days, timeZone, windowLaneCap]);
  const shades = useMemo(() => layoutDaySpans(drawable.filter((overlay) => overlay.global), days, { timeZone }).placed, [drawable, days, timeZone]);
  const lanesIn = (placed: PlacedDaySpan[]) => placed.reduce((max, span) => Math.max(max, span.lane + 1), 0);
  const maxHours = Math.max(...columns.map((column) => column.dayHours));

  // The gutter shows the hours most columns share. A column whose hours differ (a clock-change
  // day inside the week) writes its own labels.
  const gutterIndex = useMemo(() => {
    const signatures = slots.map(slotSignature);
    const count = new Map<string, number>();
    for (const signature of signatures) count.set(signature, (count.get(signature) ?? 0) + 1);
    let best = 0;
    signatures.forEach((signature, index) => { if ((count.get(signature) ?? 0) > (count.get(signatures[best]!) ?? 0)) best = index; });
    return best;
  }, [slots]);
  const gutterSignature = slotSignature(slots[gutterIndex]!);
  const hourLabels = (index: number, inline: boolean) => slots[index]!.map((slot) => <div
    key={slot.instant.getTime()}
    className={inline ? 'uix-scheduling-calendar__tg-hour uix-scheduling-calendar__tg-hour--inline' : 'uix-scheduling-calendar__tg-hour'}
    data-hour={slot.label}
    style={vars({ '--uix-scheduling-calendar-offset': (slot.instant.getTime() - columns[index]!.dayStart) / HOUR_MS })}
  >{slot.label}{slot.offsetLabel && <span className="uix-scheduling-calendar__tg-offset">{slot.offsetLabel}</span>}</div>);

  const movable = (entry: SchedulingCalendarEntry) => moving && entry.movable !== false;

  // Handlers read the latest props through a ref, so the item elements keep stable callbacks.
  const live = useRef({ ghost, entryById, timeZone, step, onProposeMove, onSelectEntry, labels, formatInstant, days, columns, movable });
  live.current = { ghost, entryById, timeZone, step, onProposeMove, onSelectEntry, labels, formatInstant, days, columns, movable };
  const dragRef = useRef<{ id: string; pointerId: number; x: number; y: number; column: number; top: boolean; moved: boolean; dropped: boolean; rects: DOMRect[]; hourPx: number; delta: MoveDelta; stop: () => void } | null>(null);
  const suppressClick = useRef(false);
  // The item a keyboard move was sent for: when the consumer applies the move the button is
  // rebuilt in another column, and focus goes back to it instead of being lost.
  const refocus = useRef<string | null>(null);

  // A pending or sent move that no longer has its entry (it left the range, or the view moved on) is dropped.
  useEffect(() => {
    if (ghost && !entryById.has(ghost.id)) setGhost(null);
  }, [ghost, entryById]);

  useEffect(() => {
    const id = refocus.current;
    const root = rootRef.current;
    if (!id || !root) return;
    const active = document.activeElement;
    const lost = !active || active === document.body;
    if (!lost) { if (active.getAttribute('data-item-id') !== id) refocus.current = null; return; }
    for (const candidate of Array.from(root.querySelectorAll<HTMLElement>('[data-item-id]'))) {
      if (candidate.getAttribute('data-item-id') === id) { candidate.focus(); break; }
    }
  });

  const send = useCallback((id: string, delta: MoveDelta) => {
    const state = live.current;
    const entry = state.entryById.get(id);
    // Checked again here: the entry may have been pinned, or moving turned off, while the gesture ran.
    if (!entry || !state.onProposeMove || !state.movable(entry) || (delta.days === 0 && delta.minutes === 0)) { setGhost(null); return; }
    const proposal = proposeMove(entry, delta, state.timeZone);
    const result = state.onProposeMove(id, proposal);
    if (result && typeof (result as Promise<unknown>).then === 'function') {
      // The outline stays where the user asked until the consumer answers. The item itself only moves when its props do.
      setGhost({ id, delta, source: 'sent', proposal });
      const clear = () => setGhost((current) => (current && current.source === 'sent' && current.proposal === proposal ? null : current));
      (result as Promise<unknown>).then(clear, clear);
    } else setGhost(null);
  }, []);

  const handlers = useMemo<ItemHandlers>(() => ({
    click: (entry) => { live.current.onSelectEntry?.(entry); },
    keyDown: (event, entry) => {
      const state = live.current;
      const pending = state.ghost && state.ghost.id === entry.id && state.ghost.source === 'keys' ? state.ghost.delta : null;
      if (event.key === 'Enter' && pending) { event.preventDefault(); refocus.current = entry.id; send(entry.id, pending); return; }
      if (event.key === 'Escape' && pending) { event.preventDefault(); event.stopPropagation(); setGhost(null); setAnnouncement(state.labels.moveCancelled); return; }
      if (!event.shiftKey) return;
      const base = pending ?? { days: 0, minutes: 0 };
      const next = event.key === 'ArrowUp' ? { ...base, minutes: base.minutes - state.step }
        : event.key === 'ArrowDown' ? { ...base, minutes: base.minutes + state.step }
          : event.key === 'ArrowLeft' ? { ...base, days: base.days - 1 }
            : event.key === 'ArrowRight' ? { ...base, days: base.days + 1 } : null;
      if (!next) return;
      event.preventDefault();
      if (next.days === 0 && next.minutes === 0) { setGhost(null); setAnnouncement(state.labels.moveCancelled); return; }
      const proposal = proposeMove(entry, next, state.timeZone);
      setGhost({ id: entry.id, delta: next, source: 'keys', proposal });
      const proposed = fillLabel(state.labels.moveProposed, { start: state.formatInstant(proposal.start), end: state.formatInstant(proposal.end) });
      setAnnouncement(proposal.adjusted ? `${fillLabel(state.labels.gapForward, { time: zonedTimeOfDay(proposal.start, state.timeZone) })} ${proposed}` : proposed);
    },
    blur: (entry) => {
      refocus.current = null;
      setGhost((current) => (current && current.id === entry.id && current.source === 'keys' ? null : current));
    },
    pointerDown: (event, entry, column, top) => {
      if (event.button !== 0 || dragRef.current) return;
      const root = rootRef.current;
      if (!root) return;
      const elements = Array.from(root.querySelectorAll<HTMLElement>('[data-tg-column]'));
      const rects = elements.map((element) => element.getBoundingClientRect());
      // Days are counted from the column under the pointer: a top-lane span may be grabbed on any of its days.
      const under = rects.findIndex((rect) => event.clientX >= rect.left && event.clientX < rect.right);
      const from = under === -1 ? column : under;
      const hours = live.current.columns[from]?.dayHours ?? 1;
      const finish = (commit: boolean) => {
        const drag = dragRef.current;
        if (!drag) return;
        drag.stop();
        dragRef.current = null;
        if (!drag.moved) return;
        // The click that follows a drag is not an activation, whether the drag was sent or dropped.
        suppressClick.current = true;
        setTimeout(() => { suppressClick.current = false; }, 0);
        if (commit && !drag.dropped) send(drag.id, drag.delta); else setGhost(null);
      };
      const onMove = (move: PointerEvent) => {
        const drag = dragRef.current;
        if (!drag || move.pointerId !== drag.pointerId) return;
        // The button was let go where this window could not see it (a menu, another window): nothing is proposed.
        if (move.buttons === 0 && move.pointerType === 'mouse') { finish(false); return; }
        if (drag.dropped) return;
        const dx = move.clientX - drag.x;
        const dy = move.clientY - drag.y;
        if (!drag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
        drag.moved = true;
        const target = drag.rects.findIndex((rect) => move.clientX >= rect.left && move.clientX < rect.right);
        const stepMinutes = live.current.step;
        // A top-lane span moves by whole days only; in the grid the time snaps to the step.
        const delta = {
          days: target === -1 ? drag.delta.days : target - drag.column,
          minutes: drag.top || drag.hourPx <= 0 ? 0 : Math.round((dy / drag.hourPx) * MINUTES_PER_HOUR / stepMinutes) * stepMinutes,
        };
        if (delta.days === drag.delta.days && delta.minutes === drag.delta.minutes) return;
        drag.delta = delta;
        const dragged = live.current.entryById.get(drag.id);
        if (dragged) setGhost({ id: drag.id, delta, source: 'pointer', proposal: proposeMove(dragged, delta, live.current.timeZone) });
      };
      const onUp = (up: PointerEvent) => { if (up.pointerId === dragRef.current?.pointerId) finish(true); };
      const onCancel = (cancel: PointerEvent) => { if (cancel.pointerId === dragRef.current?.pointerId) finish(false); };
      // Escape drops the move at once. The press is kept until the button is released, so that
      // release is still not a click on the item.
      const onKey = (key: KeyboardEvent) => {
        const drag = dragRef.current;
        if (key.key !== 'Escape' || !drag?.moved || drag.dropped) return;
        key.preventDefault();
        key.stopPropagation();
        drag.dropped = true;
        setGhost(null);
      };
      // The pointer is followed on the window: the dragged element may re-render under it.
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onCancel);
      window.addEventListener('keydown', onKey, true);
      dragRef.current = {
        id: entry.id, pointerId: event.pointerId, x: event.clientX, y: event.clientY, column: from, top, moved: false, dropped: false, rects,
        hourPx: (rects[from]?.height ?? 0) / hours, delta: { days: 0, minutes: 0 },
        stop: () => {
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onUp);
          window.removeEventListener('pointercancel', onCancel);
          window.removeEventListener('keydown', onKey, true);
        },
      };
    },
  }), [send]);
  useEffect(() => () => { dragRef.current?.stop(); dragRef.current = null; }, []);

  const gridColumns = (span: { startCol: number; endCol: number }) => `${span.startCol + 2} / ${span.endCol + 3}`;
  const headButton = (date: string) => rootRef.current?.querySelector<HTMLElement>(`.uix-scheduling-calendar__tg-dayhead[data-date="${date}"] [data-calendar-date]`) ?? null;
  /** What Enter on a day head reaches, top to bottom: its windows, its top-lane spans, the items of its column, its "+N" controls. */
  const dayRing = (date: string): HTMLElement[] => {
    const root = rootRef.current;
    const column = days.indexOf(date);
    if (!root || column === -1) return [];
    // The hour axis is grid column 1, so day n is column n + 2.
    const covers = (element: HTMLElement) => {
      const [from, to] = element.style.gridColumn.split('/').map((part) => Number(part.trim()));
      return from !== undefined && to !== undefined && from <= column + 2 && column + 2 < to;
    };
    const all = (selector: string) => Array.from(root.querySelectorAll<HTMLElement>(selector));
    return [
      ...all('.uix-scheduling-calendar__tg-strip > button.uix-scheduling-calendar__window').filter(covers),
      ...all('.uix-scheduling-calendar__tg-top > button.uix-scheduling-calendar__tg-span').filter(covers),
      ...all(`[data-tg-column="${date}"] > button[data-item-id]`),
      ...all(`.uix-scheduling-calendar__tg-dayhead[data-date="${date}"] > button.uix-scheduling-calendar__more`),
      // "+N windows" opens one day; it is reached from that day.
      ...all(`.uix-scheduling-calendar__tg-strip > button.uix-scheduling-calendar__rowmore[data-more-date="${date}"]`),
    ];
  };
  /** The day an item was entered from, or, for an item reached with the pointer, the first day it is on. */
  const dayOfItem = (item: HTMLElement): string | null => {
    if (enteredFrom.current && dayRing(enteredFrom.current).includes(item)) return enteredFrom.current;
    const inColumn = item.getAttribute('data-more-date') ?? item.closest('[data-tg-column]')?.getAttribute('data-tg-column') ?? item.closest('[data-date]')?.getAttribute('data-date');
    if (inColumn) return inColumn;
    const from = Number(item.style.gridColumn.split('/')[0]);
    return Number.isFinite(from) ? days[Math.max(0, Math.min(days.length - 1, from - 2))] ?? null : days[days.length - 1] ?? null;
  };
  const onHeadKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>, date: string) => {
    const index = days.indexOf(date);
    const target = event.key === 'ArrowLeft' ? index - 1 : event.key === 'ArrowRight' ? index + 1 : event.key === 'Home' ? 0 : event.key === 'End' ? days.length - 1 : null;
    if (target !== null) {
      event.preventDefault();
      const next = days[Math.max(0, Math.min(days.length - 1, target))]!;
      setActiveDay(next);
      headButton(next)?.focus();
    } else if (event.key === 'Enter') {
      // A day with nothing in it has nothing to go into: Enter then activates the day head, as Space always does.
      const [first] = dayRing(date);
      if (!first) return;
      event.preventDefault();
      enteredFrom.current = date;
      first.focus();
    }
  };
  const onGridKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const item = event.target as HTMLElement;
    // Shift and an arrow is a move, and belongs to the item.
    if (event.defaultPrevented || event.shiftKey || item.hasAttribute('data-calendar-date') || !['ArrowDown', 'ArrowUp', 'Home', 'End', 'Escape'].includes(event.key)) return;
    const date = dayOfItem(item);
    if (!date) return;
    const ring = dayRing(date);
    // Only the items of the day: a field or a link the consumer put in an item keeps its own keys.
    const index = ring.indexOf(item);
    if (index === -1) return;
    event.preventDefault();
    const to = event.key === 'Escape' ? null : ring[Math.max(0, Math.min(ring.length - 1, event.key === 'Home' ? 0 : event.key === 'End' ? ring.length - 1 : index + (event.key === 'ArrowDown' ? 1 : -1)))];
    // A move not yet sent does not travel with the focus: leaving the item drops it, and says so.
    if (to !== item && ghost?.source === 'keys') { setGhost(null); setAnnouncement(labels.moveCancelled); }
    if (event.key === 'Escape') {
      event.stopPropagation();
      enteredFrom.current = null;
      setActiveDay(date);
      headButton(date)?.focus();
      return;
    }
    enteredFrom.current = date;
    to?.focus();
  };
  // An item reached with the pointer takes the tab stop to its day, so Tab comes back to where the user is.
  const onGridFocus = (event: ReactFocusEvent<HTMLDivElement>) => {
    const item = event.target as HTMLElement;
    if (item.hasAttribute('data-calendar-date')) return;
    const date = dayOfItem(item);
    if (date && dayRing(date).includes(item)) setActiveDay(date);
  };
  const nowAt = now === undefined ? null : new Date(now).getTime();
  const nowColumn = nowAt === null || Number.isNaN(nowAt) ? -1 : days.indexOf(zonedDateKey(new Date(nowAt), timeZone));
  const topHiddenOn = (date: string) => top.hidden.filter((id) => { const entry = entryById.get(id); return entry ? layoutDaySpans([entry], [date], { timeZone }).placed.length > 0 : false; });
  const windowLanes = lanesIn(strip.placed);
  const topLanes = lanesIn(top.placed);
  const moreWindows = strip.hidden.length;
  const firstHiddenWindowDay = strip.firstHiddenDay ?? days[0]!;

  // What the user sees of a move: the window asked for, in the lane it would be drawn in.
  const ghostEntry = ghost ? entryById.get(ghost.id) : undefined;
  const ghostTop = ghostEntry ? placesInTopLane(ghostEntry, timeZone, laneOptions) : false;
  const ghostParts = ghost && ghostEntry && !ghostTop
    ? days.map((date) => layoutTimeGridDay([{ id: 'ghost', start: ghost.proposal.start, end: ghost.proposal.end }], date, timeZone, { crossMidnightMinutes: Infinity }).segments)
    : null;
  const ghostSpan = ghost && ghostEntry && ghostTop ? layoutDaySpans([{ id: 'ghost', start: ghost.proposal.start, end: ghost.proposal.end }], days, { timeZone }).placed[0] : undefined;
  const ghostLane = ghost ? top.placed.find((span) => span.id === ghost.id)?.lane ?? 0 : 0;

  return <div
    ref={rootRef}
    className="uix-scheduling-calendar__timegrid"
    data-view={view}
    role="group"
    aria-label={gridLabel}
    style={vars({ '--uix-scheduling-calendar-days': days.length, '--uix-scheduling-calendar-hours': maxHours })}
    onKeyDown={onGridKeyDown}
    onFocus={onGridFocus}
    onClickCapture={(event) => { if (suppressClick.current) { suppressClick.current = false; event.preventDefault(); event.stopPropagation(); } }}
  >
    <div className="uix-scheduling-calendar__tg-head">
      <div className="uix-scheduling-calendar__tg-zone">{fillLabel(labels.timeZone, { timeZone })}</div>
      {days.map((date, index) => {
        const info = dayInfo?.[date];
        const hiddenIds = dayInfo ? [] : [...columns[index]!.hidden, ...topHiddenOn(date)];
        const more = info ? info.overflowCount : hiddenIds.length;
        const moreText = fillLabel(labels.moreSpans, { count: more });
        const moreName = fillLabel(labels.moreEntriesLabel, { count: more, date: dateText(date, 'day') });
        // The head is named for its day. With consumer numbers and no consumer label, the count is said too.
        // With a consumer label the name is worded by `dayName`; without one it is the date and the count, whatever `dayName` says.
        const headName = !info ? dateText(date, 'day') : info.label ? fillLabel(labels.dayName, { date: dateText(date, 'day'), label: info.label }) : `${dateText(date, 'day')}, ${fillLabel(labels.dayCount, { count: info.count })}`;
        return <div key={date} className="uix-scheduling-calendar__tg-dayhead" role="group" aria-label={headName} data-date={date}>
          <button type="button" className="uix-scheduling-calendar__date" data-calendar-date={date} tabIndex={tabStop === date ? 0 : -1} aria-label={info?.label ? fillLabel(labels.dayName, { date: dateText(date, 'day'), label: info.label }) : dateText(date, 'day')}
            onFocus={() => setActiveDay(date)} onKeyDown={(event) => onHeadKeyDown(event, date)} onClick={onSelectDate ? () => onSelectDate(date) : undefined}>{dateText(date, 'column')}</button>
          {info && <span className="uix-scheduling-calendar__count" aria-hidden="true">{info.count}</span>}
          {info?.markers && info.markers.length > 0 && <span className="uix-scheduling-calendar__markers">{info.markers.map((marker) => <span key={marker.id}>{renderMarker(marker, true)}</span>)}</span>}
          {more > 0 && (onShowMore
            ? <button type="button" tabIndex={-1} className="uix-scheduling-calendar__more" aria-label={moreName} onClick={() => onShowMore(date, hiddenIds.map((id) => entryById.get(id)!).filter(Boolean))}>{moreText}</button>
            : <span className="uix-scheduling-calendar__more"><span aria-hidden="true">{moreText}</span><span className="uix-visually-hidden">{moreName}</span></span>)}
        </div>;
      })}
    </div>

    {(windowLanes > 0 || moreWindows > 0) && <div className="uix-scheduling-calendar__tg-strip" role="group" aria-label={labels.windows} style={vars({ '--uix-scheduling-calendar-lanes': Math.max(windowLanes, 1) })}>
      {strip.placed.map((placed) => {
        const overlay = overlayById.get(placed.id);
        if (!overlay) return null;
        return <button key={placed.id} type="button" tabIndex={-1} className="uix-scheduling-calendar__window" data-overlay-id={overlay.id} data-pattern={overlay.pattern ?? 'solid'} data-global={overlay.global || undefined} data-kind={overlay.kind}
          data-continues-before={placed.continuesBefore || undefined} data-continues-after={placed.continuesAfter || undefined}
          style={{ gridColumn: gridColumns(placed), ...vars({ '--uix-scheduling-calendar-lane': placed.lane }) }} onClick={() => onSelectOverlay?.(overlay)} aria-label={overlayName(overlay)}>
          <span className="uix-scheduling-calendar__window-text">
            {overlay.kindLabel && <span className="uix-scheduling-calendar__window-kind">{overlay.kindLabel}</span>}
            <span className="uix-scheduling-calendar__window-name">{overlay.label}</span>
            {overlay.scopeLabel && <span className="uix-scheduling-calendar__window-scope">{overlay.scopeLabel}</span>}
          </span>
        </button>;
      })}
      {moreWindows > 0 && (onShowMore
        ? <button type="button" tabIndex={-1} className="uix-scheduling-calendar__rowmore" data-more-date={firstHiddenWindowDay} aria-label={fillLabel(labels.moreWindowsLabel, { count: moreWindows, date: dateText(firstHiddenWindowDay, 'day') })} onClick={() => onShowMore(firstHiddenWindowDay, [])}>{fillLabel(labels.moreWindows, { count: moreWindows })}</button>
        : <span className="uix-scheduling-calendar__rowmore">{fillLabel(labels.moreWindows, { count: moreWindows })}</span>)}
    </div>}

    {(topLanes > 0 || ghostSpan) && <div className="uix-scheduling-calendar__tg-strip uix-scheduling-calendar__tg-top" role="group" aria-label={labels.topLane} style={vars({ '--uix-scheduling-calendar-lanes': Math.max(topLanes, 1) })}>
      {top.placed.map((placed) => {
        const entry = entryById.get(placed.id);
        if (!entry) return null;
        const canDrag = movable(entry);
        const markers = entryMarkers(entry);
        return <button key={placed.id} type="button" tabIndex={-1} className="uix-scheduling-calendar__entry uix-scheduling-calendar__tg-span" data-item-id={entry.id}
          data-highlight={entry.emphasis === 'highlight' || undefined} data-dim={entry.emphasis === 'dim' || undefined} data-band={entry.band ?? 'none'} data-status={entryStatus(entry)} data-state={entry.state}
          data-movable={canDrag || undefined} data-continues-before={placed.continuesBefore || undefined} data-continues-after={placed.continuesAfter || undefined}
          style={{ gridColumn: gridColumns(placed), ...vars({ '--uix-scheduling-calendar-lane': placed.lane }) }}
          aria-label={entryName(entry)} aria-describedby={canDrag ? hintId : undefined}
          onClick={() => handlers.click(entry)}
          onKeyDown={canDrag ? (event) => handlers.keyDown(event, entry) : undefined}
          onBlur={canDrag ? () => handlers.blur(entry) : undefined}
          onPointerDown={canDrag ? (event) => handlers.pointerDown(event, entry, placed.startCol, true) : undefined}>
          <span className="uix-scheduling-calendar__entry-text">{renderEntry?.(entry, { availableLines: 1 }) ?? <>{!placed.continuesBefore && !entry.allDay && <><span className="uix-scheduling-calendar__time">{zonedTimeOfDay(entry.start, timeZone)}</span>{' '}</>}<span className="uix-scheduling-calendar__title">{entry.title}</span></>}</span>
          {markers.length > 0 && <span className="uix-scheduling-calendar__markers">{markers.map((marker) => <span key={marker.id}>{renderMarker(marker)}</span>)}</span>}
        </button>;
      })}
      {ghostSpan && <div className="uix-scheduling-calendar__tg-ghost" aria-hidden="true" data-sent={ghost?.source === 'sent' || undefined} style={{ gridColumn: gridColumns(ghostSpan), ...vars({ '--uix-scheduling-calendar-lane': ghostLane }) }} />}
    </div>}

    <div className="uix-scheduling-calendar__tg-body">
      <div className="uix-scheduling-calendar__tg-gutter" aria-hidden="true">{hourLabels(gutterIndex, false)}</div>
      {shades.map((placed) => {
        const overlay = overlayById.get(placed.id)!;
        const first = columns[placed.startCol]!;
        const last = columns[placed.endCol]!;
        // One element per window: a polygon that starts part-way down its first day and ends
        // part-way down its last. The element is as tall as the longest day on screen, so the
        // edges are fractions of that height, not of the day they fall on.
        const from = placed.continuesBefore ? 0 : Math.max(0, (new Date(overlay.start).getTime() - first.dayStart) / HOUR_MS) / maxHours;
        const to = (placed.continuesAfter ? last.dayHours : Math.min(last.dayHours, (new Date(overlay.end).getTime() - last.dayStart) / HOUR_MS)) / maxHours;
        const width = 100 / (placed.endCol - placed.startCol + 1);
        const percent = (value: number) => `${Math.round(value * 10000) / 100}%`;
        const clipPath = placed.startCol === placed.endCol
          ? `polygon(0 ${percent(from)}, 100% ${percent(from)}, 100% ${percent(to)}, 0 ${percent(to)})`
          : `polygon(0 ${percent(from)}, ${width}% ${percent(from)}, ${width}% 0, 100% 0, 100% ${percent(to)}, ${100 - width}% ${percent(to)}, ${100 - width}% 100%, 0 100%)`;
        return <div key={`shade-${placed.id}`} className="uix-scheduling-calendar__tg-shade" aria-hidden="true" data-pattern={overlay.pattern ?? 'solid'} style={{ gridColumn: gridColumns(placed), clipPath }} />;
      })}
      {columns.map((column, index) => <div key={column.date} className="uix-scheduling-calendar__tg-column" data-tg-column={column.date} style={{ gridColumn: `${index + 2}`, ...vars({ '--uix-scheduling-calendar-hours': column.dayHours }) }}>
        {slotSignature(slots[index]!) !== gutterSignature && hourLabels(index, true)}
        {column.segments.map((segment) => {
          const entry = entryById.get(segment.id)!;
          // A continuation in the first column has its start part on a day that is not on screen: it stands for the whole item.
          const alone = segment.part === 'continuation' && index === 0;
          return <GridItem key={`${segment.id}-${segment.part}`} entry={entry} segment={segment} column={index} alone={alone} name={entryName(entry)} status={entryStatus(entry)} movable={movable(entry)}
            hintId={hintId} timeZone={timeZone} continuesFrom={fillLabel(labels.continuesFrom, { time: zonedTimeOfDay(entry.start, timeZone) })} markers={entryMarkers(entry)}
            renderEntry={renderEntry} renderMarker={renderMarker} handlers={handlers} />;
        })}
        {ghostParts?.[index]!.map((segment) => <div key={`ghost-${segment.part}`} className="uix-scheduling-calendar__tg-ghost" aria-hidden="true" data-sent={ghost?.source === 'sent' || undefined}
          style={vars({ '--uix-scheduling-calendar-offset': segment.offsetHours, '--uix-scheduling-calendar-length': segment.lengthHours })} />)}
        {index === nowColumn && nowAt !== null && <div className="uix-scheduling-calendar__tg-now" aria-hidden="true" style={vars({ '--uix-scheduling-calendar-offset': (nowAt - column.dayStart) / HOUR_MS })} />}
      </div>)}
    </div>

    {emptyNote != null && emptyNote !== false && nothingToShow && <div className="uix-scheduling-calendar__empty">{emptyNote}</div>}
    {moving && <p id={hintId} className="uix-visually-hidden">{labels.moveHint}</p>}
    <span className="uix-scheduling-calendar__tg-probe" aria-hidden="true">00:00 abcdef</span>
    <div className="uix-visually-hidden" aria-live="polite">{announcement}</div>
  </div>;
}
