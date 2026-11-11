"use client";

import { useId, useState } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../cx.js';

export interface ListSummaryProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** The names, in the order to show them. */
  items: ReadonlyArray<string>;
  /** How many names show while the list is collapsed. Default 3. */
  max?: number;
  /** An optional first line that counts the whole list, e.g. `(n) => \`${n} roles\``. */
  count?: (total: number) => ReactNode;
  /** The words for the names not shown, e.g. `(n) => \`und ${n} weitere\``. Default `and N more`. */
  more?: (hidden: number) => string;
  /** The toggle while collapsed. Translatable; default `Show all`. */
  expandLabel?: string;
  /** The toggle while expanded. Translatable; default `Show less`. */
  collapseLabel?: string;
  /** Shown instead of the list when `items` is empty. */
  empty?: ReactNode;
  /** Joins the names. Default `, `. */
  separator?: string;
  /** Start with the whole list shown. */
  defaultExpanded?: boolean;
}

/**
 * A long list of names (roles, teams, recipients) read as a count, the first few names and the
 * words for the rest, with a button that shows the whole list in place and hides it again
 * (HAR-3069). A list only one name longer than `max` is shown whole: hiding a single name saves
 * no space. Every word is a prop; the defaults are English.
 */
export function ListSummary({
  items,
  max = 3,
  count,
  more = (hidden) => `and ${hidden} more`,
  expandLabel = 'Show all',
  collapseLabel = 'Show less',
  empty,
  separator = ', ',
  defaultExpanded = false,
  className,
  ...props
}: ListSummaryProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const listId = useId();
  const limit = Math.max(1, Math.floor(max));
  const collapsible = items.length > limit + 1;
  const shown = collapsible && !expanded ? items.slice(0, limit) : items;
  return (
    <div className={cx('uix-list-summary', className)} {...props}>
      {items.length === 0 ? (
        <p className="uix-list-summary__items">{empty}</p>
      ) : (
        <>
          {count ? <p className="uix-list-summary__count">{count(items.length)}</p> : null}
          <p className="uix-list-summary__items">
            <span id={listId}>
              {shown.join(separator)}
              {collapsible && !expanded ? ` ${more(items.length - limit)}` : null}
            </span>
            {collapsible ? (
              <>
                {' '}
                <button
                  type="button"
                  className="uix-list-summary__toggle"
                  aria-expanded={expanded}
                  aria-controls={listId}
                  onClick={() => setExpanded((open) => !open)}
                >
                  {expanded ? collapseLabel : expandLabel}
                </button>
              </>
            ) : null}
          </p>
        </>
      )}
    </div>
  );
}
