"use client";

import { useId } from 'react';
import type { ReactNode } from 'react';
import { Button } from './Button.js';
import { Checkbox } from './Checkbox.js';
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

interface SavedViewMenuBaseProps {
  items: readonly SavedViewItem[];
  onSelect: (id: string) => void;
  emptyLabel?: ReactNode;
  actions?: (item: SavedViewItem) => ReactNode;
  footer?: ReactNode;
}

export type SavedViewMenuProps = SavedViewMenuBaseProps & (
  | { onPinChange: (id: string, pinned: boolean) => void; pinLabel: string; unpinLabel: string }
  | { onPinChange?: undefined; pinLabel?: never; unpinLabel?: never }
);

/** Generic saved-view selector. Persistence, ownership and authorization remain application concerns. */
export function SavedViewMenu({ items, onSelect, onPinChange, pinLabel, unpinLabel, emptyLabel, actions, footer }: SavedViewMenuProps) {
  return (
    <ul className="uix-menu uix-saved-views">
      {items.length === 0 && emptyLabel != null && <li className="uix-menu__label">{emptyLabel}</li>}
      {items.map((item) => (
        <li key={item.id} className="uix-saved-views__row">
          <button type="button" className="uix-menu__item" data-active={item.active || undefined} onClick={() => onSelect(item.id)}>{item.label}</button>
          {onPinChange && <button type="button" className="uix-saved-views__pin" aria-label={item.pinned ? unpinLabel : pinLabel} data-on={item.pinned || undefined} onClick={() => onPinChange(item.id, !item.pinned)}>★</button>}
          {actions?.(item)}
        </li>
      ))}
      {footer != null && <li className="uix-saved-views__footer">{footer}</li>}
    </ul>
  );
}
