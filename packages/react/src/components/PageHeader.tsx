import type { ReactNode, HTMLAttributes } from 'react';
import { cx } from '../cx.js';
import { InfoTip } from './InfoTip.js';
import { hasHelp, helpLabelFor } from '../info-tip-model.js';

export interface PageHeaderProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  eyebrow?: ReactNode;
  title: ReactNode;
  /** Heading level for the title — drop to `h2` when the page already owns an `h1` (UIX-A11Y-4). */
  as?: 'h1' | 'h2';
  /** Supporting copy under the title. */
  subtitle?: ReactNode;
  /**
   * Plain-text help behind a ? button right after the title. Blank lines separate paragraphs;
   * empty, whitespace-only or `null` renders no button.
   */
  help?: string | null;
  /** Accessible name of the ? button. Default `"About: <title>"` when title is text; pass a localised one. */
  helpLabel?: string;
  /** Right-aligned action area (buttons, menus). */
  actions?: ReactNode;
}

/**
 * Page header — eyebrow / title (+ optional `help` ?) / subtitle + actions row, over `.uix-page-header`.
 * The hairline + breathing room below come from the component CSS.
 */
export function PageHeader({ eyebrow, title, subtitle, help, helpLabel, actions, as: TitleTag = 'h1', className, ...props }: PageHeaderProps) {
  const heading = <TitleTag className="uix-page-header__title">{title}</TitleTag>;
  return (
    <header className={cx('uix-page-header', className)} {...props}>
      <div className="uix-page-header__titles">
        {eyebrow != null && <div className="uix-page-header__eyebrow">{eyebrow}</div>}
        {/* The ? sits beside the heading, not in it, so the heading's name stays the title. */}
        {hasHelp(help) ? (
          <div className="uix-page-header__title-row">
            {heading}
            <InfoTip content={help} label={helpLabel ?? helpLabelFor(title)} />
          </div>
        ) : heading}
        {subtitle != null && <p className="uix-page-header__subtitle">{subtitle}</p>}
      </div>
      {actions != null && <div className="uix-page-header__actions">{actions}</div>}
    </header>
  );
}
