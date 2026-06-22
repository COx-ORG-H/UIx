import type { ReactNode, HTMLAttributes } from 'react';
import { cx } from '../cx.js';

export interface AvatarProps extends HTMLAttributes<HTMLSpanElement> {
  size?: 'sm' | 'md' | 'lg';
  src?: string;
  alt?: string;
  /** Initials / fallback shown when there is no `src`. */
  children?: ReactNode;
  /** Online status dot. */
  status?: boolean;
}

/** Avatar over `.uix-avatar`. Renders an image when `src` is set, else children (initials). */
export function Avatar({ size = 'md', src, alt, children, status, className, ...props }: AvatarProps) {
  return (
    <span className={cx('uix-avatar', size !== 'md' && `uix-avatar--${size}`, className)} {...props}>
      {src ? <img src={src} alt={alt ?? ''} /> : children}
      {status && <span className="uix-avatar__status" />}
    </span>
  );
}

export interface AvatarGroupProps extends HTMLAttributes<HTMLSpanElement> {
  children?: ReactNode;
}

/** Overlapping avatar stack over `.uix-avatar-group`. */
export function AvatarGroup({ children, className, ...props }: AvatarGroupProps) {
  return (
    <span className={cx('uix-avatar-group', className)} {...props}>
      {children}
    </span>
  );
}

export interface UserChipProps extends HTMLAttributes<HTMLSpanElement> {
  /** Usually an `<Avatar />`. */
  avatar?: ReactNode;
  name?: ReactNode;
  /** Secondary line (role, email). */
  sub?: ReactNode;
}

/** Avatar + name (+ optional sub-line) over `.uix-user-chip`. */
export function UserChip({ avatar, name, sub, className, children, ...props }: UserChipProps) {
  return (
    <span className={cx('uix-user-chip', className)} {...props}>
      {avatar}
      <span>
        {name != null && <span className="uix-user-chip__name">{name}</span>}
        {sub != null && (
          <span className="uix-user-chip__sub" style={{ display: 'block' }}>
            {sub}
          </span>
        )}
      </span>
      {children}
    </span>
  );
}
