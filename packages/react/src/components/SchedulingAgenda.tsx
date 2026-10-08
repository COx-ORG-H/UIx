"use client";

/* The grouped agenda of SchedulingCalendar (HAR-1520, U4). Internal: rendered by
 * SchedulingCalendar when the consumer passes `agendaGroups`, and not exported. The consumer
 * builds, orders and counts the groups; this file renders them in the order given and never
 * sorts, groups or counts. */
import { createElement, useEffect, useRef } from 'react';
import type { FocusEvent, KeyboardEvent, ReactNode } from 'react';
import { zonedTimeOfDay } from '../calendar-model.js';
import { useVirtualRows } from '../hooks/useVirtualRows.js';
import { fillLabel } from '../fill-label.js';
import { afterNextPaint, syncRovingStop } from '../roving.js';
import type { RovingStop } from '../roving.js';
import type {
  SchedulingAgendaGroup, SchedulingCalendarEntry, SchedulingCalendarLabels, SchedulingCalendarOverlay, SchedulingDatePart, SchedulingMarker,
} from './SchedulingCalendar.js';

/** The height of one row of the virtualised agenda, in px. The stylesheet uses the same number. */
export const AGENDA_VIRTUAL_ROW = 44;

export interface SchedulingAgendaProps {
  groups: SchedulingAgendaGroup[];
  timeZone: string;
  labels: Required<SchedulingCalendarLabels>;
  headingLevel: 2 | 3 | 4 | 5 | 6;
  virtualizeAbove: number;
  dateText: (date: string, part: SchedulingDatePart) => string;
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
  | { kind: 'entry'; key: string; group: SchedulingAgendaGroup; entry: SchedulingCalendarEntry }
  | { kind: 'hidden'; key: string; group: SchedulingAgendaGroup }
  | { kind: 'continues'; key: string; group: SchedulingAgendaGroup };

/** Day headings with their rows, in the consumer's order. */
export function SchedulingAgenda({
  groups, timeZone, labels, headingLevel, virtualizeAbove, dateText, entryName, entryStatus, entryStatusText, entryMarkers, overlayName,
  renderEntry, renderMarker, onSelectEntry, onSelectOverlay, onShowMore,
}: SchedulingAgendaProps) {
  const rowCount = groups.reduce((sum, group) => sum + group.rows.length, 0);
  // A long agenda is one flat run of fixed-height rows, so only the rows near the viewport are mounted.
  const flat = rowCount > virtualizeAbove;
  const flatRows: FlatRow[] = [];
  if (flat) {
    for (const group of groups) {
      flatRows.push({ kind: 'heading', key: `h-${group.date}`, group });
      for (const entry of group.rows) flatRows.push({ kind: 'entry', key: `e-${group.date}-${entry.id}`, group, entry });
      if ((group.hiddenCount ?? 0) > 0) flatRows.push({ kind: 'hidden', key: `m-${group.date}`, group });
      if ((group.continuesCount ?? 0) > 0) flatRows.push({ kind: 'continues', key: `c-${group.date}`, group });
    }
  }
  const virtual = useVirtualRows(flatRows, { rowHeight: AGENDA_VIRTUAL_ROW, threshold: 0 });

  /* Keyboard model (HAR-1527): the agenda is one tab stop. ArrowUp and ArrowDown move between
   * its rows and controls in reading order, Home and End go to the first and last. In a long
   * agenda only the rows near the viewport are mounted, so a step past them scrolls first. */
  const plainRef = useRef<HTMLDivElement>(null);
  const stop = useRef<RovingStop>({ node: null, index: 0 });
  const scroller = () => (flat ? virtual.containerRef.current : null);
  const container = () => (flat ? virtual.containerRef.current : plainRef.current);
  const controls = () => Array.from(container()?.querySelectorAll<HTMLElement>('button') ?? []);
  const focusStop = (target: HTMLElement | undefined) => {
    if (!target) return;
    stop.current = syncRovingStop(controls(), stop.current, target);
    target.focus();
  };
  useEffect(() => { stop.current = syncRovingStop(controls(), stop.current); });
  const onFocus = (event: FocusEvent<HTMLDivElement>) => { stop.current = syncRovingStop(controls(), stop.current, event.target as HTMLElement); };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const from = event.target as HTMLElement;
    if (event.defaultPrevented || !['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key) || !controls().includes(from)) return;
    event.preventDefault();
    const box = scroller();
    if (event.key === 'Home' || event.key === 'End') {
      const end = event.key === 'End';
      if (box) box.scrollTop = end ? box.scrollHeight : 0;
      const land = () => { const all = controls(); focusStop(end ? all[all.length - 1] : all[0]); };
      if (box) afterNextPaint(land); else land();
      return;
    }
    const step = event.key === 'ArrowDown' ? 1 : -1;
    const all = controls();
    const next = all[all.indexOf(from) + step];
    if (next) { focusStop(next); return; }
    // The last mounted row of a long agenda: bring the next rows in, then take the step.
    if (!box) return;
    box.scrollTop += step * AGENDA_VIRTUAL_ROW * 3;
    afterNextPaint(() => { const now = controls(); focusStop(now[now.indexOf(from) + step]); });
  };

  const heading = (group: SchedulingAgendaGroup) => <div className="uix-scheduling-calendar__agenda-head">
    {createElement(`h${headingLevel}`, { className: 'uix-scheduling-calendar__agenda-heading' }, group.heading ?? dateText(group.date, 'day'))}
    {group.annotations && group.annotations.length > 0 && <ul className="uix-scheduling-calendar__agenda-notes">
      {group.annotations.map((overlay) => <li key={overlay.id}>
        <button type="button" className="uix-scheduling-calendar__window" data-overlay-id={overlay.id} data-pattern={overlay.pattern ?? 'solid'} data-global={overlay.global || undefined} onClick={() => onSelectOverlay?.(overlay)} aria-label={overlayName(overlay)}>
          <span className="uix-scheduling-calendar__window-text">
            {overlay.kindLabel && <span className="uix-scheduling-calendar__window-kind">{overlay.kindLabel}</span>}
            <span className="uix-scheduling-calendar__window-name">{overlay.label}</span>
            {overlay.scopeLabel && <span className="uix-scheduling-calendar__window-scope">{overlay.scopeLabel}</span>}
          </span>
        </button>
      </li>)}
    </ul>}
  </div>;

  const row = (entry: SchedulingCalendarEntry) => {
    const markers = entryMarkers(entry);
    return <button type="button" className="uix-scheduling-calendar__agenda-row" data-item-id={entry.id} data-highlight={entry.emphasis === 'highlight' || undefined} data-dim={entry.emphasis === 'dim' || undefined} data-band={entry.band ?? 'none'} data-status={entryStatus(entry)} data-state={entry.state} onClick={() => onSelectEntry?.(entry)} aria-label={entryName(entry)}>
      <span className="uix-scheduling-calendar__swatch" aria-hidden="true" data-band={entry.band ?? 'none'} data-status={entryStatus(entry)} />
      <span className="uix-scheduling-calendar__agenda-time">{entry.allDay ? null : <>{zonedTimeOfDay(entry.start, timeZone)}<span aria-hidden="true"> – </span>{zonedTimeOfDay(entry.end, timeZone)}</>}</span>
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
    return <div ref={virtual.containerRef} className="uix-scheduling-calendar__agenda uix-scheduling-calendar__agenda--virtual" role="region" aria-label={labels.agenda} onKeyDown={onKeyDown} onFocus={onFocus}>
      <div className="uix-scheduling-calendar__agenda-window" style={{ paddingTop: virtual.padTop, paddingBottom: virtual.padBottom }}>
        {virtual.rows.map((item) => <div key={item.key} className="uix-scheduling-calendar__agenda-vrow" data-kind={item.kind}>
          {item.kind === 'heading' ? heading(item.group) : item.kind === 'entry' ? row(item.entry) : item.kind === 'hidden' ? hidden(item.group) : continues(item.group)}
        </div>)}
      </div>
    </div>;
  }

  return <div ref={plainRef} className="uix-scheduling-calendar__agenda" role="region" aria-label={labels.agenda} onKeyDown={onKeyDown} onFocus={onFocus}>
    {groups.map((group) => <section key={group.date} className="uix-scheduling-calendar__agenda-group" data-date={group.date}>
      {heading(group)}
      {group.rows.length > 0 && <ol className="uix-scheduling-calendar__agenda-rows">{group.rows.map((entry) => <li key={entry.id}>{row(entry)}</li>)}</ol>}
      {(group.hiddenCount ?? 0) > 0 && hidden(group)}
      {(group.continuesCount ?? 0) > 0 && continues(group)}
    </section>)}
  </div>;
}
