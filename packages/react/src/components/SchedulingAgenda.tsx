"use client";

/* The grouped agenda of SchedulingCalendar (HAR-1520, U4). Internal: rendered by
 * SchedulingCalendar when the consumer passes `agendaGroups`, and not exported. The consumer
 * builds, orders and counts the groups; this file renders them in the order given and never
 * sorts, groups or counts. */
import { createElement, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { FocusEvent, KeyboardEvent, ReactNode } from 'react';
import { addCalendarDays, zonedDateKey, zonedTimeOfDay } from '../calendar-model.js';
import { itemDaySpan } from '../scheduling-calendar-model.js';
import { useVirtualRows } from '../hooks/useVirtualRows.js';
import { fillLabel } from '../fill-label.js';
import { syncRovingStop } from '../roving.js';
import type { RovingStop } from '../roving.js';
import type {
  SchedulingAgendaGroup, SchedulingCalendarEntry, SchedulingCalendarLabels, SchedulingCalendarOverlay, SchedulingDatePart, SchedulingMarker,
} from './SchedulingCalendar.js';

/** The height of one row of the virtualised agenda, in px. The stylesheet uses the same number. */
export const AGENDA_VIRTUAL_ROW = 44;
/** A scroller this narrow or narrower (px) gets taller rows of three lines: title, time, then markers and status. */
const AGENDA_NARROW_WIDTH = 576;
/** The height of one of those rows, in px. The stylesheet uses the same number. */
const AGENDA_NARROW_ROW = 64;
/** The height the long agenda is taken to have until its scroller is measured (server render, first paint): the stylesheet's `max-height` of 40rem. */
const AGENDA_VIRTUAL_VIEWPORT = 640;

export interface SchedulingAgendaProps {
  groups: SchedulingAgendaGroup[];
  timeZone: string;
  labels: Required<SchedulingCalendarLabels>;
  headingLevel: 2 | 3 | 4 | 5 | 6;
  virtualizeAbove: number;
  dateText: (date: string, part: SchedulingDatePart) => string;
  formatInstant: (instant: string) => string;
  entryName: (entry: SchedulingCalendarEntry) => string;
  entryStatus: (entry: SchedulingCalendarEntry) => string;
  entryStatusText: (entry: SchedulingCalendarEntry) => string;
  entryMarkers: (entry: SchedulingCalendarEntry) => SchedulingMarker[];
  overlayName: (overlay: SchedulingCalendarOverlay) => string;
  renderEntry?: (entry: SchedulingCalendarEntry) => ReactNode;
  renderMarker: (marker: SchedulingMarker, showLabel?: boolean) => ReactNode;
  onSelectEntry?: (entry: SchedulingCalendarEntry) => void;
  onSelectOverlay?: (overlay: SchedulingCalendarOverlay) => void;
  onShowMore?: (date: string, entries: SchedulingCalendarEntry[]) => void;
}

type FlatRow =
  | { kind: 'heading'; key: string; group: SchedulingAgendaGroup }
  | { kind: 'note'; key: string; group: SchedulingAgendaGroup; overlay: SchedulingCalendarOverlay }
  | { kind: 'entry'; key: string; group: SchedulingAgendaGroup; entry: SchedulingCalendarEntry }
  | { kind: 'hidden'; key: string; group: SchedulingAgendaGroup }
  | { kind: 'continues'; key: string; group: SchedulingAgendaGroup };

/** One React key per id, in order: an id that comes again gets a suffix, so a repeated date or id never shares a key. */
function uniqueKeys(ids: readonly string[]): string[] {
  const used = new Set<string>();
  return ids.map((id) => {
    let key = id;
    for (let times = 1; used.has(key); times++) key = `${id}#${times}`;
    used.add(key);
    return key;
  });
}

/** Day headings with their rows, in the consumer's order. */
export function SchedulingAgenda(props: SchedulingAgendaProps) {
  const rowCount = props.groups.reduce((sum, group) => sum + group.rows.length, 0);
  // A long agenda is one flat run of fixed-height rows, so only the rows near the viewport are mounted.
  const flat = rowCount > props.virtualizeAbove;
  // The scroller exists only in the long form, and the rows hook finds it once, when it mounts:
  // an agenda that grows past the threshold (or shrinks under it) is mounted afresh.
  return <AgendaBody key={flat ? 'flat' : 'grouped'} {...props} flat={flat} />;
}

function AgendaBody({
  groups, flat, timeZone, labels, headingLevel, dateText, formatInstant, entryName, entryStatus, entryStatusText, entryMarkers, overlayName,
  renderEntry, renderMarker, onSelectEntry, onSelectOverlay, onShowMore,
}: SchedulingAgendaProps & { flat: boolean }) {
  const groupKeys = uniqueKeys(groups.map((group) => group.date));
  const flatRows: FlatRow[] = [];
  if (flat) {
    groups.forEach((group, index) => {
      const groupKey = groupKeys[index]!;
      flatRows.push({ kind: 'heading', key: `h-${groupKey}`, group });
      // A fixed-height row holds one line: each window note gets a row of its own under the heading.
      const noteKeys = uniqueKeys((group.annotations ?? []).map((overlay) => overlay.id));
      (group.annotations ?? []).forEach((overlay, at) => flatRows.push({ kind: 'note', key: `n-${groupKey}-${noteKeys[at]!}`, group, overlay }));
      const rowKeys = uniqueKeys(group.rows.map((entry) => entry.id));
      group.rows.forEach((entry, at) => flatRows.push({ kind: 'entry', key: `e-${groupKey}-${rowKeys[at]!}`, group, entry }));
      if ((group.hiddenCount ?? 0) > 0) flatRows.push({ kind: 'hidden', key: `m-${groupKey}`, group });
      if ((group.continuesCount ?? 0) > 0) flatRows.push({ kind: 'continues', key: `c-${groupKey}`, group });
    });
  }
  // The long form in a narrow box has taller rows. The width is measured here and the stylesheet
  // follows `data-narrow`, so the row height the window is computed from is the one drawn.
  const [narrow, setNarrow] = useState(false);
  const virtual = useVirtualRows(flatRows, { rowHeight: narrow ? AGENDA_NARROW_ROW : AGENDA_VIRTUAL_ROW, threshold: 0, estimatedViewportHeight: AGENDA_VIRTUAL_VIEWPORT });
  const scroller = virtual.containerRef;
  useLayoutEffect(() => {
    const box = scroller.current;
    if (!box) return;
    const measure = () => setNarrow(box.clientWidth > 0 && box.clientWidth <= AGENDA_NARROW_WIDTH);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    return () => observer.disconnect();
  }, [scroller]);
  // In the grouped form a day heading sticks to the top with its window notes, however many lines
  // they take. Each group is told that height, so a row scrolled to by the keyboard stops below it.
  const grouped = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const box = grouped.current;
    if (!box) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const head = entry.target as HTMLElement;
        head.parentElement?.style.setProperty('--uix-scheduling-calendar-agenda-head', `${Math.ceil(head.getBoundingClientRect().height)}px`);
      }
    });
    box.querySelectorAll(':scope > section > .uix-scheduling-calendar__agenda-head').forEach((head) => observer.observe(head));
    return () => observer.disconnect();
  }, [groups]);

  /* Keyboard model (HAR-1527): the agenda is one tab stop. ArrowUp and ArrowDown move between
   * its rows and controls in reading order, Home and End go to the first and last. In a long
   * agenda only the rows near the viewport are mounted, so a step is counted in rows, not in
   * mounted elements: the row to land on is scrolled to and takes focus once it is mounted. */
  const stop = useRef<RovingStop>({ node: null, index: 0 });
  const container = () => (flat ? scroller.current : grouped.current);
  const controls = () => Array.from(container()?.querySelectorAll<HTMLElement>('button') ?? []);
  const focusStop = (target: HTMLElement | undefined | null) => {
    if (!target) return;
    stop.current = syncRovingStop(controls(), stop.current, target);
    target.focus();
  };
  /** A row of the long form that holds a control: a row, a window note, or "open day". */
  const holdsControl = (row: FlatRow | undefined) => row !== undefined && (row.kind === 'entry' || row.kind === 'note' || (row.kind === 'hidden' && onShowMore !== undefined));
  const controlAt = (index: number) => scroller.current?.querySelector<HTMLElement>(`[data-flat-index="${index}"] button`) ?? null;
  /** Where focus is, in the tree the agenda is in (a shadow tree has its own). `null`: nothing has it. */
  const focusIn = (box: HTMLElement): Element | null => {
    const tree = box.getRootNode() as Document | ShadowRoot;
    const active = tree.activeElement ?? null;
    return active === document.body ? null : active;
  };
  /** Focus has gone to something outside the agenda (not: was lost because the focused row was unmounted). */
  const focusIsElsewhere = (box: HTMLElement) => {
    const active = focusIn(box);
    if (active) return !box.contains(active);
    // Nothing in this tree has focus: in a shadow tree, the document says whether something outside has it.
    const outer = document.activeElement;
    return box.getRootNode() !== document && outer !== null && outer !== document.body && !outer.contains(box);
  };
  const rowHeight = narrow ? AGENDA_NARROW_ROW : AGENDA_VIRTUAL_ROW;
  const scrollToRow = (box: HTMLElement, index: number) => { box.scrollTop = Math.max(0, index * rowHeight - (box.clientHeight - rowHeight) / 2); };
  // The row a step is waiting for, by its key, so it is still the same row after the list has
  // changed. The step is taken after the render that mounts the row, and given up when the row
  // is gone or the user has gone somewhere else.
  const landing = useRef<{ key: string; index: number } | null>(null);
  const land = () => {
    const wanted = landing.current;
    if (!wanted) return;
    const box = container();
    const index = flatRows[wanted.index]?.key === wanted.key ? wanted.index : flatRows.findIndex((row) => row.key === wanted.key);
    if (!box || index === -1 || !holdsControl(flatRows[index]) || focusIsElsewhere(box)) { landing.current = null; return; }
    const target = controlAt(index);
    if (target) { landing.current = null; focusStop(target); return; }
    // The row moved with the list: go to where it is now.
    if (index !== wanted.index) { landing.current = { key: wanted.key, index }; scrollToRow(box, index); }
  };
  useEffect(() => {
    const all = controls();
    stop.current = syncRovingStop(all, stop.current);
    // A window of the long form may hold headings only: then the scroller itself is the tab stop, and the arrow keys scroll it.
    const box = flat ? scroller.current : null;
    if (box) { if (all.length === 0 || focusIn(box) === box) box.tabIndex = 0; else box.removeAttribute('tabindex'); }
    land();
  });
  const onFocus = (event: FocusEvent<HTMLDivElement>) => { stop.current = syncRovingStop(controls(), stop.current, event.target as HTMLElement); };
  // Leaving the agenda, or taking the pointer or the wheel to it, ends a step that was still waiting.
  const onBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node)) landing.current = null;
    // The scroller was the tab stop only while no row was mounted: once it lets go of focus, a row is.
    if (event.target === event.currentTarget && controls().length > 0) event.currentTarget.removeAttribute('tabindex');
  };
  const dropLanding = () => { landing.current = null; };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const from = event.target as HTMLElement;
    if (event.defaultPrevented || !['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key) || !controls().includes(from)) return;
    event.preventDefault();
    const box = flat ? scroller.current : null;
    if (!box) {
      // Every row is mounted: the step is the next control in the document.
      const all = controls();
      const to = event.key === 'Home' ? 0 : event.key === 'End' ? all.length - 1 : all.indexOf(from) + (event.key === 'ArrowDown' ? 1 : -1);
      focusStop(all[Math.max(0, Math.min(all.length - 1, to))]);
      return;
    }
    const at = Number(from.closest('[data-flat-index]')?.getAttribute('data-flat-index'));
    let target = -1;
    if (event.key === 'Home') target = flatRows.findIndex(holdsControl);
    else if (event.key === 'End') { for (let index = flatRows.length - 1; index >= 0 && target === -1; index--) if (holdsControl(flatRows[index])) target = index; }
    else if (Number.isFinite(at)) {
      const step = event.key === 'ArrowDown' ? 1 : -1;
      for (let index = at + step; index >= 0 && index < flatRows.length && target === -1; index += step) if (holdsControl(flatRows[index])) target = index;
    }
    if (target === -1) return;
    const mounted = controlAt(target);
    if (mounted) { landing.current = null; focusStop(mounted); return; }
    // Not mounted: bring the row to the middle of the scroller; it takes focus when it is there.
    landing.current = { key: flatRows[target]!.key, index: target };
    scrollToRow(box, target);
  };

  const note = (overlay: SchedulingCalendarOverlay) => <button type="button" className="uix-scheduling-calendar__window" data-overlay-id={overlay.id} data-pattern={overlay.pattern ?? 'solid'} data-global={overlay.global || undefined} onClick={() => onSelectOverlay?.(overlay)} aria-label={overlayName(overlay)}>
    <span className="uix-scheduling-calendar__window-text">
      {overlay.kindLabel && <span className="uix-scheduling-calendar__window-kind">{overlay.kindLabel}</span>}
      <span className="uix-scheduling-calendar__window-name">{overlay.label}</span>
      {overlay.scopeLabel && <span className="uix-scheduling-calendar__window-scope">{overlay.scopeLabel}</span>}
    </span>
  </button>;

  const heading = (group: SchedulingAgendaGroup, withNotes: boolean) => <div className="uix-scheduling-calendar__agenda-head">
    {createElement(`h${headingLevel}`, { className: 'uix-scheduling-calendar__agenda-heading' }, group.heading ?? dateText(group.date, 'day'))}
    {withNotes && group.annotations && group.annotations.length > 0 && <ul className="uix-scheduling-calendar__agenda-notes">
      {uniqueKeys(group.annotations.map((overlay) => overlay.id)).map((key, at) => <li key={key}>{note(group.annotations![at]!)}</li>)}
    </ul>}
  </div>;

  // A row under its own day reads as two times of day. One that starts on another day, or runs
  // past the next midnight by more than its start, says both days: "14:00 – 03:00" would not.
  const timeText = (entry: SchedulingCalendarEntry, date: string): ReactNode => {
    const part = (text: string) => <span className="uix-scheduling-calendar__agenda-time-part">{text}</span>;
    const dash = <span aria-hidden="true"> – </span>;
    if (entry.allDay) {
      // An end before the start has no span: the entry is on its start day.
      let span;
      try { span = itemDaySpan(entry.start, entry.end, timeZone); } catch { span = itemDaySpan(entry.start, entry.start, timeZone); }
      const last = addCalendarDays(span.end, -1);
      if (span.start === date && last === date) return labels.allDay;
      return span.start === last ? part(dateText(last, 'day')) : <>{part(dateText(span.start, 'day'))}{dash}{part(dateText(last, 'day'))}</>;
    }
    const startTime = zonedTimeOfDay(entry.start, timeZone);
    const endTime = zonedTimeOfDay(entry.end, timeZone);
    const endDay = zonedDateKey(entry.end, timeZone);
    // "Ends within a day" is by the clock: an end on the next day at the start's time of day or later is a day or more on.
    const underItsDay = zonedDateKey(entry.start, timeZone) === date && (endDay === date || (endDay === addCalendarDays(date, 1) && endTime < startTime));
    return underItsDay
      ? <>{startTime}{dash}{endTime}</>
      : <>{part(formatInstant(entry.start))}{dash}{part(formatInstant(entry.end))}</>;
  };

  const row = (entry: SchedulingCalendarEntry, date: string) => {
    const markers = entryMarkers(entry);
    // The name carries every word the row shows: the detail line is part of it.
    const name = entry.accessibleName ?? (entry.meta ? `${entryName(entry)}, ${entry.meta}` : entryName(entry));
    return <button type="button" className="uix-scheduling-calendar__agenda-row" data-item-id={entry.id} data-highlight={entry.emphasis === 'highlight' || undefined} data-dim={entry.emphasis === 'dim' || undefined} data-band={entry.band ?? 'none'} data-status={entryStatus(entry)} data-state={entry.state} onClick={() => onSelectEntry?.(entry)} aria-label={name}>
      <span className="uix-scheduling-calendar__swatch" aria-hidden="true" data-band={entry.band ?? 'none'} data-status={entryStatus(entry)} />
      <span className="uix-scheduling-calendar__agenda-time">{timeText(entry, date)}</span>
      <span className="uix-scheduling-calendar__agenda-main">
        {renderEntry?.(entry) ?? <span className="uix-scheduling-calendar__title">{entry.title}</span>}
        {entry.meta && <span className="uix-scheduling-calendar__agenda-meta">{entry.meta}</span>}
      </span>
      {markers.length > 0 && <span className="uix-scheduling-calendar__markers">{markers.map((marker) => <span key={marker.id}>{renderMarker(marker, true)}</span>)}</span>}
      <span className="uix-scheduling-calendar__status">{entryStatusText(entry)}</span>
    </button>;
  };

  const hidden = (group: SchedulingAgendaGroup) => {
    const text = fillLabel(labels.hiddenInDay, { count: group.hiddenCount ?? 0 });
    return onShowMore
      ? <button type="button" className="uix-scheduling-calendar__agenda-more" onClick={() => onShowMore(group.date, group.rows)}>{text}</button>
      : <p className="uix-scheduling-calendar__agenda-more">{text}</p>;
  };
  const continues = (group: SchedulingAgendaGroup) => <p className="uix-scheduling-calendar__agenda-continues">{fillLabel(labels.continuesInDay, { count: group.continuesCount ?? 0 })}</p>;

  if (groups.length === 0) return <div className="uix-scheduling-calendar__agenda" role="region" aria-label={labels.agenda}><p>{labels.agendaEmpty}</p></div>;

  if (flat) {
    return <div ref={virtual.containerRef} className="uix-scheduling-calendar__agenda uix-scheduling-calendar__agenda--virtual" data-narrow={narrow || undefined} role="region" aria-label={labels.agenda} onKeyDown={onKeyDown} onFocus={onFocus} onBlur={onBlur} onWheel={dropLanding} onPointerDown={dropLanding}>
      <div className="uix-scheduling-calendar__agenda-window" style={{ paddingTop: virtual.padTop, paddingBottom: virtual.padBottom }}>
        {virtual.rows.map((item, at) => <div key={item.key} className="uix-scheduling-calendar__agenda-vrow" data-kind={item.kind} data-flat-index={virtual.startIndex + at}>
          {item.kind === 'heading' ? heading(item.group, false) : item.kind === 'note' ? note(item.overlay) : item.kind === 'entry' ? row(item.entry, item.group.date) : item.kind === 'hidden' ? hidden(item.group) : continues(item.group)}
        </div>)}
      </div>
    </div>;
  }

  return <div ref={grouped} className="uix-scheduling-calendar__agenda" role="region" aria-label={labels.agenda} onKeyDown={onKeyDown} onFocus={onFocus}>
    {groups.map((group, index) => {
      const rowKeys = uniqueKeys(group.rows.map((entry) => entry.id));
      return <section key={groupKeys[index]} className="uix-scheduling-calendar__agenda-group" data-date={group.date}>
        {heading(group, true)}
        {group.rows.length > 0 && <ol className="uix-scheduling-calendar__agenda-rows">{group.rows.map((entry, at) => <li key={rowKeys[at]}>{row(entry, group.date)}</li>)}</ol>}
        {(group.hiddenCount ?? 0) > 0 && hidden(group)}
        {(group.continuesCount ?? 0) > 0 && continues(group)}
      </section>;
    })}
  </div>;
}
