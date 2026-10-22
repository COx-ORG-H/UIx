import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../cx.js';
import { BusyBar } from './BusyBar.js';

export interface BusyRegionProps extends HTMLAttributes<HTMLDivElement> {
  /** The content is being fetched again (a filter, sort, page or saved-view change). */
  busy: boolean;
  children?: ReactNode;
}

/**
 * Keeps what is on screen while it is fetched again (HAR-2582, motion standard §2.5): the
 * children stay, dim, and an indeterminate bar runs along the top; `aria-busy` is set at
 * once. The bar and the dim wait 300 ms, so a quick refetch shows nothing, and then stay at
 * least 500 ms. A skeleton is for a first load only: swapping rows for skeletons on every
 * refetch hides what changed. For a table, `TableWrap refreshing` does the same.
 */
export function BusyRegion({ busy, className, children, ...props }: BusyRegionProps) {
  return (
    <div className={cx('uix-busy-region', className)} aria-busy={busy || undefined} {...props}>
      <BusyBar busy={busy} />
      {children}
    </div>
  );
}
