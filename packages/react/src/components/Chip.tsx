import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../cx.js';
import { XIcon } from '../icons/components.js';
import { fillLabel } from '../fill-label.js';
import { renderUixLink } from '../link.js';
import type { UixRenderLink } from '../link.js';

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
  /** Adds a × button that removes the chip. */
  onRemove?: () => void;
  /**
   * Accessible name of the × button. `{label}` is replaced by the chip text when it is a
   * string. Default "Remove {label}"; pass a full name when the text is not a string.
   */
  removeLabel?: string;
  /** `add` is the dashed "+ Add filter" chip. */
  variant?: 'default' | 'add';
  disabled?: boolean;
}

/**
 * Filter, tag and token chip over `.uix-chip` (HAR-1360; TENSOR C7/B34, MOTUS C-6/B-A18).
 * Plain text, a toggle, a link or a button, optionally with a × that removes it.
 */
export function Chip({
  children, icon, count, pressed, onPressedChange, onClick, href, renderLink, onRemove, removeLabel = 'Remove {label}',
  variant = 'default', disabled, className, ...props
}: ChipProps) {
  const toggle = pressed !== undefined;
  const interactive = toggle || onClick != null || href != null;
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
    if (href != null && !disabled) return renderUixLink(renderLink, { href, className: classes, children: body, ...(extra as object) });
    if (interactive) {
      return (
        <button
          type="button"
          className={classes}
          aria-pressed={toggle ? pressed : undefined}
          disabled={disabled}
          onClick={handleClick}
          {...(extra as HTMLAttributes<HTMLButtonElement>)}
        >
          {body}
        </button>
      );
    }
    return <span className={classes} {...extra}>{body}</span>;
  };

  if (!onRemove) {
    return <>{main(outer, { ...props, 'data-on': pressed || undefined } as HTMLAttributes<HTMLElement>)}</>;
  }
  const removeName = fillLabel(removeLabel, { label: typeof children === 'string' || typeof children === 'number' ? String(children) : '' }).trim();
  return (
    <span className={outer} data-on={pressed || undefined} {...props}>
      {main('uix-chip__main')}
      <button type="button" className="uix-chip__remove" aria-label={removeName} disabled={disabled} onClick={onRemove}>
        <XIcon />
      </button>
    </span>
  );
}

export interface ChipGroupProps extends HTMLAttributes<HTMLDivElement> {
  /** Names the group, e.g. "Active filters". */
  label?: string;
  children?: ReactNode;
}

/** A wrapping row of chips with a group name. */
export function ChipGroup({ label, children, className, ...props }: ChipGroupProps) {
  return <div role="group" aria-label={label} className={cx('uix-chip-group', className)} {...props}>{children}</div>;
}
