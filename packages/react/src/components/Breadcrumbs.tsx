import type { HTMLAttributes, ReactNode } from 'react';
import { Fragment } from 'react';

export interface BreadcrumbItem {
  id?: string;
  label: ReactNode;
  href?: string;
  current?: boolean;
}

export interface BreadcrumbsProps extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  items: readonly BreadcrumbItem[];
  label: string;
  separator?: ReactNode;
}

/** Framework-neutral breadcrumb navigation. Route adapters can replace anchors at the application seam. */
export function Breadcrumbs({ items, label, separator = '/', className, ...props }: BreadcrumbsProps) {
  return (
    <nav aria-label={label} className={className} {...props}>
      <ol className="uix-breadcrumbs">
        {items.map((item, index) => {
          const current = item.current ?? index === items.length - 1;
          return (
            <Fragment key={item.id ?? `${item.href ?? 'current'}-${index}`}>
              {index > 0 && <li className="uix-breadcrumbs__sep" aria-hidden="true">{separator}</li>}
              <li>
                {item.href && !current
                  ? <a href={item.href}>{item.label}</a>
                  : <span aria-current={current ? 'page' : undefined}>{item.label}</span>}
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
