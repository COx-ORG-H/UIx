"use client";

/* The resource day of SchedulingCalendar (HAR-983; MEDx S10, S13, S48). Internal: rendered by
 * SchedulingCalendar for `view="day"` with `resources`, not exported. One column per resource
 * on a slot axis of real instants in the display zone; a sticky time gutter and a sticky head;
 * below `listBelow` of its own width it becomes a list, one resource after another.
 *
 * Keyboard: the whole view is one tab stop. ArrowUp / ArrowDown move between the slots and
 * bookings of a column, ArrowLeft / ArrowRight to the same time in the next column, Home / End
 * to the first and last of a column; Enter or Space selects (they are buttons). Time off and
 * "no schedule" are not interactive, but they are text, so reading mode finds them. */
import { memo, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react';
import { zonedTimeOfDay } from '../calendar-model.js';
import { fillLabel } from '../fill-label.js';
import { layoutResourceColumn, resourceDayGaps, resourceDaySlots } from '../scheduling-resource-model.js';
import type { ResourceDayItem, ResourceDaySlot, SchedulingAvailabilityKind, SchedulingResource, SchedulingResourceSpan } from '../scheduling-resource-model.js';

/** What `onSelectSlot` receives: the resource, the piece's own start and end, and the span it belongs to. */
export interface SchedulingSlotSelection {
  resourceId: string;
  /** ISO 8601 instants of the piece: one slot of a free span, or the whole booking. */
  start: string;
  end: string;
  kind: Exclude<SchedulingAvailabilityKind, 'off'>;
  span: SchedulingResourceSpan;
}

/** The words of the resource day. Every one is optional in `SchedulingCalendarLabels`. */
export interface SchedulingResourceLabels {
  /** Names the view. `{date}` placeholder. */
  resourceGrid: string;
  /** The words for the kinds, in names and in the list. */
  availability: Record<SchedulingAvailabilityKind, string>;
  /** Time no span covers. */
  noSchedule: string;
  /** A slot's or a booking's accessible name. `{resource}`, `{start}`, `{end}`, `{kind}`, `{label}`. */
  slotName: string;
  /** How to move, read once with the view. */
  resourceHint: string;
  /** When `resources` is empty. */
  noResources: string;
  /** While `loading` and nothing is shown yet. */
  loading: string;
  /** The time-zone corner of the axis. `{timeZone}`. */
  timeZone: string;
}

export interface SchedulingResourceDayProps {
  date: string;
  timeZone: string;
  resources: readonly SchedulingResource[];
  spans: readonly SchedulingResourceSpan[];
  dayStart?: string;
  dayEnd?: string;
  slotMinutes?: number;
  layout: 'auto' | 'columns' | 'list';
  listBelow: number;
  loading?: boolean;
  selected?: { resourceId: string; start: string };
  onSelectSlot?: (slot: SchedulingSlotSelection) => void;
  labels: SchedulingResourceLabels;
  dateText: string;
  headingLevel: 2 | 3 | 4 | 5 | 6;
  emptyNote?: ReactNode;
}

const vars = (values: Record<string, number | string>): CSSProperties => values as CSSProperties;
const iso = (ms: number) => new Date(ms).toISOString();

interface ColumnProps {
  index: number;
  resource: SchedulingResource;
  items: ResourceDayItem[];
  slots: ResourceDaySlot[];
  timeZone: string;
  labels: SchedulingResourceLabels;
  tabStop: string | null;
  selectedKey: string | null;
  skeleton: boolean;
  onSelect: (resource: SchedulingResource, item: ResourceDayItem) => void;
}

const stopKey = (column: number, start: number) => `${column}:${start}`;

function itemName(resource: SchedulingResource, item: ResourceDayItem, timeZone: string, labels: SchedulingResourceLabels) {
  if (item.span.accessibleName && item.kind !== 'free') return item.span.accessibleName;
  const name = fillLabel(labels.slotName, {
    resource: resource.label, start: zonedTimeOfDay(item.start, timeZone), end: zonedTimeOfDay(item.end, timeZone),
    kind: labels.availability[item.kind], label: item.span.label ?? '',
  });
  // An empty `{label}` leaves no dangling comma.
  return name.replace(/,\s*$/, '').replace(/,\s*,/g, ',');
}

/** One resource column of the grid. Memoised: a selection elsewhere does not redraw it. */
const Column = memo(function Column({ index, resource, items, slots, timeZone, labels, tabStop, selectedKey, skeleton, onSelect }: ColumnProps) {
  return <div className="uix-scheduling-calendar__rs-column" role="group" aria-label={resource.label} data-resource-id={resource.id} style={vars({ '--uix-scheduling-calendar-rs-slots': slots.length })}>
    {skeleton && [0.2, 0.45, 0.7].map((at) => <span key={at} className="uix-skeleton uix-scheduling-calendar__rs-skeleton" aria-hidden="true" style={vars({ '--uix-scheduling-calendar-rs-offset': Math.floor(slots.length * at), '--uix-scheduling-calendar-rs-length': 3 })} />)}
    {items.map((item) => {
      const key = stopKey(index, item.start);
      const style = vars({ '--uix-scheduling-calendar-rs-offset': item.offset, '--uix-scheduling-calendar-rs-length': item.length, '--uix-scheduling-calendar-rs-lane': item.lane, '--uix-scheduling-calendar-rs-lanes': item.lanes });
      const common = {
        className: 'uix-scheduling-calendar__rs-item',
        'data-kind': item.kind,
        'data-span-id': item.span.id,
        'data-continues-before': item.continuesBefore || undefined,
        'data-continues-after': item.continuesAfter || undefined,
        style,
      };
      const time = zonedTimeOfDay(item.start, timeZone);
      if (item.kind === 'off') {
        return <div key={item.key} {...common}><span className="uix-scheduling-calendar__rs-text">{item.span.label ?? labels.availability.off}</span><span className="uix-visually-hidden">{itemName(resource, item, timeZone, labels)}</span></div>;
      }
      return <button
        key={item.key}
        type="button"
        {...common}
        tabIndex={tabStop === key ? 0 : -1}
        data-rs-col={index}
        data-rs-start={item.start}
        data-selected={selectedKey === key || undefined}
        aria-current={selectedKey === key ? 'true' : undefined}
        aria-label={itemName(resource, item, timeZone, labels)}
        onClick={() => onSelect(resource, item)}
      >
        {item.kind === 'free'
          ? <span className="uix-scheduling-calendar__rs-text">{time}</span>
          : <span className="uix-scheduling-calendar__rs-text"><span className="uix-scheduling-calendar__time">{time}</span>{' '}<span className="uix-scheduling-calendar__title">{item.span.label ?? labels.availability.booked}</span></span>}
      </button>;
    })}
  </div>;
});

/** The resource day: columns where there is room, a list where there is not. */
export function SchedulingResourceDay({
  date, timeZone, resources, spans, dayStart, dayEnd, slotMinutes, layout, listBelow, loading = false, selected, onSelectSlot, labels, dateText, headingLevel, emptyNote,
}: SchedulingResourceDayProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const hintId = useId();
  const [narrow, setNarrow] = useState(false);
  const slots = useMemo(() => resourceDaySlots(date, timeZone, { dayStart, dayEnd, slotMinutes }), [date, timeZone, dayStart, dayEnd, slotMinutes]);
  const byResource = useMemo(() => {
    const map = new Map<string, SchedulingResourceSpan[]>();
    for (const span of spans) { const list = map.get(span.resourceId); if (list) list.push(span); else map.set(span.resourceId, [span]); }
    return map;
  }, [spans]);
  const columns = useMemo(() => resources.map((resource) => layoutResourceColumn(byResource.get(resource.id) ?? [], slots)), [resources, byResource, slots]);
  const interactive = useMemo(() => columns.flatMap((items, column) => items.filter((item) => item.kind !== 'off').map((item) => stopKey(column, item.start))), [columns]);
  const [active, setActive] = useState<string | null>(null);
  const tabStop = active && interactive.includes(active) ? active : interactive[0] ?? null;
  const selectedKey = useMemo(() => {
    if (!selected) return null;
    const column = resources.findIndex((resource) => resource.id === selected.resourceId);
    const at = new Date(selected.start).getTime();
    const hit = columns[column]?.find((item) => item.kind !== 'off' && item.start <= at && at < item.end);
    return hit ? stopKey(column, hit.start) : null;
  }, [selected, resources, columns]);

  // Columns or a list, by the view's own width (a container, not the viewport).
  useEffect(() => {
    const root = rootRef.current;
    if (layout !== 'auto' || !root || typeof ResizeObserver === 'undefined') return undefined;
    let frame = 0;
    const measure = () => { frame = 0; setNarrow(root.getBoundingClientRect().width < listBelow); };
    const observer = new ResizeObserver(() => { if (!frame) frame = requestAnimationFrame(measure); });
    observer.observe(root);
    measure();
    return () => { observer.disconnect(); if (frame) cancelAnimationFrame(frame); };
  }, [layout, listBelow]);
  const list = layout === 'list' || (layout === 'auto' && narrow);

  const live = useRef({ onSelectSlot });
  live.current = { onSelectSlot };
  const onSelect = useMemo(() => (resource: SchedulingResource, item: ResourceDayItem) => {
    setActive(stopKey(resources.indexOf(resource), item.start));
    if (item.kind === 'off') return;
    live.current.onSelectSlot?.({ resourceId: resource.id, start: iso(item.start), end: iso(item.end), kind: item.kind, span: item.span });
  }, [resources]);

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (!target.hasAttribute('data-rs-col') || !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    const all = Array.from(rootRef.current?.querySelectorAll<HTMLElement>('[data-rs-col]') ?? []);
    const column = Number(target.dataset.rsCol);
    const start = Number(target.dataset.rsStart);
    const inColumn = (c: number) => all.filter((el) => Number(el.dataset.rsCol) === c).sort((a, b) => Number(a.dataset.rsStart) - Number(b.dataset.rsStart));
    const own = inColumn(column);
    const index = own.indexOf(target);
    let next: HTMLElement | undefined;
    if (event.key === 'ArrowUp') next = own[index - 1];
    else if (event.key === 'ArrowDown') next = own[index + 1];
    else if (event.key === 'Home') next = own[0];
    else if (event.key === 'End') next = own[own.length - 1];
    else {
      // The nearest column that has anything to select, at the time closest to this one.
      const direction = event.key === 'ArrowLeft' ? -1 : 1;
      for (let c = column + direction; c >= 0 && c < resources.length && !next; c += direction) {
        const candidates = inColumn(c);
        next = candidates.reduce<HTMLElement | undefined>((best, el) => (!best || Math.abs(Number(el.dataset.rsStart) - start) < Math.abs(Number(best.dataset.rsStart) - start) ? el : best), undefined);
      }
    }
    event.preventDefault();
    if (!next) return;
    setActive(stopKey(Number(next.dataset.rsCol), Number(next.dataset.rsStart)));
    next.focus();
  };

  const skeleton = loading && spans.length === 0;
  const Heading = `h${headingLevel}` as 'h3';
  const gridLabel = fillLabel(labels.resourceGrid, { date: dateText });
  // First load: skeletons, the words for a screen reader. A refetch: the spans stay as they are,
  // and a quiet line says it is loading (no dimming: every span stays readable).
  const status = loading ? <span role="status" className={skeleton ? 'uix-visually-hidden' : 'uix-scheduling-calendar__rs-busy'}>{labels.loading}</span> : null;

  if (resources.length === 0) {
    return <div ref={rootRef} className="uix-scheduling-calendar__resources" data-empty>
      <div className="uix-scheduling-calendar__empty">{loading ? labels.loading : emptyNote ?? labels.noResources}</div>
    </div>;
  }

  if (list) {
    return <div ref={rootRef} className="uix-scheduling-calendar__resources" data-layout="list" role="group" aria-label={gridLabel} aria-describedby={hintId} aria-busy={loading || undefined} data-loading={loading || undefined} onKeyDown={onKeyDown}>
      {status}
      {resources.map((resource, column) => {
        const items = columns[column]!;
        const rows: Array<{ key: string; start: number; end: number; item?: ResourceDayItem }> = [
          ...items.map((item) => ({ key: item.key, start: item.start, end: item.end, item })),
          ...resourceDayGaps(items, slots).map((gap) => ({ key: `gap-${gap.start}`, start: gap.start, end: gap.end })),
        ].sort((a, b) => a.start - b.start);
        const headingId = `${hintId}-r${column}`;
        return <section key={resource.id} className="uix-scheduling-calendar__rs-section" aria-labelledby={headingId} data-resource-id={resource.id}>
          <Heading id={headingId} className="uix-scheduling-calendar__rs-heading">{resource.label}{resource.description && <span className="uix-scheduling-calendar__rs-description">{resource.description}</span>}</Heading>
          {skeleton ? <span className="uix-skeleton uix-scheduling-calendar__rs-skeleton" aria-hidden="true" />
            : <ol className="uix-scheduling-calendar__rs-list">{rows.map((row) => {
              const range = `${zonedTimeOfDay(row.start, timeZone)} – ${zonedTimeOfDay(row.end, timeZone)}`;
              if (!row.item) return <li key={row.key} className="uix-scheduling-calendar__rs-row" data-kind="none"><span className="uix-scheduling-calendar__rs-range">{range}</span><span>{labels.noSchedule}</span></li>;
              const item = row.item;
              const key = stopKey(column, item.start);
              const content = <><span className="uix-scheduling-calendar__rs-range">{range}</span><span className="uix-scheduling-calendar__rs-kind">{labels.availability[item.kind]}</span>{item.span.label && <span className="uix-scheduling-calendar__rs-label">{item.span.label}</span>}</>;
              if (item.kind === 'off') return <li key={row.key} className="uix-scheduling-calendar__rs-row" data-kind="off">{content}</li>;
              return <li key={row.key}><button type="button" className="uix-scheduling-calendar__rs-row" data-kind={item.kind} tabIndex={tabStop === key ? 0 : -1} data-rs-col={column} data-rs-start={item.start}
                data-selected={selectedKey === key || undefined} aria-current={selectedKey === key ? 'true' : undefined} aria-label={itemName(resource, item, timeZone, labels)} onClick={() => onSelect(resource, item)}>{content}</button></li>;
            })}</ol>}
        </section>;
      })}
      <p id={hintId} className="uix-visually-hidden">{labels.resourceHint}</p>
      {emptyNote != null && emptyNote !== false && !loading && spans.length === 0 && <div className="uix-scheduling-calendar__empty">{emptyNote}</div>}
    </div>;
  }

  // The zone name in the narrow corner may break after its slash ("Europe/ Sarajevo"), never inside a word.
  const zoneBreakable = timeZone.replace(/\//g, '/​');
  // With nothing to select (skeletons, no spans) the scroll box itself takes focus, so the keyboard can scroll it.
  // The gutter labels each hour and, with slots of 30 minutes or more, each slot.
  const showAll = slots.length > 1 && slots[1]!.start - slots[0]!.start >= 30 * 60_000;
  return <div ref={rootRef} className="uix-scheduling-calendar__resources" data-layout="columns" role="group" aria-label={gridLabel} aria-describedby={hintId} aria-busy={loading || undefined} data-loading={loading || undefined} onKeyDown={onKeyDown}
    style={vars({ '--uix-scheduling-calendar-rs-columns': resources.length, '--uix-scheduling-calendar-rs-slots': slots.length })}>
    {status}
    <div className="uix-scheduling-calendar__rs-scroll" tabIndex={interactive.length === 0 ? 0 : undefined}>
      <div className="uix-scheduling-calendar__rs-grid">
        <div className="uix-scheduling-calendar__rs-corner">{fillLabel(labels.timeZone, { timeZone: zoneBreakable })}</div>
        {resources.map((resource) => <div key={resource.id} className="uix-scheduling-calendar__rs-head" aria-hidden="true">
          <span className="uix-scheduling-calendar__rs-name">{resource.label}</span>
          {resource.description && <span className="uix-scheduling-calendar__rs-description">{resource.description}</span>}
        </div>)}
        <div className="uix-scheduling-calendar__rs-gutter" aria-hidden="true" style={vars({ '--uix-scheduling-calendar-rs-slots': slots.length })}>
          {slots.map((slot, index) => (showAll || slot.label.endsWith(':00')) && <span key={slot.start} className="uix-scheduling-calendar__rs-tick" style={vars({ '--uix-scheduling-calendar-rs-offset': index })}>{slot.label}</span>)}
        </div>
        {resources.map((resource, column) => <Column key={resource.id} index={column} resource={resource} items={columns[column]!} slots={slots} timeZone={timeZone} labels={labels}
          tabStop={tabStop?.startsWith(`${column}:`) ? tabStop : null} selectedKey={selectedKey?.startsWith(`${column}:`) ? selectedKey : null} skeleton={skeleton} onSelect={onSelect} />)}
      </div>
    </div>
    <p id={hintId} className="uix-visually-hidden">{labels.resourceHint}</p>
    {emptyNote != null && emptyNote !== false && !loading && spans.length === 0 && <div className="uix-scheduling-calendar__empty">{emptyNote}</div>}
  </div>;
}
