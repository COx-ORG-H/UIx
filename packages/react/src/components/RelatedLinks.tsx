import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../cx.js';

export interface RelatedLinkItem {
  id: string;
  label: ReactNode;
  href: string;
  meta?: ReactNode;
}

export interface RelatedLinksProps extends Omit<HTMLAttributes<HTMLElement>, 'title' | 'children'> {
  title?: ReactNode;
  items: readonly RelatedLinkItem[];
}

export function RelatedLinks({ title, items, className, ...props }: RelatedLinksProps) {
  return (
    <section className={cx('uix-related-links', className)} {...props}>
      {title != null && <h2 className="uix-related-links__title">{title}</h2>}
      <ul className="uix-related-links__list">
        {items.map((item) => (
          <li key={item.id}>
            <a className="uix-link uix-link--quiet" href={item.href}>{item.label}</a>
            {item.meta != null && <span>{item.meta}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}
