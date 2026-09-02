"use client";

import { memo, type ReactNode, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { cx } from '../cx.js';

const ChevronDownIcon = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className="uix-favourites__chevron"
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className="uix-favourites__chevron"
  >
    <path d="m9 18 6-6-6-6" />
  </svg>
);

const MoreIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="1" />
    <circle cx="12" cy="5" r="1" />
    <circle cx="12" cy="19" r="1" />
  </svg>
);

export interface NavFavouriteItem {
  /** Stable identity used for reorder + remove (consumers typically pass the href). */
  readonly id: string;
  /** Display label, interpolated into the per-row remove / options accessible names. */
  readonly label: string;
  /** The destination control, rendered by the consumer so routing + link styling stay app-owned. */
  readonly link: ReactNode;
}

export interface NavFavouritesLabels {
  /** Disclosure header, e.g. "Favourites". */
  readonly heading: string;
  /** Shown when there are no favourites. */
  readonly empty: string;
  readonly moveUp: string;
  readonly moveDown: string;
  /** Per-row remove action template with a `{label}` placeholder, e.g. "Remove {label} from favourites". */
  readonly remove: string;
  /** Per-row overflow-trigger accessible-name template with `{label}`. Defaults to "{label} favourite options". */
  readonly options?: string;
}

export interface NavFavouritesProps {
  /** The already-resolved favourites, in display order. */
  items: ReadonlyArray<NavFavouriteItem>;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  /** Called with the id of the favourite to unpin. */
  onRemove: (id: string) => void;
  /** Called with the full new id order after a move. */
  onReorder: (orderedIds: string[]) => void;
  labels: NavFavouritesLabels;
  /** Optional telemetry hook emitted as `data-empty-reason` on the empty-state node. */
  emptyReason?: string;
  className?: string;
}

/**
 * Controlled Favourites disclosure for a sidebar nav (UIx owns the look + the
 * APG interaction contract; the consumer owns the favourites list + persistence).
 *
 * An ARIA disclosure exactly like a collapsible nav group: a header button with
 * `aria-expanded`/`aria-controls`, the region always rendered with a stable id
 * and toggled via `hidden`, focus pulled to the header before collapse.
 *
 * Each row carries the consumer-rendered destination link plus:
 *   - an overflow menu (APG menu-button: button + `aria-haspopup="menu"` +
 *     `aria-expanded`; Up/Down roving focus; Escape returns focus to the
 *     trigger) with Move up / Move down / Remove,
 *   - Alt+ArrowUp / Alt+ArrowDown accelerators on the focused row so moves
 *     chain without re-opening the menu.
 *
 * Focus management:
 *   - after Remove, focus moves to the adjacent favourite, or to the header
 *     when the list empties,
 *   - after Move up/down, focus stays on the moved row's control in its new
 *     position.
 */
export function NavFavourites({
  items,
  collapsed = false,
  onToggleCollapsed,
  onRemove,
  onReorder,
  labels,
  emptyReason,
  className,
}: NavFavouritesProps) {
  const regionId = useId();
  const headerRef = useRef<HTMLButtonElement>(null);
  const regionRef = useRef<HTMLUListElement>(null);
  // After a remove/reorder, focus this id's menu trigger on next render.
  const focusAfterRef = useRef<string | null>(null);
  const triggerRefs = useRef<Map<string, HTMLButtonElement | null>>(new Map());

  const order = useMemo(() => items.map((item) => item.id), [items]);

  // Focus-after-mutation by id; re-run on order change.
  useEffect(() => {
    const id = focusAfterRef.current;
    if (!id) return;
    focusAfterRef.current = null;
    const el = triggerRefs.current.get(id);
    if (el) el.focus();
    else headerRef.current?.focus();
  }, [order]);

  const handleToggle = () => {
    if (!collapsed) {
      const active = document.activeElement;
      if (active && regionRef.current?.contains(active) && active !== headerRef.current) {
        headerRef.current?.focus();
      }
    }
    onToggleCollapsed?.();
  };

  const move = useCallback((id: string, dir: -1 | 1) => {
    const idx = order.indexOf(id);
    const next = idx + dir;
    if (idx < 0 || next < 0 || next >= order.length) return;
    const reordered = [...order];
    const [it] = reordered.splice(idx, 1);
    if (it === undefined) return;
    reordered.splice(next, 0, it);
    focusAfterRef.current = id; // keep focus on the moved row's control
    onReorder(reordered);
  }, [onReorder, order]);

  const remove = useCallback((id: string) => {
    const idx = order.indexOf(id);
    // Focus the neighbour that will occupy this slot (next, else previous).
    const neighbour = order[idx + 1] ?? order[idx - 1] ?? null;
    focusAfterRef.current = neighbour;
    onRemove(id);
  }, [onRemove, order]);

  const registerTrigger = useCallback((id: string, element: HTMLButtonElement | null) => {
    if (element) triggerRefs.current.set(id, element);
    else triggerRefs.current.delete(id);
  }, []);

  return (
    <div className={cx('uix-favourites', className)}>
      <button
        ref={headerRef}
        type="button"
        aria-expanded={!collapsed}
        aria-controls={regionId}
        onClick={handleToggle}
        className="uix-favourites__heading uix-text-eyebrow"
      >
        {collapsed ? <ChevronRightIcon /> : <ChevronDownIcon />}
        {labels.heading}
      </button>
      <ul
        ref={regionRef}
        id={regionId}
        hidden={collapsed}
        className="uix-favourites__list"
      >
        {items.length === 0 ? (
          <li
            className="uix-favourites__empty uix-text-meta"
            data-empty-reason={emptyReason}
          >
            {labels.empty}
          </li>
        ) : (
          items.map((item, idx) => (
            <FavouriteRow
              key={item.id}
              item={item}
              isFirst={idx === 0}
              isLast={idx === items.length - 1}
              labels={labels}
              onMove={move}
              onRemove={remove}
              registerTrigger={registerTrigger}
            />
          ))
        )}
      </ul>
    </div>
  );
}

const FavouriteRow = memo(function FavouriteRow({
  item,
  isFirst,
  isLast,
  labels,
  onMove,
  onRemove,
  registerTrigger,
}: {
  item: NavFavouriteItem;
  isFirst: boolean;
  isLast: boolean;
  labels: NavFavouritesLabels;
  onMove: (id: string, direction: -1 | 1) => void;
  onRemove: (id: string) => void;
  registerTrigger: (id: string, element: HTMLButtonElement | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  // Mutable on purpose (assigned in the ref callback below) — under @types/react 18
  // `useRef<T>(null)` yields a read-only RefObject, so widen T to include null.
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const optionsTemplate = labels.options ?? '{label} favourite options';

  // Build the enabled menu actions for this row (Move up/down conditional).
  const actions: Array<{ label: string; onSelect: () => void }> = [
    ...(isFirst ? [] : [{ label: labels.moveUp, onSelect: () => onMove(item.id, -1) }]),
    ...(isLast ? [] : [{ label: labels.moveDown, onSelect: () => onMove(item.id, 1) }]),
    { label: labels.remove.replace('{label}', item.label), onSelect: () => onRemove(item.id) },
  ];

  // Focus the first menu item when the menu opens (APG menu-button).
  useEffect(() => {
    if (open) itemRefs.current[0]?.focus();
  }, [open]);

  const closeAndReturnFocus = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const onMenuKeyDown = (e: React.KeyboardEvent<HTMLUListElement>) => {
    const menuItems = itemRefs.current.filter((x): x is HTMLButtonElement => x !== null);
    const currentIdx = menuItems.findIndex((el) => el === document.activeElement);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      menuItems[(currentIdx + 1) % menuItems.length]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      menuItems[(currentIdx - 1 + menuItems.length) % menuItems.length]?.focus();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeAndReturnFocus();
    } else if (e.key === 'Tab') {
      setOpen(false);
    }
  };

  // Alt+ArrowUp / Alt+ArrowDown on the row chain moves without the menu.
  const onRowKeyDown = (e: React.KeyboardEvent<HTMLLIElement>) => {
    if (!e.altKey) return;
    if (e.key === 'ArrowUp' && !isFirst) {
      e.preventDefault();
      onMove(item.id, -1);
    } else if (e.key === 'ArrowDown' && !isLast) {
      e.preventDefault();
      onMove(item.id, 1);
    }
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: keyboard accelerators on the row; the focusable controls inside carry their own semantics.
    <li
      className="uix-favourites__row"
      onKeyDown={onRowKeyDown}
    >
      <div className="uix-favourites__link">{item.link}</div>
      <button
        ref={(el) => {
          triggerRef.current = el;
          registerTrigger(item.id, el);
        }}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={optionsTemplate.replace('{label}', item.label)}
        onClick={() => setOpen((v) => !v)}
        className="uix-favourites__menu-trigger"
      >
        <MoreIcon />
      </button>
      {open ? (
        <>
          {/* biome-ignore lint/a11y/useKeyWithClickEvents: aria-hidden click-outside backdrop; keyboard dismiss is the Escape handler on the menu. */}
          <div
            aria-hidden="true"
            role="presentation"
            onClick={() => setOpen(false)}
            className="uix-favourites__backdrop"
          />
          <ul
            id={menuId}
            role="menu"
            onKeyDown={onMenuKeyDown}
            className="uix-favourites__menu"
          >
            {actions.map((action, i) => (
              <li key={action.label} role="presentation">
                <button
                  ref={(el) => {
                    itemRefs.current[i] = el;
                  }}
                  type="button"
                  role="menuitem"
                  tabIndex={-1}
                  onClick={() => {
                    setOpen(false);
                    action.onSelect();
                  }}
                  className="uix-favourites__menu-item"
                >
                  {action.label}
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </li>
  );
});
