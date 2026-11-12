"use client";

import { Children, isValidElement, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../cx.js';

export interface OverflowRowProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** The items, in order: each child is one item (a pill, a chip, a short label). */
  children?: ReactNode;
  /** The counter's text; `{count}` is the number of hidden items. Default "+{count}". */
  more?: string;
  /**
   * What a screen reader hears for the counter. `{count}` is the number of hidden items and
   * `{items}` their text, comma-separated. Default "{count} more: {items}". The counter's
   * `title` lists the same items for a pointer.
   */
  moreLabel?: string;
}

/**
 * How many items an `OverflowRow` shows (pure, so it can be tested without layout): all of
 * them when they fit side by side, otherwise the most that fit whole together with the counter
 * for the rest, and never fewer than one. `counterWidth(hidden)` is the counter's width when it
 * stands for `hidden` items.
 */
export function overflowRowFit(
  widths: readonly number[],
  available: number,
  gap: number,
  counterWidth: (hidden: number) => number,
): number {
  const n = widths.length;
  if (n === 0) return 0;
  const total = widths.reduce((sum, w, i) => sum + w + (i > 0 ? gap : 0), 0);
  if (total <= available) return n;
  let best = 1;
  let used = 0;
  for (let k = 1; k < n; k += 1) {
    used += (widths[k - 1] ?? 0) + (k > 1 ? gap : 0);
    if (used + gap + counterWidth(n - k) <= available) best = k;
  }
  return best;
}

const fill = (template: string, count: number, items: string) =>
  template.replace('{count}', String(count)).replace('{items}', items);

/**
 * One line of items that never wraps (HAR-3072): it shows, in order, the items that fit whole
 * and replaces the rest with one counter ("+3"), so a table row keeps one height and no badge is
 * cut mid-word. The first item always shows; when it alone is wider than the row it is clipped at
 * the row's edge (give it its own truncating text for an ellipsis). Re-measures when it is
 * resized and on every render; before it can measure (server render, no ResizeObserver) every
 * item shows and the row clips. The hidden items stay in the DOM for measuring but out of the
 * layout and the accessibility tree; the counter's label names them, so each is heard once.
 */
export function OverflowRow({
  children, more = '+{count}', moreLabel = '{count} more: {items}', className, ...props
}: OverflowRowProps) {
  const items = Children.toArray(children);
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(items.length);
  const [hidden, setHidden] = useState<readonly string[]>([]);
  const measure = useRef<() => void>(() => undefined);

  measure.current = () => {
    const row = ref.current;
    if (!row) return;
    const nodes = Array.from(row.children).filter((el): el is HTMLElement => el.classList.contains('uix-overflow-row__item'));
    const probe = row.querySelector<HTMLElement>('.uix-overflow-row__probe');
    // the natural width: a shrunk first item still reports its content's width as scrollWidth
    const widths = nodes.map((el) => Math.max(el.scrollWidth, el.getBoundingClientRect().width));
    const gap = Number.parseFloat(getComputedStyle(row).columnGap) || 0;
    const counter = probe ? probe.getBoundingClientRect().width : 0;
    const next = overflowRowFit(widths, row.clientWidth, gap, () => counter);
    const text = nodes.slice(next).map((el) => (el.textContent ?? '').trim()).filter(Boolean);
    setShown((current) => (current === next ? current : next));
    setHidden((current) => (current.join('\u0000') === text.join('\u0000') ? current : text));
  };

  // every render: the items may have changed
  useLayoutEffect(() => {
    if (typeof ResizeObserver !== 'undefined') measure.current();
  });

  useEffect(() => {
    const row = ref.current;
    if (!row || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(() => measure.current());
    observer.observe(row);
    return () => observer.disconnect();
  }, []);

  const visible = Math.min(shown, items.length);
  const hiddenCount = items.length - visible;
  const names = hidden.join(', ');
  return (
    <div ref={ref} className={cx('uix-overflow-row', className)} {...props}>
      {items.map((child, i) => (
        <span
          key={isValidElement(child) && child.key != null ? child.key : i}
          className="uix-overflow-row__item"
          {...(i >= visible ? { 'data-overflow-hidden': '', 'aria-hidden': true } : {})}
        >
          {child}
        </span>
      ))}
      {hiddenCount > 0 && (
        <span className="uix-overflow-row__more" title={names || undefined}>
          <span aria-hidden="true">{fill(more, hiddenCount, names)}</span>
          <span className="uix-visually-hidden">{fill(moreLabel, hiddenCount, names)}</span>
        </span>
      )}
      <span className="uix-overflow-row__probe" aria-hidden="true">{fill(more, items.length, '')}</span>
    </div>
  );
}
