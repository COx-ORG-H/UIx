import type { AnchorHTMLAttributes, ReactNode } from 'react';

/**
 * What a `renderLink` callback receives (HAR-1348). Spread it onto your router's link
 * so it keeps client navigation and prefetch: `renderLink={(p) => <NextLink {...p} />}`.
 * Every UIx component that can render a link (`ButtonLink`, `Stat href`, `Pagination
 * hrefFor`, `DetailPage`) takes the same callback, so one adapter serves them all.
 */
export interface UixLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  className?: string;
  children?: ReactNode;
}

/** Renders a link with the consumer's router. Default: a plain `<a>`. */
export type UixRenderLink = (props: UixLinkProps) => ReactNode;

export const renderPlainLink: UixRenderLink = (props) => <a {...props} />;

/** Calls the consumer's `renderLink`, falling back to a plain `<a>` when it returns nothing. */
export function renderUixLink(renderLink: UixRenderLink | undefined, props: UixLinkProps): ReactNode {
  return renderLink?.(props) ?? renderPlainLink(props);
}
