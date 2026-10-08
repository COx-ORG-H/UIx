import { forwardRef } from 'react';
import type { HTMLAttributes, ReactNode, Ref } from 'react';
import { cx } from '../cx.js';
import { renderUixLink } from '../link.js';
import type { UixLinkProps, UixRenderLink } from '../link.js';
import { ChipRemoveButton } from './ChipRemove.js';

export interface ChipProps extends Omit<HTMLAttributes<HTMLElement>, 'onClick'> {
  /** The chip's text. */
  children?: ReactNode;
  icon?: ReactNode;
  /** A trailing count, e.g. the number of matching rows. */
  count?: ReactNode;
  /** Toggle chip: `aria-pressed`, filled while on. Pair with `onPressedChange`. */
  pressed?: boolean;
  onPressedChange?: (pressed: boolean) => void;
  /** A chip that acts in place (e.g. opens the filter it shows for editing). */
  onClick?: () => void;
  /** A link chip. */
  href?: string;
  renderLink?: UixRenderLink;
  /**
   * A link chip for the page that is open: `aria-current="page"` and the filled look
   * (HAR-1632). `pressed` gives the same look but says "toggle button", which a link is not.
   */
  current?: boolean;
  /** Adds a × button that removes the chip. */
  onRemove?: () => void;
  /**
   * Accessible name of the × button. `{label}` is replaced by the chip text when it is a
   * string. Default: `UixLabelsProvider` `chip.remove`, then "Remove {label}"; pass a full name
   * when the text is not a string.
   */
  removeLabel?: string;
  /**
   * Attributes for the body: the element that carries the chip's own action. On a plain chip
   * that is the chip itself, where the other props already go; on a removable chip the other
   * props go to the wrapper, so this is how `aria-haspopup`, `aria-expanded`, `aria-controls`
   * or an `id` reach the button that opens the filter editor (HAR-1632).
   */
  bodyProps?: HTMLAttributes<HTMLElement>;
  /** `add` is the dashed "+ Add filter" chip. */
  variant?: 'default' | 'add';
  disabled?: boolean;
}

/**
 * Filter, tag and token chip over `.uix-chip` (HAR-1360; TENSOR C7/B34, MOTUS C-6/B-A18).
 * Plain text, a toggle, a link or a button, optionally with a × that removes it.
 * The ref goes to the body (the button, link or span that carries the chip's action), also on
 * a removable chip: anchor a popover to it and return focus to it without a DOM lookup.
 */
export const Chip = forwardRef<HTMLElement, ChipProps>(function Chip({
  children, icon, count, pressed, onPressedChange, onClick, href, renderLink, current, onRemove, removeLabel, bodyProps,
  variant = 'default', disabled, className, ...props
}, ref) {
  const toggle = pressed !== undefined;
  const interactive = toggle || onClick != null || href != null;
  const link = href != null && !disabled;
  const on = pressed || (link && current) || undefined;
  const body = (
    <>
      {icon != null && <span className="uix-chip__icon" aria-hidden="true">{icon}</span>}
      <span className="uix-chip__label">{children}</span>
      {count != null && <span className="uix-chip__count">{count}</span>}
    </>
  );
  const handleClick = () => {
    if (disabled) return;
    if (toggle) onPressedChange?.(!pressed);
    onClick?.();
  };
  const outer = cx(
    'uix-chip',
    variant === 'add' && 'uix-chip--add',
    onRemove && 'uix-chip--removable',
    !interactive && 'uix-chip--static',
    className,
  );

  // The part that carries the chip's own action (or just its text).
  const main = (classes: string, extra?: HTMLAttributes<HTMLElement>) => {
    if (link) {
      return renderUixLink(renderLink, {
        href, className: classes, children: body, 'aria-current': current ? 'page' : undefined,
        ...(extra as object), ...(bodyProps as object), ref,
      } as UixLinkProps);
    }
    if (interactive) {
      return (
        <button
          type="button"
          className={classes}
          aria-pressed={toggle ? pressed : undefined}
          disabled={disabled}
          onClick={handleClick}
          {...(extra as HTMLAttributes<HTMLButtonElement>)}
          {...(bodyProps as HTMLAttributes<HTMLButtonElement>)}
          ref={ref as Ref<HTMLButtonElement>}
        >
          {body}
        </button>
      );
    }
    return <span className={classes} {...extra} {...bodyProps} ref={ref as Ref<HTMLSpanElement>}>{body}</span>;
  };

  if (!onRemove) {
    return <>{main(outer, { ...props, 'data-on': on } as HTMLAttributes<HTMLElement>)}</>;
  }
  return (
    <span className={outer} data-on={on} {...props}>
      {main('uix-chip__main')}
      <ChipRemoveButton
        label={removeLabel}
        text={typeof children === 'string' || typeof children === 'number' ? String(children) : ''}
        disabled={disabled}
        onRemove={onRemove}
      />
    </span>
  );
});

export interface ChipGroupProps extends HTMLAttributes<HTMLDivElement> {
  /** Names the group, e.g. "Active filters". */
  label?: string;
  children?: ReactNode;
}

/** A wrapping row of chips with a group name. */
export function ChipGroup({ label, children, className, ...props }: ChipGroupProps) {
  return <div role="group" aria-label={label} className={cx('uix-chip-group', className)} {...props}>{children}</div>;
}
