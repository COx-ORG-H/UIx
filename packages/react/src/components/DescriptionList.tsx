import type { ReactNode, HTMLAttributes } from 'react';
import { Fragment } from 'react';
import { cx } from '../cx.js';

/**
 * Key-value description list — the `uix-dl` two-column grid (label / value).
 * The house body primitive for detail surfaces: the side-peek drawer, the
 * record detail header, summary cards.
 *
 * UIx owns the LOOK + this controlled contract; the consumer owns the data —
 * WHICH fields to show and how to format each value (a raw `sev_3` enum or an
 * assignee UUID is the app's job to resolve into "SEV 3" / a display name
 * before it reaches `description`). So in a Tensor peek surface:
 *
 *   <DescriptionList items={[
 *     { term: 'State',    description: <StatusPill tone="neutral">Closed</StatusPill> },
 *     { term: 'Severity', description: formatSeverity(row.severity) }, // app formats
 *     { term: 'Assignee', description: assigneeName ?? <em>Unassigned</em> },
 *   ]} />
 *
 * Use `items` for data-driven lists (the common case) or the `DescriptionItem`
 * compound child for hand-authored content. Both render `<dt>`/`<dd>` pairs as
 * direct children of the grid `<dl>`, so they align into the same columns.
 */
export interface DescriptionListItem {
  /** Stable identity for the row; falls back to the list index when omitted. */
  id?: string;
  term: ReactNode;
  description: ReactNode;
}

export interface DescriptionListProps extends HTMLAttributes<HTMLDListElement> {
  items?: DescriptionListItem[];
  children?: ReactNode;
}

export function DescriptionList({ items, children, className, ...props }: DescriptionListProps) {
  return (
    <dl className={cx('uix-dl', className)} {...props}>
      {items?.map((item, i) => (
        <Fragment key={item.id ?? i}>
          <dt>{item.term}</dt>
          <dd>{item.description}</dd>
        </Fragment>
      ))}
      {children}
    </dl>
  );
}

export interface DescriptionItemProps {
  term: ReactNode;
  children?: ReactNode;
}

/**
 * One hand-authored row. Renders a `<dt>`/`<dd>` fragment so the pair lands as
 * direct grid children of the enclosing `<DescriptionList>` (never wrap it in
 * an element — that breaks the two-column alignment).
 */
export function DescriptionItem({ term, children }: DescriptionItemProps) {
  return (
    <>
      <dt>{term}</dt>
      <dd>{children}</dd>
    </>
  );
}
