import type { DetailsHTMLAttributes, ReactNode } from 'react';
import { cx } from '../cx.js';
import { ChevronDownIcon } from '../icons/components.js';
import { CollapsibleSectionState } from './CollapsibleSectionState.js';

export interface CollapsibleSectionProps extends Omit<DetailsHTMLAttributes<HTMLDetailsElement>, 'title'> {
  title: ReactNode;
  summary?: ReactNode;
  children?: ReactNode;
  /**
   * Mount the body only while it is needed (HAR-1352; TENSOR B32): `true` mounts it while
   * open and unmounts it on close; `'keep'` mounts it on first open and keeps it. For
   * bodies that fetch or chart. Default: always mounted (and server-renderable).
   */
  lazy?: boolean | 'keep';
  /**
   * Remember the open state for the session under this key (`sessionStorage`,
   * `uix:collapsible:<key>`). Applied after mount, so the server HTML uses `open`.
   */
  persistKey?: string;
  /** Each new value opens the section and scrolls it into view ("jump to SLA"). */
  openRequest?: number;
}

/**
 * A `<details>` disclosure. Without `lazy`, `persistKey` or `openRequest` it is a plain,
 * server-renderable element that toggles without JavaScript; with any of them it becomes
 * a client component that tracks its open state.
 */
export function CollapsibleSection(props: CollapsibleSectionProps) {
  const { title, summary, children, className, lazy, persistKey, openRequest, ...rest } = props;
  if (lazy || persistKey !== undefined || openRequest !== undefined) return <CollapsibleSectionState {...props} />;
  return (
    <details className={cx('uix-collapsible', className)} {...rest}>
      <summary className="uix-collapsible__summary">
        <span><span className="uix-collapsible__title">{title}</span>{summary != null && <span className="uix-collapsible__meta">{summary}</span>}</span>
        <span className="uix-collapsible__chevron" aria-hidden="true"><ChevronDownIcon size="sm" /></span>
      </summary>
      <div className="uix-collapsible__body">{children}</div>
    </details>
  );
}
