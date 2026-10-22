import type { HTMLAttributes, ReactNode } from 'react';
import { Fragment } from 'react';
import { renderUixLink } from '../link.js';
import type { UixRenderLink } from '../link.js';

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
  /**
   * Renders each item's link with your router (HAR-1385): `renderLink={(p) => <NextLink {...p} />}`
   * keeps client navigation and prefetch, and a locale-aware link adds the locale prefix. The
   * same `UixRenderLink` adapter as `ButtonLink`, `Stat`, `Pagination` and `Steps`. Default: `<a>`.
   */
  renderLink?: UixRenderLink;
}

/** Framework-neutral breadcrumb navigation; `renderLink` renders the links with the app's router. */
export function Breadcrumbs({ items, label, separator = '/', renderLink, className, ...props }: BreadcrumbsProps) {
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
                  ? renderUixLink(renderLink, { href: item.href, children: item.label })
                  : <span aria-current={current ? 'page' : undefined}>{item.label}</span>}
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
