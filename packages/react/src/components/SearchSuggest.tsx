"use client";

import { useEffect, useId, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import type { FocusEvent, HTMLAttributes, KeyboardEvent, MouseEvent, ReactNode, Ref } from 'react';
import { cx } from '../cx.js';
import { useAnchoredPosition } from '../hooks/useAnchoredPosition.js';
import { searchSegments } from '../search-suggest-model.js';
import { Spinner } from './Spinner.js';

/** One result row. */
export interface SearchSuggestOption {
  /** Stable id, returned by `onSelect`. */
  id: string;
  /** The result's name. Matched letters are emphasised. */
  title: string;
  /** Where the result lives, outermost first (a breadcrumb). Middle crumbs truncate first. */
  meta?: readonly string[];
  /** One or two lines of context, clamped at two lines. Matched letters are emphasised. */
  description?: string;
  /** Optional leading glyph (decorative). */
  icon?: ReactNode;
}

/** A labelled action inside the list (the footer row, the heading action). */
export interface SearchSuggestAction {
  /** Visible text of the action. */
  label: string;
  /** Runs when the action is chosen. */
  onSelect: () => void;
}

/** Props of {@link SearchSuggest}. */
export interface SearchSuggestProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange' | 'onSelect' | 'title' | 'defaultValue'> {
  /** The text in the field (controlled). */
  value: string;
  /** Called on every edit, and with an empty string when the field is cleared. */
  onValueChange: (value: string) => void;
  /** The suggestions to show, best first. The consumer filters; this component only renders. */
  options: readonly SearchSuggestOption[];
  /** Called when a row is chosen by click or Enter. The list closes afterwards. */
  onSelect: (id: string, option: SearchSuggestOption) => void;
  /** Accessible name of the field (there is no visible label; the placeholder is not a label). */
  label: string;
  placeholder?: string;
  /** Text to emphasise in rows. Defaults to `value`. */
  highlight?: string;
  /** A title above the options, e.g. "Recently opened". */
  heading?: string;
  /** A small action next to the heading, e.g. "Clear". */
  headingAction?: SearchSuggestAction;
  /** A last row after the options, e.g. "Show all 23 results". Reachable by arrow keys. */
  footer?: SearchSuggestAction;
  /** The field is fetching suggestions: a spinner shows in the field and, with no options yet, in the list. */
  loading?: boolean;
  /** Announced while loading, and shown in the list when it has no rows yet. */
  loadingLabel?: string;
  /** Shown when the field has text, nothing is loading and there are no options. */
  empty?: ReactNode;
  /** Shown instead of the empty state when suggestions could not be loaded. */
  error?: ReactNode;
  /** A keyboard hint shown in the empty, unfocused field, e.g. "/". */
  shortcutHint?: string;
  /** Accessible name of the clear button (default "Clear search"). */
  clearLabel?: string;
  /** A polite announcement, e.g. "8 results". Rendered in a visually hidden live region. */
  status?: string;
  /** `lg` for a page-level search (hubs, start pages); `md` for a field in a toolbar or header. */
  size?: 'md' | 'lg';
  /** Controlled open state of the suggestion list (optional). */
  open?: boolean;
  /** Called when the list opens or closes. */
  onOpenChange?: (open: boolean) => void;
  /**
   * `absolute` (default) places the list under the field inside its own box. `fixed` floats it on
   * the viewport, so a clipping ancestor (`overflow: hidden` toolbars and headers) cannot cut it off;
   * it follows the field on scroll and resize and flips above it when there is no room below.
   */
  strategy?: 'absolute' | 'fixed';
  /** Focus the field from outside (e.g. a "/" shortcut). */
  inputRef?: Ref<HTMLInputElement | null>;
  /** Focus the field on mount. */
  autoFocus?: boolean;
  /** Form field name of the input. */
  name?: string;
}

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

const ClearIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" aria-hidden="true">
    <path d="M4 4l8 8M12 4l-8 8" />
  </svg>
);

function Emphasised({ text, query }: { text: string; query: string }) {
  return (
    <>
      {searchSegments(text, query).map((segment, index) =>
        segment.match
          ? <mark key={index} className="uix-search-suggest__match">{segment.text}</mark>
          : <span key={index}>{segment.text}</span>,
      )}
    </>
  );
}

const keepFocus = (event: MouseEvent) => event.preventDefault();

// useLayoutEffect warns during SSR; fall back to useEffect on the server.
const useIsomorphicLayoutEffect = typeof document !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * A search field with a suggestion list underneath: the "search and jump" pattern of Windows
 * Settings, Android Settings and most docs sites. Each row shows a name, where it lives and a line
 * of context. ARIA combobox pattern: focus stays in the field, arrow keys move the active row
 * (`aria-activedescendant`), Enter opens it (the first row when none is active), Escape closes the
 * list and a second Escape clears the text.
 */
export function SearchSuggest({
  value,
  onValueChange,
  options,
  onSelect,
  label,
  placeholder,
  highlight,
  heading,
  headingAction,
  footer,
  loading = false,
  loadingLabel,
  empty,
  error,
  shortcutHint,
  clearLabel = 'Clear search',
  status,
  size = 'md',
  open: openProp,
  strategy = 'absolute',
  onOpenChange,
  inputRef,
  autoFocus,
  name,
  className,
  onBlur,
  ...props
}: SearchSuggestProps) {
  const id = useId();
  const listboxId = `${id}-listbox`;
  const headingId = `${id}-heading`;
  const rootRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLInputElement>(null);
  useImperativeHandle(inputRef, () => fieldRef.current, []);

  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = (next: boolean) => {
    if (openProp === undefined) setOpenState(next);
    if (next !== open) onOpenChange?.(next);
  };
  const [focused, setFocused] = useState(false);
  const [activeState, setActive] = useState(-1);

  const itemCount = options.length + (footer ? 1 : 0);
  // Clamp during render: when options shrink without a keystroke (a fetch resolving), the stale
  // index must never name a row that is gone, not even for the frame before the reset effect runs.
  const active = activeState < itemCount ? activeState : -1;
  const optionKey = options.map((option) => option.id).join('|');
  useEffect(() => setActive(-1), [optionKey]);

  const hasText = value.trim().length > 0;
  const showEmpty = hasText && !loading && !error && options.length === 0 && empty != null;
  const showLoading = loading && options.length === 0;
  const visible = open && (itemCount > 0 || showLoading || showEmpty || error != null);
  const optionId = (index: number) => `${id}-option-${index}`;

  useEffect(() => {
    if (!visible || active < 0) return;
    const node = document.getElementById(optionId(active));
    node?.scrollIntoView?.({ block: 'nearest' });
  }, [active, visible]);

  const choose = (index: number) => {
    const option = options[index];
    if (option) onSelect(option.id, option);
    else if (footer && index === options.length) footer.onSelect();
    else return;
    setOpen(false);
    setActive(-1);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    // An IME is composing (CJK input): its Enter and arrows belong to the composition, not the list.
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        event.preventDefault();
        if (!itemCount) { setOpen(true); return; }
        const down = event.key === 'ArrowDown';
        if (!visible) {
          setOpen(true);
          setActive(down ? 0 : itemCount - 1);
          return;
        }
        setActive((stored) => {
          const current = stored < itemCount ? stored : -1;
          if (current < 0) return down ? 0 : itemCount - 1;
          return (current + (down ? 1 : -1) + itemCount) % itemCount;
        });
        return;
      }
      case 'Home':
      case 'End':
        // With a row active, Home/End jump within the list; otherwise they move the caret.
        if (visible && active >= 0 && itemCount) {
          event.preventDefault();
          setActive(event.key === 'Home' ? 0 : itemCount - 1);
        }
        return;
      case 'Enter':
        if (visible && active >= 0) { event.preventDefault(); choose(active); return; }
        // Only a row the user can see: after Escape closed the list, Enter must not act on it.
        if (visible && hasText && options.length) { event.preventDefault(); choose(0); }
        return;
      case 'Escape':
        if (visible) {
          event.preventDefault();
          event.stopPropagation();
          setOpen(false);
          setActive(-1);
        } else if (value) {
          event.preventDefault();
          event.stopPropagation();
          onValueChange('');
        }
        return;
      default:
    }
  };

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    onBlur?.(event);
    if (!rootRef.current?.contains(event.relatedTarget as Node | null)) {
      setFocused(false);
      setOpen(false);
      setActive(-1);
    }
  };

  const clear = () => {
    onValueChange('');
    setActive(-1);
    fieldRef.current?.focus();
  };

  const activeId = visible && active >= 0 ? optionId(active) : undefined;

  const fieldBoxRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const floating = strategy === 'fixed';
  // Width first (declared before the hook, so it runs first): the hook measures the list to flip it.
  useIsomorphicLayoutEffect(() => {
    const popup = popupRef.current;
    const box = fieldBoxRef.current;
    if (!floating || !visible || !popup || !box) return;
    const size = () => { popup.style.width = `${box.offsetWidth}px`; };
    size();
    window.addEventListener('resize', size);
    return () => window.removeEventListener('resize', size);
  }, [floating, visible]);
  useAnchoredPosition(floating ? fieldBoxRef : null, popupRef, { open: floating && visible, placement: 'bottom-start', offset: 4 });

  return (
    <div
      ref={rootRef}
      className={cx('uix-search-suggest', size === 'lg' && 'uix-search-suggest--lg', className)}
      data-open={visible || undefined}
      onBlur={handleBlur}
      {...props}
    >
      <div ref={fieldBoxRef} className="uix-search-suggest__field">
        <span className="uix-search-suggest__lead" aria-hidden="true"><SearchIcon /></span>
        <input
          ref={fieldRef}
          className="uix-input uix-search-suggest__input"
          type="text"
          role="combobox"
          aria-label={label}
          aria-autocomplete="list"
          aria-expanded={visible}
          aria-controls={listboxId}
          aria-activedescendant={activeId}
          aria-busy={loading || undefined}
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="search"
          name={name}
          value={value}
          placeholder={placeholder}
          autoFocus={autoFocus}
          onChange={(event) => {
            onValueChange(event.target.value);
            setActive(-1);
            setOpen(true);
          }}
          onFocus={() => { setFocused(true); setOpen(true); }}
          onClick={() => setOpen(true)}
          onKeyDown={handleKeyDown}
        />
        <span className="uix-search-suggest__trail">
          {loading && <Spinner className="uix-search-suggest__spinner" label={loadingLabel} />}
          {!loading && value && (
            <button type="button" className="uix-search-suggest__clear" aria-label={clearLabel} onMouseDown={keepFocus} onClick={clear}>
              <ClearIcon />
            </button>
          )}
          {!loading && !value && !focused && shortcutHint && <kbd className="uix-kbd" aria-hidden="true">{shortcutHint}</kbd>}
        </span>
      </div>

      <div ref={popupRef} className="uix-search-suggest__popup" data-strategy={floating ? 'fixed' : undefined} hidden={!visible}>
        {heading && options.length > 0 && (
          <div className="uix-search-suggest__header">
            <span className="uix-search-suggest__heading" id={headingId}>{heading}</span>
            {headingAction && (
              <button type="button" className="uix-search-suggest__header-action" onMouseDown={keepFocus} onClick={headingAction.onSelect}>
                {headingAction.label}
              </button>
            )}
          </div>
        )}
        <ul
          id={listboxId}
          role="listbox"
          className="uix-search-suggest__list"
          aria-label={heading && options.length > 0 ? undefined : label}
          aria-labelledby={heading && options.length > 0 ? headingId : undefined}
          aria-busy={loading || undefined}
        >
          {options.map((option, index) => {
            const crumbs = option.meta ?? [];
            const descId = option.description ? `${optionId(index)}-desc` : undefined;
            return (
              <li
                key={option.id}
                id={optionId(index)}
                role="option"
                aria-selected={index === active}
                aria-label={crumbs.length ? `${option.title}, ${crumbs.join(' › ')}` : option.title}
                aria-describedby={descId}
                className="uix-search-suggest__option"
                data-active={index === active || undefined}
                onMouseDown={keepFocus}
                onMouseMove={() => { if (active !== index) setActive(index); }}
                onClick={() => choose(index)}
              >
                {option.icon != null && <span className="uix-search-suggest__icon" aria-hidden="true">{option.icon}</span>}
                <span className="uix-search-suggest__body">
                  <span className="uix-search-suggest__title"><Emphasised text={option.title} query={highlight ?? value} /></span>
                  {crumbs.length > 0 && (
                    <span className="uix-search-suggest__meta" title={crumbs.join(' › ')}>
                      {crumbs.map((crumb, crumbIndex) => (
                        <span key={crumbIndex} className="uix-search-suggest__crumb">{crumb}</span>
                      ))}
                    </span>
                  )}
                  {option.description && (
                    <span id={descId} className="uix-search-suggest__desc">
                      <Emphasised text={option.description} query={highlight ?? value} />
                    </span>
                  )}
                </span>
              </li>
            );
          })}
          {footer && (
            <li
              id={optionId(options.length)}
              role="option"
              aria-selected={active === options.length}
              className="uix-search-suggest__footer"
              data-active={active === options.length || undefined}
              onMouseDown={keepFocus}
              onMouseMove={() => { if (active !== options.length) setActive(options.length); }}
              onClick={() => choose(options.length)}
            >
              {footer.label}
            </li>
          )}
        </ul>
        {showLoading && (
          // The field's spinner is the announced status; this row is the visual echo in the list.
          <div className="uix-search-suggest__state" aria-hidden="true">
            <span className="uix-spinner" />
            {loadingLabel && <span>{loadingLabel}</span>}
          </div>
        )}
        {error != null && options.length === 0 && !loading && <div className="uix-search-suggest__state">{error}</div>}
        {showEmpty && <div className="uix-search-suggest__state">{empty}</div>}
      </div>
      <span className="uix-visually-hidden" role="status" aria-live="polite">{status ?? ''}</span>
    </div>
  );
}
