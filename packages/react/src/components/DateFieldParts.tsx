"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, MouseEvent } from 'react';
import { addCalendarDays, addCalendarMonths, buildMonthGrid, isDateUnavailable, startOfMonth } from '../calendar-model.js';
import type { CalendarWeekday } from '../calendar-model.js';
import { ChevronLeftIcon, ChevronRightIcon } from '../icons/components.js';

/** The viewer's local calendar date as `YYYY-MM-DD` (not UTC: "today" is a local idea). */
export const localDateKey = (now = new Date()): string => `${now.getFullYear().toString().padStart(4, '0')}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;

const utc = (date: string) => new Date(`${date}T00:00:00Z`);
export const monthLabel = (date: string, locale?: string): string => new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(utc(date));
export const fullDateLabel = (date: string, locale?: string): string => new Intl.DateTimeFormat(locale, { dateStyle: 'full', timeZone: 'UTC' }).format(utc(date));

/**
 * Short weekday names in `locale`, starting on `weekStartsOn`. 2024-01-07 is a Sunday;
 * formatting in UTC keeps each reference day on its own date.
 */
export const weekdayNames = (locale: string | undefined, weekStartsOn: CalendarWeekday = 1): string[] => {
  const fmt = new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' });
  return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(Date.UTC(2024, 0, 7 + weekStartsOn + i))));
};

const isOpen = (el: Element | null | undefined): boolean => {
  try { return !!el?.matches(':popover-open'); } catch { return false; }
};

/**
 * Open state and trigger wiring for a field whose calendar lives in a kit `Popover`
 * (`popover="auto"`, so a press outside or Escape closes it). `restoreFocus` is called when it
 * closes while focus is inside it or nowhere: the field takes focus back.
 */
export function useFieldPopover(popoverId: string, restoreFocus: () => void, onOpenChange?: (open: boolean) => void) {
  const [open, setOpen] = useState(false);
  const pointerWasOpen = useRef<boolean | null>(null);
  const restoreRef = useRef(restoreFocus);
  restoreRef.current = restoreFocus;
  const onOpenChangeRef = useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;
  /** Set by `hide(false)`: the caller moves focus itself. */
  const skipRestore = useRef(false);
  const popoverEl = () => (typeof document === 'undefined' ? null : document.getElementById(popoverId));

  useEffect(() => {
    const el = popoverEl();
    if (!el) return;
    const onToggle = (event: Event) => {
      const { newState } = event as Event & { newState?: string };
      const nowOpen = newState ? newState === 'open' : isOpen(el);
      setOpen(nowOpen);
      onOpenChangeRef.current?.(nowOpen);
      if (nowOpen) return;
      const active = el.ownerDocument.activeElement;
      if (skipRestore.current) skipRestore.current = false;
      else if (el.contains(active) || active === el.ownerDocument.body) restoreRef.current();
    };
    el.addEventListener('toggle', onToggle);
    return () => el.removeEventListener('toggle', onToggle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [popoverId]);

  const show = () => {
    const el = popoverEl();
    if (el && !isOpen(el)) { try { el.showPopover(); } catch { /* unsupported */ } }
  };
  const hide = (restore = true) => {
    const el = popoverEl();
    if (!el || !isOpen(el)) return;
    skipRestore.current = !restore;
    try { el.hidePopover(); } catch { skipRestore.current = false; }
  };

  return {
    open, show, hide,
    /** Spread on the button that opens the calendar. */
    triggerProps: {
      'aria-haspopup': 'dialog' as const,
      'aria-expanded': open,
      'aria-controls': popoverId,
      // A pointer press outside an open auto popover already closed it (light dismiss); the
      // click that follows must not open it again.
      onPointerDown: () => { pointerWasOpen.current = isOpen(popoverEl()); },
      // A press that never became a click (dragged off, cancelled) must not decide the next one.
      onPointerLeave: () => { pointerWasOpen.current = null; },
      onPointerCancel: () => { pointerWasOpen.current = null; },
      onClick: (event: MouseEvent<HTMLElement>) => {
        if (event.defaultPrevented) return;
        const was = pointerWasOpen.current;
        pointerWasOpen.current = null;
        if (was === true) { hide(); return; }
        if (isOpen(popoverEl())) hide(); else show();
      },
    },
  };
}

export interface MonthCalendarProps {
  /** The selected day, or `null`. */
  value: string | null;
  onSelect: (date: string) => void;
  /** The day that has focus when the calendar opens. */
  initialDate: string;
  min?: string;
  max?: string;
  isUnavailable?: (date: string) => boolean;
  locale?: string;
  weekStartsOn?: CalendarWeekday;
  today: string | null;
  labels: { previousMonth: string; nextMonth: string };
  /** Move focus to the active day when the calendar mounts. */
  autoFocus?: boolean;
}

/**
 * One month of day buttons with the full calendar key path: arrows by day and week, Home / End
 * to the ends of the week, PageUp / PageDown by month, with Shift by year. Days outside
 * `min` / `max` are never reached; unavailable days inside them can be reached and read out,
 * but not chosen. Shares the day-cell look of the range picker.
 */
export function MonthCalendar({
  value, onSelect, initialDate, min, max, isUnavailable, locale, weekStartsOn = 1, today, labels, autoFocus = false,
}: MonthCalendarProps) {
  const clamp = (date: string) => (min && date < min ? min : max && date > max ? max : date);
  const [active, setActive] = useState(() => clamp(initialDate));
  const gridRef = useRef<HTMLDivElement>(null);
  const pendingFocus = useRef(autoFocus);
  const month = startOfMonth(active);
  const days = useMemo(() => buildMonthGrid(month, weekStartsOn).filter((day) => day.inMonth), [month, weekStartsOn]);
  const blanks = (utc(month).getUTCDay() - weekStartsOn + 7) % 7;
  const weekdays = useMemo(() => weekdayNames(locale, weekStartsOn), [locale, weekStartsOn]);

  useEffect(() => {
    if (!pendingFocus.current) return;
    pendingFocus.current = false;
    // preventScroll: the popover is in the top layer; focusing must not scroll the page under it.
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-date="${active}"]`)?.focus({ preventScroll: true });
  }, [active]);

  const focusDate = (date: string) => {
    pendingFocus.current = true;
    setActive(clamp(date));
  };
  const showMonth = (amount: number) => setActive((current) => clamp(addCalendarMonths(current, amount)));
  const unavailable = (date: string) => isDateUnavailable(date, { min, max, isDisabled: isUnavailable });

  const onDayKeyDown = (event: KeyboardEvent<HTMLButtonElement>, date: string) => {
    const rtl = typeof getComputedStyle === 'function' && getComputedStyle(event.currentTarget).direction === 'rtl';
    const offsets: Record<string, number> = { ArrowLeft: rtl ? 1 : -1, ArrowRight: rtl ? -1 : 1, ArrowUp: -7, ArrowDown: 7 };
    if (event.key in offsets) {
      event.preventDefault();
      focusDate(addCalendarDays(date, offsets[event.key]!));
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      const index = (utc(date).getUTCDay() - weekStartsOn + 7) % 7;
      focusDate(addCalendarDays(date, event.key === 'Home' ? -index : 6 - index));
    } else if (event.key === 'PageUp' || event.key === 'PageDown') {
      event.preventDefault();
      focusDate(addCalendarMonths(date, (event.key === 'PageUp' ? -1 : 1) * (event.shiftKey ? 12 : 1)));
    }
  };

  const atMin = !!min && month <= startOfMonth(min);
  const atMax = !!max && month >= startOfMonth(max);
  return <div className="uix-date-picker__calendar">
    <div className="uix-date-picker__nav">
      <button type="button" className="uix-date-picker__nav-btn" aria-label={labels.previousMonth} aria-disabled={atMin || undefined} onClick={() => { if (!atMin) showMonth(-1); }}><ChevronLeftIcon size="sm" /></button>
      <span className="uix-date-picker__month" aria-live="polite">{monthLabel(month, locale)}</span>
      <button type="button" className="uix-date-picker__nav-btn" aria-label={labels.nextMonth} aria-disabled={atMax || undefined} onClick={() => { if (!atMax) showMonth(1); }}><ChevronRightIcon size="sm" /></button>
    </div>
    <div className="uix-date-range-picker__weekdays" aria-hidden="true">{weekdays.map((day, index) => <span key={index}>{day}</span>)}</div>
    <div ref={gridRef} className="uix-date-range-picker__grid uix-date-picker__grid" role="group" aria-label={monthLabel(month, locale)}>
      {Array.from({ length: blanks }, (_, index) => <span key={`blank-${index}`} aria-hidden="true" />)}
      {days.map((day) => {
        const off = unavailable(day.date);
        return <button
          key={day.date} type="button" data-date={day.date} data-selected={day.date === value || undefined}
          aria-pressed={day.date === value} aria-label={fullDateLabel(day.date, locale)}
          aria-current={day.date === today ? 'date' : undefined} aria-disabled={off || undefined}
          tabIndex={active === day.date ? 0 : -1}
          onFocus={() => setActive(day.date)} onKeyDown={(event) => onDayKeyDown(event, day.date)}
          onClick={() => { if (!off) onSelect(day.date); }}
        >{day.day}</button>;
      })}
    </div>
  </div>;
}
