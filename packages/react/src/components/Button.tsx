import { forwardRef } from 'react';
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from '../cx.js';
import { renderUixLink } from '../link.js';
import type { UixRenderLink } from '../link.js';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'link';
/** `xs` is 24 px: the smallest hit area WCAG 2.5.8 allows, for dense tool rows (HAR-1348). */
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

const buttonClasses = (variant: ButtonVariant, size: ButtonSize, icon: boolean, className?: string) => cx(
  'uix-btn',
  `uix-btn--${variant}`,
  size !== 'md' && `uix-btn--${size}`,
  icon && 'uix-btn--icon',
  className,
);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: boolean;
  loading?: boolean;
  children?: ReactNode;
}

// Bundlers substitute the literal `process.env.NODE_ENV`; the typeof guard keeps
// un-bundled browser ESM from throwing where `process` doesn't exist.
declare const process: { env: { NODE_ENV?: string } } | undefined;
let warnedIconButton = false;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'secondary', size = 'md', icon = false, loading = false, className, children, disabled, onClick, ...props }, ref) => {
    // Dev-only nudge, once per page load: an icon-only button with no children and no
    // aria-label/aria-labelledby has no accessible name (UIX-A11Y-3).
    if (
      !warnedIconButton && icon && children == null &&
      !props['aria-label'] && !props['aria-labelledby'] &&
      typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
    ) {
      warnedIconButton = true;
      console.warn('uix: icon-only <Button> has no accessible name — pass aria-label or aria-labelledby.');
    }
    return (
      <button
        ref={ref}
        className={buttonClasses(variant, size, icon, className)}
        // Only explicit `disabled` removes native semantics; `loading` keeps the button
        // focusable and announced as busy, with a click guard instead (UIX-A11Y-3).
        disabled={disabled}
        aria-disabled={loading || undefined}
        aria-busy={loading || undefined}
        data-loading={loading || undefined}
        onClick={loading || onClick ? (e) => { if (loading) { e.preventDefault(); return; } onClick?.(e); } : undefined}
        {...props}
      >
        {children}
      </button>
    );
  },
);
Button.displayName = 'Button';

export interface ButtonLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Icon-only link: square, and needs `aria-label`. */
  icon?: boolean;
  /**
   * Renders the link without `href`, with `aria-disabled="true"`, so it is announced
   * as an unavailable link and cannot be followed or focused.
   */
  disabled?: boolean;
  /** Your router's link (`(p) => <NextLink {...p} />`); default a plain `<a>`. */
  renderLink?: UixRenderLink;
  children?: ReactNode;
}

/**
 * A link that looks like a `Button` (HAR-1348; TENSOR A4/B5, MOTUS C-3). Use it when the
 * action navigates; use `Button` when it acts in place.
 */
export function ButtonLink({ href, variant = 'secondary', size = 'md', icon = false, disabled = false, renderLink, className, children, onClick, ...props }: ButtonLinkProps) {
  const classes = buttonClasses(variant, size, icon, className);
  if (disabled) {
    return <a {...props} className={classes} role="link" aria-disabled="true">{children}</a>;
  }
  return <>{renderUixLink(renderLink, { ...props, href, onClick, className: classes, children })}</>;
}

export interface ButtonGroupProps {
  children?: ReactNode;
  className?: string;
}

export function ButtonGroup({ children, className }: ButtonGroupProps) {
  return <div className={cx('uix-btn-group', className)}>{children}</div>;
}
