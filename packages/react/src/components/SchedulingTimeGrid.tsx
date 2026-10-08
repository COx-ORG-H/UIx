"use client";

/* The Week/Day time grid of SchedulingCalendar (HAR-1509, U3). Internal: it is rendered by
 * SchedulingCalendar and not exported. Geometry comes from real instants (a day column is as
 * long as its day), so no day length is written down here. Every move is a proposal handed to
 * the consumer: this file never applies, refuses or cancels one. */
import { memo, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent, ReactNode } from 'react';
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

export interface TimeGridEntryContext {
  /** Whole text lines that fit in the item: 0 shows the markers only. */
  availableLines: number;
}

interface MoveDelta { days: number; minutes: number }
interface Ghost { id: string; delta: MoveDelta; source: 'keys' | 'pointer' | 'sent' }

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

interface GridItemProps {
  entry: SchedulingCalendarEntry;
  segment: TimeGridSegment;
  column: number;
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

/** One item part in a day column. The start part (or the whole item) is the button; a continuation is decoration. */
const GridItem = memo(function GridItem({ entry, segment, column, name, status, movable, hintId, timeZone, continuesFrom, markers, renderEntry, renderMarker, handlers }: GridItemProps) {
  const lines = linesFor(segment);
  const continuation = segment.part === 'continuation';
  const style = vars({
    '--uix-scheduling-calendar-offset': segment.offsetHours,
    '--uix-scheduling-calendar-length': segment.lengthHours,
    '--uix-scheduling-calendar-lane': segment.lane,
    '--uix-scheduling-calendar-lanes': segment.laneCount,
  });
  const text = renderEntry?.(entry, { availableLines: lines })
    ?? (lines > 0 ? <><span className="uix-scheduling-calendar__time">{zonedTimeOfDay(entry.start, timeZone)}</span>{' '}<span className="uix-scheduling-calendar__title">{entry.title}</span></> : null);
  const body = <>
    {continuation && lines > 0 && <span className="uix-scheduling-calendar__tg-from">{continuesFrom}</span>}
    {!continuation && text != null && text !== false && <span className="uix-scheduling-calendar__entry-text">{text}</span>}
    {markers.length > 0 && <span className="uix-scheduling-calendar__markers">{markers.map((marker) => <span key={marker.id}>{renderMarker(marker)}</span>)}</span>}
  </>;
  const shared = {
    className: 'uix-scheduling-calendar__entry uix-scheduling-calendar__tg-item',
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
  // The continuation repeats nothing to assistive technology: the start part carries the whole name.
  if (continuation) return <div {...shared} data-continuation-of={entry.id} aria-hidden="true">{body}</div>;
  return <button
    type="button"
    {...shared}
    data-item-id={entry.id}
    aria-label={name}
    aria-describedby={movable ? hintId : undefined}
    onKeyDown={movable ? (event) => handlers.keyDown(event, entry) : undefined}
    onBlur={movable ? () => handlers.blur(entry) : undefined}
  >{body}</button>;
}, (previous, next) => previous.entry === next.entry && previous.column === next.column && previous.name === next.name && previous.status === next.status
  && previous.movable === next.movable && previous.hintId === next.hintId && previous.timeZone === next.timeZone && previous.continuesFrom === next.continuesFrom
  && previous.renderEntry === next.renderEntry && previous.segment.part === next.segment.part && previous.segment.offsetHours === next.segment.offsetHours
  && previous.segment.lengthHours === next.segment.lengthHours && previous.segment.lane === next.segment.lane && previous.segment.laneCount === next.segment.laneCount);

/** Week (seven columns) or Day (one column) with an hour axis. */
export function SchedulingTimeGrid({
  view, days, timeZone, entries, overlays, dayInfo, labels, gridLabel, dateText, formatInstant, entryName, entryStatus, entryMarkers, overlayName,
  renderEntry, renderMarker, onSelectEntry, onSelectOverlay, onSelectDate, onShowMore, now, canMove, step, onProposeMove,
  topLaneCrossMidnightMinutes, topLaneCap, windowLaneCap, maxLanes, emptyNote, nothingToShow,
}: SchedulingTimeGridProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const hintId = useId();
  const [widthCap, setWidthCap] = useState(Infinity);
  const [ghost, setGhost] = useState<Ghost | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const moving = canMove && onProposeMove !== undefined;
  const laneOptions = useMemo(() => ({ crossMidnightMinutes: topLaneCrossMidnightMinutes }), [topLaneCrossMidnightMinutes]);

  // Fewer lanes when a lane would be narrower than an item showing "HH:MM" and six title characters (the probe).
  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof ResizeObserver === 'undefined') return undefined;
    const column = root.querySelector<HTMLElement>('[data-tg-column]');
    const probe = root.querySelector<HTMLElement>('.uix-scheduling-calendar__tg-probe');
    if (!column || !probe) return undefined;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const lane = probe.getBoundingClientRect().width;
      const width = column.getBoundingClientRect().width;
      setWidthCap(lane > 0 && width > 0 ? Math.max(1, Math.floor(width / lane)) : Infinity);
    };
    const observer = new ResizeObserver(() => { if (!frame) frame = requestAnimationFrame(measure); });
    observer.observe(column);
    measure();
    return () => { observer.disconnect(); if (frame) cancelAnimationFrame(frame); };
  }, [days.length]);

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

  // What the user sees of a pending move: the proposal, computed from the original window.
  const ghostEntry = ghost ? entryById.get(ghost.id) : undefined;
  const ghostProposal = ghostEntry && ghost ? proposeMove(ghostEntry, ghost.delta, timeZone) : null;
  const ghostTop = ghostEntry ? placesInTopLane(ghostEntry, timeZone, laneOptions) : false;

  // Handlers read the latest props through a ref, so the item elements keep stable callbacks.
  const live = useRef({ ghost, entryById, timeZone, step, onProposeMove, onSelectEntry, labels, formatInstant, days, columns });
  live.current = { ghost, entryById, timeZone, step, onProposeMove, onSelectEntry, labels, formatInstant, days, columns };
  const dragRef = useRef<{ id: string; pointerId: number; x: number; y: number; column: number; top: boolean; moved: boolean; rects: DOMRect[]; hourPx: number; delta: MoveDelta; stop: () => void } | null>(null);
  const suppressClick = useRef(false);

  const send = useCallback((id: string, delta: MoveDelta) => {
    const state = live.current;
    const entry = state.entryById.get(id);
    if (!entry || !state.onProposeMove || (delta.days === 0 && delta.minutes === 0)) { setGhost(null); return; }
    const result = state.onProposeMove(id, proposeMove(entry, delta, state.timeZone));
    if (result && typeof (result as Promise<unknown>).then === 'function') {
      // The ghost stays until the consumer answers. The item itself only moves when its props do.
      setGhost({ id, delta, source: 'sent' });
      const clear = () => setGhost((current) => (current && current.id === id && current.source === 'sent' ? null : current));
      (result as Promise<unknown>).then(clear, clear);
    } else setGhost(null);
  }, []);

  const handlers = useMemo<ItemHandlers>(() => ({
    click: (entry) => { live.current.onSelectEntry?.(entry); },
    keyDown: (event, entry) => {
      const state = live.current;
      const pending = state.ghost && state.ghost.id === entry.id && state.ghost.source === 'keys' ? state.ghost.delta : null;
      if (event.key === 'Enter' && pending) { event.preventDefault(); send(entry.id, pending); return; }
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
      setGhost({ id: entry.id, delta: next, source: 'keys' });
      const proposed = fillLabel(state.labels.moveProposed, { start: state.formatInstant(proposal.start), end: state.formatInstant(proposal.end) });
      setAnnouncement(proposal.adjusted ? `${fillLabel(state.labels.gapForward, { time: zonedTimeOfDay(proposal.start, state.timeZone) })} ${proposed}` : proposed);
    },
    blur: (entry) => { setGhost((current) => (current && current.id === entry.id && current.source === 'keys' ? null : current)); },
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
      const onMove = (move: PointerEvent) => {
        const drag = dragRef.current;
        if (!drag || move.pointerId !== drag.pointerId) return;
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
        if (delta.days !== drag.delta.days || delta.minutes !== drag.delta.minutes) { drag.delta = delta; setGhost({ id: drag.id, delta, source: 'pointer' }); }
      };
      const finish = (commit: boolean) => {
        const drag = dragRef.current;
        if (!drag) return;
        drag.stop();
        dragRef.current = null;
        if (!drag.moved) return;
        // The click that follows a drag is not an activation.
        suppressClick.current = true;
        setTimeout(() => { suppressClick.current = false; }, 0);
        if (commit) send(drag.id, drag.delta); else setGhost(null);
      };
      const onUp = (up: PointerEvent) => { if (up.pointerId === dragRef.current?.pointerId) finish(true); };
      const onCancel = (cancel: PointerEvent) => { if (cancel.pointerId === dragRef.current?.pointerId) finish(false); };
      const onKey = (key: KeyboardEvent) => { if (key.key === 'Escape' && dragRef.current?.moved) { key.preventDefault(); key.stopPropagation(); finish(false); } };
      // The pointer is followed on the window: the dragged element may re-render under it.
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onCancel);
      window.addEventListener('keydown', onKey, true);
      dragRef.current = {
        id: entry.id, pointerId: event.pointerId, x: event.clientX, y: event.clientY, column: from, top, moved: false, rects,
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

  const movable = (entry: SchedulingCalendarEntry) => moving && entry.movable !== false;
  const gridColumns = (span: { startCol: number; endCol: number }) => `${span.startCol + 2} / ${span.endCol + 3}`;
  const nowAt = now === undefined ? null : new Date(now).getTime();
  const nowColumn = nowAt === null || Number.isNaN(nowAt) ? -1 : days.indexOf(zonedDateKey(new Date(nowAt), timeZone));
  const topHiddenOn = (date: string) => top.hidden.filter((id) => { const entry = entryById.get(id); return entry ? layoutDaySpans([entry], [date], { timeZone }).placed.length > 0 : false; });
  const windowLanes = lanesIn(strip.placed);
  const topLanes = lanesIn(top.placed);
  const moreWindows = strip.hidden.length;
  const firstHiddenWindowDay = strip.firstHiddenDay ?? days[0]!;

  const ghostParts = ghostProposal && !ghostTop
    ? days.map((date) => layoutTimeGridDay([{ id: 'ghost', start: ghostProposal.start, end: ghostProposal.end }], date, timeZone, { crossMidnightMinutes: Infinity }).segments)
    : null;
  const ghostSpan = ghostProposal && ghostTop ? layoutDaySpans([{ id: 'ghost', start: ghostProposal.start, end: ghostProposal.end }], days, { timeZone }).placed[0] : undefined;
  const ghostLane = ghost ? top.placed.find((span) => span.id === ghost.id)?.lane ?? 0 : 0;

  return <div
    ref={rootRef}
    className="uix-scheduling-calendar__timegrid"
    data-view={view}
    role="group"
    aria-label={gridLabel}
    style={vars({ '--uix-scheduling-calendar-days': days.length, '--uix-scheduling-calendar-hours': maxHours })}
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
        return <div key={date} className="uix-scheduling-calendar__tg-dayhead" role="group" aria-label={info?.label ?? dateText(date, 'day')} data-date={date}>
          <button type="button" className="uix-scheduling-calendar__date" data-calendar-date={date} aria-label={dateText(date, 'day')} onClick={onSelectDate ? () => onSelectDate(date) : undefined}>{dateText(date, 'column')}</button>
          {info && <span className="uix-scheduling-calendar__count" aria-hidden="true">{info.count}</span>}
          {info?.markers && info.markers.length > 0 && <span className="uix-scheduling-calendar__markers">{info.markers.map((marker) => <span key={marker.id}>{renderMarker(marker, true)}</span>)}</span>}
          {more > 0 && (onShowMore
            ? <button type="button" className="uix-scheduling-calendar__more" aria-label={moreName} onClick={() => onShowMore(date, hiddenIds.map((id) => entryById.get(id)!).filter(Boolean))}>{moreText}</button>
            : <span className="uix-scheduling-calendar__more"><span aria-hidden="true">{moreText}</span><span className="uix-visually-hidden">{moreName}</span></span>)}
        </div>;
      })}
    </div>

    {(windowLanes > 0 || moreWindows > 0) && <div className="uix-scheduling-calendar__tg-strip" role="group" aria-label={labels.windows} style={vars({ '--uix-scheduling-calendar-lanes': Math.max(windowLanes, 1) })}>
      {strip.placed.map((placed) => {
        const overlay = overlayById.get(placed.id);
        if (!overlay) return null;
        return <button key={placed.id} type="button" className="uix-scheduling-calendar__window" data-overlay-id={overlay.id} data-pattern={overlay.pattern ?? 'solid'} data-global={overlay.global || undefined} data-kind={overlay.kind}
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
        ? <button type="button" className="uix-scheduling-calendar__rowmore" aria-label={fillLabel(labels.moreWindowsLabel, { count: moreWindows, date: dateText(firstHiddenWindowDay, 'day') })} onClick={() => onShowMore(firstHiddenWindowDay, [])}>{fillLabel(labels.moreWindows, { count: moreWindows })}</button>
        : <span className="uix-scheduling-calendar__rowmore">{fillLabel(labels.moreWindows, { count: moreWindows })}</span>)}
    </div>}

    {(topLanes > 0 || ghostSpan) && <div className="uix-scheduling-calendar__tg-strip uix-scheduling-calendar__tg-top" role="group" aria-label={labels.topLane} style={vars({ '--uix-scheduling-calendar-lanes': Math.max(topLanes, 1) })}>
      {top.placed.map((placed) => {
        const entry = entryById.get(placed.id);
        if (!entry) return null;
        const canDrag = movable(entry);
        const markers = entryMarkers(entry);
        return <button key={placed.id} type="button" className="uix-scheduling-calendar__entry uix-scheduling-calendar__tg-span" data-item-id={entry.id} data-band={entry.band ?? 'none'} data-status={entryStatus(entry)} data-state={entry.state}
          data-movable={canDrag || undefined} data-continues-before={placed.continuesBefore || undefined} data-continues-after={placed.continuesAfter || undefined}
          style={{ gridColumn: gridColumns(placed), ...vars({ '--uix-scheduling-calendar-lane': placed.lane }) }}
          aria-label={entryName(entry)} aria-describedby={canDrag ? hintId : undefined}
          onClick={() => handlers.click(entry)}
          onKeyDown={canDrag ? (event) => handlers.keyDown(event, entry) : undefined}
          onBlur={canDrag ? () => handlers.blur(entry) : undefined}
          onPointerDown={canDrag ? (event) => handlers.pointerDown(event, entry, Math.max(0, days.indexOf(zonedDateKey(entry.start, timeZone))), true) : undefined}>
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
        // One element per window: a polygon that starts part-way down its first day and ends part-way down its last.
        const from = placed.continuesBefore ? 0 : Math.max(0, (new Date(overlay.start).getTime() - first.dayStart) / HOUR_MS / first.dayHours);
        const to = placed.continuesAfter ? 1 : Math.min(1, (new Date(overlay.end).getTime() - last.dayStart) / HOUR_MS / last.dayHours);
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
          return <GridItem key={`${segment.id}-${segment.part}`} entry={entry} segment={segment} column={index} name={entryName(entry)} status={entryStatus(entry)} movable={movable(entry)}
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
