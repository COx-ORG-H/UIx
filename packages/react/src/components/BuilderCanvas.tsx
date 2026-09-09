"use client";

import { useEffect, useRef, useState } from 'react';
import type { DragEvent, ReactNode } from 'react';
import { cx } from '../cx.js';
import { reorder } from '../table-engine.js';

export interface BuilderCanvasItem {
  id: string;
  type: string;
  label: string;
  description?: string;
  properties?: Record<string, unknown>;
}

export interface BuilderPaletteItem {
  id: string;
  label: string;
  description?: string;
  create: () => BuilderCanvasItem;
}

export interface BuilderCanvasProps {
  items: BuilderCanvasItem[];
  onItemsChange: (items: BuilderCanvasItem[]) => void;
  palette: BuilderPaletteItem[];
  selectedId?: string;
  onSelect?: (id: string | undefined) => void;
  renderItem?: (item: BuilderCanvasItem, selected: boolean) => ReactNode;
  renderProperties?: (item: BuilderCanvasItem, onChange: (item: BuilderCanvasItem) => void) => ReactNode;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  emptyMessage?: string;
  className?: string;
}

/** Palette + sortable canvas + property panel scaffold. Owns interaction, never persistence. */
export function BuilderCanvas({
  items, onItemsChange, palette, selectedId: controlledSelectedId, onSelect,
  renderItem, renderProperties, loading, error, onRetry, emptyMessage = 'Add an item from the palette to begin.', className,
}: BuilderCanvasProps) {
  const [internalSelectedId, setInternalSelectedId] = useState<string>();
  const [draggedId, setDraggedId] = useState<string>();
  const propertyHeadingRef = useRef<HTMLHeadingElement>(null);
  const shouldFocusProperties = useRef(false);
  const selectedId = controlledSelectedId ?? internalSelectedId;
  const selected = items.find((item) => item.id === selectedId);

  useEffect(() => {
    if (shouldFocusProperties.current && selected) {
      propertyHeadingRef.current?.focus();
      shouldFocusProperties.current = false;
    }
  }, [selected]);

  const select = (id: string | undefined, focusProperties = true) => {
    shouldFocusProperties.current = focusProperties;
    if (controlledSelectedId === undefined) setInternalSelectedId(id);
    onSelect?.(id);
  };
  const move = (id: string, direction: -1 | 1) => {
    const index = items.findIndex((item) => item.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= items.length) return;
    onItemsChange(reorder(items, index, target));
  };
  const add = (paletteItem: BuilderPaletteItem) => {
    const item = paletteItem.create();
    onItemsChange([...items, item]);
    select(item.id);
  };
  const remove = (id: string) => {
    onItemsChange(items.filter((item) => item.id !== id));
    if (selectedId === id) select(undefined, false);
  };
  const drop = (event: DragEvent<HTMLElement>, targetId: string) => {
    event.preventDefault();
    if (!draggedId || draggedId === targetId) return;
    const from = items.findIndex((item) => item.id === draggedId);
    const to = items.findIndex((item) => item.id === targetId);
    if (from >= 0 && to >= 0) onItemsChange(reorder(items, from, to));
    setDraggedId(undefined);
  };

  return <section className={cx('uix-builder-canvas', className)} aria-label="Builder canvas">
    <aside className="uix-builder-canvas__palette" aria-label="Item palette">
      <h3>Palette</h3>
      {palette.length === 0 ? <p>No item types available.</p> : <ul>{palette.map((item) => <li key={item.id}><button type="button" onClick={() => add(item)}><strong>{item.label}</strong>{item.description && <span>{item.description}</span>}<span aria-hidden="true">Add</span></button></li>)}</ul>}
    </aside>
    <div className="uix-builder-canvas__workspace">
      <h3>Canvas</h3>
      {loading ? <div className="uix-builder-canvas__state" role="status">Loading canvas…</div>
        : error ? <div className="uix-builder-canvas__state" role="alert"><p>{error}</p>{onRetry && <button type="button" className="uix-btn uix-btn--secondary" onClick={onRetry}>Try again</button>}</div>
        : items.length === 0 ? <div className="uix-builder-canvas__state"><p>{emptyMessage}</p>{palette[0] && <button type="button" className="uix-btn uix-btn--primary" onClick={() => add(palette[0]!)}>Add {palette[0].label}</button>}</div>
        : <ol className="uix-builder-canvas__items">{items.map((item, index) => <li
          key={item.id} draggable onDragStart={() => setDraggedId(item.id)} onDragEnd={() => setDraggedId(undefined)}
          onDragOver={(event) => event.preventDefault()} onDrop={(event) => drop(event, item.id)}
          className={cx('uix-builder-canvas__item', selectedId === item.id && 'uix-builder-canvas__item--selected')}
        >
          <button type="button" className="uix-builder-canvas__item-main" aria-pressed={selectedId === item.id} onClick={() => select(item.id)}>
            {renderItem?.(item, selectedId === item.id) ?? <><strong>{item.label}</strong>{item.description && <span>{item.description}</span>}</>}
          </button>
          <span className="uix-builder-canvas__item-actions">
            <button type="button" onClick={() => move(item.id, -1)} disabled={index === 0} aria-label={`Move ${item.label} up`}>Up</button>
            <button type="button" onClick={() => move(item.id, 1)} disabled={index === items.length - 1} aria-label={`Move ${item.label} down`}>Down</button>
            <button type="button" onClick={() => remove(item.id)} aria-label={`Remove ${item.label}`}>Remove</button>
          </span>
        </li>)}</ol>}
    </div>
    <aside className="uix-builder-canvas__properties" aria-label="Item properties">
      <h3 ref={propertyHeadingRef} tabIndex={-1}>Properties</h3>
      {!selected ? <p>Select a canvas item to edit its properties.</p> : renderProperties?.(selected, (updated) => onItemsChange(items.map((item) => item.id === updated.id ? updated : item))) ?? <dl><dt>Type</dt><dd>{selected.type}</dd><dt>Label</dt><dd>{selected.label}</dd></dl>}
    </aside>
  </section>;
}
