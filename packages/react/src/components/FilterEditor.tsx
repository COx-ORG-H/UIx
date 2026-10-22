"use client";

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { ClipboardEvent, KeyboardEvent, ReactNode } from 'react';
import { Button } from './Button.js';
import { Checkbox } from './Checkbox.js';
import { Input } from './Input.js';
import { Radio, RadioGroup } from './Radio.js';
import { Select } from './Select.js';
import { Chip } from './Chip.js';
import { fillLabel } from '../fill-label.js';
import { useUixLabels } from '../labels-context.js';
import { foldForSearch } from '../search-suggest-model.js';
import { DATE_FILTER_OPERATORS, NUMBER_FILTER_OPERATORS, TEXT_FILTER_OPERATORS, emptyFilterValue, isUnresolvedChoice, matchFilterPreset } from '../filter-model.js';
import type { DateFilterOperator, FilterChoice, FilterField, FilterValue, NumberFilterOperator, TextFilterOperator } from '../filter-model.js';

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
  /** Names the row of `field.presets` chips. Optional so existing label objects still type-check; default "Presets". */
  presets?: string;
  /** `tags` (HAR-1832): the field that takes a new value, and its hint. Optional, like `presets`. */
  addTag?: string;
  /** `tags`: how to add one, read with the field. */
  addTagHint?: string;
  /** `date` (HAR-1832): the date of on / before / after. Optional, like `presets`. */
  date?: string;
  operators: Record<TextFilterOperator | NumberFilterOperator, string>;
  /** `date` conditions (HAR-1832). Optional, like `presets`. */
  dateOperators?: Partial<Record<DateFilterOperator, string>>;
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
  presets: 'Presets',
  addTag: 'Add a value',
  addTagHint: 'Enter or a comma adds it.',
  date: 'Date',
  dateOperators: { on: 'on', before: 'before', after: 'after', between: 'between' },
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
  /**
   * Apply the filter: the Apply button, or Enter in any field (HAR-1832). Gets the value to
   * apply, which already holds a tag still being typed: read it rather than your state, which
   * has not caught up when Enter applies in the same event.
   */
  onApply: (value: FilterValue) => void;
  onClear: () => void;
  labels?: Partial<FilterEditorLabels>;
  /** Show an option filter above an enum list once it has more options than this. Default 8. */
  searchThreshold?: number;
  /** Delay before a reference search runs, in ms. Default 250. */
  searchDelay?: number;
}

/**
 * Editor content for one typed column filter (HAR-1365; TENSOR C6, MOTUS C-1): an enum
 * multi-select, text or number with a condition, a date range, a date with a condition
 * (on / before / after / between), yes/no, free-text tags, or records found by an async search
 * (restored ids get their labels from `field.resolveLabels`). Enter applies in every kind. The product owns the popover trigger and the query; `summarizeFilter`
 * turns the applied value into the chip text. `FilterPopover` stays for the one-string case.
 * An enum field's `presets` (HAR-1505) render as toggle chips above its options. Words come
 * from `labels`, or from `UixLabelsProvider`'s `filterEditor` entry.
 */
export function FilterEditor({ field, value: valueProp, onValueChange, onApply, onClear, labels: labelOverrides, searchThreshold = 8, searchDelay = 250 }: FilterEditorProps) {
  const provided = useUixLabels().filterEditor;
  const labels: FilterEditorLabels = {
    ...DEFAULT_FILTER_EDITOR_LABELS, ...provided, ...labelOverrides,
    operators: { ...DEFAULT_FILTER_EDITOR_LABELS.operators, ...provided?.operators, ...labelOverrides?.operators },
    dateOperators: { ...DEFAULT_FILTER_EDITOR_LABELS.dateOperators, ...provided?.dateOperators, ...labelOverrides?.dateOperators },
  };
  const id = useId();
  let value = valueProp?.kind === field.kind ? valueProp : emptyFilterValue(field.kind);
  // A date condition the field does not offer (the empty value's `on`) becomes its first one.
  if (value.kind === 'date' && field.dateOperators?.length && !field.dateOperators.includes(value.operator)) value = { ...value, operator: field.dateOperators[0] };
  /** A tag typed but not yet committed: Apply and Enter take it along (set by TagsBody). */
  const pendingTag = useRef<() => FilterValue | undefined>(() => undefined);
  const apply = () => onApply(pendingTag.current() ?? value);
  // Enter applies in every kind (HAR-1832), not only in the text field. A control that uses Enter
  // itself (a button, an open list, a tag being added) prevents it first; an IME commit does not apply.
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' || event.defaultPrevented || event.nativeEvent.isComposing || event.keyCode === 229) return;
    const target = event.target as HTMLElement;
    if (target.closest('button, a, textarea, [role="option"], [role="listbox"], [aria-expanded="true"]')) return;
    event.preventDefault();
    apply();
  };

  let body: ReactNode = null;
  switch (value.kind) {
    case 'enum': body = <EnumBody field={field} value={value} onChange={onValueChange} labels={labels} threshold={searchThreshold} />; break;
    case 'reference': body = <ReferenceBody field={field} value={value} onChange={onValueChange} labels={labels} delay={searchDelay} />; break;
    case 'tags': body = <TagsBody value={value} onChange={onValueChange} labels={labels} pending={pendingTag} id={id} />; break;
    case 'date': {
      const ops = field.dateOperators ?? DATE_FILTER_OPERATORS;
      const words = labels.dateOperators ?? {};
      const between = value.operator === 'between';
      body = (
        <div className="uix-filter-editor__row">
          {ops.length > 1 && (
            <Select size="sm" aria-label={labels.operator} value={value.operator} onChange={(e) => onValueChange({ ...value, operator: e.currentTarget.value as DateFilterOperator, ...(e.currentTarget.value === 'between' ? {} : { to: undefined }) })}>
              {ops.map((op) => <option key={op} value={op}>{words[op] ?? DEFAULT_FILTER_EDITOR_LABELS.dateOperators![op]}</option>)}
            </Select>
          )}
          <label className="uix-filter-editor__date"><span>{between ? labels.from : labels.date ?? DEFAULT_FILTER_EDITOR_LABELS.date}</span><Input type="date" value={value.from ?? ''} max={between ? value.to : undefined} onChange={(e) => onValueChange({ ...value, from: e.currentTarget.value || undefined })} autoFocus /></label>
          {between && <label className="uix-filter-editor__date"><span>{labels.to}</span><Input type="date" value={value.to ?? ''} min={value.from} onChange={(e) => onValueChange({ ...value, to: e.currentTarget.value || undefined })} /></label>}
        </div>
      );
      break;
    }
    case 'text': {
      const ops = (field.operators as readonly TextFilterOperator[] | undefined) ?? TEXT_FILTER_OPERATORS;
      body = (
        <div className="uix-filter-editor__row">
          {ops.length > 1 && <Select size="sm" aria-label={labels.operator} value={value.operator} onChange={(e) => onValueChange({ ...value, operator: e.currentTarget.value as TextFilterOperator })}>{ops.map((op) => <option key={op} value={op}>{labels.operators[op]}</option>)}</Select>}
          <Input aria-label={labels.value} value={value.text} onChange={(e) => onValueChange({ ...value, text: e.currentTarget.value })} autoFocus />
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
    <div className="uix-filter-popover uix-filter-editor" role="group" aria-labelledby={`${id}-label`} data-kind={field.kind} onKeyDown={onKeyDown}>
      <div id={`${id}-label`} className="uix-filter-editor__label">{field.label}</div>
      {body}
      <div className="uix-filter-popover__actions">
        <Button type="button" size="sm" onClick={onClear}>{labels.clear}</Button>
        <Button type="button" size="sm" variant="primary" onClick={apply}>{labels.apply}</Button>
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
  const presets = field.presets ?? [];
  const active = matchFilterPreset(field, value);
  return (
    <>
      {presets.length > 0 && (
        <div className="uix-chip-group uix-filter-editor__presets" role="group" aria-label={labels.presets ?? DEFAULT_FILTER_EDITOR_LABELS.presets}>
          {presets.map((p) => <Chip key={p.id} pressed={p === active} onPressedChange={() => onChange({ kind: 'enum', values: [...p.values] })}>{p.label}</Chip>)}
        </div>
      )}
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
  const [slow, setSlow] = useState(false);
  const latest = useRef(0);
  // The latest functions, so a field object rebuilt on every render does not search again (HAR-1832):
  // the search re-runs for a new query, a retry, or another field.
  const search = useRef(field.onSearch);
  search.current = field.onSearch;
  const resolve = useRef(field.resolveLabels);
  resolve.current = field.resolveLabels;
  useEffect(() => {
    if (!search.current) return;
    const run = ++latest.current;
    const timer = window.setTimeout(() => {
      // The results on show stay while the next ones load; the note waits 300 ms.
      setState((s) => ({ ...s, status: 'loading' }));
      search.current!(query.trim()).then(
        (results) => { if (run === latest.current) setState({ status: 'done', results }); },
        () => { if (run === latest.current) setState({ status: 'error', results: [] }); },
      );
    }, delay);
    return () => window.clearTimeout(timer);
  }, [query, attempt, field.id, delay]);
  useEffect(() => {
    if (state.status !== 'loading') { setSlow(false); return; }
    const timer = window.setTimeout(() => setSlow(true), 300);
    return () => window.clearTimeout(timer);
  }, [state.status]);

  // Ids restored from a saved view arrive without labels: ask once per set of unknown ids.
  const [known, setKnown] = useState<ReadonlyMap<string, string>>(new Map());
  /** Ids the resolver has answered for, named or not: an id it does not know is not asked again. */
  const answered = useRef(new Set<string>());
  /** One request per set of ids, so StrictMode's second effect run reuses the first. */
  const requests = useRef(new Map<string, Promise<readonly FilterChoice[]>>());
  const unresolved = value.values.filter((v) => isUnresolvedChoice(v) && !known.has(v.value) && !answered.current.has(v.value)).map((v) => v.value);
  const unresolvedKey = unresolved.join('\u0000');
  useEffect(() => {
    if (!unresolvedKey || !resolve.current) return;
    let live = true;
    const ids = unresolvedKey.split('\u0000');
    let request = requests.current.get(unresolvedKey);
    if (!request) { request = resolve.current(ids); requests.current.set(unresolvedKey, request); }
    const settle = (choices: readonly FilterChoice[]) => {
      for (const id of ids) answered.current.add(id);
      if (live) setKnown((prev) => new Map([...prev, ...choices.map((c) => [c.value, c.label] as const)]));
    };
    // A failed lookup keeps the ids: the chips still work.
    request.then(settle, () => settle([]));
    return () => { live = false; };
  }, [unresolvedKey, field.id]);
  const labelled = (v: FilterChoice): FilterChoice => (isUnresolvedChoice(v) && known.has(v.value) ? { value: v.value, label: known.get(v.value)! } : v);
  const values = value.values.map(labelled);

  const chosen = new Map(values.map((v) => [v.value, v]));
  const toggle = (choice: FilterChoice, on: boolean) => onChange({ kind: 'reference', values: on ? [...values, choice] : values.filter((v) => v.value !== choice.value) });
  const showResults = state.status === 'done' || (state.status === 'loading' && state.results.length > 0);
  return (
    <>
      {values.length > 0 && (
        <div className="uix-chip-group" role="group" aria-label={fillLabel(labels.selected, { count: values.length })}>
          {values.map((v) => <Chip key={v.value} removeLabel={fillLabel(labels.remove, { label: v.label })} onRemove={() => toggle(v, false)}>{v.label}</Chip>)}
        </div>
      )}
      <Input type="search" size="sm" aria-label={labels.search} placeholder={labels.search} value={query} onChange={(e) => setQuery(e.currentTarget.value)} autoFocus />
      <div className="uix-filter-editor__list" aria-busy={state.status === 'loading' || undefined}>
        {state.status === 'loading' && slow && <p className="uix-filter-editor__note" role="status">{labels.searching}</p>}
        {state.status === 'error' && <p className="uix-filter-editor__note" role="alert">{labels.searchFailed} <Button type="button" variant="link" size="sm" onClick={() => setAttempt((n) => n + 1)}>{labels.retry}</Button></p>}
        {state.status === 'done' && state.results.length === 0 && <p className="uix-filter-editor__note">{labels.noMatches}</p>}
        {showResults && state.results.map((r) => <Checkbox key={r.value} label={r.label} checked={chosen.has(r.value)} onChange={(e) => toggle(r, e.currentTarget.checked)} />)}
      </div>
    </>
  );
}

/** Splits typed or pasted text into tags: at commas and line breaks, trimmed, no empties. */
const splitTags = (text: string) => text.split(/[,\n]/).map((t) => t.trim()).filter(Boolean);

function TagsBody({ value, onChange, labels, pending, id }: {
  value: Extract<FilterValue, { kind: 'tags' }>; onChange: (v: FilterValue) => void; labels: FilterEditorLabels;
  pending: { current: () => FilterValue | undefined }; id: string;
}) {
  const [draft, setDraft] = useState('');
  const field = useRef<HTMLInputElement>(null);
  const withTags = (tags: string[]): FilterValue => ({ kind: 'tags', values: [...value.values, ...tags.filter((t, i) => !value.values.includes(t) && tags.indexOf(t) === i)] });
  // Apply (the button or Enter on an empty field) takes a tag still being typed along.
  pending.current = () => (splitTags(draft).length ? withTags(splitTags(draft)) : undefined);
  const commit = (text: string) => {
    const tags = splitTags(text);
    if (tags.length) onChange(withTags(tags));
    setDraft('');
  };
  const remove = (tag: string) => {
    onChange({ kind: 'tags', values: value.values.filter((t) => t !== tag) });
    field.current?.focus();
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;
    // Enter or a comma adds the typed value; Enter on an empty field applies (the editor's handler).
    if ((event.key === 'Enter' || event.key === ',') && draft.trim()) {
      event.preventDefault();
      commit(draft);
    } else if (event.key === ',') {
      event.preventDefault();
    } else if (event.key === 'Backspace' && draft === '' && value.values.length > 0) {
      onChange({ kind: 'tags', values: value.values.slice(0, -1) });
    }
  };
  const onPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const text = event.clipboardData.getData('text');
    if (!/[,\n]/.test(text)) return;
    event.preventDefault();
    commit(`${draft}${text}`);
  };
  return (
    <div className="uix-taginput uix-filter-editor__tags">
      {value.values.map((tag) => (
        <span key={tag} className="uix-tag">
          {tag}
          <button type="button" className="uix-tag__remove" aria-label={fillLabel(labels.remove, { label: tag })} onClick={() => remove(tag)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </span>
      ))}
      <input
        ref={field}
        className="uix-taginput__field"
        aria-label={labels.addTag ?? DEFAULT_FILTER_EDITOR_LABELS.addTag}
        aria-describedby={`${id}-tags-hint`}
        placeholder={labels.addTag ?? DEFAULT_FILTER_EDITOR_LABELS.addTag}
        value={draft}
        enterKeyHint="enter"
        onChange={(e) => setDraft(e.currentTarget.value)}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
        autoFocus
      />
      <span id={`${id}-tags-hint`} className="uix-visually-hidden">{labels.addTagHint ?? DEFAULT_FILTER_EDITOR_LABELS.addTagHint}</span>
    </div>
  );
}
