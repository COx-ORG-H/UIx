import type { ReactNode, HTMLAttributes } from 'react';
import { cx } from '../cx.js';

export type AlertTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export interface AlertProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  tone?: AlertTone;
  title?: ReactNode;
  icon?: ReactNode;
  children?: ReactNode;
}

export function Alert({ tone, title, icon, children, className, ...props }: AlertProps) {
  return (
    <div
      className={cx('uix-alert', tone && tone !== 'neutral' && `uix-alert--${tone}`, className)}
      // urgent tones interrupt, the rest announce politely; before the spread so an explicit `role` wins (UIX-A11Y-4)
      role={tone === 'danger' || tone === 'warning' ? 'alert' : 'status'}
      {...props}
    >
      {icon && <div className="uix-alert__icon">{icon}</div>}
      <div>
        {title && <div className="uix-alert__title">{title}</div>}
        {children && <div className="uix-alert__body">{children}</div>}
      </div>
    </div>
  );
}
