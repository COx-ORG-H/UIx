"use client";

/* The per-item action panel (enterprise UX study, roadmap #10; spec Docs/specs/2026-11-20-action-panel.md).
 * Raycast's action panel: Enter on a focused item runs its primary action, Mod+K lists every action
 * of the item with its keys, searchable and grouped, destructive ones last and confirmed (or undoable).
 * Superhuman's first-press-local rule, through the shortcut registry's scopes: the item's Mod+K is
 * registered in the item's scope, which outranks the global command palette's Mod+K, so the first
 * press opens the item's panel; inside the open panel a Mod+K closes it, gives focus back and passes
 * the key on, so the second press reaches the palette. With focus on no item, the item's Mod+K steps
 * aside and the palette gets the first press.
 *
 * It is a separate surface from `CommandPalette` and reuses its list visuals (`.uix-cmdk`).
 * `ActionPanel` is the dialog; `ActionPanelScope` makes any item opt in; `DataWorkspace`
 * `getRowActions` wires the focused row through `useActionPanelHost`. */
import { forwardRef, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { HTMLAttributes, KeyboardEvent as ReactKeyboardEvent, ReactNode, RefObject } from 'react';
import { cx } from '../cx.js';
import { fillLabel } from '../fill-label.js';
import { useUixLabels } from '../labels-context.js';
import { useDialog } from '../hooks/useDialog.js';
import { useAnchoredPosition } from '../hooks/useAnchoredPosition.js';
import type { Placement } from '../overlay-position.js';
import { groupActionPanelActions, needsConfirm, primaryAction } from '../action-panel-model.js';
import type { ActionPanelAction, ActionPanelConfirm } from '../action-panel-model.js';
import { searchSegments } from '../search-suggest-model.js';
import { isTypingTarget } from '../shortcut-model.js';
import type { KeySequence } from '../shortcut-model.js';
import { Button } from './Button.js';
import { KbdCombo, ariaKeyShortcutsFor, useKbdPlatform } from './Kbd.js';
import { ShortcutScope, useShortcut, useShortcuts } from './Shortcuts.js';

// useLayoutEffect warns during SSR; fall back to useEffect on the server.
const useIsomorphicLayoutEffect = typeof document !== 'undefined' ? useLayoutEffect : useEffect;

/** The command id of the item's Mod+K (remap it, or give a `Button` / `MenuItem` this `shortcutId`). */
export const ACTION_PANEL_SHORTCUT_ID = 'uix.action-panel';
/** The item's panel opens on these keys by default. */
export const ACTION_PANEL_DEFAULT_KEYS = 'Mod+K';

/** The panel's words (`UixLabelsProvider` `actionPanel`). `{name}`, `{action}` and `{count}` are filled in. */
export interface ActionPanelLabels {
  /** The panel's name with the item's name. Default "Actions for {name}". */
  title: string;
  /** The panel's name without one. Default "Actions". */
  titleUnnamed: string;
  /** The search field's name and placeholder. Default "Search actions". */
  search: string;
  /** Nothing matches the query. Default "No matching actions". */
  empty: string;
  /** The polite count as the person types. Defaults "{count} action" / "{count} actions". */
  resultsOne: string;
  resultsMany: string;
  /** The item's Mod+K in the shortcut sheet and on the row's ⋯ button. Default "Show actions". */
  open: string;
  /** The group of destructive actions, for screen readers. Default "Destructive actions". */
  destructiveGroup: string;
  /** The confirm step's question. Default "{action}?". */
  confirmTitle: string;
  /** The confirm step's explanation. Default "This cannot be undone." */
  confirmBody: string;
  /** Leaves the confirm step. Default "Cancel". */
  cancel: string;
}

export const DEFAULT_ACTION_PANEL_LABELS: ActionPanelLabels = {
  title: 'Actions for {name}',
  titleUnnamed: 'Actions',
  search: 'Search actions',
  empty: 'No matching actions',
  resultsOne: '{count} action',
  resultsMany: '{count} actions',
  open: 'Show actions',
  destructiveGroup: 'Destructive actions',
  confirmTitle: '{action}?',
  confirmBody: 'This cannot be undone.',
  cancel: 'Cancel',
};

/** The panel's words: the defaults, then `UixLabelsProvider` `actionPanel`, then the component's own. */
export function useActionPanelLabels(own?: Partial<ActionPanelLabels>): ActionPanelLabels {
  const provided = useUixLabels().actionPanel;
  return useMemo(() => ({ ...DEFAULT_ACTION_PANEL_LABELS, ...provided, ...own }), [provided, own]);
}

export interface ActionPanelProps {
  /** Controlled open state. */
  open: boolean;
  /** Called with `false` when it closes: Escape, a click outside, an action chosen, a second Mod+K. */
  onOpenChange: (open: boolean) => void;
  /** The item's actions. Destructive ones are listed last; disabled ones are shown and skipped. */
  actions: readonly ActionPanelAction[];
  /** The item's name, in the panel's title: "Actions for INC-0412". */
  name?: string;
  /** What it hangs off: the item, or the button that opened it. Without one it is centred like a dialog. */
  anchor?: HTMLElement | RefObject<HTMLElement | null> | null;
  /** Preferred placement against `anchor`. Default `'bottom-end'`. */
  placement?: Placement;
  /**
   * Where focus goes when it closes, and where each action's keys are looked up (inside the item's
   * scope). Default: the element that had focus when it opened.
   */
  returnFocus?: HTMLElement | null;
  /** Called instead when `returnFocus` has left the document meanwhile (the row was resolved by someone else). */
  onReturnFocusLost?: () => void;
  /**
   * Open on the confirm step of this action, not the list (its key was pressed on the item).
   * Escape then closes the panel; from the list, Escape steps back to the list.
   */
  confirmId?: string | null;
  /** Show the primary action with Enter (the item's Enter runs it). Default `true`. */
  showPrimaryKey?: boolean;
  labels?: Partial<ActionPanelLabels>;
  className?: string;
}

const optionId = (base: string, action: ActionPanelAction) => `${base}-${action.id.replace(/[^\w-]/g, '_')}`;

function Highlighted({ text, query }: { text: string; query: string }) {
  return <>{searchSegments(text, query).map((segment, index) => (segment.match ? <mark key={index} className="uix-cmdk__mark">{segment.text}</mark> : segment.text))}</>;
}

const ENTER: KeySequence = [['Enter']];

/**
 * The action panel of one item (a ticket row, a card), anchored to it: a modal native `<dialog>`
 * with a search field over the item's actions (the command palette's list), each with the keys it
 * has now, grouped, the primary one first and the destructive ones last. Enter or a click runs the
 * active action after the panel has closed and focus is back on the item; a destructive action asks
 * first, in the panel, unless it is `undoable`. Escape (or a click outside) closes it, Mod+K inside it
 * closes it and passes the key on to the global palette. Opens and closes with no animation: it is
 * keyboard-first and used many times a day.
 *
 * Usually you do not render it yourself: `DataWorkspace` `getRowActions` and `ActionPanelScope`
 * open it from the item's Mod+K, its ⋯ button and its action keys.
 */
export function ActionPanel({
  open, onOpenChange, actions, name, anchor, placement = 'bottom-end', returnFocus, onReturnFocusLost, confirmId = null,
  showPrimaryKey = true, labels: labelOverrides, className,
}: ActionPanelProps) {
  const labels = useActionPanelLabels(labelOverrides);
  const shortcuts = useShortcuts();
  const platform = useKbdPlatform();
  const baseId = useId();
  const listId = `${baseId}-list`;
  const title = name ? fillLabel(labels.title, { name }) : labels.titleUnnamed;

  // Each open starts fresh: an empty query, the first action active, the list (or the confirm step).
  const [seen, setSeen] = useState(open);
  const [query, setQuery] = useState('');
  const [activeState, setActiveState] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(open ? confirmId : null);
  /** The confirm step was reached from the list (Escape goes back there), not from the item's key. */
  const [fromList, setFromList] = useState(false);
  // Where focus goes back to (and where the actions' keys are read): taken as it opens, before the
  // dialog takes focus, so the first frame already shows the item's keys.
  const returnTo = useRef<HTMLElement | null>(null);
  if (open !== seen) {
    setSeen(open);
    if (open) {
      setQuery(''); setActiveState(null); setConfirming(confirmId); setFromList(false);
      returnTo.current = returnFocus ?? (typeof document === 'undefined' ? null : document.activeElement as HTMLElement | null);
    }
  }
  // Mounted open: the same, before useDialog's effect below opens the dialog.
  useIsomorphicLayoutEffect(() => {
    if (!open) return;
    returnTo.current = returnFocus ?? (document.activeElement as HTMLElement | null);
  }, [open]);

  const latest = useRef({ onOpenChange, onReturnFocusLost });
  latest.current = { onOpenChange, onReturnFocusLost };
  const giveFocusBack = () => {
    const back = returnTo.current;
    if (back?.isConnected) back.focus({ preventScroll: true });
    else latest.current.onReturnFocusLost?.();
  };
  // A native close (a close request the keys below did not take) still gives focus back.
  const ref = useDialog(open, () => {
    if (document.activeElement == null || document.activeElement === document.body) giveFocusBack();
    latest.current.onOpenChange(false);
  });
  useAnchoredPosition(anchor ?? null, ref, { open: open && anchor != null, placement, offset: 4, capHeight: true });

  /**
   * Close now, synchronously: the dialog, focus back on the item, then the state, then `run`. So an
   * action that opens its own dialog (or a palette that opens on the passed-on Mod+K) finds focus on
   * the item and gives it back there when it closes.
   */
  const finish = (run?: () => void) => {
    const el = ref.current;
    if (el?.open) el.close();
    giveFocusBack();
    onOpenChange(false);
    run?.();
  };

  // The second press: inside the open panel, Mod+K closes it and passes the key on (the palette).
  useShortcut({
    id: ACTION_PANEL_SHORTCUT_ID, keys: ACTION_PANEL_DEFAULT_KEYS, label: labels.open, scope: ref, enabled: open, hidden: true,
    allowInInputs: true, handler: () => { finish(); return false; },
  });

  const groups = useMemo(() => groupActionPanelActions(actions, query), [actions, query]);
  const rows = useMemo(() => groups.flatMap((group) => group.actions), [groups]);
  const enabled = rows.filter((action) => !action.disabled);
  const activeId = enabled.some((action) => action.id === activeState) ? activeState : enabled[0]?.id ?? null;
  const active = rows.find((action) => action.id === activeId) ?? null;
  const confirmAction = confirming ? actions.find((action) => action.id === confirming) ?? null : null;
  const primary = showPrimaryKey ? primaryAction(actions) : null;

  // The count is announced after typing settles, once per change (as the palette does).
  const [announced, setAnnounced] = useState('');
  const count = rows.length;
  const countText = useRef((n: number) => fillLabel(n === 1 ? labels.resultsOne : labels.resultsMany, { count: n }));
  countText.current = (n: number) => fillLabel(n === 1 ? labels.resultsOne : labels.resultsMany, { count: n });
  const step = confirmAction ? confirmAction.id : null;
  useEffect(() => {
    if (!open || step) return undefined;
    const t = window.setTimeout(() => setAnnounced(countText.current(count)), 150);
    return () => window.clearTimeout(t);
  }, [count, open, step]);

  // Focus: the field on the list, Cancel on the confirm step (the safe choice, as in ConfirmDialog).
  // Keyed on the step, not on the action objects: a re-render with new actions moves nothing.
  const inputRef = useRef<HTMLInputElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  useIsomorphicLayoutEffect(() => {
    if (!open) return;
    (step ? cancelRef.current : inputRef.current)?.focus({ preventScroll: true });
  }, [open, step]);

  // Keyboard moves are instant: the active row scrolls into view without animation.
  const listRef = useRef<HTMLDivElement>(null);
  useIsomorphicLayoutEffect(() => {
    if (!open || !activeId) return;
    listRef.current?.querySelector<HTMLElement>(`[id="${optionId(listId, { id: activeId } as ActionPanelAction)}"]`)?.scrollIntoView?.({ block: 'nearest' });
  }, [activeId, open, listId]);

  const choose = (action: ActionPanelAction) => {
    if (action.disabled) return;
    if (needsConfirm(action)) { setConfirming(action.id); setFromList(true); return; }
    finish(action.onSelect);
  };
  const move = (to: number) => {
    if (enabled.length === 0) return;
    setActiveState(enabled[(to + enabled.length) % enabled.length].id);
  };
  const onInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.defaultPrevented || event.nativeEvent.isComposing) return;
    const at = enabled.findIndex((action) => action.id === activeId);
    switch (event.key) {
      case 'ArrowDown': event.preventDefault(); move(at + 1); break;
      case 'ArrowUp': event.preventDefault(); move(at - 1); break;
      case 'Home': if (query === '') { event.preventDefault(); move(0); } break;
      case 'End': if (query === '') { event.preventDefault(); move(enabled.length - 1); } break;
      case 'Enter': if (active) { event.preventDefault(); choose(active); } break;
      default:
    }
  };
  // Escape is the panel's: it steps back from a confirm step reached from the list, else closes.
  // Taken on keydown (no native cancel), so a maximized workspace or a drawer around it keeps its own.
  const onKeyDown = (event: ReactKeyboardEvent<HTMLDialogElement>) => {
    if (event.key !== 'Escape' || event.defaultPrevented || event.nativeEvent.isComposing) return;
    event.preventDefault();
    if (confirmAction && fromList) { setConfirming(null); return; }
    finish();
  };
  const pressedBackdrop = useRef(false);

  const keysOf = (action: ActionPanelAction): KeySequence | null => {
    if (primary && action.id === primary.id) return ENTER;
    return shortcuts.keysFor(action.id, returnFocus ?? returnTo.current);
  };

  const renderRow = (action: ActionPanelAction) => {
    const id = optionId(listId, action);
    const isActive = action.id === activeId;
    const keys = keysOf(action);
    return (
      <div
        key={action.id}
        id={id}
        role="option"
        className={cx('uix-cmdk__item', action.destructive && 'uix-action-panel__item--danger')}
        data-active={isActive || undefined}
        aria-selected={isActive}
        aria-disabled={action.disabled || undefined}
        // Enter is the item's, not a shortcut of this option: only the registered keys are announced.
        aria-keyshortcuts={keys === ENTER ? undefined : ariaKeyShortcutsFor(keys, platform)}
        onPointerMove={() => { if (!action.disabled && !isActive) setActiveState(action.id); }}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => choose(action)}
      >
        {action.icon != null && <span className="uix-cmdk__icon" aria-hidden="true">{action.icon}</span>}
        <span className="uix-cmdk__text">
          <span className="uix-cmdk__label"><Highlighted text={action.label} query={query} /></span>
          {action.description && <span className="uix-cmdk__desc">{action.description}</span>}
        </span>
        {keys ? <span className="uix-cmdk__shortcut"><KbdCombo keys={keys} platform={platform} /></span> : null}
      </div>
    );
  };

  let body: ReactNode;
  if (confirmAction) {
    const words: ActionPanelConfirm = typeof confirmAction.confirm === 'object' ? confirmAction.confirm : {};
    const question = words.title ?? fillLabel(labels.confirmTitle, { action: confirmAction.label });
    const description = words.description ?? labels.confirmBody;
    body = (
      <div className="uix-action-panel__confirm" role="group" aria-labelledby={`${baseId}-q`} aria-describedby={`${baseId}-d`}>
        <p className="uix-action-panel__question" id={`${baseId}-q`}>{question}</p>
        <p className="uix-action-panel__body" id={`${baseId}-d`}>{description}</p>
        <div className="uix-action-panel__buttons">
          <Button ref={cancelRef} size="sm" variant="secondary" onClick={() => (fromList ? setConfirming(null) : finish())}>{labels.cancel}</Button>
          <Button size="sm" variant={confirmAction.destructive ? 'danger' : 'primary'} onClick={() => finish(confirmAction.onSelect)}>
            {words.confirmLabel ?? confirmAction.label}
          </Button>
        </div>
      </div>
    );
  } else {
    body = (
      <div className="uix-cmdk" data-items="">
        <input
          ref={inputRef}
          className="uix-cmdk__input"
          role="combobox"
          aria-expanded="true"
          aria-autocomplete="list"
          aria-controls={listId}
          aria-activedescendant={active ? optionId(listId, active) : undefined}
          aria-label={labels.search}
          placeholder={labels.search}
          autoComplete="off"
          spellCheck={false}
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          onKeyDown={onInputKeyDown}
        />
        <div ref={listRef} className="uix-cmdk__list" role="listbox" id={listId} aria-label={title} hidden={rows.length === 0}>
          {groups.map((group, index) => {
            const headingId = `${baseId}-g${index}`;
            return (
              <div
                key={group.destructive ? '__danger' : group.label ?? `__${index}`}
                role="group"
                className={cx(group.destructive && 'uix-action-panel__danger')}
                aria-labelledby={group.label != null ? headingId : undefined}
                aria-label={group.destructive ? labels.destructiveGroup : undefined}
              >
                {group.label != null && <div className="uix-cmdk__group" id={headingId} role="presentation">{group.label}</div>}
                {group.actions.map(renderRow)}
              </div>
            );
          })}
        </div>
        {rows.length === 0 && <p className="uix-cmdk__empty">{labels.empty}</p>}
        <span className="uix-visually-hidden" role="status">{announced}</span>
      </div>
    );
  }

  return (
    <dialog
      ref={ref}
      className={cx('uix-action-panel', className)}
      // the motion contract (HAR-2578): a keyboard surface opens and closes with no animation
      data-uix-instant=""
      aria-label={title}
      onKeyDown={onKeyDown}
      // a click on the backdrop (the dialog box itself, outside the panel) closes it
      onPointerDown={(event) => { pressedBackdrop.current = event.target === event.currentTarget; }}
      onClick={(event) => {
        if (event.target === event.currentTarget && pressedBackdrop.current) finish();
        pressedBackdrop.current = false;
      }}
    >
      {open ? body : null}
    </dialog>
  );
}

/* ── the host: one panel for a scope of items (a list's rows, or one item) ─────────────────── */

export interface ActionPanelHostOptions {
  /** Off: nothing is registered and nothing opens. */
  enabled: boolean;
  /** Where the item keys work (WCAG 2.1.4 "active only on focus"): a list, or the item itself. */
  scope: RefObject<HTMLElement | null>;
  /** The scope's heading in the shortcut sheet. */
  scopeLabel?: string;
  /** The item a key press on `target` is for, or `null` (a header, a toolbar: not an item). */
  itemOf: (target: Element | null) => HTMLElement | null;
  /** The item's actions, read when its keys are pressed or its panel opens. */
  actionsOf: (item: HTMLElement) => readonly ActionPanelAction[] | null | undefined;
  /** The item's name, for the panel's title. */
  nameOf?: (item: HTMLElement) => string | undefined;
  /** The actions whose keys are registered now: the active item's (the `?` sheet lists them). */
  verbs?: readonly ActionPanelAction[] | null;
  /** Show the primary action with Enter (the host's Enter runs it). Default `true`. */
  showPrimaryKey?: boolean;
  labels?: Partial<ActionPanelLabels>;
  /** Where focus goes when the item left the document while its panel was open. */
  onItemGone?: () => void;
}

export interface ActionPanelHost {
  /** The panel and the action keys' registrations: render it inside `scope`. */
  element: ReactNode;
  /** Open the item's panel, anchored to `anchor` (default the item). `false`: the item has no enabled action. */
  open: (item: HTMLElement, anchor?: HTMLElement | null) => boolean;
  /** Enter on the item: run its primary action (asking first when it must). `false`: it has none. */
  runPrimary: (item: HTMLElement) => boolean;
}

interface HostState {
  open: boolean;
  item: HTMLElement | null;
  anchor: HTMLElement | null;
  returnFocus: HTMLElement | null;
  confirmId: string | null;
}
const CLOSED: HostState = { open: false, item: null, anchor: null, returnFocus: null, confirmId: null };

/** The element a keydown came from, or the focused one for a command run from the palette. */
const targetOf = (event: KeyboardEvent | null): Element | null => {
  if (event) {
    const first = typeof event.composedPath === 'function' ? event.composedPath()[0] : event.target;
    const node = (first ?? event.target) as Node | null;
    return node && node.nodeType === 1 ? node as Element : node?.parentElement ?? null;
  }
  return typeof document === 'undefined' ? null : document.activeElement;
};

/**
 * The scope's Mod+K (the first press). A child rendered before the action keys, so it registers
 * first and leads the scope's part of the shortcut sheet.
 */
function OpenKey({ enabled, scope, scopeLabel, label, onPress }: {
  enabled: boolean; scope: RefObject<HTMLElement | null>; scopeLabel?: string; label: string; onPress: (event: KeyboardEvent | null) => boolean;
}) {
  useShortcut({ id: ACTION_PANEL_SHORTCUT_ID, keys: ACTION_PANEL_DEFAULT_KEYS, label, scope, scopeLabel, enabled, handler: onPress });
  return null;
}

/** One action's keys, registered in the scope. */
function ActionKey({ action, scope, scopeLabel, onKey }: {
  action: ActionPanelAction; scope: RefObject<HTMLElement | null>; scopeLabel?: string; onKey: (id: string, event: KeyboardEvent | null) => boolean;
}) {
  useShortcut({
    id: action.id, keys: action.keys ?? '', label: action.label, group: action.group, scope, scopeLabel,
    enabled: action.keys != null && !action.disabled, handler: (event) => onKey(action.id, event),
  });
  return null;
}

/**
 * The wiring behind `ActionPanelScope` and `DataWorkspace` `getRowActions` (internal): the scope's
 * Mod+K and each action's keys in the registry, Enter's primary action, the confirm step, and one
 * `ActionPanel` for whichever item it is opened on.
 */
export function useActionPanelHost(options: ActionPanelHostOptions): ActionPanelHost {
  const { enabled, scope, scopeLabel, verbs, showPrimaryKey = true, labels: labelOverrides } = options;
  const labels = useActionPanelLabels(labelOverrides);
  const latest = useRef(options);
  latest.current = options;
  const [state, setState] = useState<HostState>(CLOSED);

  /** Where focus goes back to: the focused control inside the item (the ⋯ button, a checkbox), else the item. */
  const focusIn = (item: HTMLElement) => {
    const focused = typeof document === 'undefined' ? null : document.activeElement as HTMLElement | null;
    return focused && item.contains(focused) ? focused : item;
  };
  const enabledActions = (item: HTMLElement) => (latest.current.actionsOf(item) ?? []).filter((action) => !action.disabled);

  const open = useCallback((item: HTMLElement, anchor?: HTMLElement | null) => {
    if (!latest.current.enabled || enabledActions(item).length === 0) return false;
    setState({ open: true, item, anchor: anchor ?? item, returnFocus: focusIn(item), confirmId: null });
    return true;
  }, []);

  /** Run an action of the item from its key or Enter: at once, or through the confirm step. */
  const trigger = useCallback((action: ActionPanelAction, item: HTMLElement) => {
    if (needsConfirm(action)) setState({ open: true, item, anchor: item, returnFocus: focusIn(item), confirmId: action.id });
    else action.onSelect();
  }, []);

  const runPrimary = useCallback((item: HTMLElement) => {
    if (!latest.current.enabled) return false;
    const action = primaryAction(latest.current.actionsOf(item));
    if (!action) return false;
    trigger(action, item);
    return true;
  }, [trigger]);

  const onKey = useCallback((id: string, event: KeyboardEvent | null) => {
    const item = latest.current.itemOf(targetOf(event));
    if (!item) return false;
    const action = latest.current.actionsOf(item)?.find((candidate) => candidate.id === id);
    if (!action || action.disabled) return false;
    trigger(action, item);
    return true;
  }, [trigger]);

  // The first press: Mod+K on an item with actions opens its panel. Anywhere else in the scope (a
  // header, a field, a dialog inside it), it passes the key on: the global palette gets it.
  const onOpenKey = useCallback((event: KeyboardEvent | null) => {
    const target = targetOf(event);
    if (!target || target.closest('dialog') || isTypingTarget(target)) return false;
    const item = latest.current.itemOf(target);
    return item ? open(item) : false;
  }, [open]);

  // The item left the document while its panel was open (resolved elsewhere, a refetch): close.
  const item = state.item;
  const gone = state.open && item != null && !item.isConnected;
  useEffect(() => {
    if (!gone) return;
    setState(CLOSED);
    latest.current.onItemGone?.();
  }, [gone]);

  const actions = state.open && item ? latest.current.actionsOf(item) ?? [] : [];
  const name = item ? latest.current.nameOf?.(item) : undefined;
  const element = (
    <>
      <OpenKey enabled={enabled} scope={scope} scopeLabel={scopeLabel} label={labels.open} onPress={onOpenKey} />
      {enabled && verbs?.filter((action) => action.keys != null).map((action) => (
        <ActionKey key={action.id} action={action} scope={scope} scopeLabel={scopeLabel} onKey={onKey} />
      ))}
      <ActionPanel
        open={state.open && !gone}
        onOpenChange={(next) => { if (!next) setState(CLOSED); }}
        actions={actions}
        name={name}
        anchor={state.anchor}
        returnFocus={state.returnFocus}
        onReturnFocusLost={() => latest.current.onItemGone?.()}
        confirmId={state.confirmId}
        showPrimaryKey={showPrimaryKey}
        labels={labelOverrides}
      />
    </>
  );
  return { element, open, runPrimary };
}

/* ── any item opts in ─────────────────────────────────────────────────────────────────────────── */

export interface ActionPanelScopeProps extends HTMLAttributes<HTMLDivElement> {
  /** The item's actions. `primary` runs on Enter while the item itself has focus; `keys` work while focus is inside it. */
  actions: readonly ActionPanelAction[];
  /** The item's name: the panel's title ("Actions for {name}") and, by default, its heading in the shortcut sheet. */
  name: string;
  /** Its heading in the shortcut sheet. Default `name`. */
  scopeLabel?: string;
  labels?: Partial<ActionPanelLabels>;
  /** Off: no keys, no panel (the actions stay wherever else you show them). Default `true`. */
  enabled?: boolean;
  children?: ReactNode;
}

/**
 * Make any item (a card, a record header, a list item) a keyboard item with actions: a
 * `ShortcutScope` whose Mod+K opens the item's `ActionPanel` anchored to it (a second Mod+K reaches
 * the global palette), whose action `keys` work while focus is inside it (the `?` sheet lists them
 * under `scopeLabel`, the single-key switch and remaps apply), and where Enter on the item itself
 * runs its `primary` action. Give it `tabIndex={0}` when the item is not focusable by itself.
 * For rows of a `DataWorkspace`, use its `getRowActions` instead: one panel for the whole list.
 */
export const ActionPanelScope = forwardRef<HTMLDivElement, ActionPanelScopeProps>(function ActionPanelScope({
  actions, name, scopeLabel, labels, enabled = true, children, onKeyDown, ...props
}, forwarded) {
  const ref = useRef<HTMLDivElement | null>(null);
  const setRef = useCallback((node: HTMLDivElement | null) => {
    ref.current = node;
    if (typeof forwarded === 'function') forwarded(node);
    else if (forwarded) forwarded.current = node;
  }, [forwarded]);
  const host = useActionPanelHost({
    enabled, scope: ref, scopeLabel: scopeLabel ?? name, labels, verbs: actions,
    itemOf: (target) => (target && ref.current?.contains(target) ? ref.current : null),
    actionsOf: () => actions,
    nameOf: () => name,
  });
  return (
    <ShortcutScope
      ref={setRef}
      label={scopeLabel ?? name}
      {...props}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        // Enter on the item itself (not on a control in it) runs the primary action.
        if (event.defaultPrevented || event.key !== 'Enter' || event.target !== event.currentTarget) return;
        if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
        if (host.runPrimary(event.currentTarget)) event.preventDefault();
      }}
    >
      {children}
      {host.element}
    </ShortcutScope>
  );
});
