import { forwardRef } from 'react';
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from '../cx.js';
import { renderUixLink } from '../link.js';
import type { UixRenderLink } from '../link.js';
import { ShortcutHint } from './ShortcutHint.js';
import type { KeyShortcut } from './Kbd.js';
import { ButtonFeedback } from './ButtonFeedback.js';
import type { ButtonResult, ButtonResultLabels } from './ButtonFeedback.js';
import { PENDING_DELAY_MS } from '../motion-timing.js';
import { Tooltip } from './Tooltip.js';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'link';
/** `xs` is 24 px: the smallest hit area WCAG 2.5.8 allows, for dense tool rows (HAR-1348). */
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

const buttonClasses = (variant: ButtonVariant, size: ButtonSize, icon: boolean, wrap: boolean, className?: string) => cx(
  'uix-btn',
  `uix-btn--${variant}`,
  size !== 'md' && `uix-btn--${size}`,
  icon && 'uix-btn--icon',
  wrap && !icon && 'uix-btn--wrap',
  className,
);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: boolean;
  /**
   * The button's action is running. The button stops taking presses at once and is announced
   * busy; the spinner appears only after `loadingDelay` and then stays at least 500 ms, so a
   * fast action never flashes one (HAR-2580, motion standard §2.3). The button keeps its full
   * colour while it works: a spinner, not a greyed-out control.
   */
  loading?: boolean;
  /** Milliseconds before the spinner shows (default 300). `0` shows it at once. */
  loadingDelay?: number;
  /**
   * How the button's last action ended (HAR-2581). When it changes to `success` or `error`,
   * or an action ends with one, the label crossfades to a check and `resultLabels.success`
   * ("Done") or an alert mark and `resultLabels.error` ("Failed") for 1.5 s, announced
   * politely, then returns. Never on the first render. The button is always as wide as its
   * widest wording, so nothing beside it moves. Pass `null` while there is no result (keep
   * the prop defined); say what failed and how to recover somewhere that stays, such as a
   * field error or a toast. e.g. `result={m.isSuccess ? 'success' : m.isError ? 'error' : null}`
   */
  result?: ButtonResult | null;
  /** The result words, e.g. `{ success: 'Assigned', error: 'Not assigned' }`; or `UixLabelsProvider` `buttonResult`. */
  resultLabels?: Partial<ButtonResultLabels>;
  /**
   * Let a long label wrap onto more lines: the size becomes a minimum height instead of a fixed
   * one (HAR-1813, WCAG 1.4.10 reflow). For human-language labels on public or narrow screens;
   * dense staff rows keep the one-line default. Ignored with `icon`.
   */
  wrap?: boolean;
  /**
   * The button's keyboard shortcut, in `KbdCombo` key names: `['A']`, `['Mod', 'Enter']`
   * (HAR-2031). Hover or focus shows the keys in a hint above the button (an icon button's
   * `aria-label` before them; ⌘ on Apple, Ctrl elsewhere). Screen readers hear the keys once, as
   * the button's description after any `aria-describedby` of yours ("Control+Enter"), the same
   * rule as a `Tooltip` with a shortcut (HAR-2416). Inside a `Tooltip` the Tooltip shows and says
   * the keys. An `aria-keyshortcuts` you pass is kept as it is. The kit only shows the shortcut:
   * the product binds the key.
   */
  shortcut?: KeyShortcut;
  /**
   * Why the button is unavailable (HAR-2816), e.g. "Nur Administratoren können Lizenzen
   * löschen". Use it with `disabled`: the button then stays focusable and hoverable as
   * `aria-disabled="true"`, takes no press, shows the reason in a `Tooltip` and is described by
   * it, so a keyboard or screen-reader user learns why as well. A disabled button looks the same
   * with or without a reason (muted text, no fill, a hairline); the reason is what tells a person
   * what to do instead. While the button is enabled the reason is silent. Pass the prop for as
   * long as the button can become unavailable (`undefined` only when it never can): the button
   * then sits in the Tooltip's inline wrapper the whole time, so turning `disabled` on or off
   * never remounts it and focus stays on it. Give a full-width button's wrapper its width with
   * `disabledReasonClassName`.
   */
  disabledReason?: string;
  /** Class for the Tooltip wrapper `disabledReason` adds, e.g. to make it full width. */
  disabledReasonClassName?: string;
  children?: ReactNode;
}

// Bundlers substitute the literal `process.env.NODE_ENV`; the typeof guard keeps
// un-bundled browser ESM from throwing where `process` doesn't exist.
declare const process: { env: { NODE_ENV?: string } } | undefined;
let warnedIconButton = false;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'secondary', size = 'md', icon = false, loading, loadingDelay = PENDING_DELAY_MS, result, resultLabels, wrap = false, shortcut, disabledReason, disabledReasonClassName, className, children, disabled, onClick, ...props }, ref) => {
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
    // A disabled button with a reason stays focusable (aria-disabled) so its Tooltip can say why.
    const explained = !!disabled && !!disabledReason;
    const blocked = loading || explained;
    const button = (
      <button
        ref={ref}
        className={buttonClasses(variant, size, icon, wrap, className)}
        // Only explicit `disabled` removes native semantics; `loading` keeps the button
        // focusable and announced as busy, with a click guard instead (UIX-A11Y-3). The
        // spinner itself is ButtonFeedback's delayed marker, not data-loading (HAR-2580).
        disabled={explained ? undefined : disabled}
        aria-disabled={blocked || undefined}
        aria-busy={loading || undefined}
        data-pending={loading || undefined}
        data-disabled-reason={explained || undefined}
        onClick={blocked || onClick ? (e) => { if (blocked) { e.preventDefault(); return; } onClick?.(e); } : undefined}
        {...props}
      >
        {loading !== undefined || result !== undefined ? (
          <ButtonFeedback loading={!!loading} loadingDelay={loadingDelay} result={result} resultLabels={resultLabels}>{children}</ButtonFeedback>
        ) : children}
        {shortcut && shortcut.length > 0 && (
          <ShortcutHint keys={shortcut} label={icon ? props['aria-label'] : undefined} describedBy={props['aria-describedby']} />
        )}
      </button>
    );
    // The wrapper stays while the prop is passed, so toggling `disabled` keeps the same <button>.
    return disabledReason !== undefined
      ? <Tooltip label={explained ? disabledReason : undefined} className={disabledReasonClassName}>{button}</Tooltip>
      : button;
  },
);
Button.displayName = 'Button';

export interface ButtonLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Icon-only link: square, and needs `aria-label`. */
  icon?: boolean;
  /** Let a long label wrap (see `ButtonProps.wrap`, HAR-1813). Ignored with `icon`. */
  wrap?: boolean;
  /**
   * Renders the link without `href`, with `aria-disabled="true"`, so it is announced
   * as an unavailable link and cannot be followed or focused.
   */
  disabled?: boolean;
  /** Your router's link (`(p) => <NextLink {...p} />`); default a plain `<a>`. */
  renderLink?: UixRenderLink;
  /**
   * The link's keyboard shortcut, as on `Button` (HAR-2416): hover or keyboard focus shows the
   * keys in a hint above it, and screen readers hear them once as its description. Not shown
   * while `disabled`. The kit only shows the shortcut: the product binds the key.
   */
  shortcut?: KeyShortcut;
  children?: ReactNode;
}

/**
 * A link that looks like a `Button` (HAR-1348; TENSOR A4/B5, MOTUS C-3). Use it when the
 * action navigates; use `Button` when it acts in place.
 */
export function ButtonLink({ href, variant = 'secondary', size = 'md', icon = false, wrap = false, disabled = false, renderLink, shortcut, className, children, onClick, ...props }: ButtonLinkProps) {
  const classes = buttonClasses(variant, size, icon, wrap, className);
  if (disabled) {
    return <a {...props} className={classes} role="link" aria-disabled="true">{children}</a>;
  }
  const content = shortcut && shortcut.length > 0
    ? <>{children}<ShortcutHint keys={shortcut} label={icon ? props['aria-label'] : undefined} describedBy={props['aria-describedby']} /></>
    : children;
  return <>{renderUixLink(renderLink, { ...props, href, onClick, className: classes, children: content })}</>;
}

export interface ButtonGroupProps {
  children?: ReactNode;
  className?: string;
}

export function ButtonGroup({ children, className }: ButtonGroupProps) {
  return <div className={cx('uix-btn-group', className)}>{children}</div>;
}
