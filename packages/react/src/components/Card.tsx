import type { ReactNode, HTMLAttributes } from 'react';
import { cx } from '../cx.js';

export interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: ReactNode;
  /** Element for the title — pick a real heading to slot the card into the page outline (UIX-A11Y-4). Default `div` keeps legacy rendering. */
  titleAs?: 'h2' | 'h3' | 'h4' | 'div';
  subtitle?: ReactNode;
  headerAction?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
}

export function Card({ title, titleAs: TitleTag = 'div', subtitle, headerAction, footer, children, className, ...props }: CardProps) {
  const hasHeader = title != null || subtitle != null || headerAction != null;
  return (
    <div className={cx('uix-card', className)} {...props}>
      {hasHeader && (
        <div className="uix-card__header">
          <div style={{ flex: 1 }}>
            {title && <TitleTag className="uix-card__title">{title}</TitleTag>}
            {subtitle && <div className="uix-card__subtitle">{subtitle}</div>}
          </div>
          {headerAction}
        </div>
      )}
      {children != null && <div className="uix-card__body">{children}</div>}
      {footer != null && <div className="uix-card__footer">{footer}</div>}
    </div>
  );
}
