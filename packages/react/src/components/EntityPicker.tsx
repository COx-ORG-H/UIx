"use client";

import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { cx } from '../cx.js';
import { fillLabel } from '../fill-label.js';
import { SearchSuggest } from './SearchSuggest.js';
import type { SearchSuggestOption } from './SearchSuggest.js';

export interface EntityPickerLabels {
  /** Accessible name of the search field while picking. */
  search: string;
  loading: string;
  empty: string;
  error: string;
  retry: string;
  /** Clears the chosen record. `{title}`. */
  clear: string;
  /** Names the chosen-record button that reopens the search. `{label}`, `{title}`. */
  change: string;
  /** Shown in the field when nothing is chosen. */
  none: string;
  /** Polite count after a search. `{count}`. */
  results: string;
}

export const DEFAULT_ENTITY_PICKER_LABELS: EntityPickerLabels = {
  search: 'Search',
  loading: 'Searching…',
  empty: 'No matches.',
  error: 'Search failed.',
  retry: 'Try again',
  clear: 'Clear {title}',
  change: '{label}: {title}. Change',
  none: 'Choose…',
  results: '{count} results',
};

export interface EntityPickerProps {
  /** The chosen record, or null. */
  value: SearchSuggestOption | null;
  onValueChange: (next: SearchSuggestOption | null) => void;
  /** Finds records for the query; a rejection shows the error state with a Retry row. */
  onSearch: (query: string) => Promise<readonly SearchSuggestOption[]>;
  /** The field's name (the visible label usually comes from a surrounding `Field`). */
  label: string;
  /** Id of the control, for `Field htmlFor`/`label for`. */
  id?: string;
  /** Hidden form value: the chosen record's id. */
  name?: string;
  placeholder?: string;
  /** Search only from this many characters. Default 0 (an empty query lists suggestions). */
  minQueryLength?: number;
  /** Debounce before searching, in ms. Default 250. */
  delay?: number;
  disabled?: boolean;
  invalid?: boolean;
  /** Ids of hint/error text (from `Field`). */
  'aria-describedby'?: string;
  /** How the chosen record shows in the field. Default: title, then the last breadcrumb. */
  renderValue?: (option: SearchSuggestOption) => ReactNode;
  labels?: Partial<EntityPickerLabels>;
  className?: string;
}

/**
 * A form field that holds one record found by an async search (HAR-1366; TENSOR B28/C5
 * `entity-picker.tsx`, MOTUS B-P10): the chosen record shows as the field's value with a
 * clear ×; choosing again or typing opens a `SearchSuggest` list with loading, empty and error
 * states, and Retry is a list row, so the keyboard reaches it. Stale results are ignored.
 */
export function EntityPicker({
  value, onValueChange, onSearch, label, id, name, placeholder, minQueryLength = 0, delay = 250, disabled, invalid,
  'aria-describedby': describedBy, renderValue, labels: labelOverrides, className,
}: EntityPickerProps) {
  const labels = { ...DEFAULT_ENTITY_PICKER_LABELS, ...labelOverrides };
  const [editing, setEditing] = useState(value == null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<readonly SearchSuggestOption[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [attempt, setAttempt] = useState(0);
  const latest = useRef(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const valueButtonRef = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef(false);

  // A value set from outside closes the search.
  useEffect(() => { if (value) setEditing(false); else setEditing(true); }, [value?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!editing || disabled) return;
    const q = query.trim();
    if (q.length < minQueryLength) { setStatus('idle'); setResults([]); return; }
    const run = ++latest.current;
    const timer = window.setTimeout(() => {
      setStatus('loading');
      onSearch(q).then(
        (found) => { if (run === latest.current) { setResults(found); setStatus('done'); } },
        () => { if (run === latest.current) { setResults([]); setStatus('error'); } },
      );
    }, delay);
    return () => window.clearTimeout(timer);
  }, [editing, query, attempt, minQueryLength, delay, disabled]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!returnFocus.current) return;
    returnFocus.current = false;
    (editing ? inputRef.current : valueButtonRef.current)?.focus();
  }, [editing]);

  const startEditing = () => { setQuery(''); returnFocus.current = true; setEditing(true); };
  const choose = (option: SearchSuggestOption) => { onValueChange(option); returnFocus.current = true; setEditing(false); };
  const clear = () => { onValueChange(null); returnFocus.current = true; setEditing(true); };

  const hidden = name ? <input type="hidden" name={name} value={value?.id ?? ''} /> : null;

  if (!editing && value) {
    const shown = renderValue?.(value) ?? (
      <>
        <span className="uix-entity-picker__title">{value.title}</span>
        {value.meta?.length ? <span className="uix-entity-picker__meta">{value.meta[value.meta.length - 1]}</span> : null}
      </>
    );
    return (
      <div className={cx('uix-entity-picker', className)} data-invalid={invalid || undefined}>
        <button
          ref={valueButtonRef}
          id={id}
          type="button"
          className="uix-input uix-entity-picker__value"
          aria-label={fillLabel(labels.change, { label, title: value.title })}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          disabled={disabled}
          onClick={startEditing}
        >
          {value.icon != null && <span className="uix-entity-picker__icon" aria-hidden="true">{value.icon}</span>}
          <span className="uix-entity-picker__text">{shown}</span>
        </button>
        {!disabled && (
          <button type="button" className="uix-entity-picker__clear" aria-label={fillLabel(labels.clear, { title: value.title })} onClick={clear}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" /></svg>
          </button>
        )}
        {hidden}
      </div>
    );
  }

  return (
    <div className={cx('uix-entity-picker', 'uix-entity-picker--editing', className)} data-invalid={invalid || undefined}
      onKeyDown={(event) => { if (event.key === 'Escape' && value && !query) { event.preventDefault(); returnFocus.current = true; setEditing(false); } }}>
      <SearchSuggest
        inputId={id}
        inputDescribedBy={describedBy}
        inputRef={inputRef}
        value={query}
        onValueChange={setQuery}
        options={status === 'done' ? results : []}
        onSelect={(_, option) => choose(option)}
        label={`${label}. ${labels.search}`}
        placeholder={placeholder ?? labels.none}
        loading={status === 'loading'}
        loadingLabel={labels.loading}
        empty={labels.empty}
        error={status === 'error' ? labels.error : undefined}
        footer={status === 'error' ? { label: labels.retry, onSelect: () => setAttempt((n) => n + 1) } : undefined}
        status={status === 'done' ? fillLabel(labels.results, { count: results.length }) : undefined}
        strategy="fixed"
      />
      {hidden}
    </div>
  );
}
