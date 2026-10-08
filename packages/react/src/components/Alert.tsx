import { forwardRef } from 'react';
import type { ReactNode, HTMLAttributes } from 'react';
import { cx } from '../cx.js';
import { AlertDismissButton } from './AlertDismiss.js';

export type AlertTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export interface AlertProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  tone?: AlertTone;
  title?: ReactNode;
  icon?: ReactNode;
  children?: ReactNode;
  /**
   * A trailing slot for what the alert offers to do: a `Button`, a link (HAR-1614). It keeps
   * its place at the end while the text beside it wraps.
   */
  actions?: ReactNode;
  /**
   * Adds a × at the end. The alert does not hide itself: stop rendering it in the handler, and
   * move focus somewhere sensible if the alert held it.
   */
  onDismiss?: () => void;
  /** Accessible name of the ×. Default: `UixLabelsProvider` `alert.dismiss`, then "Dismiss". */
  dismissLabel?: string;
}

/**
 * Inline banner over `.uix-alert`. The ref is the alert element, so a form can move focus to
 * its error message (give it `tabIndex={-1}`).
 */
export const Alert = forwardRef<HTMLDivElement, AlertProps>(function Alert(
  { tone, title, icon, children, actions, onDismiss, dismissLabel, className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cx('uix-alert', tone && tone !== 'neutral' && `uix-alert--${tone}`, className)}
      // urgent tones interrupt, the rest announce politely; before the spread so an explicit `role` wins (UIX-A11Y-4)
      role={tone === 'danger' || tone === 'warning' ? 'alert' : 'status'}
      {...props}
    >
      {icon && <div className="uix-alert__icon">{icon}</div>}
      <div className="uix-alert__content">
        {title && <div className="uix-alert__title">{title}</div>}
        {children && <div className="uix-alert__body">{children}</div>}
      </div>
      {actions != null && <div className="uix-alert__actions">{actions}</div>}
      {onDismiss && <AlertDismissButton label={dismissLabel} onDismiss={onDismiss} />}
    </div>
  );
});
