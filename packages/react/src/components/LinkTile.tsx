"use client";

import { useId } from 'react';
import type { AnchorHTMLAttributes, CSSProperties, ReactNode } from 'react';
import { cx } from '../cx.js';
import { renderUixLink, type UixRenderLink } from '../link.js';
import { ChevronRightIcon } from '../icons/components.js';

export interface LinkTileProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'title'> {
  /** The tile's title: the link's accessible name. */
  title: ReactNode;
  /** A short description at the meta size, announced as the link's description. */
  description?: ReactNode;
  /** A 16 px icon before the title, aligned to its first line. Decorative: hidden from screen readers. */
  icon?: ReactNode;
  /** At most this many lines of description, then an ellipsis. Default: no limit. */
  descriptionLines?: number;
  /** The title's element. Default `h3`, for a grid of tiles under a section heading. */
  titleAs?: 'h2' | 'h3' | 'h4' | 'span';
  /** Renders the anchor with your router's link (client navigation, prefetch), as `CardLink` does. */
  renderLink?: UixRenderLink;
}

/**
 * A navigation tile (HAR-3095): a whole-card link to another page, laid out by the kit. It has a
 * leading icon, the title, a short description and a trailing chevron that says "this opens a
 * page". Built on `CardLink`'s interactive card (`.uix-card--interactive`), with no inner padding
 * beyond `.uix-card__body`. One anchor per tile: the title names it, the description describes it,
 * the icon and the arrow are `aria-hidden`.
 */
export function LinkTile({ title, description, icon, descriptionLines, titleAs: Title = 'h3', className, href, renderLink, ...props }: LinkTileProps) {
  const uid = useId();
  const titleId = `${uid}-title`;
  const descriptionId = description != null ? `${uid}-description` : undefined;
  const lines = descriptionLines != null && Number.isFinite(descriptionLines) && descriptionLines >= 1 ? Math.floor(descriptionLines) : null;
  const classes = cx('uix-card', 'uix-card--interactive', 'uix-link-tile', className);
  const body = (
    <span className="uix-card__body uix-link-tile__body">
      {icon != null && <span className="uix-link-tile__icon" aria-hidden="true">{icon}</span>}
      <span className="uix-link-tile__text">
        <Title id={titleId} className="uix-link-tile__title">{title}</Title>
        {description != null && (
          <span
            id={descriptionId}
            className="uix-link-tile__description"
            data-clamped={lines != null ? '' : undefined}
            style={lines != null ? ({ '--uix-link-tile-lines': String(lines) } as CSSProperties) : undefined}
          >
            {description}
          </span>
        )}
      </span>
      <span className="uix-link-tile__arrow" aria-hidden="true"><ChevronRightIcon size="sm" /></span>
    </span>
  );
  const a11y = { 'aria-labelledby': titleId, ...(descriptionId ? { 'aria-describedby': descriptionId } : {}) };
  if (renderLink && href !== undefined) {
    return <>{renderUixLink(renderLink, { ...a11y, ...props, href, className: classes, children: body })}</>;
  }
  return <a className={classes} href={href} {...a11y} {...props}>{body}</a>;
}
