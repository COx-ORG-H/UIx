"use client";

import { useCallback, useId, useRef, useState } from 'react';
import type { HTMLAttributes, KeyboardEvent, Ref } from 'react';
import { cx } from '../cx.js';
import { useUixLabels } from '../labels-context.js';
import { Button } from './Button.js';
import type { ButtonVariant } from './Button.js';

/** The words of a `SearchBar` (HAR-2030); the field's own name is its `label`. */
export interface SearchBarLabels {
  /** Accessible name of the clear button. */
  clear: string;
  /** Text of the submit button (`submitButton`). */
  submit: string;
}

const DEFAULT_SEARCH_BAR_LABELS: SearchBarLabels = { clear: 'Clear search', submit: 'Search' };

export interface SearchBarProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onSubmit' | 'onChange' | 'defaultValue'> {
  /**
   * Accessible name of the field and of its search landmark, e.g. "Search services". It is not
   * shown (the placeholder is not a label): the field shows `placeholder`.
   */
  label: string;
  /** The text in the field (controlled). Leave it out, with `defaultValue`, for an uncontrolled field. */
  value?: string;
  defaultValue?: string;
  /** Called on every edit, and with `''` when the field is cleared. */
  onValueChange?: (value: string) => void;
  /** Enter in the field, or the submit button: search for this text. */
  onSubmit?: (value: string) => void;
  /** After the clear button or Escape emptied the field. Focus stays in the field. */
  onClear?: () => void;
  placeholder?: string;
  /** `md` (default) for a header or a toolbar; `lg` for a page-level or public search: 44 px, the touch floor. */
  size?: 'md' | 'lg';
  /** A submit button after the field, with `labels.submit`. Enter submits either way. */
  submitButton?: boolean;
  /** The submit button's variant. Default `primary`. */
  submitVariant?: ButtonVariant;
  /**
   * A `search` landmark named by `label` (default). Pass `false` for a field that filters a list
   * or a table, where one more landmark per toolbar would crowd the landmark list. Never wrap it
   * in a `<search>` or `role="search"` of your own: that nests two landmarks.
   */
  landmark?: boolean;
  /** Ids of elements that describe the field (a hint, a result count), as its `aria-describedby`. */
  inputDescribedBy?: string;
  /** The words. Default: `UixLabelsProvider` `searchBar`, then English. */
  labels?: Partial<SearchBarLabels>;
  /** The field's `name`. */
  name?: string;
  /** The longest text the field takes (HAR-2622). */
  maxLength?: number;
  /** The field's `id`, e.g. for a "/" shortcut that focuses it. Default: generated. */
  inputId?: string;
  inputRef?: Ref<HTMLInputElement>;
  autoFocus?: boolean;
  disabled?: boolean;
}

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

const ClearIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

/**
 * One search field look and behaviour (HAR-2030; TENSOR audit UXC-02) over the `.uix-searchbar`
 * contract: a leading magnifier, a clear button while there is text, Enter to search, Escape to
 * clear (an empty field lets Escape through, so it still closes the dialog it sits in). It is a
 * `search` landmark named by `label`.
 *
 * It is not a `<form>`, so it can sit inside one: Enter calls `onSubmit` and never submits a
 * surrounding form. For suggestions while typing, use `SearchSuggest`. Inside an overlay that
 * takes Escape itself before the field (a ConfirmPopover, the table's view menu), Escape closes
 * the overlay rather than clearing the text.
 */
export function SearchBar({
  label, value: valueProp, defaultValue = '', onValueChange, onSubmit, onClear, placeholder, size = 'md',
  submitButton = false, submitVariant = 'primary', landmark = true, inputDescribedBy, labels: labelsProp, name, maxLength, inputId, inputRef,
  autoFocus, disabled, className, ...props
}: SearchBarProps) {
  const uixLabels = useUixLabels();
  const labels: SearchBarLabels = { ...DEFAULT_SEARCH_BAR_LABELS, ...uixLabels.searchBar, ...labelsProp };
  const id = useId();
  const fieldId = inputId ?? `${id}-field`;
  const labelId = `${id}-label`;
  const field = useRef<HTMLInputElement | null>(null);
  const [own, setOwn] = useState(defaultValue);
  const value = valueProp ?? own;

  // Kept in step even while controlled, so a switch to uncontrolled keeps the last text.
  const change = (next: string) => {
    setOwn(next);
    onValueChange?.(next);
  };
  const clear = () => {
    change('');
    field.current?.focus();
    onClear?.();
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    // An IME's Enter or Escape commits or cancels the composition. Safari sends the committing
    // Enter after compositionend with keyCode 229, so isComposing alone is not enough.
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;
    if (event.key === 'Enter') {
      // Never the surrounding form's submit.
      event.preventDefault();
      onSubmit?.(value);
    } else if (event.key === 'Escape' && value !== '') {
      // Also keeps the browser's own clear of a search field from running twice.
      event.preventDefault();
      event.stopPropagation();
      clear();
    }
  };
  // Stable, so a consumer's callback ref is not detached and reattached on every keystroke.
  const setField = useCallback((node: HTMLInputElement | null) => {
    field.current = node;
    if (typeof inputRef === 'function') inputRef(node);
    else if (inputRef) (inputRef as { current: HTMLInputElement | null }).current = node;
  }, [inputRef]);

  return (
    <div
      role={landmark ? 'search' : undefined}
      aria-labelledby={landmark ? labelId : undefined}
      className={cx('uix-searchbar', size === 'md' && 'uix-searchbar--md', className)}
      {...props}
    >
      <div className="uix-searchbar__wrap">
        <label id={labelId} htmlFor={fieldId} className="uix-visually-hidden">{label}</label>
        <SearchIcon />
        <input
          ref={setField}
          id={fieldId}
          type="search"
          name={name}
          maxLength={maxLength}
          className="uix-input"
          value={value}
          placeholder={placeholder}
          autoComplete="off"
          enterKeyHint="search"
          aria-describedby={inputDescribedBy}
          autoFocus={autoFocus}
          disabled={disabled}
          onChange={(event) => change(event.currentTarget.value)}
          onKeyDown={onKeyDown}
        />
        {value !== '' && !disabled && (
          <button
            type="button"
            className="uix-searchbar__clear"
            aria-label={labels.clear}
            // Keep focus in the field while the pointer is down on the button.
            onMouseDown={(event) => event.preventDefault()}
            onClick={clear}
          >
            <ClearIcon />
          </button>
        )}
      </div>
      {submitButton && (
        <Button type="button" variant={submitVariant} size={size === 'lg' ? 'lg' : 'md'} disabled={disabled} onClick={() => onSubmit?.(value)}>
          {labels.submit}
        </Button>
      )}
    </div>
  );
}
