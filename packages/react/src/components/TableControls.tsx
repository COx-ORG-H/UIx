"use client";

import { useEffect, useId, useRef, useState } from 'react';
import type { PointerEvent, ReactNode } from 'react';
import { Button } from './Button.js';
import { Checkbox } from './Checkbox.js';
import { EditorIcon } from './EditorIcons.js';
import { Input } from './Input.js';
import { Segmented, SegmentedOption } from './Segmented.js';
import { Switch } from './Switch.js';

export interface ViewMenuColumn {
  id: string;
  label: ReactNode;
  visible: boolean;
  disabled?: boolean;
}

export interface ViewMenuProps {
  density: string;
  densityLabel: ReactNode;
  densityOptions: readonly { value: string; label: ReactNode }[];
  onDensityChange: (value: string) => void;
  zebra?: { checked: boolean; label: ReactNode; onChange: (checked: boolean) => void };
  freeze?: { checked: boolean; label: ReactNode; onChange: (checked: boolean) => void };
  columns?: readonly ViewMenuColumn[];
  columnsLabel?: ReactNode;
  onColumnVisibilityChange?: (id: string, visible: boolean) => void;
}

/** Controlled table presentation menu; wrap it with Popover when trigger behavior is needed. */
export function ViewMenu({ density, densityLabel, densityOptions, onDensityChange, zebra, freeze, columns, columnsLabel, onColumnVisibilityChange }: ViewMenuProps) {
  const densityLabelId = useId();
  const zebraLabelId = useId();
  const freezeLabelId = useId();
  return (
    <div className="uix-view-menu">
      <div className="uix-view-menu__group">
        <div id={densityLabelId} className="uix-view-menu__label">{densityLabel}</div>
        <Segmented value={density} onChange={onDensityChange} aria-labelledby={densityLabelId}>
          {densityOptions.map((option) => <SegmentedOption key={option.value} value={option.value}>{option.label}</SegmentedOption>)}
        </Segmented>
      </div>
      {(zebra || freeze) && <div className="uix-view-menu__group">
        {zebra && <div className="uix-view-menu__row"><span id={zebraLabelId}>{zebra.label}</span><Switch checked={zebra.checked} aria-labelledby={zebraLabelId} onChange={(event) => zebra.onChange(event.currentTarget.checked)} /></div>}
        {freeze && <div className="uix-view-menu__row"><span id={freezeLabelId}>{freeze.label}</span><Switch checked={freeze.checked} aria-labelledby={freezeLabelId} onChange={(event) => freeze.onChange(event.currentTarget.checked)} /></div>}
      </div>}
      {columns && columns.length > 0 && <div className="uix-view-menu__group">
        {columnsLabel != null && <div className="uix-view-menu__label">{columnsLabel}</div>}
        <div className="uix-view-menu__cols">
          {columns.map((column) => <Checkbox key={column.id} label={column.label} checked={column.visible} disabled={column.disabled} onChange={(event) => onColumnVisibilityChange?.(column.id, event.currentTarget.checked)} />)}
        </div>
      </div>}
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
  const [dragging, setDragging] = useState<string | null>(null);
  const dragStart = useRef<readonly string[] | null>(null);
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
  const dragOver = (event: PointerEvent<HTMLButtonElement>, group: SavedViewGroup, id: string) => {
    if (dragging !== id) return;
    const rows = Array.from(event.currentTarget.closest('ul')?.querySelectorAll(':scope > .uix-saved-views__row') ?? []);
    let index = rows.length - 1;
    for (let i = 0; i < rows.length; i++) {
      const box = rows[i]!.getBoundingClientRect();
      if (event.clientY < box.top + box.height / 2) { index = i; break; }
    }
    const current = orderOf(group);
    const next = placeId(current, id, index);
    if (next !== current) setDraft({ group: group.id, ids: next });
  };
  const drop = (group: SavedViewGroup, id: string) => {
    if (dragging !== id) return;
    setDragging(null);
    const start = dragStart.current;
    dragStart.current = null;
    const end = orderOf(group);
    if (start && !sameOrder(start, end)) onReorder?.([...end], group.id);
  };

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
                event.currentTarget.setPointerCapture?.(event.pointerId);
                dragStart.current = orderOf(group);
                setDragging(item.id);
              }}
              onPointerMove={(event) => dragOver(event, group, item.id)}
              onPointerUp={() => drop(group, item.id)}
              onPointerCancel={() => drop(group, item.id)}
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
