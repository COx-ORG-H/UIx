"use client";

import { Children, Fragment, forwardRef, isValidElement, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type {
  ChangeEvent, FocusEvent, FocusEventHandler, KeyboardEvent, ReactElement, ReactNode, Ref, SelectHTMLAttributes,
  SyntheticEvent,
} from 'react';
import { cx } from '../cx.js';
import { useUixLabels } from '../labels-context.js';
import { useAnchoredPosition } from '../hooks/useAnchoredPosition.js';
import type { Placement } from '../overlay-position.js';
import { Drawer } from './Drawer.js';
import {
  buildSelectModel, countSelectOptions, filterSelectItems, firstEnabled, isSelectGroup, lastEnabled, moveActive,
  toggleValue, toValueList, typeahead,
} from '../select-model.js';
import type { SelectEntry, SelectGroup, SelectItem, SelectOption } from '../select-model.js';

export type { SelectGroup, SelectOption } from '../select-model.js';

// useLayoutEffect warns during SSR; fall back to useEffect on the server.
const useIsomorphicLayoutEffect = typeof document !== 'undefined' ? useLayoutEffect : useEffect;

/** Chrome strings of `Select`; `{count}` is replaced where noted. */
export interface SelectLabels {
  /** Accessible name of the filter field when the Select has no label of its own. */
  search: string;
  /** Placeholder of the filter field. */
  searchPlaceholder: string;
  loading: string;
  /** No options at all. */
  empty: string;
  /** A filter matched nothing. */
  noMatches: string;
  /** Async `loadOptions` failed. */
  error: string;
  retry: string;
  /** Multi-select: clears every value. */
  clear: string;
  /** Multi-select on a phone: closes the sheet. */
  done: string;
  /** Multi-select trigger, spoken after the "+N". `{count}` = how many are selected. */
  selectedCount: string;
  /** Announced after filtering. `{count}`. */
  results: string;
}

const DEFAULT_LABELS: SelectLabels = {
  search: 'Search options',
  searchPlaceholder: 'Search…',
  loading: 'Loading…',
  empty: 'No options',
  noMatches: 'No matching options',
  error: 'Could not load the options.',
  retry: 'Retry',
  clear: 'Clear',
  done: 'Done',
  selectedCount: '{count} selected',
  results: '{count} options',
};

const fill = (template: string, count: number): string => template.replace('{count}', String(count));

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  size?: 'sm' | 'md';
  /** The options as data, instead of `<option>` / `<optgroup>` children. */
  options?: readonly (SelectOption | SelectGroup)[];
  /**
   * Called with the new value: a string, or every selected value with `multiple`. `option` is the
   * option that was chosen or toggled. `onChange(e)` still fires as on a native select.
   */
  onValueChange?: (value: string | string[], option?: SelectOption) => void;
  /** Shown while nothing is selected. Also makes "nothing" the starting value (and `required` checks it). */
  placeholder?: string;
  /** Marks the control invalid (`aria-invalid`), e.g. from your own validation. */
  invalid?: boolean;
  /** Shows and submits the value, but does not open. */
  readOnly?: boolean;
  /** A filter field at the top of the list. `'auto'` adds it for more than 12 options. Default `false`. */
  searchable?: boolean | 'auto';
  /**
   * Load the options when the list opens (and, when `searchable`, as the filter changes). The
   * previous request's `signal` is aborted when a newer one starts or the list closes. Pass the
   * selected option in `options` so its label shows before the first load.
   */
  loadOptions?: (query: string, signal: AbortSignal) => Promise<readonly (SelectOption | SelectGroup)[]>;
  /** Draw an option's content (the check mark for the selected state is drawn for you). */
  renderOption?: (option: SelectOption, state: { selected: boolean; active: boolean }) => ReactNode;
  /** Draw the trigger's content for the selected option(s). */
  renderValue?: (selected: readonly SelectOption[]) => ReactNode;
  /** Preferred side of the list. Default `'bottom-start'`; it flips when there is no room. */
  placement?: Placement;
  labels?: Partial<SelectLabels>;
}

/* ---------------------------------------------------------------- children → options */

type ParsedOption = SelectOption & { hidden?: boolean; selected?: boolean };

function textOf(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (isValidElement(node)) return textOf((node.props as { children?: ReactNode }).children);
  return '';
}

function parseOption(el: ReactElement): ParsedOption {
  const p = el.props as { value?: unknown; label?: string; children?: ReactNode; disabled?: boolean; hidden?: boolean; selected?: boolean };
  const text = textOf(p.children).replace(/\s+/g, ' ').trim();
  const label = p.label ?? text;
  const option: ParsedOption = { value: p.value != null ? String(p.value) : text, label };
  if (p.disabled) option.disabled = true;
  if (p.hidden) option.hidden = true;
  if (p.selected) option.selected = true;
  return option;
}

/** `<option>` / `<optgroup>` children (also inside fragments and `.map()` arrays) as items. */
function parseChildren(children: ReactNode): SelectItem[] {
  const out: SelectItem[] = [];
  const walk = (nodes: ReactNode, into: SelectItem[] | null) => {
    Children.forEach(nodes, (child) => {
      if (!isValidElement(child)) return;
      if (child.type === Fragment) walk((child.props as { children?: ReactNode }).children, into);
      else if (child.type === 'option') (into ?? out).push(parseOption(child));
      else if (child.type === 'optgroup' && !into) {
        const p = child.props as { label?: string; disabled?: boolean; children?: ReactNode };
        const options: SelectItem[] = [];
        walk(p.children, options);
        out.push({ label: p.label ?? '', disabled: p.disabled || undefined, options: options as SelectOption[] });
      }
    });
  };
  walk(children, null);
  return out;
}

/* ---------------------------------------------------------------- the form proxy */

const selectProto = typeof HTMLSelectElement !== 'undefined' ? HTMLSelectElement.prototype : null;
const optionProto = typeof HTMLOptionElement !== 'undefined' ? HTMLOptionElement.prototype : null;
const descriptor = (proto: object | null, key: string) => (proto ? Object.getOwnPropertyDescriptor(proto, key) : undefined);

/** The selected values, read past any interception. */
function readProxy(select: HTMLSelectElement): string[] {
  const selected = descriptor(optionProto, 'selected')?.get;
  return Array.from(select.options).filter((o) => (selected ? selected.call(o) : o.selected)).map((o) => o.value);
}

/** Select exactly `values` (the first one only in single mode), without notifying ourselves. */
function writeProxy(select: HTMLSelectElement, values: readonly string[], multiple: boolean): void {
  const set = descriptor(optionProto, 'selected')?.set;
  let done = false;
  for (const o of Array.from(select.options)) {
    const on = multiple ? values.includes(o.value) : !done && o.value === (values[0] ?? '');
    if (on) done = true;
    if (set) set.call(o, on); else o.selected = on;
  }
}

/**
 * Watch writes that bypass the UI — react-hook-form's `register` writes `ref.value` (and each
 * option's `selected` for `multiple`), a form library may set `selectedIndex` — so the trigger
 * follows them. Our own writes go through the prototype setters and are not seen.
 */
const watched = new WeakSet<Element>();
function watchWrites(el: HTMLSelectElement | HTMLOptionElement, keys: readonly string[], proto: object | null, notify: () => void) {
  if (watched.has(el) || !proto) return;
  watched.add(el);
  for (const key of keys) {
    const d = descriptor(proto, key);
    if (!d?.get || !d.set) continue;
    const { get, set } = d;
    Object.defineProperty(el, key, {
      configurable: true,
      enumerable: d.enumerable,
      get() { return get.call(this); },
      set(v: unknown) { set.call(this, v); notify(); },
    });
  }
}

/* ---------------------------------------------------------------- helpers */

const PHONE = '(pointer: coarse) and (max-width: 640px)';
const isPhone = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(PHONE).matches;

const OFFSET = 4;
const EDGE = 8;
const MAX_HEIGHT = 320;
const TYPEAHEAD_MS = 500;

/** Text of the label(s) naming the trigger, leaving out the Select's own nodes (a wrapping label). */
function labelText(trigger: HTMLElement, own: readonly (Node | null)[], ariaLabel?: string, labelledBy?: string): string {
  if (ariaLabel) return ariaLabel;
  const doc = trigger.ownerDocument;
  const read = (root: Node): string => {
    let text = '';
    const walker = doc.createTreeWalker(root, 4 /* SHOW_TEXT */);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (own.some((o) => o && o.contains(n))) continue;
      text += n.nodeValue ?? '';
    }
    return text.replace(/\s+/g, ' ').trim();
  };
  if (labelledBy) {
    return labelledBy.split(/\s+/).map((id) => doc.getElementById(id)).filter((el): el is HTMLElement => !!el && el !== trigger).map(read).join(' ').trim();
  }
  const labels = (trigger as HTMLButtonElement).labels;
  return labels ? Array.from(labels).map(read).join(' ').trim() : '';
}

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

type AsyncState = { status: 'idle' | 'loading' | 'ready' | 'error'; items: SelectItem[]; seen: Map<string, SelectOption> };

/* ---------------------------------------------------------------- Select */

/**
 * A select that draws its own list (HAR-1572): the WAI-ARIA APG select-only combobox — focus
 * stays on the trigger, `aria-activedescendant` marks the active option — in a top-layer popover
 * placed with `useAnchoredPosition`, or a bottom sheet on a phone. A visually hidden native
 * `<select>` carries `name`, `required`, `form`, `multiple` and the value, so `<option>` children,
 * `onChange(e)` with `e.target.value`, FormData, `form.reset()`, `ref` and react-hook-form keep
 * working; `ref` points at that select.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(props, forwardedRef) {
  const {
    size = 'md', className, style, children, options, value, defaultValue, onChange, onInput, onInvalid, onValueChange,
    onFocus, onBlur, onKeyDown, onClick,
    placeholder, invalid, readOnly, searchable = false, loadOptions, renderOption, renderValue, placement = 'bottom-start',
    labels: labelsProp, name, form, required, disabled, multiple = false, autoComplete,
    'aria-label': ariaLabel, 'aria-labelledby': ariaLabelledBy, 'aria-invalid': ariaInvalid,
    ...rest
  } = props;
  const uixLabels = useUixLabels();
  const labels: SelectLabels = { ...DEFAULT_LABELS, ...uixLabels.select, ...labelsProp };

  const uid = useId();
  const listId = `${uid}-listbox`;
  const optionId = (index: number) => `${uid}-option-${index}`;

  const triggerRef = useRef<HTMLButtonElement>(null);
  const proxyRef = useRef<HTMLSelectElement | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  /* ---- items */
  const staticItems = useMemo<SelectItem[]>(() => (options ? [...options] : parseChildren(children)), [options, children]);
  const formModel = useMemo(() => buildSelectModel(staticItems), [staticItems]);

  /* ---- value */
  const controlled = value !== undefined;
  const [internal, setInternal] = useState<string[]>(() => {
    if (defaultValue !== undefined) return toValueList(defaultValue);
    const marked = formModel.all.filter((e) => (e.option as ParsedOption).selected).map((e) => e.option.value);
    if (multiple) return marked;
    if (marked.length) return [marked[marked.length - 1]!];
    if (placeholder != null) return [''];
    const first = formModel.all.find((e) => !e.disabled);
    return [first ? first.option.value : ''];
  });
  const values = controlled ? toValueList(value) : internal;
  const current = values[0] ?? '';
  const valuesRef = useRef(values);
  valuesRef.current = values;
  const controlledRef = useRef(controlled);
  controlledRef.current = controlled;
  const [initialDefault] = useState(() => (multiple ? values : current));

  /* ---- open state */
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'popover' | 'sheet'>('popover');
  const [active, setActive] = useState(-1);
  const [query, setQuery] = useState('');
  const [listLabel, setListLabel] = useState('');
  const [formInvalid, setFormInvalid] = useState(false);
  const snapshot = useRef<string[]>([]);
  const typed = useRef<{ text: string; timer: ReturnType<typeof setTimeout> | null }>({ text: '', timer: null });

  /* ---- async */
  const loadRef = useRef(loadOptions);
  loadRef.current = loadOptions;
  const hasLoader = !!loadOptions;
  const [asyncState, setAsyncState] = useState<AsyncState>({ status: 'idle', items: [], seen: new Map() });
  const request = useRef<AbortController | null>(null);
  const load = useCallback((q: string) => {
    const loader = loadRef.current;
    if (!loader) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setAsyncState((s) => ({ ...s, status: 'loading' }));
    Promise.resolve()
      .then(() => loader(q, controller.signal))
      .then((items) => {
        if (controller.signal.aborted) return;
        setAsyncState((s) => {
          const seen = new Map(s.seen);
          for (const item of items) for (const o of isSelectGroup(item) ? item.options : [item]) seen.set(o.value, o);
          return { status: 'ready', items: [...items], seen };
        });
      }, () => {
        if (controller.signal.aborted) return;
        setAsyncState((s) => ({ ...s, status: 'error', items: [] }));
      });
  }, []);
  useEffect(() => {
    if (!open || !hasLoader) return undefined;
    // A new query makes the request in flight stale at once, before the debounce runs out.
    request.current?.abort();
    const timer = setTimeout(() => load(query), query ? 200 : 0);
    return () => clearTimeout(timer);
  }, [open, query, hasLoader, load]);
  useEffect(() => {
    if (!open) request.current?.abort();
  }, [open]);
  useEffect(() => () => request.current?.abort(), []);

  const isSearchable = searchable === true || (searchable === 'auto' && countSelectOptions(staticItems) > 12);
  const listItems = hasLoader ? asyncState.items : isSearchable ? filterSelectItems(staticItems, query) : staticItems;
  const listModel = useMemo(() => buildSelectModel(listItems), [listItems]);
  const entries = listModel.entries;
  const activeEntry: SelectEntry | undefined = active >= 0 ? entries[active] : undefined;

  /** Every option we know by value: static, loaded, and the selected ones. */
  const known = (v: string): SelectOption | undefined =>
    formModel.all.find((e) => e.option.value === v)?.option ?? asyncState.seen.get(v);

  /* ---- proxy options: every static option, every loaded one, and any selected value we lack */
  const proxyOptions = useMemo(() => {
    const list: { value: string; label: string; disabled?: boolean; group?: string }[] = [];
    const have = new Set<string>();
    for (const e of formModel.all) {
      have.add(e.option.value);
      list.push({ value: e.option.value, label: e.option.label, disabled: e.disabled, group: formModel.sections[e.section]?.label });
    }
    for (const o of asyncState.seen.values()) if (!have.has(o.value)) { have.add(o.value); list.push({ value: o.value, label: o.label }); }
    // "Nothing chosen" is a leading "" option (the placeholder option `required` rejects), added
    // only when needed so `selectedIndex` and `options` match a native select otherwise.
    if (!multiple && !have.has('') && (placeholder != null || values.length === 0 || values.includes(''))) {
      have.add('');
      list.unshift({ value: '', label: placeholder ?? '' });
    }
    for (const v of values) if (!have.has(v)) { have.add(v); list.push({ value: v, label: v }); }
    return list;
  }, [formModel, asyncState.seen, values, multiple, placeholder]);

  /* ---- keep the proxy's selection on the value (controlled values, re-renders) */
  const syncProxy = useCallback(() => {
    const proxy = proxyRef.current;
    if (!proxy) return;
    const now = readProxy(proxy);
    const want = valuesRef.current;
    const same = multiple ? now.length === want.length && now.every((v, i) => v === want[i]) : now[0] === (want[0] ?? '');
    if (!same) writeProxy(proxy, want, multiple);
  }, [multiple]);
  useIsomorphicLayoutEffect(() => { syncProxy(); });

  /**
   * Writes from outside (react-hook-form, `select.value = x`) move the trigger. Read at once:
   * react-hook-form writes its default inside the ref callback, before our layout effect, which
   * would otherwise put the old value back.
   */
  const fromOutside = useCallback(() => {
    const proxy = proxyRef.current;
    if (!proxy || controlledRef.current) return;
    const read = readProxy(proxy);
    const next = multiple ? read : [read[0] ?? ''];
    valuesRef.current = next;
    setInternal(next);
  }, [multiple]);

  const setProxyRef = useCallback((el: HTMLSelectElement | null) => {
    proxyRef.current = el;
    if (el) {
      watchWrites(el, ['value', 'selectedIndex'], selectProto, fromOutside);
      for (const o of Array.from(el.options)) watchWrites(o, ['selected'], optionProto, fromOutside);
    }
    if (typeof forwardedRef === 'function') forwardedRef(el);
    else if (forwardedRef) (forwardedRef as { current: HTMLSelectElement | null }).current = el;
  }, [forwardedRef, fromOutside]);
  useIsomorphicLayoutEffect(() => {
    const el = proxyRef.current;
    if (el) for (const o of Array.from(el.options)) watchWrites(o, ['selected'], optionProto, fromOutside);
  });

  /* ---- form reset restores the default; a focus sent to the proxy goes to the trigger */
  useEffect(() => {
    const proxy = proxyRef.current;
    if (!proxy) return undefined;
    const doc = proxy.ownerDocument;
    const onReset = (event: Event) => {
      if (!proxy.form || event.target !== proxy.form) return;
      setTimeout(() => {
        setFormInvalid(false);
        if (controlledRef.current) { syncProxy(); return; }
        const next = readProxy(proxy);
        setInternal(multiple ? next : [next[0] ?? '']);
      }, 0);
    };
    const onProxyFocus = () => triggerRef.current?.focus();
    doc.addEventListener('reset', onReset, true);
    proxy.addEventListener('focus', onProxyFocus);
    return () => {
      doc.removeEventListener('reset', onReset, true);
      proxy.removeEventListener('focus', onProxyFocus);
    };
  }, [multiple, syncProxy]);

  /* ---- committing a value: the native setter, then bubbling input + change */
  const changed = useRef<SelectOption | undefined>(undefined);
  const commit = (next: readonly string[], option?: SelectOption) => {
    const proxy = proxyRef.current;
    changed.current = option;
    if (!proxy) {
      if (!controlled) setInternal([...next]);
      onValueChange?.(multiple ? [...next] : next[0] ?? '', option);
      return;
    }
    writeProxy(proxy, next, multiple);
    proxy.dispatchEvent(new Event('input', { bubbles: true }));
    proxy.dispatchEvent(new Event('change', { bubbles: true }));
  };

  const handleProxyChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const read = readProxy(event.currentTarget);
    const next = multiple ? read : [read[0] ?? ''];
    if (!controlled) setInternal(next);
    setFormInvalid(false);
    onChange?.(event);
    const option = changed.current ?? (multiple ? undefined : known(next[0] ?? ''));
    changed.current = undefined;
    onValueChange?.(multiple ? next : next[0] ?? '', option);
    // A controlled value the consumer did not take snaps back after this event.
    if (controlled) queueMicrotask(syncProxy);
  };

  /* ---- open / close */
  const selectedIndexIn = (list: readonly SelectEntry[]) => list.findIndex((e) => valuesRef.current.includes(e.option.value));

  const openList = (target: 'selected' | 'first' | 'last' = 'selected', typedText?: string) => {
    if (disabled || readOnly || open) return;
    const trigger = triggerRef.current;
    snapshot.current = [...valuesRef.current];
    setMode(isPhone() ? 'sheet' : 'popover');
    setQuery('');
    if (trigger) setListLabel(labelText(trigger, [trigger, proxyRef.current, popupRef.current], ariaLabel, ariaLabelledBy));
    const base = hasLoader ? buildSelectModel(asyncState.items).entries : formModel.entries;
    const selected = selectedIndexIn(base);
    let next = target === 'first' ? firstEnabled(base) : target === 'last' ? lastEnabled(base) : selected >= 0 ? selected : firstEnabled(base);
    if (typedText) {
      const found = typeahead(base, typedText, selected);
      if (found >= 0) next = found;
    }
    setActive(next);
    setOpen(true);
  };

  const close = (opts: { revert?: boolean; focus?: boolean } = {}) => {
    if (opts.revert && multiple) {
      const was = snapshot.current;
      const now = valuesRef.current;
      if (was.length !== now.length || was.some((v, i) => v !== now[i])) commit(was);
    }
    setOpen(false);
    setActive(-1);
    setQuery('');
    typed.current.text = '';
    if (opts.focus) triggerRef.current?.focus({ preventScroll: true });
  };

  const choose = (entry: SelectEntry | undefined, closeAfter = !multiple) => {
    if (!entry || entry.disabled) return;
    if (multiple) {
      commit(toggleValue(valuesRef.current, entry.option.value), entry.option);
      setActive(entry.index);
      if (closeAfter) close({ focus: true });
      return;
    }
    if (entry.option.value !== current) commit([entry.option.value], entry.option);
    close({ focus: true });
  };

  const clearAll = () => {
    if (valuesRef.current.length) commit([]);
  };

  /* ---- typeahead */
  const typeChar = (char: string, list: readonly SelectEntry[], from: number): number => {
    const state = typed.current;
    if (state.timer) clearTimeout(state.timer);
    state.text += char;
    state.timer = setTimeout(() => { state.text = ''; state.timer = null; }, TYPEAHEAD_MS);
    return typeahead(list, state.text, from);
  };
  useEffect(() => () => { if (typed.current.timer) clearTimeout(typed.current.timer); }, []);

  const printable = (e: KeyboardEvent) => e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey;

  /** Keys on an open list. `editable`: the filter field has focus (it keeps Home/End/Space and letters). */
  const onOpenKey = (e: KeyboardEvent, editable: boolean): void => {
    const { key, altKey } = e;
    const retryable = asyncState.status === 'error' && !entries.length;
    switch (key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!altKey) setActive(moveActive(entries, active, 1));
        return;
      case 'ArrowUp':
        e.preventDefault();
        if (altKey) { if (multiple) close({ focus: true }); else choose(activeEntry); return; }
        setActive(moveActive(entries, active, -1));
        return;
      case 'PageDown':
        e.preventDefault();
        setActive(moveActive(entries, active, 10));
        return;
      case 'PageUp':
        e.preventDefault();
        setActive(moveActive(entries, active, -10));
        return;
      case 'Home':
      case 'End':
        if (editable) return;
        e.preventDefault();
        setActive(key === 'Home' ? firstEnabled(entries) : lastEnabled(entries));
        return;
      case 'Enter':
        e.preventDefault();
        if (retryable) { load(query); return; }
        if (activeEntry) choose(activeEntry); else if (!multiple) close({ focus: true });
        return;
      case 'Escape':
        e.preventDefault();
        e.stopPropagation();
        close({ revert: true, focus: true });
        return;
      case 'Tab':
        // APG: Tab selects the active option and closes; focus moves on as usual.
        if (!multiple && activeEntry && !activeEntry.disabled && activeEntry.option.value !== current) {
          commit([activeEntry.option.value], activeEntry.option);
        }
        close();
        return;
      case ' ':
        if (editable) return;
        if (typed.current.text) break; // a space inside a typed string ("in progress")
        e.preventDefault();
        if (retryable) { load(query); return; }
        if (activeEntry) choose(activeEntry);
        return;
      default:
        break;
    }
    if (!editable && printable(e)) {
      e.preventDefault();
      const found = typeChar(e.key, entries, active);
      if (found >= 0) setActive(found);
    }
  };

  const onTriggerKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    onKeyDown?.(e as unknown as KeyboardEvent<HTMLSelectElement>);
    if (e.defaultPrevented || disabled || readOnly) return;
    if (open && mode === 'popover' && !isSearchable) { onOpenKey(e, false); return; }
    if (open) return;
    const { key, altKey } = e;
    if (key === 'ArrowDown' || key === 'ArrowUp' || key === 'Enter' || key === ' ') {
      e.preventDefault();
      openList();
    } else if (key === 'Home' || key === 'End') {
      e.preventDefault();
      openList(key === 'Home' ? 'first' : 'last');
    } else if (multiple && (key === 'Delete' || key === 'Backspace') && valuesRef.current.length) {
      e.preventDefault();
      clearAll();
    } else if (printable(e) && !altKey) {
      e.preventDefault();
      const state = typed.current;
      if (state.timer) clearTimeout(state.timer);
      state.text = e.key;
      state.timer = setTimeout(() => { state.text = ''; state.timer = null; }, TYPEAHEAD_MS);
      openList('selected', e.key);
    }
  };

  /* ---- focus and blur, reported as the select's own (react-hook-form reads `target.name`) */
  const own = (node: EventTarget | null) => {
    const n = node as Node | null;
    return !!n && [triggerRef.current, popupRef.current, proxyRef.current, listRef.current?.closest('dialog') ?? null].some((el) => el?.contains(n));
  };
  const asSelectEvent = <E extends SyntheticEvent>(e: E) => {
    const proxy = proxyRef.current;
    return (proxy ? Object.create(e, { target: { value: proxy }, currentTarget: { value: proxy } }) : e) as unknown as FocusEvent<HTMLSelectElement>;
  };
  const handleFocus = (e: FocusEvent<HTMLElement>) => {
    if (own(e.relatedTarget)) return;
    (onFocus as FocusEventHandler<HTMLSelectElement> | undefined)?.(asSelectEvent(e));
  };
  /** Focus left the trigger, the filter field or the sheet for somewhere else. */
  const handleBlur = (e: FocusEvent<HTMLElement>) => {
    if (own(e.relatedTarget)) return;
    if (open && mode === 'popover') close();
    (onBlur as FocusEventHandler<HTMLSelectElement> | undefined)?.(asSelectEvent(e));
  };

  /* ---- the popover: show it, size it, then let useAnchoredPosition place it */
  const showing = open && mode === 'popover';
  useIsomorphicLayoutEffect(() => {
    const popup = popupRef.current;
    const trigger = triggerRef.current;
    if (!popup || !trigger) return;
    const isOpen = () => { try { return popup.matches(':popover-open'); } catch { return false; } };
    if (showing) {
      const r = trigger.getBoundingClientRect();
      const room = Math.max(r.top, window.innerHeight - r.bottom) - OFFSET - EDGE;
      popup.style.minWidth = `${Math.round(r.width)}px`;
      popup.style.maxHeight = `${Math.max(96, Math.min(MAX_HEIGHT, Math.floor(room)))}px`;
      try { if (!isOpen()) popup.showPopover(); } catch { /* no Popover API: `hidden` drives it */ }
      if (isSearchable) searchRef.current?.focus({ preventScroll: true });
    } else {
      try { if (isOpen()) popup.hidePopover(); } catch { /* no Popover API */ }
    }
  }, [showing, isSearchable]);
  useAnchoredPosition(triggerRef, popupRef, { open: showing, placement, offset: OFFSET, padding: EDGE });

  /* ---- the phone sheet: the listbox takes focus */
  useEffect(() => {
    if (open && mode === 'sheet') (isSearchable ? searchRef.current : listRef.current)?.focus({ preventScroll: true });
  }, [open, mode, isSearchable]);

  /* ---- keep the active option in view */
  useIsomorphicLayoutEffect(() => {
    const list = listRef.current;
    if (!open || !list || active < 0) return;
    const el = list.ownerDocument.getElementById(optionId(active));
    if (!el || !list.contains(el)) return;
    const top = el.offsetTop;
    const bottom = top + el.offsetHeight;
    if (top < list.scrollTop) list.scrollTop = top;
    else if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight;
  }, [open, active, mode]);

  /* ---- a press outside closes it (a press on our own label toggles it instead) */
  useEffect(() => {
    if (!showing) return undefined;
    const doc = triggerRef.current?.ownerDocument;
    if (!doc) return undefined;
    const onDown = (event: Event) => {
      const target = event.target as Node | null;
      if (own(target)) return;
      const labelsOf = triggerRef.current?.labels;
      if (target && labelsOf && Array.from(labelsOf).some((l) => l.contains(target))) return;
      close();
    };
    doc.addEventListener('pointerdown', onDown, true);
    return () => doc.removeEventListener('pointerdown', onDown, true);
  }, [showing]); // eslint-disable-line react-hooks/exhaustive-deps

  /* A filter or a new load can leave the active index past the end: pull it back. */
  useEffect(() => {
    if (!open) return;
    if (active >= entries.length || (active < 0 && entries.length)) setActive(entries.length ? (selectedIndexIn(entries) >= 0 ? selectedIndexIn(entries) : firstEnabled(entries)) : -1);
  }, [open, entries.length, query]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------------------------------------------------------------- render */

  // "" is a placeholder unless it is a real, listed, enabled option (e.g. "Any status").
  const emptyEntry = formModel.all.find((x) => x.option.value === '');
  const emptyIsPlaceholder = !emptyEntry || emptyEntry.hidden || emptyEntry.disabled;
  const firstSelected = multiple ? known(values[0] ?? '') : known(current);
  const showPlaceholder = multiple ? values.length === 0 : !firstSelected || (current === '' && emptyIsPlaceholder);
  const selectedOptions = showPlaceholder ? [] : values.map((v) => known(v)).filter((o): o is SelectOption => !!o);
  const display: ReactNode = renderValue && selectedOptions.length
    ? renderValue(selectedOptions)
    : showPlaceholder
      ? (firstSelected?.label || placeholder || '')
      : (
        <>
          {firstSelected?.icon != null && <span className="uix-select__icon" aria-hidden="true">{firstSelected.icon}</span>}
          <span className="uix-select__text">{firstSelected?.label}</span>
        </>
      );
  const more = multiple && values.length > 1 ? values.length - 1 : 0;
  const isInvalid = !!invalid || formInvalid || (ariaInvalid != null && ariaInvalid !== false && ariaInvalid !== 'false');
  // `popover` is a valid HTML attribute but absent from React 18's DOM types.
  const popoverAttr = { popover: 'manual' } as Record<string, string>;

  const searchField = isSearchable && (
    <input
      ref={searchRef}
      className="uix-input uix-select__search"
      type="text"
      role="combobox"
      aria-label={listLabel || labels.search}
      aria-autocomplete="list"
      aria-expanded={open}
      aria-controls={listId}
      aria-activedescendant={open && activeEntry ? optionId(active) : undefined}
      autoComplete="off"
      spellCheck={false}
      placeholder={labels.searchPlaceholder}
      value={query}
      onChange={(e) => { setQuery(e.target.value); setActive(-1); }}
      onKeyDown={(e) => onOpenKey(e, true)}
      onBlur={mode === 'popover' ? handleBlur : undefined}
    />
  );

  const renderEntry = (entry: SelectEntry) => {
    const o = entry.option;
    const selected = values.includes(o.value);
    const isActive = entry.index === active;
    return (
      <div
        key={`${o.value}-${entry.index}`}
        id={optionId(entry.index)}
        role="option"
        className="uix-listbox__option"
        aria-selected={selected}
        aria-disabled={entry.disabled || undefined}
        data-active={(open && isActive) || undefined}
        onMouseDown={(e) => e.preventDefault()}
        onPointerMove={() => { if (!isActive && !entry.disabled) setActive(entry.index); }}
        onClick={(e) => { e.preventDefault(); choose(entry); }}
      >
        {renderOption ? renderOption(o, { selected, active: isActive }) : (
          <>
            {o.icon != null && <span className="uix-listbox__icon" aria-hidden="true">{o.icon}</span>}
            <span className="uix-listbox__text">
              <span className="uix-listbox__label">{o.label}</span>
              {o.description && <span className="uix-listbox__desc">{o.description}</span>}
            </span>
          </>
        )}
        <span className="uix-listbox__check" aria-hidden="true">{selected && <CheckIcon />}</span>
      </div>
    );
  };

  const empty = entries.length === 0;
  const status = hasLoader ? asyncState.status : 'ready';
  const listbox = (
    <div
      ref={listRef}
      id={listId}
      role="listbox"
      className="uix-listbox uix-select__listbox"
      aria-label={listLabel || placeholder || undefined}
      aria-multiselectable={multiple || undefined}
      aria-busy={status === 'loading' || undefined}
      aria-activedescendant={open && mode === 'sheet' && !isSearchable && activeEntry ? optionId(active) : undefined}
      tabIndex={mode === 'sheet' ? 0 : -1}
      hidden={entries.length === 0 || undefined}
      onKeyDown={mode === 'sheet' && !isSearchable ? (e) => onOpenKey(e, false) : undefined}
    >
      {listModel.sections.map((section, i) => (section.label != null ? (
        <div key={`g${i}`} role="group" className="uix-listbox__group" aria-labelledby={`${uid}-group-${i}`} aria-disabled={section.disabled || undefined}>
          <div id={`${uid}-group-${i}`} role="presentation" className="uix-listbox__group-label">{section.label}</div>
          {section.entries.map(renderEntry)}
        </div>
      ) : (
        <Fragment key={`s${i}`}>{section.entries.map(renderEntry)}</Fragment>
      )))}
    </div>
  );

  const stateRow = status === 'loading' && empty ? (
    <div className="uix-select__state" role="status"><span className="uix-spinner uix-select__spinner" aria-hidden="true" />{labels.loading}</div>
  ) : status === 'error' ? (
    <div className="uix-select__state" role="alert">
      <span>{labels.error}</span>
      <button type="button" className="uix-btn uix-btn--link uix-btn--sm" tabIndex={mode === 'sheet' ? 0 : -1} onClick={() => load(query)}>{labels.retry}</button>
    </div>
  ) : empty && status !== 'idle' ? (
    <div className="uix-select__state">{query ? labels.noMatches : labels.empty}</div>
  ) : null;

  const toolbar = multiple && values.length > 0 && mode === 'popover' && (
    <div className="uix-select__toolbar">
      <span>{fill(labels.selectedCount, values.length)}</span>
      <button type="button" className="uix-btn uix-btn--link uix-btn--sm" tabIndex={-1} onMouseDown={(e) => e.preventDefault()} onClick={clearAll}>{labels.clear}</button>
    </div>
  );

  const live = isSearchable && open && query ? fill(labels.results, entries.length) : '';
  const body = (
    <>
      {searchField}
      {toolbar}
      {listbox}
      {stateRow}
      {isSearchable && <span className="uix-visually-hidden" aria-live="polite">{live}</span>}
    </>
  );

  return (
    <>
      <button
        {...(rest as Record<string, unknown>)}
        ref={triggerRef}
        type="button"
        role="combobox"
        className={cx('uix-select', size === 'sm' && 'uix-select--sm', className)}
        style={style}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={showing && !isSearchable && activeEntry ? optionId(active) : undefined}
        aria-invalid={isInvalid || undefined}
        aria-readonly={readOnly || undefined}
        aria-required={(rest as Record<string, unknown>)['aria-required'] as boolean | undefined ?? (required || undefined)}
        data-invalid={isInvalid || undefined}
        data-placeholder={showPlaceholder || undefined}
        data-state={open ? 'open' : 'closed'}
        onClick={(e) => {
          onClick?.(e as unknown as Parameters<NonNullable<typeof onClick>>[0]);
          if (e.defaultPrevented || readOnly) return;
          // Safari does not focus a clicked button; the keyboard must still reach the list.
          if (document.activeElement !== e.currentTarget) e.currentTarget.focus({ preventScroll: true });
          if (open) close(); else openList();
        }}
        onKeyDown={onTriggerKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
      >
        <span className="uix-select__value">{display}</span>
        {more > 0 && (
          <span className="uix-select__more">
            <span aria-hidden="true">+{more}</span>
            <span className="uix-visually-hidden">{`, ${fill(labels.selectedCount, values.length)}`}</span>
          </span>
        )}
      </button>
      <select
        ref={setProxyRef as Ref<HTMLSelectElement>}
        data-uix-select-proxy=""
        className="uix-select__proxy"
        aria-hidden="true"
        tabIndex={-1}
        name={name}
        form={form}
        required={required}
        disabled={disabled}
        multiple={multiple}
        autoComplete={autoComplete}
        defaultValue={initialDefault}
        onChange={handleProxyChange}
        onInput={onInput}
        onInvalid={(e) => { onInvalid?.(e); setFormInvalid(true); }}
      >
        {proxyOptions.map((o, i) => <option key={`${o.value}-${i}`} value={o.value} disabled={o.disabled}>{o.label}</option>)}
      </select>
      <div
        ref={popupRef}
        className="uix-select__popup"
        data-uix-select-popup=""
        hidden={!showing}
        {...popoverAttr}
        // Keep focus where it is (the trigger or the filter field), and never let a click in the
        // list activate a wrapping <label> (which would toggle the trigger).
        onMouseDown={(e) => { if (e.target !== searchRef.current) e.preventDefault(); }}
        onClick={(e) => e.preventDefault()}
      >
        {mode === 'popover' && body}
      </div>
      {mode === 'sheet' && (
        <Drawer
          side="bottom"
          open={open}
          onClose={() => close({ focus: true })}
          title={listLabel || placeholder || labels.search}
          className="uix-select__sheet"
          footer={multiple ? (
            <>
              <button type="button" className="uix-btn uix-btn--ghost" onClick={clearAll}>{labels.clear}</button>
              <button type="button" className="uix-btn uix-btn--primary" style={{ marginLeft: 'auto' }} onClick={() => close({ focus: true })}>{labels.done}</button>
            </>
          ) : undefined}
          onClick={(e) => { if (e.target !== e.currentTarget) e.preventDefault(); }}
        >
          {body}
        </Drawer>
      )}
    </>
  );
});
Select.displayName = 'Select';
