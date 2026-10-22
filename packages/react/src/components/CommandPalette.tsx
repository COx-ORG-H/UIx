"use client";

import { createContext, useCallback, useContext, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode, HTMLAttributes, InputHTMLAttributes, KeyboardEvent } from 'react';
import { cx } from '../cx.js';
import { fillLabel } from '../fill-label.js';
import { useUixLabels } from '../labels-context.js';
import { useDialog } from '../hooks/useDialog.js';
import { filterCommandItems, groupCommandItems } from '../command-palette-model.js';
import type { CommandPaletteItem } from '../command-palette-model.js';
import { searchSegments } from '../search-suggest-model.js';
import { KbdCombo, ariaKeyShortcuts, useKbdPlatform } from './Kbd.js';

/* Combobox wiring shared across the palette family (UIX-A11Y-1): the root owns the listbox id
 * and the active option id (input → aria-activedescendant), and counts mounted items so a status
 * region can announce result counts as the consumer filters. Null outside a <CommandPalette>. */
interface CmdkContextValue {
  listId: string;
  /** An active item claims aria-activedescendant; pass active=false to release it. */
  setActive: (id: string, active: boolean) => void;
  /** Register a mounted item for the results count; returns the unregister cleanup. */
  registerItem: () => () => void;
}
const CmdkContext = createContext<CmdkContextValue | null>(null);

// useLayoutEffect warns during SSR; fall back to useEffect on the server.
const useIsomorphicLayoutEffect = typeof document !== 'undefined' ? useLayoutEffect : useEffect;

export interface CommandPaletteProps extends HTMLAttributes<HTMLDivElement> {
  /** TENSOR RX-125 (UIX-04): translatable; English default. */
  inputLabel?: string;
  /**
   * The polite result count for this palette (HAR-1647). Default: `UixLabelsProvider`
   * `commandPalette.resultsOne` / `resultsMany` (`{count}`), then "1 result" / "3 results".
   */
  resultsLabel?: (count: number) => string;
  /** Props for the search input (value/onChange/placeholder wired by the consumer). */
  inputProps?: InputHTMLAttributes<HTMLInputElement>;
  children?: ReactNode;
  /**
   * Items mode (HAR-1378): pass the commands and the palette filters them itself (case and
   * diacritics folded, best match first), groups them, moves the active one with ↑ / ↓ (Home / End
   * while the query is empty) through `aria-activedescendant`, and runs it on Enter or a click.
   * Without `items`, `children` render as before and the consumer wires everything.
   */
  items?: readonly CommandPaletteItem[];
  /** Items mode: the query (controlled). Pair with `onQueryChange`. */
  query?: string;
  /** Items mode: the query as it changes (also when the palette clears it on close). */
  onQueryChange?: (query: string) => void;
  /** Items mode: what an empty query shows above all items, under the `recentLabel` heading. */
  recent?: readonly CommandPaletteItem[];
  /** Items mode: your own matching instead of the built-in one (`filterCommandItems`). */
  filter?: (items: readonly CommandPaletteItem[], query: string) => CommandPaletteItem[];
  /** Items mode: called with every chosen item, after its own `onSelect`, e.g. to record it as recent. */
  onItemSelect?: (item: CommandPaletteItem) => void;
  /** Items mode: follow an item's `href` with your router. Default: the browser goes there. */
  onNavigate?: (href: string, item: CommandPaletteItem) => void;
  /** Items mode: shown when nothing matches. Default: `UixLabelsProvider` `commandPalette.empty`, then "No results". */
  emptyLabel?: ReactNode;
  /** Items mode: the heading of `recent`. Default: `commandPalette.recent`, then "Recent". */
  recentLabel?: string;
  /** Items mode: the input's placeholder. */
  placeholder?: string;
  /**
   * Items mode: host the palette in a modal native `<dialog>` (focus stays inside, Escape and a
   * click outside close it, focus returns to the opener). Closing it clears the query. Without
   * `open`, the palette renders in place.
   */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Items mode: render at most this many found items (the count still says how many were found). Default 100. */
  limit?: number;
}

/**
 * ⌘K command palette surface over `.uix-cmdk`. Presentational: mount it inside a
 * Modal/Popover and wire search + keyboard selection in the consumer. The input is
 * a combobox over the listbox of `CommandItem`s; spreads override every default, so
 * consumers already passing their own roles/labels keep working.
 *
 * ⌘K is keyboard-initiated and used many times a day, so the palette marks the dialog or
 * popover it sits in `[data-uix-instant]`: it opens and closes with no animation, without the
 * consumer knowing the attribute (or the older `data-uix-cmdk-dialog`).
 */
export function CommandPalette(props: CommandPaletteProps) {
  if (props.items) return <CommandPaletteItems {...props} items={props.items} />;
  return <CommandPaletteChildren {...props} />;
}

function CommandPaletteChildren({
  inputProps, children, inputLabel: inputLabelProp, resultsLabel, className,
  items: _items, query: _query, onQueryChange: _onQueryChange, recent: _recent, filter: _filter, onItemSelect: _onItemSelect,
  onNavigate: _onNavigate, emptyLabel: _emptyLabel, recentLabel: _recentLabel, placeholder: _placeholder, open: _open, onOpenChange: _onOpenChange,
  limit: _limit, ...props
}: CommandPaletteProps) {
  const uixLabels = useUixLabels();
  const inputLabel = inputLabelProp ?? uixLabels.commandPalette?.input ?? 'Command palette';
  const resultsOne = uixLabels.commandPalette?.resultsOne ?? '{count} result';
  const resultsMany = uixLabels.commandPalette?.resultsMany ?? '{count} results';
  const resultsText = (count: number) => resultsLabel?.(count) ?? fillLabel(count === 1 ? resultsOne : resultsMany, { count });
  // The latest formatter, so a new function identity on every render does not re-announce.
  const resultsTextRef = useRef(resultsText);
  resultsTextRef.current = resultsText;
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  // Before the overlay's own open effect runs (a child's layout effect runs first), so the first
  // open is already instant. Leaves an attribute the consumer set (Modal `instant`) alone.
  useIsomorphicLayoutEffect(() => {
    const overlay = rootRef.current?.closest<HTMLElement>('dialog, [popover]');
    if (!overlay || overlay.hasAttribute('data-uix-instant')) return;
    overlay.setAttribute('data-uix-instant', '');
    return () => overlay.removeAttribute('data-uix-instant');
  }, []);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const [announced, setAnnounced] = useState('');

  const setActive = useCallback((id: string, active: boolean) => {
    setActiveId((cur) => (active ? id : cur === id ? null : cur));
  }, []);
  const registerItem = useCallback(() => {
    setCount((c) => c + 1);
    return () => setCount((c) => c - 1);
  }, []);

  // debounced so a keystroke's worth of item mounts/unmounts announces once
  useEffect(() => {
    const t = window.setTimeout(() => setAnnounced(resultsTextRef.current(count)), 150);
    return () => clearTimeout(t);
  }, [count]);

  const ctx = useMemo(() => ({ listId, setActive, registerItem }), [listId, setActive, registerItem]);

  return (
    <CmdkContext.Provider value={ctx}>
      <div ref={rootRef} className={cx('uix-cmdk', className)} {...props}>
        <input
          className="uix-cmdk__input"
          role="combobox"
          aria-expanded="true"
          aria-autocomplete="list"
          aria-controls={listId}
          aria-activedescendant={activeId ?? undefined}
          aria-label={inputLabel}
          {...inputProps}
        />
        <div className="uix-cmdk__list" role="listbox" id={listId}>{children}</div>
        <span className="uix-visually-hidden" role="status">{announced}</span>
      </div>
    </CmdkContext.Provider>
  );
}

export interface CommandGroupProps {
  label?: ReactNode;
  children?: ReactNode;
}

/** A labeled group of command items. */
export function CommandGroup({ label, children }: CommandGroupProps) {
  const labelId = useId();
  return (
    <div role="group" aria-labelledby={label != null ? labelId : undefined}>
      {label != null && <div className="uix-cmdk__group" id={labelId}>{label}</div>}
      {children}
    </div>
  );
}

export interface CommandItemProps extends HTMLAttributes<HTMLDivElement> {
  icon?: ReactNode;
  /** Trailing shortcut hint (e.g. a `.uix-kbd`). */
  shortcut?: ReactNode;
  active?: boolean;
  children?: ReactNode;
}

/** A single command row over `.uix-cmdk__item`. */
export function CommandItem({ icon, shortcut, active, children, className, id, ...props }: CommandItemProps) {
  const ctx = useContext(CmdkContext);
  const autoId = useId();
  const itemId = id ?? autoId;

  useEffect(() => ctx?.registerItem(), [ctx]);
  useEffect(() => {
    if (!ctx || !active) return;
    ctx.setActive(itemId, true);
    return () => ctx.setActive(itemId, false);
  }, [ctx, itemId, active]);

  return (
    <div
      className={cx('uix-cmdk__item', className)}
      data-active={active || undefined}
      id={itemId}
      role="option"
      aria-selected={!!active}
      {...props}
    >
      {icon}
      <span>{children}</span>
      {shortcut}
    </div>
  );
}

/** The id of an item's option: the list's id plus the item id, made safe for an id reference. */
const optionId = (listId: string, item: CommandPaletteItem, recent: boolean) => `${listId}-${recent ? 'r-' : ''}${item.id.replace(/[^\w-]/g, '_')}`;

/** A label with the query's matches emphasised (the same rule as SearchSuggest). */
function Highlighted({ text, query }: { text: string; query: string }) {
  return <>{searchSegments(text, query).map((segment, index) => (segment.match ? <mark key={index} className="uix-cmdk__mark">{segment.text}</mark> : segment.text))}</>;
}

function CommandPaletteItems({
  items, query: queryProp, onQueryChange, recent, filter, onItemSelect, onNavigate, emptyLabel, recentLabel, placeholder,
  open, onOpenChange, limit = 100, inputLabel: inputLabelProp, resultsLabel, inputProps, className, children: _children, ...props
}: CommandPaletteProps & { items: readonly CommandPaletteItem[] }) {
  const uixLabels = useUixLabels();
  const labels = uixLabels.commandPalette;
  const inputLabel = inputLabelProp ?? labels?.input ?? 'Command palette';
  const empty = emptyLabel ?? labels?.empty ?? 'No results';
  const recentHeading = recentLabel ?? labels?.recent ?? 'Recent';
  const resultsText = (count: number) => resultsLabel?.(count) ?? fillLabel(count === 1 ? labels?.resultsOne ?? '{count} result' : labels?.resultsMany ?? '{count} results', { count });
  const resultsTextRef = useRef(resultsText);
  resultsTextRef.current = resultsText;
  const platform = useKbdPlatform();
  const listId = useId();
  const [queryState, setQueryState] = useState('');
  const query = queryProp ?? queryState;
  const setQuery = (next: string) => { if (queryProp === undefined) setQueryState(next); onQueryChange?.(next); };

  const inDialog = open !== undefined;
  const ref = useDialog(inDialog ? open : false, () => onOpenChange?.(false));
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);

  const found = useMemo(() => (filter ?? filterCommandItems)(items, query), [filter, items, query]);
  const showRecent = query.trim() === '' && (recent?.length ?? 0) > 0;
  // A long list is capped, not virtualised: a palette is for narrowing down, and 100 rows render in a frame.
  const groups = useMemo(() => groupCommandItems(found.slice(0, Math.max(0, limit))), [found, limit]);
  /** Every row in display order: recent first (while the query is empty), then the groups. */
  const rows = useMemo(() => [
    ...(showRecent ? recent!.map((item) => ({ item, id: optionId(listId, item, true) })) : []),
    ...groups.flatMap((group) => group.items.map((item) => ({ item, id: optionId(listId, item, false) }))),
  ], [showRecent, recent, groups, listId]);
  const enabled = rows.filter((row) => !row.item.disabled);

  // The active row: kept while it is still found, else the first enabled one. Computed during
  // render, so no frame ever shows a list with no active option (LESSONS 2026-10-16).
  const [activeState, setActiveState] = useState<string | null>(null);
  const activeId = enabled.some((row) => row.id === activeState) ? activeState : enabled[0]?.id ?? null;
  const active = rows.find((row) => row.id === activeId);

  // Keyboard moves are instant: the active row scrolls into view without animation.
  useLayoutEffect(() => {
    if (!activeId) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[id="${activeId}"]`);
    el?.scrollIntoView?.({ block: 'nearest' });
  }, [activeId]);

  // The count is announced after typing settles, once per change.
  const [announced, setAnnounced] = useState('');
  const count = found.length;
  useEffect(() => {
    const t = window.setTimeout(() => setAnnounced(resultsTextRef.current(count)), 150);
    return () => window.clearTimeout(t);
  }, [count]);

  // Opening: remember the opener, focus the field. Closing: clear the query, focus goes back.
  useEffect(() => {
    if (!inDialog) return;
    if (open) {
      returnTo.current = document.activeElement as HTMLElement | null;
      inputRef.current?.focus();
    } else {
      if (query) setQuery('');
      setActiveState(null);
      returnTo.current?.focus?.();
      returnTo.current = null;
    }
    // Only on open and close: the query and its setter are read as they are then.
  }, [open, inDialog]);

  const choose = (item: CommandPaletteItem) => {
    if (item.disabled) return;
    item.onSelect?.();
    if (item.href) {
      if (onNavigate) onNavigate(item.href, item);
      else window.location.assign(item.href);
    }
    onItemSelect?.(item);
    if (inDialog) onOpenChange?.(false);
  };

  const move = (to: number) => {
    if (enabled.length === 0) return;
    const index = (to + enabled.length) % enabled.length;
    setActiveState(enabled[index].id);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    inputProps?.onKeyDown?.(event);
    if (event.defaultPrevented || event.nativeEvent.isComposing) return;
    const at = enabled.findIndex((row) => row.id === activeId);
    switch (event.key) {
      case 'ArrowDown': event.preventDefault(); move(at + 1); break;
      case 'ArrowUp': event.preventDefault(); move(at - 1); break;
      // Home / End move the caret while there is text to edit; in an empty field they jump.
      case 'Home': if (query === '') { event.preventDefault(); move(0); } break;
      case 'End': if (query === '') { event.preventDefault(); move(enabled.length - 1); } break;
      case 'Enter': if (active) { event.preventDefault(); choose(active.item); } break;
      default:
    }
  };

  const renderRow = ({ item, id }: { item: CommandPaletteItem; id: string }) => {
    const isActive = id === activeId;
    return (
      <div
        key={id}
        id={id}
        role="option"
        className="uix-cmdk__item"
        data-active={isActive || undefined}
        aria-selected={isActive}
        aria-disabled={item.disabled || undefined}
        aria-keyshortcuts={item.shortcut?.length ? ariaKeyShortcuts(item.shortcut, platform) : undefined}
        // pointermove, not mouseenter: the list scrolling under a still pointer must not steal the active row
        onPointerMove={() => { if (!item.disabled && !isActive) setActiveState(id); }}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => choose(item)}
      >
        {item.icon != null && <span className="uix-cmdk__icon" aria-hidden="true">{item.icon}</span>}
        <span className="uix-cmdk__text">
          <span className="uix-cmdk__label"><Highlighted text={item.label} query={query} /></span>
          {item.description && <span className="uix-cmdk__desc">{item.description}</span>}
        </span>
        {item.shortcut?.length ? <span className="uix-cmdk__shortcut"><KbdCombo keys={[...item.shortcut]} platform={platform} /></span> : null}
      </div>
    );
  };

  const recentRows = showRecent ? rows.slice(0, recent!.length) : [];
  /** Where the next group's rows start in `rows`. */
  let cursor = recentRows.length;
  const palette = (
    <div className={cx('uix-cmdk', className)} data-items="" {...props}>
      <input
        ref={inputRef}
        className="uix-cmdk__input"
        role="combobox"
        aria-expanded="true"
        aria-autocomplete="list"
        aria-controls={listId}
        aria-activedescendant={activeId ?? undefined}
        aria-label={inputLabel}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        {...inputProps}
        value={query}
        onChange={(event) => { inputProps?.onChange?.(event); setQuery(event.currentTarget.value); }}
        onKeyDown={onKeyDown}
      />
      <div ref={listRef} className="uix-cmdk__list" role="listbox" id={listId} aria-label={inputLabel} hidden={rows.length === 0}>
        {recentRows.length > 0 && (
          <div role="group" aria-labelledby={`${listId}-recent`}>
            <div className="uix-cmdk__group" id={`${listId}-recent`} role="presentation">{recentHeading}</div>
            {recentRows.map(renderRow)}
          </div>
        )}
        {groups.map((group, index) => {
          const groupRows = rows.slice(cursor, cursor + group.items.length);
          cursor += group.items.length;
          const headingId = `${listId}-g${index}`;
          return (
            <div key={group.label ?? `__${index}`} role="group" aria-labelledby={group.label != null ? headingId : undefined}>
              {group.label != null && <div className="uix-cmdk__group" id={headingId} role="presentation">{group.label}</div>}
              {groupRows.map(renderRow)}
            </div>
          );
        })}
      </div>
      {rows.length === 0 && <p className="uix-cmdk__empty">{empty}</p>}
      <span className="uix-visually-hidden" role="status">{announced}</span>
    </div>
  );

  if (!inDialog) return palette;
  return (
    <dialog
      ref={ref}
      className="uix-dialog uix-cmdk-dialog"
      data-uix-cmdk-dialog=""
      // the motion contract (HAR-2578): a keyboard surface opens and closes with no animation
      data-uix-instant=""
      aria-label={inputLabel}
      // a click on the backdrop (the dialog box itself, outside the palette) closes it
      onClick={(event) => { if (event.target === event.currentTarget) onOpenChange?.(false); }}
    >
      {palette}
    </dialog>
  );
}
