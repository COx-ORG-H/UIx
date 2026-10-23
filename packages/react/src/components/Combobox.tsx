"use client";

import { Fragment, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { AriaAttributes, ChangeEvent, FocusEvent, HTMLAttributes, KeyboardEvent } from 'react';
import { cx } from '../cx.js';
import { filterComboboxItems } from '../combobox-model.js';
import type { ComboboxGroup, ComboboxOption } from '../combobox-model.js';
import { useAnchoredPosition, zoomOf } from '../hooks/useAnchoredPosition.js';
import { CheckIcon } from '../icons/components.js';
import type { Placement } from '../overlay-position.js';
import { buildSelectModel, firstEnabled, lastEnabled, moveActive } from '../select-model.js';
import type { SelectEntry } from '../select-model.js';

// useLayoutEffect warns during SSR; fall back to useEffect on the server.
const useIsomorphicLayoutEffect = typeof document !== 'undefined' ? useLayoutEffect : useEffect;

const OFFSET = 4;
const EDGE = 8;
const MAX_HEIGHT = 320;

export interface ComboboxProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** The options, and groups of options (`{ label, options }`, HAR-1588). */
  options: readonly (ComboboxOption | ComboboxGroup)[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string, option: ComboboxOption) => void;
  /** The field's name. Not used as its name when `aria-labelledby` points at a visible label. */
  label: string;
  placeholder?: string;
  /** Shown in the open list when nothing matches (outside the listbox, so it is never an option). */
  emptyLabel: string;
  name?: string;
  disabled?: boolean;
  /** Ids of the visible label(s) that name the field; replaces `label` as its name. */
  'aria-labelledby'?: string;
  /** Ids of hint or error text; lands on the input. */
  'aria-describedby'?: string;
  'aria-invalid'?: AriaAttributes['aria-invalid'];
  /** Id of the input itself (for a `<label for>`); `id` stays on the wrapper. */
  inputId?: string;
  /** Preferred side of the list. Default `'bottom-start'`; it flips when there is no room. */
  placement?: Placement;
}

/**
 * An editable combobox (HAR-1588): type to filter, choose with the keyboard or the pointer. It
 * follows the WAI-ARIA APG combobox with a listbox popup, at parity with `Select`: the list is a
 * top-layer popover placed with `useAnchoredPosition`, so a Drawer, a Popover or an
 * `overflow: hidden` cell never clips it; ↑ ↓ PageUp PageDown move (Home and End too while an
 * option is active), disabled options are skipped and the list does not wrap; Enter chooses;
 * Escape closes the list and puts the chosen option's text back, as leaving the field does.
 * Groups render as `role="group"`; the no-match row sits outside the listbox.
 */
export function Combobox({
  options,
  value,
  defaultValue,
  onValueChange,
  label,
  placeholder,
  emptyLabel,
  name,
  disabled,
  className,
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
  inputId,
  placement = 'bottom-start',
  ...props
}: ComboboxProps) {
  const uid = useId();
  const listboxId = `${uid}-listbox`;
  const optionId = (index: number) => `${listboxId}-${index}`;
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [internalValue, setInternalValue] = useState(defaultValue ?? '');
  const selectedValue = value ?? internalValue;
  const all = useMemo(() => buildSelectModel(options).all, [options]);
  const selected = all.find((entry) => entry.option.value === selectedValue)?.option as ComboboxOption | undefined;
  const [query, setQuery] = useState(selected?.label ?? '');
  // What filters the list: only text the person typed, never the chosen label put back in the field.
  const [filter, setFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const model = useMemo(() => buildSelectModel(filterComboboxItems(options, open ? filter : '')), [open, options, filter]);
  const entries = model.entries;
  const active: SelectEntry | undefined = activeIndex >= 0 ? entries[activeIndex] : undefined;

  const selectedLabel = () => (all.find((entry) => entry.option.value === selectedValue)?.option.label ?? '');
  useEffect(() => {
    if (!open) setQuery(selectedLabel());
  }, [open, options, selectedValue]); // eslint-disable-line react-hooks/exhaustive-deps

  const openList = (target: 'selected' | 'first' | 'last' = 'selected', list: readonly SelectEntry[] = entries) => {
    if (disabled) return;
    const chosen = list.findIndex((entry) => entry.option.value === selectedValue && !entry.disabled);
    setActiveIndex(target === 'last' ? lastEnabled(list) : target === 'first' || chosen < 0 ? firstEnabled(list) : chosen);
    setOpen(true);
  };

  const select = (entry: SelectEntry | undefined) => {
    if (!entry || entry.disabled) return;
    const option = entry.option as ComboboxOption;
    if (value == null) setInternalValue(option.value);
    setQuery(option.label);
    setFilter('');
    setOpen(false);
    setActiveIndex(-1);
    onValueChange?.(option.value, option);
  };

  const restore = () => {
    setFilter('');
    setOpen(false);
    setActiveIndex(-1);
    setQuery(selectedLabel());
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    // An IME is composing (CJK input): its keys belong to the composition, not the list.
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;
    const { key, altKey } = event;
    switch (key) {
      case 'ArrowDown':
      case 'ArrowUp':
        event.preventDefault();
        if (!open) { openList(key === 'ArrowUp' && !altKey ? 'last' : 'selected'); return; }
        if (altKey) return;
        setActiveIndex((index) => moveActive(entries, index, key === 'ArrowDown' ? 1 : -1));
        return;
      case 'PageDown':
      case 'PageUp':
        if (!open) return;
        event.preventDefault();
        setActiveIndex((index) => moveActive(entries, index, key === 'PageDown' ? 10 : -10));
        return;
      case 'Home':
      case 'End':
        // With an option active, Home / End jump in the list; otherwise they move the caret.
        if (!open || activeIndex < 0) return;
        event.preventDefault();
        setActiveIndex(key === 'Home' ? firstEnabled(entries) : lastEnabled(entries));
        return;
      case 'Enter':
        if (open && active) { event.preventDefault(); select(active); }
        return;
      case 'Escape':
        if (open || query !== selectedLabel()) {
          event.preventDefault();
          event.stopPropagation();
          restore();
        }
        return;
      default:
    }
  };

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    const next = event.relatedTarget as Node | null;
    if (!rootRef.current?.contains(next)) restore();
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const text = event.target.value;
    setQuery(text);
    setFilter(text);
    const list = buildSelectModel(filterComboboxItems(options, text)).entries;
    setActiveIndex(firstEnabled(list));
    setOpen(true);
  };

  /* A filter can leave the active index past the end: pull it back in the same commit. */
  useIsomorphicLayoutEffect(() => {
    if (open && activeIndex >= entries.length) setActiveIndex(firstEnabled(entries));
  }, [open, entries.length]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---- the popup: shown in the top layer, sized to the field, placed by useAnchoredPosition */
  useIsomorphicLayoutEffect(() => {
    const popup = popupRef.current;
    const input = inputRef.current;
    if (!popup || !input) return;
    const isOpen = () => { try { return popup.matches(':popover-open'); } catch { return false; } };
    if (open) {
      const zoom = zoomOf(input);
      const r = input.getBoundingClientRect();
      const room = Math.max(r.top, window.innerHeight - r.bottom) / zoom - OFFSET - EDGE;
      popup.style.minWidth = `${Math.round(r.width / zoom)}px`;
      popup.style.maxHeight = `${Math.max(96, Math.min(MAX_HEIGHT, Math.floor(room)))}px`;
      try { if (!isOpen()) popup.showPopover(); } catch { /* no Popover API: `hidden` drives it */ }
    } else {
      try { if (isOpen()) popup.hidePopover(); } catch { /* no Popover API */ }
    }
  }, [open]);
  useAnchoredPosition(inputRef, popupRef, { open, placement, offset: OFFSET, padding: EDGE });

  /* ---- keep the active option in view */
  useIsomorphicLayoutEffect(() => {
    const list = listRef.current;
    if (!open || !list || activeIndex < 0) return;
    const el = list.ownerDocument.getElementById(optionId(activeIndex));
    if (!el || !list.contains(el)) return;
    const top = el.offsetTop;
    const bottom = top + el.offsetHeight;
    if (top < list.scrollTop) list.scrollTop = top;
    else if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight;
  }, [open, activeIndex]);

  // `popover` is a valid HTML attribute but absent from React 18's DOM types.
  const popoverAttr = { popover: 'manual' } as Record<string, string>;
  const invalid = ariaInvalid != null && ariaInvalid !== false && ariaInvalid !== 'false';

  const renderEntry = (entry: SelectEntry) => (
    <div
      id={optionId(entry.index)}
      key={`${entry.option.value}-${entry.index}`}
      className="uix-listbox__option"
      role="option"
      aria-selected={entry.option.value === selectedValue}
      aria-disabled={entry.disabled || undefined}
      data-active={(open && entry.index === activeIndex) || undefined}
      onMouseDown={(event) => event.preventDefault()}
      onPointerMove={() => { if (entry.index !== activeIndex && !entry.disabled) setActiveIndex(entry.index); }}
      onClick={() => select(entry)}
    >
      <span className="uix-listbox__text"><span className="uix-listbox__label">{entry.option.label}</span></span>
      {/* the chosen option: a check mark as well as the colour, as in Select */}
      <span className="uix-listbox__check" aria-hidden="true">{entry.option.value === selectedValue && <CheckIcon size="sm" />}</span>
    </div>
  );

  return (
    <div ref={rootRef} className={cx('uix-combobox', className)} onBlur={handleBlur} {...props}>
      {name && <input type="hidden" name={name} value={selectedValue} />}
      <input
        ref={inputRef}
        id={inputId}
        className="uix-input"
        role="combobox"
        aria-label={ariaLabelledBy ? undefined : label}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        aria-invalid={invalid || undefined}
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={open && active ? optionId(activeIndex) : undefined}
        autoComplete="off"
        spellCheck={false}
        value={query}
        placeholder={placeholder}
        disabled={disabled}
        onChange={handleChange}
        onFocus={() => { setQuery(''); openList('selected', buildSelectModel(options).entries); }}
        onKeyDown={handleKeyDown}
      />
      <div
        ref={popupRef}
        className="uix-select__popup uix-combobox__popup"
        hidden={!open}
        {...popoverAttr}
        // Keep focus in the field while the pointer picks.
        onMouseDown={(event) => event.preventDefault()}
      >
        <div
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-label={label}
          className="uix-listbox uix-select__listbox"
          hidden={entries.length === 0 || undefined}
        >
          {model.sections.map((section, i) => (section.label != null ? (
            <div key={`g${i}`} role="group" className="uix-listbox__group" aria-labelledby={`${uid}-group-${i}`} aria-disabled={section.disabled || undefined}>
              <div id={`${uid}-group-${i}`} role="presentation" className="uix-listbox__group-label">{section.label}</div>
              {section.entries.map(renderEntry)}
            </div>
          ) : (
            <Fragment key={`s${i}`}>{section.entries.map(renderEntry)}</Fragment>
          )))}
        </div>
        {entries.length === 0 && <div className="uix-select__state">{emptyLabel}</div>}
      </div>
      {/* Always mounted, so "no match" is announced when it appears (a live region that mounts with
          its text in it is often not read). */}
      <span className="uix-visually-hidden" role="status" aria-live="polite">{open && entries.length === 0 ? emptyLabel : ''}</span>
    </div>
  );
}

export type { ComboboxGroup, ComboboxOption } from '../combobox-model.js';
