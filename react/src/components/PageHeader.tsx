import type { ReactNode, HTMLAttributes } from 'react';
import { cx } from '../cx.js';

export interface PageHeaderProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  eyebrow?: ReactNode;
  title: ReactNode;
  /** Supporting copy under the title. */
  subtitle?: ReactNode;
  /** Right-aligned action area (buttons, menus). */
  actions?: ReactNode;
}

/**
 * Page header — eyebrow / title / subtitle + actions row, over `.uix-page-header`.
 * The hairline + breathing room below come from the component CSS.
 */
export function PageHeader({ eyebrow, title, subtitle, actions, className, ...props }: PageHeaderProps) {
  return (
    <header className={cx('uix-page-header', className)} {...props}>
      <div className="uix-page-header__titles">
        {eyebrow != null && <div className="uix-page-header__eyebrow">{eyebrow}</div>}
        <h1 className="uix-page-header__title">{title}</h1>
        {subtitle != null && <p className="uix-page-header__subtitle">{subtitle}</p>}
      </div>
      {actions != null && <div className="uix-page-header__actions">{actions}</div>}
    </header>
  );
}
