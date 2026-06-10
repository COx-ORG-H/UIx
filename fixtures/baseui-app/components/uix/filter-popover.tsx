'use client';

/* @uix registry item — ported from @itsmx/shared-ui/src/filter-popover.tsx */

import { Check, ChevronDown, X } from 'lucide-react';
import { type ChangeEvent, type ReactNode, useEffect, useRef, useState } from 'react';
import { cn } from './utils';

/**
 * Discriminated filter popover for per-column table filtering. One
 * component renders the input panel for any of the 7 filter kinds; the
 * calling toolbar manages anchor positioning + open state.
 *
 * Filter value shape is designed to round-trip through a saved-view
 * persistence layer in the consumer app — a popover can be opened with
 * a previously-saved value and emits a value the same shape.
 *
 * Pure presentational. The consumer wires the reference autocomplete
 * (`ReferenceFilterProps.onSearch`) and the enum option labels
 * (`EnumFilterProps.options`) — the popover never reads from a
 * directory or a registry.
 */

// -- discriminated value union ----------------------------------------

export type FilterValue =
  | { kind: 'enum'; values: string[] }
  | {
      kind: 'text';
      mode: 'contains' | 'equals' | 'starts_with';
      value: string;
    }
  | {
      kind: 'date';
      mode: 'on' | 'before' | 'after' | 'between';
      value: string | [string, string];
    }
  | {
      kind: 'numeric';
      mode: 'eq' | 'lt' | 'gt' | 'between';
      value: number | [number, number];
    }
  | { kind: 'reference'; values: string[] }
  | { kind: 'boolean'; value: boolean }
  | { kind: 'multi_value'; values: string[] };

export type FilterKind = FilterValue['kind'];

// -- per-kind props ----------------------------------------------------

interface BasePopoverProps {
  /** Resolver-passed labels — defaults are English-only. */
  applyLabel?: ReactNode;
  cancelLabel?: ReactNode;
  clearLabel?: ReactNode;
  onApply: (value: FilterValue | undefined) => void;
  onCancel: () => void;
  className?: string;
}

export interface EnumFilterProps extends BasePopoverProps {
  kind: 'enum';
  /** Resolver-passed `{value, label}` options. Caller resolves them. */
  options: ReadonlyArray<{ value: string; label: ReactNode }>;
  initial?: ReadonlyArray<string>;
}

export interface TextFilterProps extends BasePopoverProps {
  kind: 'text';
  initial?: { mode?: 'contains' | 'equals' | 'starts_with'; value?: string };
  /** Resolver-passed placeholder. */
  placeholder?: string;
}

export interface DateFilterProps extends BasePopoverProps {
  kind: 'date';
  initial?: {
    mode?: 'on' | 'before' | 'after' | 'between';
    value?: string | [string, string];
  };
}

export interface NumericFilterProps extends BasePopoverProps {
  kind: 'numeric';
  initial?: {
    mode?: 'eq' | 'lt' | 'gt' | 'between';
    value?: number | [number, number];
  };
}

export interface ReferenceFilterProps extends BasePopoverProps {
  kind: 'reference';
  initial?: ReadonlyArray<string>;
  /**
   * Async option fetcher. Consumer-provided so the popover can search
   * the user / group / CI directory without coupling to a specific
   * tRPC client. Returns `{value, label}` shape; popover renders
   * labels and stores values.
   */
  onSearch: (query: string) => Promise<ReadonlyArray<{ value: string; label: ReactNode }>>;
  /** Resolver-passed placeholder. */
  placeholder?: string;
}

export interface BooleanFilterProps extends BasePopoverProps {
  kind: 'boolean';
  initial?: boolean;
  /** Resolver-passed labels. */
  trueLabel?: ReactNode;
  falseLabel?: ReactNode;
  anyLabel?: ReactNode;
}

export interface MultiValueFilterProps extends BasePopoverProps {
  kind: 'multi_value';
  initial?: ReadonlyArray<string>;
  /** Resolver-passed placeholder. */
  placeholder?: string;
}

export type FilterPopoverProps =
  | EnumFilterProps
  | TextFilterProps
  | DateFilterProps
  | NumericFilterProps
  | ReferenceFilterProps
  | BooleanFilterProps
  | MultiValueFilterProps;

// -- shared styles -----------------------------------------------------

const panelCls = 'flex w-72 max-w-[90vw] flex-col gap-3 rounded-md border p-3 shadow-md';
const panelStyle = {
  background: 'rgb(var(--surface))',
  borderColor: 'var(--border-strong)',
  color: 'rgb(var(--text-primary))',
};
const inputCls = 'block h-9 w-full rounded-md border px-3 text-sm tabular-nums';
const inputStyle = {
  background: 'rgb(var(--surface))',
  color: 'rgb(var(--text-primary))',
  borderColor: 'var(--border-strong)',
};
const selectCls = inputCls;
const primaryBtnCls =
  'inline-flex h-8 items-center justify-center rounded-md px-3 text-xs disabled:cursor-not-allowed disabled:opacity-50';
const secondaryBtnCls =
  'inline-flex h-8 items-center justify-center rounded-md border px-3 text-xs';

// -- root component ----------------------------------------------------

export function FilterPopover(props: FilterPopoverProps) {
  switch (props.kind) {
    case 'enum':
      return <EnumPopover {...props} />;
    case 'text':
      return <TextPopover {...props} />;
    case 'date':
      return <DatePopover {...props} />;
    case 'numeric':
      return <NumericPopover {...props} />;
    case 'reference':
      return <ReferencePopover {...props} />;
    case 'boolean':
      return <BooleanPopover {...props} />;
    case 'multi_value':
      return <MultiValuePopover {...props} />;
  }
}

function Footer({
  onApply,
  onCancel,
  onClear,
  applyLabel = 'Apply',
  cancelLabel = 'Cancel',
  clearLabel = 'Clear',
  applyDisabled,
}: {
  onApply: () => void;
  onCancel: () => void;
  // Accept explicit `undefined` so callers can pass conditional handlers
  // without spreading. exactOptionalPropertyTypes treats `?:` as "may be
  // omitted" but NOT "may be undefined"; we need the union to allow both.
  onClear?: (() => void) | undefined;
  applyLabel?: ReactNode | undefined;
  cancelLabel?: ReactNode | undefined;
  clearLabel?: ReactNode | undefined;
  applyDisabled?: boolean | undefined;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      {onClear ? (
        <button
          type="button"
          onClick={onClear}
          className="text-xs underline decoration-dotted underline-offset-4"
          style={{ color: 'rgb(var(--text-hushed))' }}
        >
          {clearLabel}
        </button>
      ) : (
        <span />
      )}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onCancel}
          className={secondaryBtnCls}
          style={{
            background: 'rgb(var(--surface))',
            color: 'rgb(var(--text-primary))',
            borderColor: 'var(--border-strong)',
          }}
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onApply}
          disabled={applyDisabled}
          className={primaryBtnCls}
          style={{ background: 'rgb(var(--accent))', color: 'rgb(var(--accent-fg))' }}
        >
          {applyLabel}
        </button>
      </div>
    </div>
  );
}

// -- Enum --------------------------------------------------------------

function EnumPopover(props: EnumFilterProps) {
  const [selected, setSelected] = useState<string[]>(() => props.initial?.slice() ?? []);
  const toggle = (v: string) => {
    setSelected((cur) => (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]));
  };
  return (
    <div
      className={cn(panelCls, props.className)}
      style={panelStyle}
      role="dialog"
      data-kind="enum"
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          props.onApply(selected.length > 0 ? { kind: 'enum', values: selected } : undefined);
        }
      }}
    >
      <ul
        className="flex max-h-64 flex-col gap-1 overflow-y-auto"
        // biome-ignore lint/a11y/useSemanticElements: <select multiple> would lose the styled checkbox UI; ARIA listbox is the documented headless equivalent + WAI-ARIA Authoring Practices reference pattern.
        role="listbox"
        aria-multiselectable="true"
      >
        {props.options.map((o) => {
          const checked = selected.includes(o.value);
          return (
            <li key={o.value}>
              <button
                type="button"
                role="option"
                aria-selected={checked}
                onClick={() => toggle(o.value)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-[rgb(var(--bg-hover))]"
                style={{ color: 'rgb(var(--text-primary))' }}
              >
                <span
                  aria-hidden="true"
                  className="inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border"
                  style={{
                    borderColor: 'var(--border-strong)',
                    background: checked ? 'rgb(var(--accent))' : 'transparent',
                    color: 'rgb(var(--accent-fg))',
                  }}
                >
                  {checked ? <Check size={12} strokeWidth={2.5} /> : null}
                </span>
                <span className="truncate">{o.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <Footer
        onApply={() =>
          props.onApply(selected.length > 0 ? { kind: 'enum', values: selected } : undefined)
        }
        onCancel={props.onCancel}
        onClear={selected.length > 0 ? () => setSelected([]) : undefined}
        applyLabel={props.applyLabel}
        cancelLabel={props.cancelLabel}
        clearLabel={props.clearLabel}
      />
    </div>
  );
}

// -- Text --------------------------------------------------------------

function TextPopover(props: TextFilterProps) {
  const [mode, setMode] = useState<'contains' | 'equals' | 'starts_with'>(
    props.initial?.mode ?? 'contains',
  );
  const [value, setValue] = useState<string>(props.initial?.value ?? '');
  return (
    <div
      className={cn(panelCls, props.className)}
      style={panelStyle}
      role="dialog"
      data-kind="text"
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          props.onApply(value.trim() ? { kind: 'text', mode, value } : undefined);
        }
      }}
    >
      <select
        value={mode}
        onChange={(e: ChangeEvent<HTMLSelectElement>) =>
          setMode(e.target.value as 'contains' | 'equals' | 'starts_with')
        }
        className={selectCls}
        style={inputStyle}
        aria-label="Match mode"
      >
        <option value="contains">contains</option>
        <option value="equals">equals</option>
        <option value="starts_with">starts with</option>
      </select>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={props.placeholder}
        className={inputCls}
        style={inputStyle}
        autoFocus
      />
      <Footer
        onApply={() => props.onApply(value.trim() ? { kind: 'text', mode, value } : undefined)}
        onCancel={props.onCancel}
        onClear={value.length > 0 ? () => setValue('') : undefined}
        applyLabel={props.applyLabel}
        cancelLabel={props.cancelLabel}
        clearLabel={props.clearLabel}
      />
    </div>
  );
}

// -- Date --------------------------------------------------------------

function DatePopover(props: DateFilterProps) {
  const [mode, setMode] = useState<'on' | 'before' | 'after' | 'between'>(
    props.initial?.mode ?? 'on',
  );
  const initial = props.initial?.value;
  const initialA = typeof initial === 'string' ? initial : (initial?.[0] ?? '');
  const initialB = Array.isArray(initial) ? (initial[1] ?? '') : '';
  const [a, setA] = useState<string>(initialA);
  const [b, setB] = useState<string>(initialB);

  const apply = () => {
    if (!a) return props.onApply(undefined);
    if (mode === 'between') {
      if (!b) return props.onApply(undefined);
      return props.onApply({ kind: 'date', mode, value: [a, b] });
    }
    props.onApply({ kind: 'date', mode, value: a });
  };

  return (
    <div
      className={cn(panelCls, props.className)}
      style={panelStyle}
      role="dialog"
      data-kind="date"
    >
      <select
        value={mode}
        onChange={(e: ChangeEvent<HTMLSelectElement>) =>
          setMode(e.target.value as 'on' | 'before' | 'after' | 'between')
        }
        className={selectCls}
        style={inputStyle}
        aria-label="Date mode"
      >
        <option value="on">on</option>
        <option value="before">before</option>
        <option value="after">after</option>
        <option value="between">between</option>
      </select>
      <input
        type="date"
        value={a}
        onChange={(e) => setA(e.target.value)}
        className={inputCls}
        style={inputStyle}
        aria-label="Date"
      />
      {mode === 'between' ? (
        <input
          type="date"
          value={b}
          onChange={(e) => setB(e.target.value)}
          className={inputCls}
          style={inputStyle}
          aria-label="Date end"
        />
      ) : null}
      <Footer
        onApply={apply}
        onCancel={props.onCancel}
        onClear={
          a || b
            ? () => {
                setA('');
                setB('');
              }
            : undefined
        }
        applyLabel={props.applyLabel}
        cancelLabel={props.cancelLabel}
        clearLabel={props.clearLabel}
      />
    </div>
  );
}

// -- Numeric -----------------------------------------------------------

function NumericPopover(props: NumericFilterProps) {
  const [mode, setMode] = useState<'eq' | 'lt' | 'gt' | 'between'>(props.initial?.mode ?? 'eq');
  const initial = props.initial?.value;
  const initialA =
    typeof initial === 'number'
      ? String(initial)
      : String(Array.isArray(initial) ? initial[0] : '');
  const initialB = Array.isArray(initial) ? String(initial[1]) : '';
  const [a, setA] = useState<string>(initialA);
  const [b, setB] = useState<string>(initialB);

  const apply = () => {
    const na = Number.parseFloat(a);
    if (Number.isNaN(na)) return props.onApply(undefined);
    if (mode === 'between') {
      const nb = Number.parseFloat(b);
      if (Number.isNaN(nb)) return props.onApply(undefined);
      return props.onApply({ kind: 'numeric', mode, value: [na, nb] });
    }
    props.onApply({ kind: 'numeric', mode, value: na });
  };

  return (
    <div
      className={cn(panelCls, props.className)}
      style={panelStyle}
      role="dialog"
      data-kind="numeric"
    >
      <select
        value={mode}
        onChange={(e: ChangeEvent<HTMLSelectElement>) =>
          setMode(e.target.value as 'eq' | 'lt' | 'gt' | 'between')
        }
        className={selectCls}
        style={inputStyle}
        aria-label="Numeric mode"
      >
        <option value="eq">=</option>
        <option value="lt">&lt;</option>
        <option value="gt">&gt;</option>
        <option value="between">between</option>
      </select>
      <input
        type="number"
        value={a}
        onChange={(e) => setA(e.target.value)}
        className={inputCls}
        style={inputStyle}
        aria-label="Number"
      />
      {mode === 'between' ? (
        <input
          type="number"
          value={b}
          onChange={(e) => setB(e.target.value)}
          className={inputCls}
          style={inputStyle}
          aria-label="Number end"
        />
      ) : null}
      <Footer
        onApply={apply}
        onCancel={props.onCancel}
        onClear={
          a || b
            ? () => {
                setA('');
                setB('');
              }
            : undefined
        }
        applyLabel={props.applyLabel}
        cancelLabel={props.cancelLabel}
        clearLabel={props.clearLabel}
      />
    </div>
  );
}

// -- Reference (async autocomplete) -----------------------------------

function ReferencePopover(props: ReferenceFilterProps) {
  const [query, setQuery] = useState<string>('');
  const [selected, setSelected] = useState<string[]>(() => props.initial?.slice() ?? []);
  const [labelById, setLabelById] = useState<Record<string, ReactNode>>({});
  const [options, setOptions] = useState<ReadonlyArray<{ value: string; label: ReactNode }>>([]);
  const [loading, setLoading] = useState(false);
  const reqIdRef = useRef(0);

  useEffect(() => {
    const myReq = ++reqIdRef.current;
    setLoading(true);
    props.onSearch(query).then((r) => {
      if (myReq !== reqIdRef.current) return;
      setOptions(r);
      // Cache labels so already-selected ids render their human label
      // even after the user types a query that excludes them.
      setLabelById((cur) => {
        const next = { ...cur };
        for (const opt of r) next[opt.value] = opt.label;
        return next;
      });
      setLoading(false);
    });
  }, [query, props.onSearch]);

  const toggle = (v: string) => {
    setSelected((cur) => (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]));
  };

  return (
    <div
      className={cn(panelCls, props.className)}
      style={panelStyle}
      role="dialog"
      data-kind="reference"
    >
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={props.placeholder ?? 'Search…'}
        className={inputCls}
        style={inputStyle}
        autoFocus
        aria-label="Search references"
      />
      {selected.length > 0 ? (
        <ul className="flex flex-wrap gap-1" aria-label="Selected">
          {selected.map((id) => (
            <li
              key={id}
              className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs"
              style={{ borderColor: 'var(--border)' }}
            >
              <span className="truncate">{labelById[id] ?? id}</span>
              <button
                type="button"
                onClick={() => toggle(id)}
                aria-label="Remove"
                className="inline-flex h-4 w-4 items-center justify-center"
                style={{ color: 'rgb(var(--text-hushed))' }}
              >
                <X size={10} strokeWidth={2} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <ul
        className="flex max-h-64 flex-col gap-1 overflow-y-auto"
        // biome-ignore lint/a11y/useSemanticElements: <select multiple> drops the styled checkbox UI; ARIA listbox is the WAI-ARIA reference pattern.
        role="listbox"
        aria-multiselectable="true"
        aria-busy={loading}
      >
        {options.map((o) => {
          const checked = selected.includes(o.value);
          return (
            <li key={o.value}>
              <button
                type="button"
                role="option"
                aria-selected={checked}
                onClick={() => toggle(o.value)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-[rgb(var(--bg-hover))]"
              >
                <span
                  aria-hidden="true"
                  className="inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border"
                  style={{
                    borderColor: 'var(--border-strong)',
                    background: checked ? 'rgb(var(--accent))' : 'transparent',
                    color: 'rgb(var(--accent-fg))',
                  }}
                >
                  {checked ? <Check size={12} strokeWidth={2.5} /> : null}
                </span>
                <span className="truncate">{o.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <Footer
        onApply={() =>
          props.onApply(selected.length > 0 ? { kind: 'reference', values: selected } : undefined)
        }
        onCancel={props.onCancel}
        onClear={selected.length > 0 ? () => setSelected([]) : undefined}
        applyLabel={props.applyLabel}
        cancelLabel={props.cancelLabel}
        clearLabel={props.clearLabel}
      />
    </div>
  );
}

// -- Boolean -----------------------------------------------------------

function BooleanPopover(props: BooleanFilterProps) {
  const initial: boolean | undefined = props.initial;
  const [value, setValue] = useState<'true' | 'false' | 'any'>(
    initial === true ? 'true' : initial === false ? 'false' : 'any',
  );
  const apply = () => {
    if (value === 'any') return props.onApply(undefined);
    props.onApply({ kind: 'boolean', value: value === 'true' });
  };
  return (
    <div
      className={cn(panelCls, props.className)}
      style={panelStyle}
      role="dialog"
      data-kind="boolean"
    >
      <fieldset className="flex flex-col gap-1" aria-label="Boolean">
        {[
          { v: 'true', label: props.trueLabel ?? 'True' },
          { v: 'false', label: props.falseLabel ?? 'False' },
          { v: 'any', label: props.anyLabel ?? 'Any' },
        ].map((opt) => (
          <label
            key={opt.v}
            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-[rgb(var(--bg-hover))]"
          >
            <input
              type="radio"
              name="bool"
              value={opt.v}
              checked={value === opt.v}
              onChange={() => setValue(opt.v as 'true' | 'false' | 'any')}
            />
            <span>{opt.label}</span>
          </label>
        ))}
      </fieldset>
      <Footer
        onApply={apply}
        onCancel={props.onCancel}
        applyLabel={props.applyLabel}
        cancelLabel={props.cancelLabel}
      />
    </div>
  );
}

// -- Multi-value (comma-separated tags) -------------------------------

function MultiValuePopover(props: MultiValueFilterProps) {
  const [draft, setDraft] = useState<string>('');
  const [tags, setTags] = useState<string[]>(() => props.initial?.slice() ?? []);
  const commit = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    if (!tags.includes(trimmed)) setTags((t) => [...t, trimmed]);
    setDraft('');
  };
  return (
    <div
      className={cn(panelCls, props.className)}
      style={panelStyle}
      role="dialog"
      data-kind="multi_value"
    >
      <div className="flex flex-wrap gap-1">
        {tags.map((t) => (
          <span
            key={t}
            className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs"
            style={{ borderColor: 'var(--border)' }}
          >
            <span className="truncate">{t}</span>
            <button
              type="button"
              onClick={() => setTags((cur) => cur.filter((x) => x !== t))}
              aria-label={`Remove ${t}`}
              className="inline-flex h-4 w-4 items-center justify-center"
              style={{ color: 'rgb(var(--text-hushed))' }}
            >
              <X size={10} strokeWidth={2} />
            </button>
          </span>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              commit();
            }
          }}
          placeholder={props.placeholder ?? 'Type and press Enter'}
          className={inputCls}
          style={inputStyle}
          aria-label="Tag"
          autoFocus
        />
        <button
          type="button"
          onClick={commit}
          aria-label="Add tag"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border"
          style={{ borderColor: 'var(--border-strong)' }}
        >
          <ChevronDown size={14} strokeWidth={1.75} />
        </button>
      </div>
      <Footer
        onApply={() =>
          props.onApply(tags.length > 0 ? { kind: 'multi_value', values: tags } : undefined)
        }
        onCancel={props.onCancel}
        onClear={tags.length > 0 ? () => setTags([]) : undefined}
        applyLabel={props.applyLabel}
        cancelLabel={props.cancelLabel}
        clearLabel={props.clearLabel}
      />
    </div>
  );
}
