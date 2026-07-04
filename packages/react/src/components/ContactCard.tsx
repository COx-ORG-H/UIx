import type { ReactNode, HTMLAttributes } from 'react';
import { cx } from '../cx.js';
import { Button, type ButtonProps } from './Button.js';

/** An action rendered as a small `Button` (the composed primitive). */
export interface ContactAction {
  label: ReactNode;
  variant?: ButtonProps['variant'];
  onClick?: () => void;
}

export interface ContactCardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'role'> {
  /** Leading avatar/logo (pass a `<span class="uix-avatar">` or `Avatar`). */
  avatar?: ReactNode;
  name?: ReactNode;
  /** Secondary line under the name (`.uix-contact__role`) — the contact's role/relationship,
   *  NOT the ARIA role attribute (which is omitted from this props type to avoid the clash). */
  role?: ReactNode;
  /** Stat tiles — pass `ContactCardStat`s (rendered in `.uix-contact__stats`). */
  stats?: ReactNode;
  /** Actions: `ContactAction[]` (rendered as small `Button`s) or arbitrary nodes. */
  actions?: ReactNode | ContactAction[];
  children?: ReactNode;
}

const isActionArray = (a: ReactNode | ContactAction[]): a is ContactAction[] =>
  Array.isArray(a) && a.every((x) => x != null && typeof x === 'object' && 'label' in x);

/** Contact / account card over `.uix-contact`; composes `Button` for its actions. */
export function ContactCard({ avatar, name, role, stats, actions, className, children, ...props }: ContactCardProps) {
  return (
    <div className={cx('uix-contact', className)} {...props}>
      {avatar}
      {name != null && <div className="uix-contact__name">{name}</div>}
      {role != null && <div className="uix-contact__role">{role}</div>}
      {stats != null && <div className="uix-contact__stats">{stats}</div>}
      {children}
      {actions != null && (
        <div className="uix-contact__actions">
          {isActionArray(actions)
            ? actions.map((a, i) => (
                <Button key={i} size="sm" variant={a.variant ?? 'secondary'} onClick={a.onClick}>
                  {a.label}
                </Button>
              ))
            : actions}
        </div>
      )}
    </div>
  );
}

export interface ContactCardStatProps extends HTMLAttributes<HTMLDivElement> {
  /** The emphasised value (`<b>`). */
  value?: ReactNode;
  /** The muted label (`<span>`). */
  label?: ReactNode;
  children?: ReactNode;
}

/** One stat tile over `.uix-contact__stat` (value + label). */
export function ContactCardStat({ value, label, className, children, ...props }: ContactCardStatProps) {
  return (
    <div className={cx('uix-contact__stat', className)} {...props}>
      {children != null ? (
        children
      ) : (
        <>
          <b>{value}</b>
          <span>{label}</span>
        </>
      )}
    </div>
  );
}
