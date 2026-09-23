"use client";

import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent, ReactNode } from 'react';
import { cx } from '../cx.js';
import { Button } from './Button.js';
import { Checkbox } from './Checkbox.js';
import { EditorIcon } from './EditorIcons.js';
import { Input } from './Input.js';
import { Popover } from './Popover.js';
import { Segmented, SegmentedOption } from './Segmented.js';
import { Switch } from './Switch.js';

export interface ViewMenuColumn {
  id: string;
  label: ReactNode;
  visible: boolean;
  disabled?: boolean;
  /** Always shown (e.g. the record id): the row has no checkbox and no Hide / Show, its name sits in the checkbox's slot. */
  required?: boolean;
  /** Plain-text name for the `{label}` templates in `columnLabels` when `label` is not a string. */
  textLabel?: string;
}

/**
 * Words for the column rows. `{label}` is replaced by the column name; `moved` also gets
 * `{position}` and `{count}`. Every key has an English default.
 */
export interface ViewMenuColumnLabels {
  /** Name of a row's ⋯ menu button and of the menu. Default `Column actions: {label}`. */
  rowActions: string;
  /** Name of a row's drag grip. Default `Drag to reorder: {label}`. */
  reorder: string;
  moveUp: string;
  moveDown: string;
  hide: string;
  show: string;
  /** Tooltip on a required column's name. Default `Always shown`. */
  required: string;
  /** Polite announcement after a move. Default `{label} moved to position {position} of {count}`. */
  moved: string;
}

const VIEW_MENU_COLUMN_LABELS: ViewMenuColumnLabels = {
  rowActions: 'Column actions: {label}',
  reorder: 'Drag to reorder: {label}',
  moveUp: 'Move up',
  moveDown: 'Move down',
  hide: 'Hide',
  show: 'Show',
  required: 'Always shown',
  moved: '{label} moved to position {position} of {count}',
};

export interface ViewMenuProps {
  /** The density section renders when `densityOptions` and `onDensityChange` are given. */
  density?: string;
  densityLabel?: ReactNode;
  densityOptions?: readonly { value: string; label: ReactNode }[];
  onDensityChange?: (value: string) => void;
  /** Optional title over the zebra / freeze switches. */
  displayLabel?: ReactNode;
  zebra?: { checked: boolean; label: ReactNode; onChange: (checked: boolean) => void };
  freeze?: { checked: boolean; label: ReactNode; onChange: (checked: boolean) => void };
  columns?: readonly ViewMenuColumn[];
  columnsLabel?: ReactNode;
  onColumnVisibilityChange?: (id: string, visible: boolean) => void;
  /**
   * Turns on reordering: every column row gets a drag grip (pointer; ArrowUp / ArrowDown once
   * focused) and a ⋯ menu with Move up · Move down · Hide / Show, which is the keyboard path.
   * Receives every column id, first to last. The order is the application's to persist.
   */
  onReorder?: (orderedIds: string[]) => void;
  columnLabels?: Partial<ViewMenuColumnLabels>;
  /** Pinned under the columns, e.g. a Reset sort `.uix-menu__item` button. */
  footer?: ReactNode;
  className?: string;
}

const fill = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (match, name: string) => (name in values ? String(values[name]) : match));

const columnText = (column: ViewMenuColumn) => column.textLabel ?? (typeof column.label === 'string' ? column.label : column.id);

const isPopoverOpen = (el: Element | null) => {
  try { return !!el?.matches(':popover-open'); } catch { return false; }
};

interface RowMenuAction { id: string; label: string; disabled?: boolean; onSelect: () => void }

/** A column row's ⋯ menu: an APG menu button over a top-layer Popover, so the scrolling panel never clips it. */
function ColumnRowMenu({ label, actions, triggerRef }: { label: string; actions: readonly RowMenuAction[]; triggerRef: (el: HTMLButtonElement | null) => void }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const button = useRef<HTMLButtonElement | null>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);
  const wasOpenAtPress = useRef(false);

  const enabled = () => items.current.filter((el): el is HTMLButtonElement => !!el && !el.disabled);
  const close = (returnFocus: boolean) => {
    const el = document.getElementById(menuId);
    if (isPopoverOpen(el)) (el as HTMLElement).hidePopover();
    setOpen(false);
    if (returnFocus) button.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const el = document.getElementById(menuId);
    if (el && typeof el.showPopover === 'function' && !isPopoverOpen(el)) {
      try { el.showPopover(); } catch { /* not connected */ }
    }
    enabled()[0]?.focus();
    // Light dismiss (outside press, Escape) closes the native popover; mirror it.
    const onToggle = (event: Event) => { if ((event as Event & { newState?: string }).newState === 'closed') setOpen(false); };
    // Escape closes this menu only, wherever focus is, and never reaches an enclosing overlay's handler.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      close(true);
    };
    el?.addEventListener('toggle', onToggle);
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      el?.removeEventListener('toggle', onToggle);
      document.removeEventListener('keydown', onKeyDown, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, menuId]);

  const onMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const list = enabled();
    const at = list.indexOf(document.activeElement as HTMLButtonElement);
    const focus = (index: number) => { event.preventDefault(); list[(index + list.length) % list.length]?.focus(); };
    if (event.key === 'ArrowDown') focus(at + 1);
    else if (event.key === 'ArrowUp') focus(at - 1);
    else if (event.key === 'Home') focus(0);
    else if (event.key === 'End') focus(list.length - 1);
    else if (event.key === 'Tab') close(false);
  };

  return (
    <span className="uix-view-menu__actions">
      <button
        ref={(el) => { button.current = el; triggerRef(el); }}
        type="button"
        className="uix-btn uix-btn--ghost uix-btn--sm uix-btn--icon"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        // A press outside an open auto popover already closed it (light dismiss); don't reopen.
        onPointerDown={() => { wasOpenAtPress.current = isPopoverOpen(document.getElementById(menuId)); }}
        onClick={() => {
          const wasOpen = wasOpenAtPress.current;
          wasOpenAtPress.current = false;
          if (wasOpen) return;
          if (open) close(false);
          else setOpen(true);
        }}
      >
        <EditorIcon name="more" />
      </button>
      {open && (
        <Popover id={menuId} anchor={button} placement="bottom-end" offset={4} role="menu" aria-label={label} className="uix-view-menu__row-menu" onKeyDown={onMenuKeyDown}>
          {actions.map((action, index) => (
            <button
              key={action.id}
              ref={(el) => { items.current[index] = el; }}
              type="button"
              role="menuitem"
              tabIndex={-1}
              className="uix-menu__item"
              disabled={action.disabled}
              onClick={() => { close(true); action.onSelect(); }}
            >
              {action.label}
            </button>
          ))}
        </Popover>
      )}
    </span>
  );
}

/**
 * Controlled table presentation panel with its own surface: density, zebra / freeze and a column
 * list under sticky section titles. A column row is grip · checkbox · name · ⋯ (grip and ⋯ with
 * `onReorder`). Usable inside a Popover or any overlay shell, including one that adds no chrome.
 */
export function ViewMenu({
  density, densityLabel, densityOptions, onDensityChange, displayLabel, zebra, freeze,
  columns, columnsLabel, onColumnVisibilityChange, onReorder, columnLabels, footer, className,
}: ViewMenuProps) {
  const baseId = useId();
  const densityLabelId = `${baseId}-density`;
  const zebraLabelId = `${baseId}-zebra`;
  const freezeLabelId = `${baseId}-freeze`;
  const columnsLabelId = `${baseId}-columns`;
  const labels = { ...VIEW_MENU_COLUMN_LABELS, ...columnLabels };
  const list = columns ?? [];

  // The order being dragged (or just moved) until the consumer's new order arrives.
  const [draft, setDraft] = useState<readonly string[] | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const dragStart = useRef<readonly string[] | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const triggers = useRef(new Map<string, HTMLButtonElement>());
  const refocus = useRef<{ id: string; part: 'grip' | 'actions' } | null>(null);
  const orderKey = JSON.stringify(list.map((column) => column.id));
  useEffect(() => setDraft(null), [orderKey]);

  const order = draft ?? list.map((column) => column.id);
  const byId = new Map(list.map((column) => [column.id, column] as const));
  const ordered = order.map((id) => byId.get(id)).filter((column): column is ViewMenuColumn => !!column);

  // React moves the DOM node of a row that goes down, which drops focus; put it back.
  useEffect(() => {
    const target = refocus.current;
    refocus.current = null;
    if (!target) return;
    const el = target.part === 'actions'
      ? triggers.current.get(target.id)
      : Array.from(listRef.current?.children ?? []).find((row) => (row as HTMLElement).dataset.columnId === target.id)?.querySelector<HTMLElement>('.uix-view-menu__grip');
    if (el && document.activeElement !== el) el.focus();
  });

  const commit = (next: readonly string[], id: string) => {
    setDraft(next);
    onReorder?.([...next]);
    const column = byId.get(id);
    if (column) setAnnouncement(fill(labels.moved, { label: columnText(column), position: next.indexOf(id) + 1, count: next.length }));
  };
  const move = (id: string, delta: -1 | 1, part: 'grip' | 'actions') => {
    const next = placeId(order, id, order.indexOf(id) + delta);
    if (next === order) return;
    refocus.current = { id, part };
    commit(next, id);
  };
  const { dragging, start: startDrag } = useRowDrag('.uix-view-menu__col', {
    over: (id, index) => {
      const next = placeId(order, id, index);
      if (next !== order) setDraft(next);
    },
    drop: (id) => {
      const start = dragStart.current;
      dragStart.current = null;
      if (start && !sameOrder(start, order)) commit(order, id);
    },
  });

  const rowActions = (column: ViewMenuColumn, index: number): RowMenuAction[] => [
    { id: 'up', label: labels.moveUp, disabled: index === 0, onSelect: () => move(column.id, -1, 'actions') },
    { id: 'down', label: labels.moveDown, disabled: index === ordered.length - 1, onSelect: () => move(column.id, 1, 'actions') },
    ...(column.required || column.disabled ? [] : [column.visible
      ? { id: 'hide', label: labels.hide, onSelect: () => onColumnVisibilityChange?.(column.id, false) }
      : { id: 'show', label: labels.show, onSelect: () => onColumnVisibilityChange?.(column.id, true) }]),
  ];

  const showDensity = !!densityOptions?.length && !!onDensityChange;
  return (
    <div className={cx('uix-view-menu', className)} data-dragging={dragging ? '' : undefined}>
      {showDensity && <div className="uix-view-menu__group">
        <div id={densityLabelId} className="uix-view-menu__label">{densityLabel}</div>
        <Segmented value={density ?? ''} onChange={onDensityChange} aria-labelledby={densityLabelId}>
          {densityOptions.map((option) => <SegmentedOption key={option.value} value={option.value}>{option.label}</SegmentedOption>)}
        </Segmented>
      </div>}
      {(zebra || freeze) && <div className="uix-view-menu__group">
        {displayLabel != null && <div className="uix-view-menu__label">{displayLabel}</div>}
        {zebra && <div className="uix-view-menu__row"><span id={zebraLabelId}>{zebra.label}</span><Switch checked={zebra.checked} aria-labelledby={zebraLabelId} onChange={(event) => zebra.onChange(event.currentTarget.checked)} /></div>}
        {freeze && <div className="uix-view-menu__row"><span id={freezeLabelId}>{freeze.label}</span><Switch checked={freeze.checked} aria-labelledby={freezeLabelId} onChange={(event) => freeze.onChange(event.currentTarget.checked)} /></div>}
      </div>}
      {ordered.length > 0 && <div className="uix-view-menu__group">
        {columnsLabel != null && <div id={columnsLabelId} className="uix-view-menu__label">{columnsLabel}</div>}
        <ul ref={listRef} className="uix-view-menu__cols" aria-labelledby={columnsLabel != null ? columnsLabelId : undefined}>
          {ordered.map((column, index) => {
            const text = columnText(column);
            return (
              <li
                key={column.id}
                className="uix-view-menu__col"
                data-column-id={column.id}
                data-visible={String(column.visible)}
                data-required={column.required ? 'true' : undefined}
                data-dragging={dragging === column.id || undefined}
              >
                {onReorder && (
                  <button
                    type="button"
                    className="uix-view-menu__grip"
                    // Pointer-first: the ⋯ menu's Move up / Move down is the keyboard path, so the grip
                    // stays out of the tab order (it still moves with the arrows once clicked).
                    tabIndex={-1}
                    aria-label={fill(labels.reorder, { label: text })}
                    onPointerDown={(event) => {
                      if (event.button !== 0) return;
                      event.preventDefault(); // no text selection; it also blocks focus, so focus by hand
                      event.currentTarget.focus({ preventScroll: true });
                      dragStart.current = order;
                      startDrag(event, column.id);
                    }}
                    onKeyDown={(event) => {
                      if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
                      event.preventDefault();
                      move(column.id, event.key === 'ArrowUp' ? -1 : 1, 'grip');
                    }}
                  >
                    <EditorIcon name="grip" />
                  </button>
                )}
                {column.required
                  ? (
                    <span className="uix-view-menu__col-toggle" title={labels.required}>
                      <span className="uix-view-menu__col-box" aria-hidden="true" />
                      <span className="uix-view-menu__col-name">{column.label}</span>
                    </span>
                  )
                  : (
                    <Checkbox
                      className="uix-view-menu__col-toggle"
                      label={<span className="uix-view-menu__col-name">{column.label}</span>}
                      checked={column.visible}
                      disabled={column.disabled}
                      onChange={(event) => onColumnVisibilityChange?.(column.id, event.currentTarget.checked)}
                    />
                  )}
                {onReorder && (
                  <ColumnRowMenu
                    label={fill(labels.rowActions, { label: text })}
                    actions={rowActions(column, index)}
                    triggerRef={(el) => { if (el) triggers.current.set(column.id, el); else triggers.current.delete(column.id); }}
                  />
                )}
              </li>
            );
          })}
        </ul>
      </div>}
      {footer != null && <div className="uix-view-menu__footer">{footer}</div>}
      {onReorder && <div role="status" className="uix-visually-hidden">{announcement}</div>}
    </div>
  );
}

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterPopoverProps {
  label: ReactNode;
  type?: 'text' | 'number' | 'date' | 'select' | 'enum' | 'boolean';
  value: string;
  onValueChange: (value: string) => void;
  options?: readonly FilterOption[];
  applyLabel: ReactNode;
  clearLabel: ReactNode;
  onApply: () => void;
  onClear: () => void;
  placeholder?: string;
}

/** Controlled filter editor content; applications own query serialization and the popover trigger. */
export function FilterPopover({ label, type = 'text', value, onValueChange, options, applyLabel, clearLabel, onApply, onClear, placeholder }: FilterPopoverProps) {
  return (
    <div className="uix-filter-popover">
      <label className="uix-label">
        <span>{label}</span>
        {type === 'select' || type === 'enum' || type === 'boolean'
          ? <select className="uix-select" value={value} onChange={(event) => onValueChange(event.currentTarget.value)}>{options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
          : <Input type={type} value={value} placeholder={placeholder} onChange={(event) => onValueChange(event.currentTarget.value)} />}
      </label>
      <div className="uix-filter-popover__actions"><Button type="button" onClick={onClear}>{clearLabel}</Button><Button type="button" variant="primary" onClick={onApply}>{applyLabel}</Button></div>
    </div>
  );
}

export interface SavedViewItem {
  id: string;
  label: ReactNode;
  active?: boolean;
  pinned?: boolean;
}

/** A titled group of saved views, e.g. the user's custom views above the built-in presets. */
export interface SavedViewSection {
  id: string;
  label: ReactNode;
  items: readonly SavedViewItem[];
}

interface SavedViewMenuBaseProps {
  onSelect: (id: string) => void;
  emptyLabel?: ReactNode;
  /** The row's overflow slot (e.g. a ⋯ menu trigger). It stays quiet until the row is hovered or focused, or its menu is open. */
  actions?: (item: SavedViewItem) => ReactNode;
  footer?: ReactNode;
}

export type SavedViewMenuProps = SavedViewMenuBaseProps & (
  | { items: readonly SavedViewItem[]; sections?: never }
  | { sections: readonly SavedViewSection[]; items?: never }
) & (
  | { onPinChange: (id: string, pinned: boolean) => void; pinLabel: string; unpinLabel: string }
  | { onPinChange?: undefined; pinLabel?: never; unpinLabel?: never }
) & (
  | {
    /**
     * Adds a drag grip to every row. Rows move only within their own section; the
     * callback receives that section's full id order (and its id when `sections` is used).
     * The grip also moves its row with ArrowUp / ArrowDown.
     */
    onReorder: (orderedIds: string[], sectionId: string | undefined) => void;
    /** Accessible name of the grip; the row's name is attached as its description. */
    reorderLabel: string;
  }
  | { onReorder?: undefined; reorderLabel?: never }
);

interface SavedViewGroup { id: string | undefined; label?: ReactNode; items: readonly SavedViewItem[] }

const sameOrder = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((id, i) => id === b[i]);

/**
 * Where a dragged row lands: how many of the OTHER rows have their middle above the pointer.
 * The rows reorder live while dragging, so counting the dragged row itself would push it one
 * slot past the pointer every time it moves down.
 */
function dropIndex(rows: readonly Element[], dragged: Element | null, clientY: number): number {
  let index = 0;
  for (const row of rows) {
    if (row === dragged) continue;
    const box = row.getBoundingClientRect();
    if (clientY > box.top + box.height / 2) index++;
  }
  return index;
}

interface RowDragHandlers { over: (id: string, index: number) => void; drop: (id: string) => void }

/**
 * Pointer drag for a list whose rows reorder live. It listens on the window for the whole drag:
 * React moves the dragged row's DOM node when the order changes, which releases pointer capture on
 * its grip, so after the first move down the grip itself stops receiving move and up events.
 */
function useRowDrag(rowSelector: string, handlers: RowDragHandlers) {
  const [dragging, setDragging] = useState<string | null>(null);
  const drag = useRef<{ id: string; list: Element; row: Element } | null>(null);
  const latest = useRef(handlers);
  latest.current = handlers;
  useEffect(() => {
    if (!dragging) return;
    const move = (event: MouseEvent) => {
      const current = drag.current;
      if (!current) return;
      latest.current.over(current.id, dropIndex(Array.from(current.list.querySelectorAll(`:scope > ${rowSelector}`)), current.row, event.clientY));
    };
    const end = () => {
      const current = drag.current;
      drag.current = null;
      setDragging(null);
      if (current) latest.current.drop(current.id);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
    };
  }, [dragging, rowSelector]);
  const start = (event: PointerEvent<HTMLElement>, id: string) => {
    const row = event.currentTarget.closest('li');
    if (!row?.parentElement) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    drag.current = { id, list: row.parentElement, row };
    setDragging(id);
  };
  return { dragging, start };
}

/** Move `id` to `index` within `ids`. Returns `ids` itself when nothing moves. */
function placeId(ids: readonly string[], id: string, index: number): readonly string[] {
  const from = ids.indexOf(id);
  const to = Math.max(0, Math.min(index, ids.length - 1));
  if (from < 0 || from === to) return ids;
  const next = ids.filter((other) => other !== id);
  next.splice(to, 0, id);
  return next;
}

/**
 * Generic saved-view selector: optional titled sections inside one `.uix-menu`, rows of
 * grip · name · overflow. The selected row is tinted as a whole (no check glyph). Persistence,
 * ownership, permissions and labels remain application concerns.
 */
export function SavedViewMenu({ items, sections, onSelect, onPinChange, pinLabel, unpinLabel, onReorder, reorderLabel, emptyLabel, actions, footer }: SavedViewMenuProps) {
  const baseId = useId();
  const groups: readonly SavedViewGroup[] = sections ?? [{ id: undefined, items: items ?? [] }];
  // The order being dragged (or just moved by keyboard) until the consumer's new order arrives.
  const [draft, setDraft] = useState<{ group: string | undefined; ids: readonly string[] } | null>(null);
  const dragStart = useRef<readonly string[] | null>(null);
  const dragGroup = useRef<string | undefined>(undefined);
  const orderKey = JSON.stringify(groups.map((group) => [group.id, group.items.map((item) => item.id)]));
  useEffect(() => setDraft(null), [orderKey]);

  const orderOf = (group: SavedViewGroup) => (draft && draft.group === group.id ? draft.ids : group.items.map((item) => item.id));
  const move = (group: SavedViewGroup, id: string, delta: -1 | 1) => {
    const current = orderOf(group);
    const next = placeId(current, id, current.indexOf(id) + delta);
    if (next === current) return;
    setDraft({ group: group.id, ids: next });
    onReorder?.([...next], group.id);
  };
  const { dragging, start: startDrag } = useRowDrag('.uix-saved-views__row', {
    over: (id, index) => {
      const group = groups.find((candidate) => candidate.id === dragGroup.current);
      if (!group) return;
      const current = orderOf(group);
      const next = placeId(current, id, index);
      if (next !== current) setDraft({ group: group.id, ids: next });
    },
    drop: () => {
      const group = groups.find((candidate) => candidate.id === dragGroup.current);
      const start = dragStart.current;
      dragStart.current = null;
      if (!group) return;
      const end = orderOf(group);
      if (start && !sameOrder(start, end)) onReorder?.([...end], group.id);
    },
  });

  const visible = groups.filter((group) => group.items.length > 0);
  const renderRows = (group: SavedViewGroup, groupIndex: number) => {
    const byId = new Map(group.items.map((item) => [item.id, item] as const));
    return orderOf(group).map((id, index) => {
      const item = byId.get(id);
      if (!item) return null;
      const nameId = `${baseId}-${groupIndex}-${index}`;
      const extra = actions?.(item);
      return (
        <li key={item.id} className="uix-saved-views__row" data-active={item.active || undefined} data-dragging={dragging === item.id || undefined}>
          {onReorder && (
            <button
              type="button"
              className="uix-saved-views__grip"
              aria-label={reorderLabel}
              aria-describedby={nameId}
              onPointerDown={(event) => {
                if (event.button !== 0) return;
                event.preventDefault();
                dragStart.current = orderOf(group);
                dragGroup.current = group.id;
                startDrag(event, item.id);
              }}
              onKeyDown={(event) => {
                if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
                event.preventDefault();
                move(group, item.id, event.key === 'ArrowUp' ? -1 : 1);
              }}
            >
              <EditorIcon name="grip" />
            </button>
          )}
          <button type="button" id={nameId} className="uix-menu__item" data-active={item.active || undefined} aria-current={item.active || undefined} title={typeof item.label === 'string' ? item.label : undefined} onClick={() => onSelect(item.id)}>
            <span className="uix-saved-views__name">{item.label}</span>
          </button>
          {onPinChange && <button type="button" className="uix-saved-views__pin" aria-label={item.pinned ? unpinLabel : pinLabel} data-on={item.pinned || undefined} onClick={() => onPinChange(item.id, !item.pinned)}>★</button>}
          {extra != null && extra !== false && <span className="uix-saved-views__actions">{extra}</span>}
        </li>
      );
    });
  };

  return (
    <ul className="uix-menu uix-saved-views" data-dragging={dragging ? '' : undefined}>
      {visible.length === 0 && emptyLabel != null && <li className="uix-menu__label">{emptyLabel}</li>}
      {sections
        ? visible.map((group, groupIndex) => {
          const labelId = `${baseId}-section-${groupIndex}`;
          return (
            <li key={group.id} className="uix-saved-views__section">
              <div id={labelId} className="uix-menu__label uix-saved-views__section-label">{group.label}</div>
              <ul className="uix-saved-views__group" aria-labelledby={labelId}>{renderRows(group, groupIndex)}</ul>
            </li>
          );
        })
        : visible[0] && renderRows(visible[0], 0)}
      {footer != null && <li className="uix-saved-views__footer">{footer}</li>}
    </ul>
  );
}
