import type { ReactNode, HTMLAttributes } from 'react';
import { cx } from '../cx.js';

/** Presence of a person (HAR-1374). Each state has its own shape as well as its own colour. */
export type AvatarPresence = 'online' | 'busy' | 'away' | 'offline';

/** The words read for each presence state. English; pass translations as `presenceLabels`. */
export const DEFAULT_PRESENCE_LABELS: Record<AvatarPresence, string> = {
  online: 'online',
  busy: 'busy',
  away: 'away',
  offline: 'offline',
};

export interface AvatarProps extends HTMLAttributes<HTMLSpanElement> {
  /** TENSOR RX-125 (UIX-04): translatable; English default. Still honoured for `online`. */
  onlineLabel?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  src?: string;
  alt?: string;
  /** Initials / fallback shown when there is no `src`. */
  children?: ReactNode;
  /** Online status dot. The same as `presence="online"`; kept for existing callers. */
  status?: boolean;
  /**
   * A presence dot: `online` (filled green), `busy` (red with a bar), `away` (an amber ring),
   * `offline` (a grey ring). The state is also in visually hidden text, so it is never colour
   * alone.
   */
  presence?: AvatarPresence;
  /** Translations of the presence words. */
  presenceLabels?: Partial<Record<AvatarPresence, string>>;
}

/** Avatar over `.uix-avatar`. Renders an image when `src` is set, else children (initials). */
export function Avatar({ size = 'md', src, alt, children, status, presence, presenceLabels, onlineLabel, className, ...props }: AvatarProps) {
  const state = presence ?? (status ? 'online' : undefined);
  const word = state && (presenceLabels?.[state] ?? (state === 'online' ? onlineLabel : undefined) ?? DEFAULT_PRESENCE_LABELS[state]);
  return (
    <span className={cx('uix-avatar', size !== 'md' && `uix-avatar--${size}`, className)} {...props}>
      {src ? <img src={src} alt={alt ?? ''} /> : children}
      {/* the dot is a shape and a colour — pair it with hidden text so AT hears the state (UIX-A11Y-4) */}
      {state && <span className="uix-avatar__status" data-presence={state === 'online' ? undefined : state} aria-hidden="true" />}
      {state && <span className="uix-visually-hidden">{word}</span>}
    </span>
  );
}

export interface PresenceDotProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  presence: AvatarPresence;
  /**
   * The state in words for assistive technology. Default: the English word. Pass `null` when
   * the state is already written next to the dot, to make the dot decorative.
   */
  label?: string | null;
}

/** The presence dot on its own, for a row or a menu that shows no avatar (HAR-1374). */
export function PresenceDot({ presence, label, className, ...props }: PresenceDotProps) {
  const decorative = label === null;
  return (
    <span
      className={cx('uix-presence', `uix-presence--${presence}`, className)}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : (label ?? DEFAULT_PRESENCE_LABELS[presence])}
      aria-hidden={decorative ? true : undefined}
      {...props}
    />
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
