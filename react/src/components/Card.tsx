import type { ReactNode, HTMLAttributes } from 'react';
import { cx } from '../cx.js';

export interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: ReactNode;
  subtitle?: ReactNode;
  headerAction?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
}

export function Card({ title, subtitle, headerAction, footer, children, className, ...props }: CardProps) {
  const hasHeader = title != null || subtitle != null || headerAction != null;
  return (
    <div className={cx('uix-card', className)} {...props}>
      {hasHeader && (
        <div className="uix-card__header">
          <div style={{ flex: 1 }}>
            {title && <div className="uix-card__title">{title}</div>}
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
