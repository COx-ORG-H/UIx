"use client";

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Button } from './Button.js';
import { Checkbox } from './Checkbox.js';
import { Input } from './Input.js';
import { Radio, RadioGroup } from './Radio.js';
import { Select } from './Select.js';
import { Chip } from './Chip.js';
import { fillLabel } from '../fill-label.js';
import { foldForSearch } from '../search-suggest-model.js';
import { NUMBER_FILTER_OPERATORS, TEXT_FILTER_OPERATORS, emptyFilterValue } from '../filter-model.js';
import type { FilterChoice, FilterField, FilterValue, NumberFilterOperator, TextFilterOperator } from '../filter-model.js';

export interface FilterEditorLabels {
  apply: string;
  clear: string;
  operator: string;
  value: string;
  from: string;
  to: string;
  /** Between two numbers: "and". */
  and: string;
  any: string;
  yes: string;
  no: string;
  search: string;
  searching: string;
  noMatches: string;
  searchFailed: string;
  retry: string;
  selectAll: string;
  selectNone: string;
  /** `{count}` chosen. */
  selected: string;
  /** Remove one chosen record. `{label}`. */
  remove: string;
  operators: Record<TextFilterOperator | NumberFilterOperator, string>;
}

export const DEFAULT_FILTER_EDITOR_LABELS: FilterEditorLabels = {
  apply: 'Apply',
  clear: 'Clear',
  operator: 'Condition',
  value: 'Value',
  from: 'From',
  to: 'To',
  and: 'and',
  any: 'Any',
  yes: 'Yes',
  no: 'No',
  search: 'Search',
  searching: 'Searching…',
  noMatches: 'No matches.',
  searchFailed: 'Search failed.',
  retry: 'Try again',
  selectAll: 'Select all',
  selectNone: 'Clear selection',
  selected: '{count} selected',
  remove: 'Remove {label}',
  operators: {
    contains: 'contains', 'not-contains': 'does not contain', is: 'is', 'is-not': 'is not', 'starts-with': 'starts with',
    eq: 'equals', neq: 'does not equal', lt: 'less than', lte: 'at most', gt: 'more than', gte: 'at least', between: 'between',
  },
};

export interface FilterEditorProps {
  field: FilterField;
  /** Undefined means "not filtered yet". */
  value: FilterValue | undefined;
  onValueChange: (value: FilterValue) => void;
  onApply: () => void;
  onClear: () => void;
  labels?: Partial<FilterEditorLabels>;
  /** Show an option filter above an enum list once it has more options than this. Default 8. */
  searchThreshold?: number;
  /** Delay before a reference search runs, in ms. Default 250. */
  searchDelay?: number;
}

/**
 * Editor content for one typed column filter (HAR-1365; TENSOR C6, MOTUS C-1): an enum
 * multi-select, text or number with a condition, a date range, yes/no, or records found by
 * an async search. The product owns the popover trigger and the query; `summarizeFilter`
 * turns the applied value into the chip text. `FilterPopover` stays for the one-string case.
 */
export function FilterEditor({ field, value: valueProp, onValueChange, onApply, onClear, labels: labelOverrides, searchThreshold = 8, searchDelay = 250 }: FilterEditorProps) {
  const labels: FilterEditorLabels = { ...DEFAULT_FILTER_EDITOR_LABELS, ...labelOverrides, operators: { ...DEFAULT_FILTER_EDITOR_LABELS.operators, ...labelOverrides?.operators } };
  const id = useId();
  const value = valueProp?.kind === field.kind ? valueProp : emptyFilterValue(field.kind);

  let body: ReactNode = null;
  switch (value.kind) {
    case 'enum': body = <EnumBody field={field} value={value} onChange={onValueChange} labels={labels} threshold={searchThreshold} />; break;
    case 'reference': body = <ReferenceBody field={field} value={value} onChange={onValueChange} labels={labels} delay={searchDelay} />; break;
    case 'text': {
      const ops = (field.operators as readonly TextFilterOperator[] | undefined) ?? TEXT_FILTER_OPERATORS;
      body = (
        <div className="uix-filter-editor__row">
          {ops.length > 1 && <Select size="sm" aria-label={labels.operator} value={value.operator} onChange={(e) => onValueChange({ ...value, operator: e.currentTarget.value as TextFilterOperator })}>{ops.map((op) => <option key={op} value={op}>{labels.operators[op]}</option>)}</Select>}
          <Input aria-label={labels.value} value={value.text} onChange={(e) => onValueChange({ ...value, text: e.currentTarget.value })} onKeyDown={(e) => { if (e.key === 'Enter') onApply(); }} autoFocus />
        </div>
      );
      break;
    }
    case 'number': {
      const ops = (field.operators as readonly NumberFilterOperator[] | undefined) ?? NUMBER_FILTER_OPERATORS;
      const toNumber = (raw: string) => (raw.trim() === '' ? undefined : Number(raw));
      body = (
        <div className="uix-filter-editor__row">
          {ops.length > 1 && <Select size="sm" aria-label={labels.operator} value={value.operator} onChange={(e) => onValueChange({ ...value, operator: e.currentTarget.value as NumberFilterOperator })}>{ops.map((op) => <option key={op} value={op}>{labels.operators[op]}</option>)}</Select>}
          <Input type="number" inputMode="decimal" aria-label={value.operator === 'between' ? labels.from : labels.value} value={value.value ?? ''} onChange={(e) => onValueChange({ ...value, value: toNumber(e.currentTarget.value) })} autoFocus />
          {value.operator === 'between' && <><span className="uix-filter-editor__and">{labels.and}</span><Input type="number" inputMode="decimal" aria-label={labels.to} value={value.to ?? ''} onChange={(e) => onValueChange({ ...value, to: toNumber(e.currentTarget.value) })} /></>}
          {field.unit && <span className="uix-filter-editor__unit">{field.unit}</span>}
        </div>
      );
      break;
    }
    case 'date-range':
      body = (
        <div className="uix-filter-editor__row">
          <label className="uix-filter-editor__date"><span>{labels.from}</span><Input type="date" value={value.from ?? ''} max={value.to} onChange={(e) => onValueChange({ ...value, from: e.currentTarget.value || undefined })} /></label>
          <label className="uix-filter-editor__date"><span>{labels.to}</span><Input type="date" value={value.to ?? ''} min={value.from} onChange={(e) => onValueChange({ ...value, to: e.currentTarget.value || undefined })} /></label>
        </div>
      );
      break;
    case 'boolean': {
      const pick = (v: boolean | undefined) => onValueChange({ kind: 'boolean', value: v });
      body = (
        <RadioGroup className="uix-filter-editor__choices">
          <Radio name={`${id}-bool`} label={labels.any} checked={value.value === undefined} onChange={() => pick(undefined)} />
          <Radio name={`${id}-bool`} label={field.trueLabel ?? labels.yes} checked={value.value === true} onChange={() => pick(true)} />
          <Radio name={`${id}-bool`} label={field.falseLabel ?? labels.no} checked={value.value === false} onChange={() => pick(false)} />
        </RadioGroup>
      );
      break;
    }
  }

  return (
    <div className="uix-filter-popover uix-filter-editor" role="group" aria-labelledby={`${id}-label`} data-kind={field.kind}>
      <div id={`${id}-label`} className="uix-filter-editor__label">{field.label}</div>
      {body}
      <div className="uix-filter-popover__actions">
        <Button type="button" size="sm" onClick={onClear}>{labels.clear}</Button>
        <Button type="button" size="sm" variant="primary" onClick={onApply}>{labels.apply}</Button>
      </div>
    </div>
  );
}

function EnumBody({ field, value, onChange, labels, threshold }: { field: FilterField; value: Extract<FilterValue, { kind: 'enum' }>; onChange: (v: FilterValue) => void; labels: FilterEditorLabels; threshold: number }) {
  const [query, setQuery] = useState('');
  const options = field.options ?? [];
  const shown = useMemo(() => {
    const q = foldForSearch(query.trim()).text;
    return q ? options.filter((o) => foldForSearch(o.label).text.includes(q)) : options;
  }, [options, query]);
  const selected = new Set(value.values);
  const toggle = (v: string, on: boolean) => onChange({ kind: 'enum', values: on ? [...value.values, v] : value.values.filter((x) => x !== v) });
  return (
    <>
      {options.length > threshold && <Input type="search" size="sm" aria-label={labels.search} placeholder={labels.search} value={query} onChange={(e) => setQuery(e.currentTarget.value)} autoFocus />}
      <div className="uix-filter-editor__bulk">
        <span className="uix-filter-editor__count" aria-live="polite">{fillLabel(labels.selected, { count: value.values.length })}</span>
        <Button type="button" variant="link" size="sm" onClick={() => onChange({ kind: 'enum', values: [...new Set([...value.values, ...shown.map((o) => o.value)])] })}>{labels.selectAll}</Button>
        <Button type="button" variant="link" size="sm" onClick={() => onChange({ kind: 'enum', values: [] })}>{labels.selectNone}</Button>
      </div>
      <div className="uix-filter-editor__list">
        {shown.length === 0 ? <p className="uix-filter-editor__note">{labels.noMatches}</p>
          : shown.map((o) => <Checkbox key={o.value} label={o.label} checked={selected.has(o.value)} onChange={(e) => toggle(o.value, e.currentTarget.checked)} />)}
      </div>
    </>
  );
}

function ReferenceBody({ field, value, onChange, labels, delay }: { field: FilterField; value: Extract<FilterValue, { kind: 'reference' }>; onChange: (v: FilterValue) => void; labels: FilterEditorLabels; delay: number }) {
  const [query, setQuery] = useState('');
  const [state, setState] = useState<{ status: 'idle' | 'loading' | 'done' | 'error'; results: readonly FilterChoice[] }>({ status: 'idle', results: [] });
  const [attempt, setAttempt] = useState(0);
  const latest = useRef(0);
  useEffect(() => {
    if (!field.onSearch) return;
    const run = ++latest.current;
    const timer = window.setTimeout(() => {
      setState((s) => ({ ...s, status: 'loading' }));
      field.onSearch!(query.trim()).then(
        (results) => { if (run === latest.current) setState({ status: 'done', results }); },
        () => { if (run === latest.current) setState({ status: 'error', results: [] }); },
      );
    }, delay);
    return () => window.clearTimeout(timer);
  }, [query, attempt, field, delay]);
  const chosen = new Map(value.values.map((v) => [v.value, v]));
  const toggle = (choice: FilterChoice, on: boolean) => onChange({ kind: 'reference', values: on ? [...value.values, choice] : value.values.filter((v) => v.value !== choice.value) });
  return (
    <>
      {value.values.length > 0 && (
        <div className="uix-chip-group" role="group" aria-label={fillLabel(labels.selected, { count: value.values.length })}>
          {value.values.map((v) => <Chip key={v.value} removeLabel={fillLabel(labels.remove, { label: v.label })} onRemove={() => toggle(v, false)}>{v.label}</Chip>)}
        </div>
      )}
      <Input type="search" size="sm" aria-label={labels.search} placeholder={labels.search} value={query} onChange={(e) => setQuery(e.currentTarget.value)} autoFocus />
      <div className="uix-filter-editor__list" aria-busy={state.status === 'loading' || undefined}>
        {state.status === 'loading' && <p className="uix-filter-editor__note" role="status">{labels.searching}</p>}
        {state.status === 'error' && <p className="uix-filter-editor__note" role="alert">{labels.searchFailed} <Button type="button" variant="link" size="sm" onClick={() => setAttempt((n) => n + 1)}>{labels.retry}</Button></p>}
        {state.status === 'done' && state.results.length === 0 && <p className="uix-filter-editor__note">{labels.noMatches}</p>}
        {state.status === 'done' && state.results.map((r) => <Checkbox key={r.value} label={r.label} checked={chosen.has(r.value)} onChange={(e) => toggle(r, e.currentTarget.checked)} />)}
      </div>
    </>
  );
}
