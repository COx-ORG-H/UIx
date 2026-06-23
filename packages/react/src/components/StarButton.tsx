"use client";

import type { MouseEvent } from 'react';
import { cx } from '../cx.js';

// Matches the styleguide's nav star glyph (index.html #navigation). Fill is
// CSS-driven: `.uix-navitem__star[data-on] svg { fill: currentColor }`.
const StarGlyph = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M11.5 2.7a.6.6 0 0 1 1 0l2.4 5 5.4.8a.6.6 0 0 1 .3 1l-3.9 3.8.9 5.4a.6.6 0 0 1-.8.6L12 17l-4.8 2.5a.6.6 0 0 1-.8-.6l.9-5.4L3.4 9.5a.6.6 0 0 1 .3-1l5.4-.8z" />
  </svg>
);

export interface StarButtonProps {
  /** Pinned state — drives the filled, warning-toned, always-visible look via `data-on`. */
  pinned: boolean;
  /** Item label, interpolated into the accessible name. */
  label: string;
  /**
   * Accessible-name template carrying a `{label}` placeholder. ONE state model:
   * a STATIC name ("Add {label} to favourites") plus `aria-pressed` reflecting
   * the pinned state — never a dynamic Pin/Remove name AND `aria-pressed` (that
   * double-encodes the state). Defaults to `Add {label} to favourites`.
   */
  addLabel?: string;
  /** Called with the next pinned state when the control is activated. */
  onToggle: (next: boolean) => void;
  /** Extra classes — e.g. consumer-owned reveal triggers when the row is not a `.uix-navitem`. */
  className?: string;
}

/**
 * Controlled pin/unpin star for a nav item. UIx owns the look (the
 * `.uix-navitem__star` contract: reveal-on-hover inside a `.uix-navitem`,
 * warning-toned fill when pinned); the consumer owns the pinned state.
 *
 * Reveal-on-hover is opacity-only (zeroed under `prefers-reduced-motion`).
 * When the star lives outside a `.uix-navitem` row, pass reveal triggers via
 * `className`.
 */
export function StarButton({
  pinned,
  label,
  addLabel = 'Add {label} to favourites',
  onToggle,
  className,
}: StarButtonProps) {
  return (
    <button
      type="button"
      className={cx('uix-navitem__star', className)}
      data-on={pinned || undefined}
      aria-pressed={pinned}
      aria-label={addLabel.replace('{label}', label)}
      onClick={(e: MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle(!pinned);
      }}
    >
      <StarGlyph />
    </button>
  );
}
