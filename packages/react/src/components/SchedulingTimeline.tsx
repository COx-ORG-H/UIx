"use client";

import { useId, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent, ReactNode } from 'react';
import { cx } from '../cx.js';
import { fillLabel } from '../fill-label.js';
import { useUixLabels } from '../labels-context.js';
import { defaultTimelineStep, layoutLane, pixelsToMs, placeSpan, shiftSpan, timelineTicks } from '../scheduling-timeline-model.js';
import type { PlacedSpan, TimelineRange, TimelineScale } from '../scheduling-timeline-model.js';
import type { SchedulingEntryState } from './SchedulingCalendar.js';

export interface SchedulingTimelineLane {
  id: string;
  label: ReactNode;
  /** A quieter second line under the lane name (an owner, a count). */
  meta?: ReactNode;
}

export interface SchedulingTimelineItem {
  id: string;
  laneId: string;
  title: string;
  /** ISO 8601 instants. */
  start: string;
  end: string;
  state?: SchedulingEntryState;
  meta?: string;
  /** `false` keeps this bar fixed even when `onMoveItem` is set. */
  movable?: boolean;
}

export type SchedulingTimelineOverlayKind = 'freeze' | 'maintenance' | 'blackout';

export interface SchedulingTimelineOverlay {
  id: string;
  label: string;
  start: string;
  end: string;
  kind: SchedulingTimelineOverlayKind;
  /** Only this lane; every lane when unset. */
  laneId?: string;
}

export interface SchedulingTimelineMarker {
  id: string;
  label: string;
  /** ISO 8601 instant. */
  at: string;
  laneId?: string;
}

export interface SchedulingTimelineLabels {
  region: string;
  lanes: string;
  /** `{title}`, `{state}`, `{start}`, `{end}`, `{conflict}`. */
  item: string;
  conflict: string;
  moveHint: string;
  /** Announced after a move. `{title}`, `{start}`, `{end}`. */
  moved: string;
  /** Announced after a resize. `{title}`, `{end}`. */
  resized: string;
  loading: string;
  retry: string;
  empty: string;
  /** Heading of the screen-reader list of windows and markers. */
  windows: string;
  now: string;
  states: Record<SchedulingEntryState, string>;
  overlays: Record<SchedulingTimelineOverlayKind, string>;
}

export const DEFAULT_SCHEDULING_TIMELINE_LABELS: SchedulingTimelineLabels = {
  region: 'Schedule timeline in {timeZone}',
  lanes: 'Lanes',
  item: '{title}, {state}, {start} to {end}{conflict}',
  conflict: ', overlaps another entry',
  moveHint: 'Shift and an arrow key moves it; Alt, Shift and an arrow key changes when it ends.',
  moved: 'Moved {title} to {start} – {end}',
  resized: '{title} now ends {end}',
  loading: 'Loading schedule…',
  retry: 'Try again',
  empty: 'Nothing is scheduled in this range.',
  windows: 'Windows and markers in this range',
  now: 'Now',
  states: { scheduled: 'Scheduled', conflicted: 'Conflicted', 'in-progress': 'In progress', 'blackout-violation': 'Blackout violation' },
  overlays: { freeze: 'Change freeze', maintenance: 'Maintenance window', blackout: 'Blackout' },
};

export interface SchedulingTimelineProps {
  lanes: SchedulingTimelineLane[];
  items: SchedulingTimelineItem[];
  /** The visible window (ISO 8601 instants). */
  range: TimelineRange;
  /** Tick unit of the axis. Default `day`. */
  scale?: TimelineScale;
  /** IANA zone for tick boundaries and every printed time. */
  timeZone: string;
  locale?: string;
  overlays?: SchedulingTimelineOverlay[];
  markers?: SchedulingTimelineMarker[];
  /** Draws a "now" line at this instant (pass the current time; the component keeps no clock). */
  now?: string;
  /** First day of a week tick (0 = Sunday). Default 1. */
  weekStartsOn?: number;
  /** Width of one tick, as a CSS length. Defaults: hour 3.5rem, day 7rem, week 6rem, month 8rem. */
  tickWidth?: string;
  /** Move/resize granularity in ms. Defaults: 15 min (hour), 1 h (day), 1 day (week, month). */
  step?: number;
  /** Tick label. Default: `Intl` in `locale` and `timeZone`. */
  formatTick?: (at: Date, scale: TimelineScale) => string;
  /** Start/end text in names and announcements. Default: `Intl` medium date + short time in `timeZone`. */
  formatInstant?: (instant: string) => string;
  /** Bar content. Default: the title. */
  renderItem?: (item: SchedulingTimelineItem) => ReactNode;
  onSelectItem?: (item: SchedulingTimelineItem) => void;
  /** Makes bars draggable and keyboard-movable. Receives the snapped new start and end. */
  onMoveItem?: (id: string, next: { start: string; end: string }) => void;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  labels?: Partial<SchedulingTimelineLabels>;
  className?: string;
}

const TICK_WIDTH: Record<TimelineScale, string> = { hour: '3.5rem', day: '7rem', week: '6rem', month: '8rem' };
const TICK_FORMAT: Record<TimelineScale, Intl.DateTimeFormatOptions> = {
  hour: { hour: '2-digit', minute: '2-digit' },
  day: { weekday: 'short', day: 'numeric' },
  week: { day: 'numeric', month: 'short' },
  month: { month: 'short', year: 'numeric' },
};

interface Drag { id: string; x: number; width: number; delta: number; moved: boolean }

/**
 * Lanes of bars on a time axis (HAR-1364; TENSOR C8): change schedules, rollout Gantt rows,
 * renewal markers. Overlapping bars in a lane stack and are hatched; freeze, maintenance and
 * blackout windows are bands; with `onMoveItem`, bars move by drag or Shift+arrows and their
 * end changes with Alt+Shift+arrows, snapped to `step`.
 */
export function SchedulingTimeline({
  lanes, items, range, scale = 'day', timeZone, locale, overlays = [], markers = [], now, weekStartsOn = 1,
  tickWidth, step: stepProp, formatTick, formatInstant: formatInstantProp, renderItem, onSelectItem, onMoveItem,
  loading, error, onRetry, labels: labelOverrides, className,
}: SchedulingTimelineProps) {
  const uixLabels = useUixLabels();
  const labels: SchedulingTimelineLabels = {
    ...DEFAULT_SCHEDULING_TIMELINE_LABELS,
    ...uixLabels.schedulingTimeline,
    ...labelOverrides,
    states: { ...DEFAULT_SCHEDULING_TIMELINE_LABELS.states, ...uixLabels.schedulingTimeline?.states, ...labelOverrides?.states },
    overlays: { ...DEFAULT_SCHEDULING_TIMELINE_LABELS.overlays, ...uixLabels.schedulingTimeline?.overlays, ...labelOverrides?.overlays },
  };
  const id = useId();
  const step = stepProp ?? defaultTimelineStep(scale);
  const ticks = useMemo(() => timelineTicks(range, scale, timeZone, weekStartsOn), [range.start, range.end, scale, timeZone, weekStartsOn]); // eslint-disable-line react-hooks/exhaustive-deps
  const laneLayouts = useMemo(
    () => lanes.map((lane) => ({ lane, placed: layoutLane(items.filter((item) => item.laneId === lane.id), range) })),
    [lanes, items, range.start, range.end], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const ordered = useMemo(() => laneLayouts.flatMap((l) => l.placed.map((p) => p.item.id)), [laneLayouts]);
  const [activeId, setActiveId] = useState<string | undefined>();
  const focusId = activeId && ordered.includes(activeId) ? activeId : ordered[0];
  const [drag, setDrag] = useState<Drag | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const rootRef = useRef<HTMLElement>(null);

  const fmtInstant = (instant: string) => formatInstantProp?.(instant)
    ?? new Intl.DateTimeFormat(locale, { timeZone, dateStyle: 'medium', timeStyle: 'short' }).format(new Date(instant));
  const fmtTick = (at: number) => formatTick?.(new Date(at), scale) ?? new Intl.DateTimeFormat(locale, { timeZone, ...TICK_FORMAT[scale] }).format(new Date(at));
  const movable = (item: SchedulingTimelineItem) => !!onMoveItem && item.movable !== false;

  const focusItem = (itemId: string | undefined) => {
    if (!itemId) return;
    setActiveId(itemId);
    requestAnimationFrame(() => rootRef.current?.querySelector<HTMLElement>(`[data-timeline-item="${CSS.escape(itemId)}"]`)?.focus());
  };

  const commit = (item: SchedulingTimelineItem, delta: number, mode: 'move' | 'resize') => {
    if (!onMoveItem || delta === 0) return;
    const next = shiftSpan(item, delta, mode, step);
    onMoveItem(item.id, next);
    setAnnouncement(mode === 'move'
      ? fillLabel(labels.moved, { title: item.title, start: fmtInstant(next.start), end: fmtInstant(next.end) })
      : fillLabel(labels.resized, { title: item.title, end: fmtInstant(next.end) }));
  };

  const onItemKeyDown = (event: KeyboardEvent<HTMLButtonElement>, laneIndex: number, placed: PlacedSpan<SchedulingTimelineItem>[], index: number) => {
    const item = placed[index]!.item;
    const horizontal = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0;
    if (horizontal && event.shiftKey && movable(item)) {
      event.preventDefault();
      commit(item, horizontal * step, event.altKey ? 'resize' : 'move');
      return;
    }
    if (horizontal) { event.preventDefault(); focusItem(placed[index + horizontal]?.item.id); return; }
    if (event.key === 'Home' || event.key === 'End') { event.preventDefault(); focusItem((event.key === 'Home' ? placed[0] : placed[placed.length - 1])?.item.id); return; }
    const vertical = event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0;
    if (vertical) {
      event.preventDefault();
      const start = Date.parse(item.start);
      for (let l = laneIndex + vertical; l >= 0 && l < laneLayouts.length; l += vertical) {
        const candidates = laneLayouts[l]!.placed;
        if (candidates.length === 0) continue;
        const nearest = candidates.reduce((best, p) => (Math.abs(Date.parse(p.item.start) - start) < Math.abs(Date.parse(best.item.start) - start) ? p : best));
        focusItem(nearest.item.id);
        return;
      }
    }
  };

  const onPointerDown = (event: PointerEvent<HTMLButtonElement>, item: SchedulingTimelineItem) => {
    if (!movable(item) || event.button !== 0) return;
    const track = (event.currentTarget.closest('.uix-scheduling-timeline__track') as HTMLElement | null);
    if (!track) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setDrag({ id: item.id, x: event.clientX, width: track.getBoundingClientRect().width, delta: 0, moved: false });
  };
  const onPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    if (!drag) return;
    const dx = event.clientX - drag.x;
    const delta = pixelsToMs(dx, drag.width, range, step);
    if (delta !== drag.delta || (!drag.moved && Math.abs(dx) > 3)) setDrag({ ...drag, delta, moved: drag.moved || Math.abs(dx) > 3 });
  };
  const onPointerUp = (item: SchedulingTimelineItem) => {
    if (!drag || drag.id !== item.id) return;
    if (drag.moved) commit(item, drag.delta, 'move');
    // keep `moved` for the click that follows pointerup, then clear
    setDrag(drag.moved ? { ...drag, delta: 0 } : null);
    if (drag.moved) window.setTimeout(() => setDrag(null), 0);
  };

  const nowPos = now ? placeSpan({ start: now, end: now }, range) : null;
  const overlaysFor = (laneId: string) => overlays.filter((o) => !o.laneId || o.laneId === laneId);
  const markersFor = (laneId: string) => markers.filter((m) => !m.laneId || m.laneId === laneId);
  const trackStyle = { minWidth: `calc(${Math.max(ticks.length - 1, 1)} * ${tickWidth ?? TICK_WIDTH[scale]})` } as CSSProperties;

  const band = (o: SchedulingTimelineOverlay, showLabel: boolean) => {
    const pos = placeSpan(o, range);
    return pos && (
      <span key={o.id} className="uix-scheduling-timeline__overlay" data-kind={o.kind} style={{ left: `${pos.left}%`, width: `${pos.width}%` }}>
        {showLabel && <span className="uix-scheduling-timeline__overlay-label">{o.label}</span>}
      </span>
    );
  };

  return (
    <section ref={rootRef} className={cx('uix-scheduling-timeline', className)} aria-label={fillLabel(labels.region, { timeZone })}>
      {loading ? <div className="uix-scheduling-timeline__state" role="status">{labels.loading}</div>
        : error ? <div className="uix-scheduling-timeline__state" role="alert"><p>{error}</p>{onRetry && <button type="button" className="uix-btn uix-btn--secondary" onClick={onRetry}>{labels.retry}</button>}</div>
        : <>
          {(overlays.length > 0 || markers.length > 0) && (
            <div className="uix-visually-hidden">
              <p id={`${id}-windows`}>{labels.windows}</p>
              <ul aria-labelledby={`${id}-windows`}>
                {overlays.map((o) => <li key={o.id}>{labels.overlays[o.kind]}: {o.label}, {fmtInstant(o.start)} – {fmtInstant(o.end)}</li>)}
                {markers.map((m) => <li key={m.id}>{m.label}, {fmtInstant(m.at)}</li>)}
              </ul>
            </div>
          )}
          <div className="uix-scheduling-timeline__scroller">
            <div className="uix-scheduling-timeline__grid">
              <div className="uix-scheduling-timeline__row uix-scheduling-timeline__row--axis" aria-hidden="true">
                <div className="uix-scheduling-timeline__lane-label">{labels.lanes}</div>
                <div className="uix-scheduling-timeline__track uix-scheduling-timeline__axis" style={trackStyle}>
                  {ticks.map((tick) => (
                    <span key={tick.at} className="uix-scheduling-timeline__tick" data-major={tick.major || undefined} style={{ left: `${tick.offset}%` }}>
                      {tick.offset < 100 && <span className="uix-scheduling-timeline__tick-label">{fmtTick(tick.at)}</span>}
                    </span>
                  ))}
                </div>
              </div>
              {laneLayouts.map(({ lane, placed }, laneIndex) => {
                const rows = placed.reduce((max, p) => Math.max(max, p.row + 1), 1);
                const laneLabelId = `${id}-lane-${laneIndex}`;
                return (
                  <div key={lane.id} className="uix-scheduling-timeline__row" style={{ '--uix-timeline-rows': rows } as CSSProperties}>
                    <div className="uix-scheduling-timeline__lane-label" id={laneLabelId}>
                      <span className="uix-scheduling-timeline__lane-name">{lane.label}</span>
                      {lane.meta != null && <span className="uix-scheduling-timeline__lane-meta">{lane.meta}</span>}
                    </div>
                    <div className="uix-scheduling-timeline__track" style={trackStyle}>
                      {ticks.map((tick) => <span key={tick.at} className="uix-scheduling-timeline__gridline" data-major={tick.major || undefined} style={{ left: `${tick.offset}%` }} aria-hidden="true" />)}
                      <span aria-hidden="true">{overlaysFor(lane.id).map((o) => band(o, laneIndex === 0 || !!o.laneId))}</span>
                      {nowPos && <span className="uix-scheduling-timeline__now" style={{ left: `${nowPos.left}%` }} aria-hidden="true">{laneIndex === 0 && <span className="uix-scheduling-timeline__now-label">{labels.now}</span>}</span>}
                      {markersFor(lane.id).map((m) => {
                        const pos = placeSpan({ start: m.at, end: m.at }, range);
                        return pos && <span key={m.id} className="uix-scheduling-timeline__marker" style={{ left: `${pos.left}%` }} title={m.label} aria-hidden="true" />;
                      })}
                      <ul className="uix-scheduling-timeline__items" aria-labelledby={laneLabelId}>
                        {placed.map((p, index) => {
                          const item = p.item;
                          const state = item.state ?? 'scheduled';
                          const dragging = drag?.id === item.id && drag.moved;
                          const shown = dragging && drag ? placeSpan(shiftSpan(item, drag.delta, 'move', step), range) ?? p : p;
                          return (
                            <li key={item.id} className="uix-scheduling-timeline__slot" style={{ left: `${shown.left}%`, width: `${shown.width}%`, '--uix-timeline-row': p.row } as CSSProperties}>
                              <button
                                type="button"
                                className="uix-scheduling-timeline__item"
                                data-timeline-item={item.id}
                                title={item.title}
                                data-state={state}
                                data-conflict={p.conflict || undefined}
                                data-clipped-start={p.clippedStart || undefined}
                                data-clipped-end={p.clippedEnd || undefined}
                                data-movable={movable(item) || undefined}
                                data-dragging={dragging || undefined}
                                tabIndex={focusId === item.id ? 0 : -1}
                                aria-label={fillLabel(labels.item, { title: item.title, state: labels.states[state], start: fmtInstant(item.start), end: fmtInstant(item.end), conflict: p.conflict ? labels.conflict : '' })}
                                aria-describedby={movable(item) ? `${id}-hint` : undefined}
                                onFocus={() => setActiveId(item.id)}
                                onKeyDown={(event) => onItemKeyDown(event, laneIndex, placed, index)}
                                onPointerDown={(event) => onPointerDown(event, item)}
                                onPointerMove={onPointerMove}
                                onPointerUp={() => onPointerUp(item)}
                                onPointerCancel={() => setDrag(null)}
                                onClick={() => { if (drag?.moved) return; onSelectItem?.(item); }}
                              >
                                <span className="uix-scheduling-timeline__item-title">{renderItem?.(item) ?? item.title}</span>
                                {item.meta && <span className="uix-scheduling-timeline__item-meta">{item.meta}</span>}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          {ordered.length === 0 && <p className="uix-scheduling-timeline__empty">{labels.empty}</p>}
        </>}
      {onMoveItem && <span id={`${id}-hint`} className="uix-visually-hidden">{labels.moveHint}</span>}
      <span className="uix-visually-hidden" role="status" aria-live="polite">{announcement}</span>
    </section>
  );
}
