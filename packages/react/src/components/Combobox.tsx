"use client";

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, FocusEvent, HTMLAttributes, KeyboardEvent } from 'react';
import { cx } from '../cx.js';
import { filterComboboxOptions } from '../combobox-model.js';
import type { ComboboxOption } from '../combobox-model.js';

export interface ComboboxProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  options: readonly ComboboxOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string, option: ComboboxOption) => void;
  label: string;
  placeholder?: string;
  emptyLabel: string;
  name?: string;
  disabled?: boolean;
}

/** Searchable single-select combobox with keyboard navigation and no framework dependencies. */
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
  ...props
}: ComboboxProps) {
  const generatedId = useId();
  const listboxId = `${generatedId}-listbox`;
  const rootRef = useRef<HTMLDivElement>(null);
  const [internalValue, setInternalValue] = useState(defaultValue ?? '');
  const selectedValue = value ?? internalValue;
  const selected = options.find((option) => option.value === selectedValue);
  const [query, setQuery] = useState(selected?.label ?? '');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const filtered = useMemo(() => filterComboboxOptions(options, open ? query : ''), [open, options, query]);
  const activeOption = filtered[activeIndex];

  useEffect(() => {
    if (!open) setQuery(options.find((option) => option.value === selectedValue)?.label ?? '');
  }, [open, options, selectedValue]);

  const select = (option: ComboboxOption) => {
    if (option.disabled) return;
    if (value == null) setInternalValue(option.value);
    setQuery(option.label);
    setOpen(false);
    onValueChange?.(option.value, option);
  };

  const move = (step: number) => {
    if (!filtered.length) return;
    let next = activeIndex;
    for (let attempts = 0; attempts < filtered.length; attempts += 1) {
      next = (next + step + filtered.length) % filtered.length;
      if (!filtered[next]?.disabled) break;
    }
    setActiveIndex(next);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) setOpen(true);
      else move(event.key === 'ArrowDown' ? 1 : -1);
    } else if (event.key === 'Enter' && open && activeOption) {
      event.preventDefault();
      select(activeOption);
    } else if (event.key === 'Escape') {
      setOpen(false);
      setQuery(selected?.label ?? '');
    }
  };

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!rootRef.current?.contains(event.relatedTarget as Node | null)) {
      setOpen(false);
      setQuery(options.find((option) => option.value === selectedValue)?.label ?? '');
    }
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value);
    setActiveIndex(0);
    setOpen(true);
  };

  return (
    <div ref={rootRef} className={cx('uix-combobox', className)} onBlur={handleBlur} {...props}>
      {name && <input type="hidden" name={name} value={selectedValue} />}
      <input
        className="uix-input"
        role="combobox"
        aria-label={label}
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={open && activeOption ? `${listboxId}-${activeIndex}` : undefined}
        value={query}
        placeholder={placeholder}
        disabled={disabled}
        onChange={handleChange}
        onFocus={() => { setQuery(''); setOpen(true); setActiveIndex(Math.max(0, options.findIndex((option) => option.value === selectedValue))); }}
        onKeyDown={handleKeyDown}
      />
      {open && (
        <ul id={listboxId} className="uix-listbox uix-combobox__listbox" role="listbox">
          {filtered.length === 0 && <li className="uix-listbox__empty">{emptyLabel}</li>}
          {filtered.map((option, index) => (
            <li
              id={`${listboxId}-${index}`}
              key={option.value}
              className="uix-listbox__option"
              role="option"
              aria-selected={option.value === selectedValue}
              aria-disabled={option.disabled || undefined}
              data-active={index === activeIndex || undefined}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => select(option)}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export type { ComboboxOption } from '../combobox-model.js';
