import type { ReactNode, HTMLAttributes } from 'react';
import { cx } from '../cx.js';
import { InfoTip } from './InfoTip.js';
import { hasHelp, helpTopic } from '../info-tip-model.js';

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
  /** Accessible name of the ? button. Default: the `UixLabelsProvider` `infoTip` template with the title (`"About: <title>"` without a provider). */
  helpLabel?: string;
  /** Right-aligned action area (buttons, menus). */
  actions?: ReactNode;
  /**
   * `display` is the staff type preset (HAR-1815; TENSOR, MOTUS ADR-0047): a 40 px heading-font
   * title, a bold hushed eyebrow, a body-size hushed subtitle up to 42rem, and the actions
   * aligned to the bottom of the titles. `default` is the 24 px header. `compact` (HAR-3081) sets
   * the title one step down the scale, at the h3 size (15 px, semibold), with the same eyebrow,
   * subtitle, help and actions: for a page whose first content (a Sev-1 alert, a live status)
   * must read before its title, such as a greeting on a home page.
   */
  size?: 'default' | 'display' | 'compact';
}

/**
 * Page header — eyebrow / title (+ optional `help` ?) / subtitle + actions row, over `.uix-page-header`.
 * The hairline + breathing room below come from the component CSS.
 */
export function PageHeader({ eyebrow, title, subtitle, help, helpLabel, actions, as: TitleTag = 'h1', size = 'default', className, ...props }: PageHeaderProps) {
  const heading = <TitleTag className="uix-page-header__title">{title}</TitleTag>;
  return (
    <header className={cx('uix-page-header', size !== 'default' && `uix-page-header--${size}`, className)} {...props}>
      <div className="uix-page-header__titles">
        {eyebrow != null && <div className="uix-page-header__eyebrow">{eyebrow}</div>}
        {/* The ? sits beside the heading, not in it, so the heading's name stays the title. */}
        {hasHelp(help) ? (
          <div className="uix-page-header__title-row">
            {heading}
            <InfoTip content={help} label={helpLabel} topic={helpTopic(title)} />
          </div>
        ) : heading}
        {subtitle != null && <p className="uix-page-header__subtitle">{subtitle}</p>}
      </div>
      {actions != null && <div className="uix-page-header__actions">{actions}</div>}
    </header>
  );
}
