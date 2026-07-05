import type { ReactNode, HTMLAttributes } from 'react';
import { Children, Fragment } from 'react';
import { cx } from '../cx.js';

export interface BreadcrumbsProps extends HTMLAttributes<HTMLElement> {
  /** Decorative separator rendered between items. Defaults to "/". */
  separator?: ReactNode;
  children?: ReactNode;
}

/** Breadcrumb trail over `.uix-breadcrumbs`. Renders a `<nav aria-label="Breadcrumb">` and
 *  interleaves a decorative `.uix-breadcrumbs__sep` between its children. */
export function Breadcrumbs({ separator = '/', className, children, ...props }: BreadcrumbsProps) {
  const items = Children.toArray(children); // toArray drops null/undefined/boolean children
  return (
    <nav className={cx('uix-breadcrumbs', className)} aria-label="Breadcrumb" {...props}>
      {items.map((child, i) => (
        <Fragment key={i}>
          {i > 0 && (
            <span className="uix-breadcrumbs__sep" aria-hidden="true">
              {separator}
            </span>
          )}
          {child}
        </Fragment>
      ))}
    </nav>
  );
}

export interface BreadcrumbItemProps extends HTMLAttributes<HTMLElement> {
  /** Link target. When omitted (or `current`), the crumb renders as non-interactive text. */
  href?: string;
  /** Mark as the current page: renders `<span aria-current="page">`, not a link. */
  current?: boolean;
  children?: ReactNode;
}

/** One breadcrumb: a link (`href`) or the current page (`current`, non-interactive). */
export function BreadcrumbItem({ current, href, className, children, ...props }: BreadcrumbItemProps) {
  if (current || !href) {
    return (
      <span aria-current={current ? 'page' : undefined} className={className} {...props}>
        {children}
      </span>
    );
  }
  return (
    <a href={href} className={className} {...props}>
      {children}
    </a>
  );
}
