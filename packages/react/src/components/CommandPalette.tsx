"use client";

import { createContext, useCallback, useContext, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode, HTMLAttributes, InputHTMLAttributes, KeyboardEvent } from 'react';
import { cx } from '../cx.js';
import { fillLabel } from '../fill-label.js';
import { useUixLabels } from '../labels-context.js';
import { useDialog } from '../hooks/useDialog.js';
import { groupCommandItems } from '../command-palette-model.js';
import type { CommandPaletteItem, CommandPalettePage, CommandPaletteSource } from '../command-palette-model.js';
import { defaultCommandFold, rankCommandItems } from '../command-palette-rank.js';
import type { RankedCommand } from '../command-palette-rank.js';
import { useCommandSources } from '../hooks/useCommandSources.js';
import type { CommandFrecency } from '../hooks/useCommandFrecency.js';
import { PENDING_DELAY_MS } from '../motion-timing.js';
import { searchSegments } from '../search-suggest-model.js';
import { Breadcrumbs } from './Breadcrumbs.js';
import { DelayedRender } from './DelayedRender.js';
import { KbdCombo, ariaKeyShortcutsFor, useKbdPlatform } from './Kbd.js';
import { toSequence } from '../shortcut-hooks.js';
import { useShortcut, useShortcuts } from './Shortcuts.js';
import type { ShortcutBinding } from '../shortcut-model.js';

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
  /**
   * Items mode: searches the palette runs as the person types (tickets, people on the server),
   * each listed as its own group after the commands. See `CommandPaletteSource`.
   */
  sources?: readonly CommandPaletteSource[];
  /**
   * Items mode: the person's use of each command (`useCommandFrecency()`): often and lately used
   * commands rank higher, and every command chosen here is recorded. Sources' results are not.
   */
  frecency?: Pick<CommandFrecency, 'score'> & Partial<Pick<CommandFrecency, 'record'>>;
  /** Items mode: a source's row while it searches with nothing to show yet. `{source}` is its label. Default: `commandPalette.loading`, then "Searching…". */
  loadingLabel?: string;
  /** Items mode: a source's row when its search failed; choosing it searches again. `{source}`. Default: `commandPalette.failed`, then "Search failed". */
  failedLabel?: string;
  /** Items mode: the Retry hint on that row. Default: `commandPalette.retry`, then "Retry". */
  retryLabel?: string;
  /** Items mode: your own matching instead of the built-in one (no aliases, boosts or frecency then). */
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
  /**
   * Items mode with `open` and `onOpenChange` (without the callback it binds nothing): keys that open and close the palette through the
   * shortcut registry, e.g. `'Mod+K'`; they work in text fields too, and list in the shortcut
   * sheet under its `shortcutLabel`. A person's remap of `uix.command-palette` applies. Default:
   * none (the product binds its own key, as before).
   */
  shortcut?: ShortcutBinding;
  /** The palette's shortcut in the sheet. Default: `UixLabelsProvider` `shortcuts.openPalette`, then "Open the command palette". */
  shortcutLabel?: string;
}

/** The command id of `CommandPalette` `shortcut`, for a remap or a `Button` `shortcutId`. */
export const COMMAND_PALETTE_SHORTCUT_ID = 'uix.command-palette';

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
  limit: _limit, shortcut: _shortcut, shortcutLabel: _shortcutLabel, sources: _sources, frecency: _frecency,
  loadingLabel: _loadingLabel, failedLabel: _failedLabel, retryLabel: _retryLabel, ...props
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

/** The id of an option: the list's id, a prefix for where the row is (recent, a source), the item id; safe for an id reference. */
const optionId = (listId: string, prefix: string, id: string) => `${listId}-${`${prefix}${id}`.replace(/[^\w-]/g, '_')}`;

/** A label with the query's matches emphasised (the same rule as SearchSuggest). */
function Highlighted({ text, query }: { text: string; query: string }) {
  return <>{searchSegments(text, query).map((segment, index) => (segment.match ? <mark key={index} className="uix-cmdk__mark">{segment.text}</mark> : segment.text))}</>;
}

/** One level of the page stack: the page, and the query and active row of the level it was opened from. */
interface PaletteLevel { page: CommandPalettePage; parentQuery: string; parentActive: string | null }

/** A row of the list: a command (perhaps a source's, perhaps stale while its source loads) or a source's Retry. */
type PaletteRow =
  | { kind: 'item'; id: string; item: CommandPaletteItem; alias?: string; source?: string; stale?: boolean }
  | { kind: 'retry'; id: string; source: CommandPaletteSource };

interface PaletteSection {
  key: string;
  label: string | undefined;
  rows: PaletteRow[];
  /** A source still loading with nothing to show yet: its group appears (with a loading row) after the pending delay. */
  loading?: CommandPaletteSource;
  busy?: boolean;
}

const NO_ITEMS: readonly CommandPaletteItem[] = [];

function CommandPaletteItems({
  items, query: queryProp, onQueryChange, recent, filter, onItemSelect, onNavigate, emptyLabel, recentLabel, placeholder,
  open, onOpenChange, limit = 100, inputLabel: inputLabelProp, resultsLabel, inputProps, className, children: _children,
  shortcut, shortcutLabel, sources, frecency, loadingLabel, failedLabel, retryLabel, ...props
}: CommandPaletteProps & { items: readonly CommandPaletteItem[] }) {
  const uixLabels = useUixLabels();
  const shortcuts = useShortcuts();
  // The palette's own keys, through the registry: in text fields too, and over its own dialog so
  // the same keys close it.
  useShortcut({
    id: COMMAND_PALETTE_SHORTCUT_ID, keys: shortcut ?? '', enabled: shortcut != null && open !== undefined && onOpenChange != null, scope: 'global',
    label: shortcutLabel ?? uixLabels.shortcuts?.openPalette ?? 'Open the command palette',
    allowInInputs: true, allowInModal: true, handler: () => onOpenChange?.(!open),
  });
  const labels = uixLabels.commandPalette;
  const inputLabel = inputLabelProp ?? labels?.input ?? 'Command palette';
  const empty = emptyLabel ?? labels?.empty ?? 'No results';
  const recentHeading = recentLabel ?? labels?.recent ?? 'Recent';
  const loadingText = (source: CommandPaletteSource) => fillLabel(loadingLabel ?? labels?.loading ?? 'Searching…', { source: source.label });
  const failedText = (source: CommandPaletteSource) => fillLabel(failedLabel ?? labels?.failed ?? 'Search failed', { source: source.label });
  const retryText = retryLabel ?? labels?.retry ?? 'Retry';
  const resultsText = (count: number) => resultsLabel?.(count) ?? fillLabel(count === 1 ? labels?.resultsOne ?? '{count} result' : labels?.resultsMany ?? '{count} results', { count });
  const platform = useKbdPlatform();
  const listId = useId();
  const [queryState, setQueryState] = useState('');
  const query = queryProp ?? queryState;
  const setQuery = (next: string) => { if (queryProp === undefined) setQueryState(next); onQueryChange?.(next); };

  const inDialog = open !== undefined;
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);
  /** The press began on the backdrop (a text selection dragged out of the field is not a click on it). */
  const pressedBackdrop = useRef(false);
  /** Escape just stepped back a page: the dialog's own Escape handling must not also close it. */
  const steppedBack = useRef(false);
  const ref = useDialog(inDialog ? open : false, () => onOpenChange?.(false));

  // The page stack (roadmap #9): the top level is `items` and `sources`; an item's `page` opens a level.
  const [stack, setStack] = useState<readonly PaletteLevel[]>([]);
  const page = stack.length > 0 ? stack[stack.length - 1]!.page : undefined;
  const levelItems = page ? page.items ?? NO_ITEMS : items;
  const scope = stack.map((level) => level.page.id).join('\u0001');
  const fieldLabel = page?.label ?? inputLabel;

  // Ranked with the alias that matched, the screen's boosts and the person's frecency; a custom `filter` keeps its own order.
  const frecencyScore = frecency?.score;
  const found = useMemo<RankedCommand[]>(() => (filter
    ? filter(levelItems, query).map((item) => ({ item, score: 0 }))
    : rankCommandItems(levelItems, query, { fold: defaultCommandFold, frecency: frecencyScore })), [filter, levelItems, query, frecencyScore]);
  const { views, retry } = useCommandSources(page ? page.sources : sources, query, scope, !inDialog || !!open);
  const showRecent = !page && query.trim() === '' && (recent?.length ?? 0) > 0;

  // A long list is capped, not virtualised: a palette is for narrowing down, and 100 rows render in a frame.
  const sections = useMemo<PaletteSection[]>(() => {
    const out: PaletteSection[] = [];
    if (showRecent) out.push({ key: 'recent', label: recentHeading, rows: recent!.map((item) => ({ kind: 'item', item, id: optionId(listId, 'r-', item.id) })) });
    const shown = found.slice(0, Math.max(0, limit));
    const aliasOf = new Map(shown.map((entry) => [entry.item, entry.alias]));
    groupCommandItems(shown.map((entry) => entry.item)).forEach((group, index) => out.push({
      key: `g${index}`, label: group.label, rows: group.items.map((item) => ({ kind: 'item', item, alias: aliasOf.get(item), id: optionId(listId, '', item.id) })),
    }));
    // Server results list after the commands (a late answer never moves rows already shown), the
    // sources the screen boosts first.
    const ordered = views
      .map((view, index) => ({ view, index, boost: Math.max(0, view.source.contextBoost ?? 0) || 0 }))
      .sort((a, b) => b.boost - a.boost || a.index - b.index);
    for (const { view } of ordered) {
      const { source } = view;
      const rows: PaletteRow[] = view.failed
        ? [{ kind: 'retry', source, id: optionId(listId, 's-', `${source.id}-retry`) }]
        : view.items.slice(0, Math.max(0, limit)).map((item) => ({ kind: 'item', item, source: source.id, stale: view.loading, id: optionId(listId, `s-${source.id}-`, item.id) }));
      out.push({ key: `s-${source.id}`, label: source.label, rows, loading: view.loading && rows.length === 0 ? source : undefined, busy: view.loading });
    }
    return out;
  }, [showRecent, recent, recentHeading, found, limit, views, listId]);
  /** Every row in display order. */
  const rows = useMemo(() => sections.flatMap((section) => section.rows), [sections]);
  const enabled = rows.filter((row) => row.kind === 'retry' || (!row.item.disabled && !row.stale));
  const loading = views.some((view) => view.loading);

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

  // The count is announced once typing settles and every source has answered, once per change;
  // a failed source is named, and so is the page after the page changes.
  const [announced, setAnnounced] = useState('');
  const count = found.length + views.reduce((sum, view) => sum + (view.loading || view.failed ? 0 : view.items.length), 0);
  const failedSources = views.filter((view) => view.failed).map((view) => view.source);
  const failedKey = failedSources.map((source) => source.id).join('\u0001');
  const announcement = () => [resultsText(count), ...failedSources.map((source) => `${source.label}: ${failedText(source)}`)].join('. ');
  const announcementRef = useRef(announcement);
  announcementRef.current = announcement;
  const announcedScope = useRef(scope);
  const fieldLabelRef = useRef(fieldLabel);
  fieldLabelRef.current = fieldLabel;
  useEffect(() => {
    if (loading) return undefined;
    const t = window.setTimeout(() => {
      const moved = announcedScope.current !== scope;
      announcedScope.current = scope;
      setAnnounced(`${moved ? `${fieldLabelRef.current}: ` : ''}${announcementRef.current()}`);
    }, 150);
    return () => window.clearTimeout(t);
  }, [count, loading, failedKey, scope]);

  // Opening: remember the opener, focus the field. Closing: clear the query and the pages, focus goes back.
  useEffect(() => {
    if (!inDialog) return;
    if (open) {
      returnTo.current = document.activeElement as HTMLElement | null;
      inputRef.current?.focus();
    } else {
      if (query) setQuery('');
      setStack([]);
      setActiveState(null);
      returnTo.current?.focus?.();
      returnTo.current = null;
    }
    // Only on open and close: the query and its setter are read as they are then.
  }, [open, inDialog]);

  /** Open `next` on top: the field empties, and coming back gives this level's query and row back. */
  const push = (next: CommandPalettePage) => {
    setStack([...stack, { page: next, parentQuery: query, parentActive: activeId }]);
    setQuery('');
    setActiveState(null);
  };
  /** Back to the level under `stack[to]` (0: the top level), with the query and the row it had. */
  const pop = (to: number) => {
    const level = stack[to];
    if (!level) return;
    setStack(stack.slice(0, to));
    setQuery(level.parentQuery);
    setActiveState(level.parentActive);
    inputRef.current?.focus();
  };

  const choose = (row: PaletteRow) => {
    if (row.kind === 'retry') { retry(row.source.id); return; }
    const { item } = row;
    if (item.disabled || row.stale) return;
    // A source's result is the server's to rank; frecency learns the palette's own commands.
    if (!row.source) frecency?.record?.(item.id);
    if (item.page) {
      item.onSelect?.();
      onItemSelect?.(item);
      push(item.page);
      return;
    }
    item.onSelect?.();
    if (item.href) {
      if (onNavigate) onNavigate(item.href, item);
      else window.location.assign(item.href);
    }
    // A registered command with nothing else to do runs, once the palette has closed and given focus back.
    const command = !item.onSelect && !item.href && item.shortcutId ? item.shortcutId : null;
    onItemSelect?.(item);
    if (inDialog) onOpenChange?.(false);
    if (command) {
      if (inDialog) window.setTimeout(() => shortcuts.run(command), 0);
      else shortcuts.run(command);
    }
  };

  const move = (to: number) => {
    if (enabled.length === 0) return;
    const index = (to + enabled.length) % enabled.length;
    setActiveState(enabled[index]!.id);
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
      case 'Enter': if (active) { event.preventDefault(); choose(active); } break;
      // On a page, Escape steps back instead of closing (cmdk's pattern). Cancelling the keydown
      // stops the dialog's close request; `steppedBack` covers an engine that sends `cancel` anyway.
      case 'Escape':
        if (stack.length > 0) {
          event.preventDefault();
          steppedBack.current = true;
          window.setTimeout(() => { steppedBack.current = false; }, 0);
          pop(stack.length - 1);
        }
        break;
      // Backspace in an empty field steps back too; not a held one, which was still deleting text.
      case 'Backspace':
        if (stack.length > 0 && query === '' && !event.repeat) { event.preventDefault(); pop(stack.length - 1); }
        break;
      default:
    }
  };

  const renderRow = (row: PaletteRow) => {
    const isActive = row.id === activeId;
    if (row.kind === 'retry') {
      return (
        <div
          key={row.id}
          id={row.id}
          role="option"
          className="uix-cmdk__item uix-cmdk__item--retry"
          data-active={isActive || undefined}
          aria-selected={isActive}
          onPointerMove={() => { if (!isActive) setActiveState(row.id); }}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => choose(row)}
        >
          <span className="uix-cmdk__text"><span className="uix-cmdk__label">{failedText(row.source)}</span></span>
          <span className="uix-cmdk__retry">{retryText}</span>
        </div>
      );
    }
    const { item, alias, stale } = row;
    const inert = item.disabled || stale;
    // The registry's keys for a registered command (none while it is off), else the literal ones.
    // at the opener, where the command will run: a scoped command shows keys only when opened from its scope
    const keys = item.shortcutId ? shortcuts.keysFor(item.shortcutId, returnTo.current ?? (typeof document === 'undefined' ? null : document.activeElement)) : toSequence(item.shortcut);
    return (
      <div
        key={row.id}
        id={row.id}
        role="option"
        className="uix-cmdk__item"
        data-active={isActive || undefined}
        data-stale={stale || undefined}
        aria-selected={isActive}
        aria-disabled={inert || undefined}
        aria-keyshortcuts={ariaKeyShortcutsFor(keys, platform)}
        // pointermove, not mouseenter: the list scrolling under a still pointer must not steal the active row
        onPointerMove={() => { if (!inert && !isActive) setActiveState(row.id); }}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => choose(row)}
      >
        {item.icon != null && <span className="uix-cmdk__icon" aria-hidden="true">{item.icon}</span>}
        <span className="uix-cmdk__text">
          <span className="uix-cmdk__label">
            <Highlighted text={item.label} query={query} />
            {alias !== undefined && <>{' '}<span className="uix-cmdk__alias">(<Highlighted text={alias} query={query} />)</span></>}
          </span>
          {item.description && <span className="uix-cmdk__desc">{item.description}</span>}
        </span>
        {keys ? <span className="uix-cmdk__shortcut"><KbdCombo keys={keys} platform={platform} /></span> : null}
        {item.page && <span className="uix-cmdk__chevron" aria-hidden="true" />}
      </div>
    );
  };

  const renderSection = (section: PaletteSection) => {
    const headingId = `${listId}-${section.key}`;
    const group = (
      <div key={section.key} role="group" aria-labelledby={section.label != null ? headingId : undefined} aria-busy={section.busy || undefined}>
        {section.label != null && <div className="uix-cmdk__group" id={headingId} role="presentation">{section.label}</div>}
        {section.rows.map(renderRow)}
        {section.loading && (
          <div className="uix-cmdk__status" role="presentation">
            <span className="uix-spinner uix-spinner--sm" aria-hidden="true" />
            {loadingText(section.loading)}
          </div>
        )}
      </div>
    );
    // A source with nothing to show yet appears only once its search has taken a moment (motion
    // standard §2.3): a fast answer never flashes a loading row.
    return section.loading ? <DelayedRender key={section.key} delay={PENDING_DELAY_MS}>{group}</DelayedRender> : group;
  };

  const crumbs = page ? (
    <Breadcrumbs
      className="uix-cmdk__crumbs"
      label={labels?.breadcrumb ?? 'Breadcrumb'}
      separator="›"
      items={[
        { label: inputLabel, id: '\u0000' },
        ...stack.slice(0, -1).map((level) => ({ label: level.page.label, id: level.page.id })),
      ].map((crumb, index) => ({
        id: crumb.id,
        current: false,
        // a press keeps focus in the field; a keyboard click comes back to it
        label: <button type="button" className="uix-cmdk__crumb" onMouseDown={(event) => event.preventDefault()} onClick={() => pop(index)}>{crumb.label}</button>,
      })).concat([{ id: page.id, current: true, label: <>{page.label}</> }])}
    />
  ) : null;

  const palette = (
    <div className={cx('uix-cmdk', className)} data-items="" {...props}>
      {crumbs}
      <input
        ref={inputRef}
        className="uix-cmdk__input"
        role="combobox"
        aria-expanded="true"
        aria-autocomplete="list"
        aria-controls={listId}
        aria-activedescendant={activeId ?? undefined}
        aria-label={fieldLabel}
        aria-busy={loading || undefined}
        placeholder={page?.placeholder ?? placeholder}
        autoComplete="off"
        spellCheck={false}
        {...inputProps}
        value={query}
        onChange={(event) => { inputProps?.onChange?.(event); setQuery(event.currentTarget.value); }}
        onKeyDown={onKeyDown}
      />
      <div ref={listRef} className="uix-cmdk__list" role="listbox" id={listId} aria-label={fieldLabel} aria-busy={loading || undefined} hidden={rows.length === 0 && !loading}>
        {sections.map(renderSection)}
      </div>
      {rows.length === 0 && !loading && <p className="uix-cmdk__empty">{empty}</p>}
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
      // Escape that stepped back a page is not also a request to close
      onCancel={(event) => { if (steppedBack.current) event.preventDefault(); }}
      // a click on the backdrop (the dialog box itself, outside the palette) closes it
      onPointerDown={(event) => { pressedBackdrop.current = event.target === event.currentTarget; }}
      onClick={(event) => {
        if (event.target === event.currentTarget && pressedBackdrop.current) onOpenChange?.(false);
        pressedBackdrop.current = false;
      }}
    >
      {palette}
    </dialog>
  );
}
