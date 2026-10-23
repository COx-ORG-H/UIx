"use client";

import { forwardRef, useEffect, useId, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { AriaAttributes, CSSProperties, KeyboardEvent } from 'react';
import { cx } from '../cx.js';
import { fillLabel } from '../fill-label.js';
import { ClockIcon } from '../icons/components.js';
import { useUixLabels } from '../labels-context.js';
import type { Placement } from '../overlay-position.js';
import {
  formatTimeKey, isTimeOutOfRange, isValidTimeKey, parseTimeInput, stepTime, timePartEnds, timeSlots, timeToMinutes,
} from '../time-field-model.js';
import { useFieldPopover } from './DateFieldParts.js';
import { Popover } from './Popover.js';

// useLayoutEffect warns during SSR; fall back to useEffect on the server.
const useIsomorphicLayoutEffect = typeof document !== 'undefined' ? useLayoutEffect : useEffect;

/** Every word `TimePicker` renders or announces. */
export interface TimePickerLabels {
  /** The list button's name while no time is set. */
  open: string;
  /** The list button's name with a time set; `{time}` is the time as the field shows it. */
  openSelected: string;
  /** The list of times (the popover's and the listbox's name). */
  list: string;
  /** Shown when the typed text is not a time; `{example}` is a time in the field's own shape. */
  invalidTime: string;
  /** Shown when the typed time is before `min`; `{min}`. */
  tooEarly: string;
  /** Shown when the typed time is after `max`; `{max}`. */
  tooLate: string;
}

export const DEFAULT_TIME_PICKER_LABELS: TimePickerLabels = {
  open: 'Choose time',
  openSelected: 'Change time, {time}',
  list: 'Times',
  invalidTime: 'Enter a time like {example}.',
  tooEarly: 'Choose {min} or later.',
  tooLate: 'Choose {max} or earlier.',
};

/** Why typed text was refused: not a time, or a time before `min` / after `max`. */
export type TimeInputProblem = 'format' | 'early' | 'late';

export interface TimePickerProps {
  /** The time as `HH:mm` (24-hour), or `null` for none. */
  value: string | null;
  onValueChange: (value: string | null) => void;
  /** Minutes the arrow keys step the minutes by, and between the times in the list. Default 15. */
  minuteStep?: number;
  /** First and last time that can be chosen (`HH:mm`, inclusive). */
  min?: string;
  max?: string;
  /**
   * The locale that writes the time: 14:30 in `de`, 2:30 PM in `en-US`. Default: `UixLabelsProvider`
   * `dateFormat.locale`, then the viewer's.
   */
  locale?: string;
  /** `true` writes 2:30 PM, `false` 14:30, whatever the locale. */
  hour12?: boolean;
  placeholder?: string;
  size?: 'sm' | 'md';
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  invalid?: boolean;
  /** Submits the `HH:mm` value under this name (a hidden input), whatever the field shows. */
  name?: string;
  /** Lands on the text input, so a `<label htmlFor>` or `<Field>` names it. */
  id?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: AriaAttributes['aria-invalid'];
  'aria-required'?: AriaAttributes['aria-required'];
  /** Where the list opens. Default `'bottom-start'`; it flips and shifts to stay on screen. */
  placement?: Placement;
  /** Told when typed text is refused, and `null` once the field is fine again. */
  onInputProblem?: (problem: TimeInputProblem | null) => void;
  onOpenChange?: (open: boolean) => void;
  /** Translatable words; English defaults in {@link DEFAULT_TIME_PICKER_LABELS}. */
  labels?: Partial<TimePickerLabels>;
  className?: string;
  style?: CSSProperties;
}

/**
 * A time of day as a form field (HAR-1835), beside `DatePicker`: a text input that shows the time
 * in the locale's shape (14:30 in German, 2:30 PM in en-US) and reads a typed one (`1430`, `9`,
 * `2:30 pm`) on Enter and when focus leaves it; a clock button opens the times at `minuteStep` in a
 * list. ArrowUp / ArrowDown step the part the caret is in (the hour, or the minutes by
 * `minuteStep`), PageUp / PageDown step the hour, Alt+ArrowDown opens the list. Text that is not a
 * time, or a time outside `min` / `max`, marks the field invalid, says why and leaves `value` alone.
 * The value is `HH:mm`, what `<input type="time">` holds.
 */
export const TimePicker = forwardRef<HTMLInputElement, TimePickerProps>(function TimePicker({
  value, onValueChange, minuteStep = 15, min, max, locale: localeProp, hour12, placeholder, size = 'md', disabled, readOnly, required,
  invalid, name, id: idProp, 'aria-label': ariaLabel, 'aria-labelledby': ariaLabelledBy, 'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid, 'aria-required': ariaRequired, placement = 'bottom-start', onInputProblem, onOpenChange,
  labels: labelOverrides, className, style,
}, forwardedRef) {
  const uid = useId();
  const id = idProp ?? `${uid}-input`;
  const popoverId = `${uid}-times`;
  const listId = `${uid}-list`;
  const errorId = `${uid}-error`;
  const uixLabels = useUixLabels();
  const labels: TimePickerLabels = { ...DEFAULT_TIME_PICKER_LABELS, ...uixLabels.timePicker, ...labelOverrides };
  // the app-wide locale of the date fields (UixLabelsProvider `dateFormat`); a prop still wins
  const locale = localeProp ?? uixLabels.dateFormat?.locale;
  const anchorRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  useImperativeHandle(forwardedRef, () => inputRef.current as HTMLInputElement);
  const step = Math.max(1, Math.round(minuteStep));
  const current = isValidTimeKey(value) ? value : null;

  const format = (time: string) => formatTimeKey(time, locale, hour12);
  const [text, setText] = useState(() => (current ? format(current) : ''));
  const [problem, setProblemState] = useState<TimeInputProblem | null>(null);
  const reported = useRef<TimeInputProblem | null>(null);
  const setProblem = (next: TimeInputProblem | null) => {
    if (next !== reported.current) { reported.current = next; onInputProblem?.(next); }
    setProblemState(next);
  };
  // A new value (or locale) rewrites the field; a refused draft stays as typed until then.
  useEffect(() => {
    setText(current ? format(current) : '');
    setProblem(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, locale, hour12]);

  const { open, show, hide, triggerProps } = useFieldPopover(popoverId, () => inputRef.current?.focus({ preventScroll: true }), onOpenChange);
  const locked = !!disabled || !!readOnly;

  /** Read the typed text. Returns whether the field is now in a good state. */
  const commit = (): boolean => {
    const typed = text.trim();
    if (!typed) {
      setProblem(null);
      if (text) setText('');
      if (value !== null) onValueChange(null);
      return true;
    }
    if (current && typed === format(current)) { setProblem(null); return true; }
    const parsed = parseTimeInput(typed, locale);
    if (!parsed) { setProblem('format'); return false; }
    if (isTimeOutOfRange(parsed, min, max)) { setProblem(min && isValidTimeKey(min) && parsed < min ? 'early' : 'late'); return false; }
    setProblem(null);
    setText(format(parsed));
    if (parsed !== value) onValueChange(parsed);
    return true;
  };

  /** Set a time from a key or the list: the field shows it at once. */
  const choose = (time: string) => {
    setProblem(null);
    setText(format(time));
    if (time !== value) onValueChange(time);
  };

  const onInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (locked) return;
    const { key, altKey } = event;
    if (key === 'ArrowDown' && altKey) {
      event.preventDefault();
      show();
      return;
    }
    if (key === 'ArrowUp' || key === 'ArrowDown' || key === 'PageUp' || key === 'PageDown') {
      event.preventDefault();
      // Step from what the field holds now: a typed draft that reads as a time counts.
      const base = parseTimeInput(text, locale) ?? current;
      const input = event.currentTarget;
      const caret = input.selectionStart ?? 0;
      // Where the hour ends: from the locale's own parts when the field shows the formatted time
      // ("오후 2:30" puts the day period first), else the first run of digits of a typed draft.
      const ends = base && input.value === format(base) ? timePartEnds(base, locale, hour12) : null;
      const hourEnd = ends?.hour ?? /^\s*\d{1,2}/.exec(input.value)?.[0].length ?? 0;
      // The caret up to the hour's end means the hour; past it, the minutes.
      const onHour = key === 'PageUp' || key === 'PageDown' || (!!base && caret <= hourEnd);
      const sign = key === 'ArrowUp' || key === 'PageUp' ? 1 : -1;
      let next: string;
      if (!base) next = stepTime(null, 0, min, max);
      else if (onHour) next = stepTime(base, sign * 60, min, max);
      else {
        // Minutes move to the next step boundary: 09:07 with a 15-minute step goes to 09:15 / 09:00.
        const minutes = timeToMinutes(base);
        const snapped = sign > 0 ? Math.floor(minutes / step) * step + step : Math.ceil(minutes / step) * step - step;
        next = stepTime(base, snapped - minutes, min, max);
      }
      choose(next);
      // Keep the caret on the part that moved.
      requestAnimationFrame(() => {
        const el = inputRef.current;
        if (!el || el.ownerDocument.activeElement !== el) return;
        const moved = timePartEnds(next, locale, hour12);
        const at = moved ? (onHour ? moved.hour : moved.minute) : el.value.length;
        try { el.setSelectionRange(at, at); } catch { /* not a text field */ }
      });
      return;
    }
    if (key === 'Enter' && text.trim() !== (current ? format(current) : '')) {
      // Enter reads a changed draft; an unchanged field leaves Enter to the form.
      event.preventDefault();
      commit();
    }
  };

  const pick = (time: string) => {
    choose(time);
    hide(false);
    inputRef.current?.focus({ preventScroll: true });
  };

  const describedBy = [ariaDescribedBy, problem ? errorId : undefined].filter(Boolean).join(' ') || undefined;
  const isInvalid = !!invalid || !!problem || ariaInvalid === true || ariaInvalid === 'true';
  const example = format(min && isValidTimeKey(min) && min > '14:30' ? min : '14:30');

  return <div
    ref={anchorRef} className={cx('uix-date-picker', 'uix-time-picker', size === 'sm' && 'uix-date-picker--sm', className)} style={style}
    onKeyDown={(event) => {
      // Escape while the list is open belongs to the field: it closes the list, not a drawer around it,
      // and the field takes focus back (inside a modal dialog the browser parks it on the dialog).
      if (event.key !== 'Escape' || !open) return;
      event.stopPropagation();
      event.preventDefault();
      hide(false);
      inputRef.current?.focus({ preventScroll: true });
    }}
  >
    <div className="uix-date-picker__control">
      <input
        ref={inputRef} id={id} type="text" autoComplete="off" spellCheck={false}
        className={cx('uix-input', size === 'sm' && 'uix-input--sm', 'uix-date-picker__input', 'uix-time-picker__input')}
        value={text} placeholder={placeholder ?? example}
        disabled={disabled} readOnly={readOnly} required={required}
        aria-label={ariaLabel} aria-labelledby={ariaLabelledBy} aria-describedby={describedBy}
        aria-invalid={isInvalid || undefined} aria-required={ariaRequired}
        onChange={(event) => { setText(event.target.value); if (problem) setProblem(null); }}
        onBlur={() => { if (!locked) commit(); }}
        onKeyDown={onInputKeyDown}
      />
      <button
        type="button" className="uix-date-picker__toggle" disabled={locked}
        aria-label={current ? fillLabel(labels.openSelected, { time: format(current) }) : labels.open}
        {...triggerProps}
      ><ClockIcon size="sm" /></button>
    </div>
    {name && <input type="hidden" name={name} value={current ?? ''} disabled={disabled} />}
    {problem && <span id={errorId} className="uix-field__error uix-date-picker__error" role="alert">
      {problem === 'format'
        ? fillLabel(labels.invalidTime, { example })
        : problem === 'early' ? fillLabel(labels.tooEarly, { min: format(min ?? '') }) : fillLabel(labels.tooLate, { max: format(max ?? '') })}
    </span>}
    <Popover
      id={popoverId} anchor={anchorRef} placement={placement} className="uix-time-picker__popover"
      role="dialog" aria-label={labels.list} capHeight closeWhenAnchorHidden
    >
      {open && <TimeList
        ref={listRef} id={listId} value={current} step={step} min={min} max={max} label={labels.list} format={format} onPick={pick}
      />}
    </Popover>
  </div>;
});
TimePicker.displayName = 'TimePicker';

interface TimeListProps {
  id: string;
  value: string | null;
  step: number;
  min?: string;
  max?: string;
  label: string;
  format: (time: string) => string;
  onPick: (time: string) => void;
}

/**
 * The popover's list: a listbox that takes focus, with the chosen (or nearest) time active and in
 * view. ArrowUp / ArrowDown, Home / End and PageUp / PageDown (an hour) move; Enter, Space or a
 * click chooses; Escape (on the field) closes.
 */
const TimeList = forwardRef<HTMLDivElement, TimeListProps>(function TimeList({ id, value, step, min, max, label, format, onPick }, ref) {
  const slots = useMemo(() => timeSlots(step, min, max), [step, min, max]);
  const nearest = () => {
    if (!slots.length) return -1;
    if (!value) return 0;
    const exact = slots.indexOf(value);
    if (exact >= 0) return exact;
    const at = slots.findIndex((slot) => slot > value);
    return at < 0 ? slots.length - 1 : Math.max(0, at - 1);
  };
  const [active, setActive] = useState(nearest);
  const listRef = useRef<HTMLDivElement>(null);
  useImperativeHandle(ref, () => listRef.current as HTMLDivElement);
  const optionId = (index: number) => `${id}-${index}`;

  useEffect(() => { listRef.current?.focus({ preventScroll: true }); }, []);
  const placed = useRef(false);
  useIsomorphicLayoutEffect(() => {
    const list = listRef.current;
    const el = list?.ownerDocument.getElementById(optionId(active));
    if (!list || !el) return;
    const top = el.offsetTop;
    const bottom = top + el.offsetHeight;
    // The chosen time opens in the middle of the list; later moves only scroll as far as needed.
    if (!placed.current) { placed.current = true; list.scrollTop = top - (list.clientHeight - el.offsetHeight) / 2; return; }
    if (top < list.scrollTop) list.scrollTop = top;
    else if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight;
  }, [active]);

  const perHour = Math.max(1, Math.round(60 / step));
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const last = slots.length - 1;
    const moves: Record<string, number> = { ArrowDown: 1, ArrowUp: -1, PageDown: perHour, PageUp: -perHour };
    if (event.key in moves) {
      event.preventDefault();
      setActive((index) => Math.max(0, Math.min(last, index + moves[event.key]!)));
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      setActive(event.key === 'Home' ? 0 : last);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const slot = slots[active];
      if (slot) onPick(slot);
    }
  };

  return <div
    ref={listRef} id={id} role="listbox" tabIndex={0} aria-label={label} className="uix-listbox uix-time-picker__list"
    aria-activedescendant={active >= 0 ? optionId(active) : undefined} onKeyDown={onKeyDown}
  >
    {slots.map((slot, index) => (
      <div
        key={slot} id={optionId(index)} role="option" className="uix-listbox__option"
        aria-selected={slot === value} data-active={index === active || undefined}
        onPointerMove={() => { if (index !== active) setActive(index); }}
        onClick={() => onPick(slot)}
      >
        <span className="uix-listbox__label">{format(slot)}</span>
      </div>
    ))}
  </div>;
});
