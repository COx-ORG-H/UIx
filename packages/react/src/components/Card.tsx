import type { ReactNode, HTMLAttributes, AnchorHTMLAttributes } from 'react';
import { cx } from '../cx.js';
import { InfoTip } from './InfoTip.js';
import { hasHelp, helpLabelFor } from '../info-tip-model.js';

export interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: ReactNode;
  /** Element for the title — pick a real heading to slot the card into the page outline (UIX-A11Y-4). Default `div` keeps legacy rendering. */
  titleAs?: 'h2' | 'h3' | 'h4' | 'div';
  /**
   * Id of the title element (HAR-1354; MOTUS B-A5), so a form, table or region elsewhere
   * can point `aria-labelledby` at it. With a `role` (e.g. `role="region"`), the card is
   * labelled by its title too; a plain card has no role, and ARIA forbids naming it.
   */
  titleId?: string;
  subtitle?: ReactNode;
  /**
   * Plain-text help behind a ? button after the title. Blank lines separate paragraphs;
   * empty, whitespace-only or `null` renders no button.
   */
  help?: string | null;
  /** Accessible name of the ? button. Default `"About: <title>"` when title is text; pass a localised one. */
  helpLabel?: string;
  headerAction?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
}

export function Card({ title, titleAs: TitleTag = 'div', titleId, subtitle, help, helpLabel, headerAction, footer, children, className, ...props }: CardProps) {
  const hasHeader = title != null || subtitle != null || headerAction != null;
  const heading = title ? <TitleTag className="uix-card__title" id={titleId}>{title}</TitleTag> : null;
  return (
    <div className={cx('uix-card', className)} aria-labelledby={heading && titleId && props.role ? titleId : undefined} {...props}>
      {hasHeader && (
        <div className="uix-card__header">
          <div style={{ flex: 1 }}>
            {heading && hasHelp(help) ? (
              <div className="uix-card__title-row">
                {heading}
                <InfoTip content={help} label={helpLabel ?? helpLabelFor(title)} />
              </div>
            ) : heading}
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

export interface CardLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'title'> {
  title?: ReactNode;
  subtitle?: ReactNode;
  headerAction?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
}

/** A whole-card anchor with visible hover and keyboard focus affordances. */
export function CardLink({ title, subtitle, headerAction, footer, children, className, ...props }: CardLinkProps) {
  const hasHeader = title != null || subtitle != null || headerAction != null;
  return (
    <a className={cx('uix-card', 'uix-card--interactive', className)} {...props}>
      {hasHeader && (
        <div className="uix-card__header">
          <div style={{ flex: 1 }}>
            {title != null && <div className="uix-card__title">{title}</div>}
            {subtitle != null && <div className="uix-card__subtitle">{subtitle}</div>}
          </div>
          {headerAction}
        </div>
      )}
      {children != null && <div className="uix-card__body">{children}</div>}
      {footer != null && <div className="uix-card__footer">{footer}</div>}
    </a>
  );
}

export interface InsetProps extends HTMLAttributes<HTMLDivElement> {
  /** `md` (default) pads with `--uix-space-4`; `sm` with `--uix-space-3`, for a dense card. */
  padding?: 'sm' | 'md';
  /**
   * `sunken` (default) is `--uix-bg-subtle` on the card's surface; `surface` is for a well on a
   * panel that is already subtle.
   */
  tone?: 'sunken' | 'surface';
  children?: ReactNode;
}

/**
 * A bordered, sunken well inside a card body (HAR-1818), over `.uix-inset`: for a preview or a
 * specimen (a rendered header, an image crop, a code sample). Use it instead of a `Card` in a
 * `Card`, which brings a second shadow, card padding and card semantics. It lays out nothing:
 * the content is yours. Give it `role="group"` and an `aria-label` when the preview needs a name.
 */
export function Inset({ padding = 'md', tone = 'sunken', children, className, ...props }: InsetProps) {
  return (
    <div className={cx('uix-inset', padding === 'sm' && 'uix-inset--sm', tone === 'surface' && 'uix-inset--surface', className)} {...props}>
      {children}
    </div>
  );
}

