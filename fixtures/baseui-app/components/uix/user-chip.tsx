'use client';
/* @uix registry item — ported from @itsmx/shared-ui/src/user-chip.tsx */

import { User as UserIcon, Webhook } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from './utils';

/**
 * UI-PRIM-01 / addendum 5 — universal user surface.
 *
 * Per Docs/build-plan.md § UI-PRIM-01 acceptance. Five chip variants:
 *
 *   - `compact`         — avatar only with the name in a tooltip.
 *                         Used in dense table cells.
 *   - `default`         — avatar + name.
 *   - `with-role`       — adds a meta line below the name with role
 *                         + group display.
 *   - `with-presence`   — adds a status dot (online / busy / offline)
 *                         to the avatar corner.
 *   - `system-reporter` — used for ticket reporters of kind
 *                         `system` / `webhook` / `email` per
 *                         realignment 1's reporter taxonomy. Renders
 *                         the system icon (or provider-specific icon
 *                         the consumer passes) + display name; no
 *                         hover card.
 *
 * Pure presentational: takes a `User` data prop + emits a `onClick`
 * event. No DB calls, no tRPC imports. The consumer wires data.
 */

export type UserChipVariant =
  | 'compact'
  | 'default'
  | 'with-role'
  | 'with-presence'
  | 'system-reporter';

export type UserPresence = 'online' | 'busy' | 'away' | 'offline';

export interface UserChipPerson {
  readonly id: string;
  /** Resolver-passed; do not reach into a directory here. */
  readonly display_name: string;
  /** Optional role label for the with-role variant. */
  readonly role_label?: string;
  /** Optional group / team label. */
  readonly group_label?: string;
  readonly presence?: UserPresence;
  /**
   * Optional avatar image URL. Falls back to initials when absent.
   * Must be sanitized + tenant-scoped at the source; this primitive
   * uses it as-is.
   */
  readonly avatar_url?: string;
}

export interface UserChipProps {
  user: UserChipPerson;
  variant?: UserChipVariant;
  /** Fires on click. Default no-op. */
  onClick?: (user: UserChipPerson) => void;
  /** Render-prop for opt-in hover card. See <UserPeekCard/>. */
  peekCard?: ReactNode;
  className?: string;
}

export interface UserAvatarProps {
  user: Pick<UserChipPerson, 'display_name' | 'avatar_url' | 'presence'>;
  /** Default 24. */
  sizePx?: number;
  /** When true, render the presence dot. Default false. */
  showPresence?: boolean;
  className?: string;
}

export interface SystemReporterChipProps {
  /**
   * Resolver-passed display name for the system source (e.g. "Datadog",
   * "PagerDuty alert", "support@example.com"). The realignment-1
   * reporter taxonomy maps a system-id to a display string at the
   * consumer; the primitive just renders it.
   */
  display_name: string;
  /** Optional provider-specific icon. Falls back to <Webhook/>. */
  icon?: typeof Webhook;
  className?: string;
}

// -- shared helpers ----------------------------------------------------

const initialsOf = (name: string): string => {
  // Drop parenthetical / non-letter-leading tokens (e.g. "(dev)") so a
  // name like "Ada Lovelace (dev)" yields "AL", not "A(".
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .filter((p) => /^[\p{L}\p{N}]/u.test(p));
  if (parts.length === 0) return '?';
  if (parts.length === 1) return (parts[0] ?? '?').slice(0, 2).toUpperCase();
  const first = parts[0]?.charAt(0) ?? '';
  const last = parts[parts.length - 1]?.charAt(0) ?? '';
  return `${first}${last}`.toUpperCase();
};

const PRESENCE_BG: Record<UserPresence, string> = {
  online: 'var(--uix-success)',
  busy: 'var(--uix-danger)',
  away: 'var(--uix-warning)',
  offline: 'var(--uix-text-hushed)',
};

// -- UserAvatar --------------------------------------------------------

export function UserAvatar({
  user,
  sizePx = 24,
  showPresence = false,
  className,
}: UserAvatarProps) {
  const initials = initialsOf(user.display_name);
  const presence = showPresence && user.presence ? user.presence : undefined;
  const fontPx = Math.max(9, Math.round(sizePx * 0.42));
  const dotPx = Math.max(6, Math.round(sizePx * 0.3));
  return (
    <span
      className={cn(
        'relative inline-flex flex-shrink-0 items-center justify-center overflow-hidden rounded-full',
        className,
      )}
      style={{
        width: sizePx,
        height: sizePx,
        background: 'var(--uix-bg-hover)',
        color: 'var(--uix-text)',
        fontSize: fontPx,
        lineHeight: 1,
        fontWeight: 400,
      }}
      data-presence={presence}
    >
      {user.avatar_url ? (
        // The img is plain HTML — no Next/Image because shared-ui must
        // stay framework-neutral.
        <img
          src={user.avatar_url}
          alt=""
          width={sizePx}
          height={sizePx}
          className="block h-full w-full object-cover"
        />
      ) : (
        <span aria-hidden="true" className="tabular-nums">
          {initials}
        </span>
      )}
      {presence ? (
        <span
          className="absolute right-0 bottom-0 rounded-full ring-2"
          style={{
            width: dotPx,
            height: dotPx,
            background: PRESENCE_BG[presence],
            // The ring matches the surrounding background so the dot
            // reads as a notch out of the avatar regardless of parent.
            // `--uix-surface` is the canonical default; consumers on
            // hovered rows can re-tint with a wrapping class.
            ['--tw-ring-color' as never]: 'var(--uix-surface)',
          }}
        />
      ) : null}
    </span>
  );
}

// -- UserChip ----------------------------------------------------------

export function UserChip({
  user,
  variant = 'default',
  onClick,
  peekCard,
  className,
}: UserChipProps) {
  if (variant === 'system-reporter') {
    return (
      <SystemReporterChip
        display_name={user.display_name}
        {...(className !== undefined ? { className } : {})}
      />
    );
  }

  const showName = variant !== 'compact';
  const showMeta = variant === 'with-role';
  const showPresence = variant === 'with-presence';
  const interactive = typeof onClick === 'function';

  const inner = (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-2',
        interactive ? 'cursor-pointer' : '',
        className,
      )}
      style={{ color: 'var(--uix-text)' }}
      data-variant={variant}
      data-user-id={user.id}
      onClick={interactive ? () => onClick?.(user) : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.(user);
              }
            }
          : undefined
      }
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      title={!showName ? user.display_name : undefined}
    >
      <UserAvatar user={user} showPresence={showPresence} />
      {showName ? (
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-sm">{user.display_name}</span>
          {showMeta ? (
            <span className="truncate text-xs" style={{ color: 'var(--uix-text-hushed)' }}>
              {[user.role_label, user.group_label].filter(Boolean).join(' · ')}
            </span>
          ) : null}
        </span>
      ) : null}
    </span>
  );

  if (!peekCard) return inner;
  // Render-prop hover card. Consumers compose Radix HoverCard or a
  // pure-CSS popover around the chip themselves; we just give them a
  // wrapper that exposes `aria-describedby` for accessibility.
  return (
    <span className="group/peek relative inline-flex">
      {inner}
      <span
        className="invisible absolute top-full left-0 z-10 mt-1 group-hover/peek:visible group-focus-within/peek:visible"
        role="tooltip"
      >
        {peekCard}
      </span>
    </span>
  );
}

// -- SystemReporterChip ------------------------------------------------

export function SystemReporterChip({
  display_name,
  icon: IconComponent = Webhook,
  className,
}: SystemReporterChipProps) {
  return (
    <span
      className={cn('inline-flex items-center gap-2 text-sm', className)}
      style={{ color: 'var(--uix-text)' }}
      data-variant="system-reporter"
    >
      <span
        className="inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full"
        style={{
          background: 'var(--uix-bg-hover)',
          color: 'var(--uix-text-hushed)',
        }}
      >
        <IconComponent size={14} strokeWidth={1.75} aria-hidden="true" />
      </span>
      <span className="truncate">{display_name}</span>
    </span>
  );
}

/**
 * Fallback icon export so consumers can avoid a lucide-react import in
 * the common case (they almost always want the generic <UserIcon/>).
 * Re-exported so `import { DefaultUserIcon }` in apps/web stays linted
 * by the future "no direct lucide-react entity-icon imports" rule.
 */
export const DefaultUserIcon = UserIcon;

// -- UserPeekCard ------------------------------------------------------

export interface UserPeekCardProps {
  user: UserChipPerson;
  /** Resolver-passed heading labels. */
  recentTicketsLabel?: ReactNode;
  ownedCisLabel?: ReactNode;
  /** Optional content slots wired by the consumer. */
  recentTickets?: ReactNode;
  ownedCis?: ReactNode;
  /** Optional href for the user's profile page. */
  profileHref?: string;
  /** Resolver-passed label for the profile link. */
  profileLabel?: ReactNode;
  className?: string;
}

/**
 * Optional hover card per UI-PRIM-01 acceptance. Consumers OPT IN by
 * passing it to `<UserChip peekCard={<UserPeekCard ... />}>`. The
 * primitive itself does not fetch data — the consumer pre-loads
 * recent tickets + owned CIs and renders them in the slots.
 *
 * Suppressed by default in dense table contexts (cells) to avoid
 * jittery hover behavior — the consumer simply omits the prop.
 */
export function UserPeekCard({
  user,
  recentTicketsLabel = 'Recent items',
  ownedCisLabel = 'Linked items',
  recentTickets,
  ownedCis,
  profileHref,
  profileLabel = 'View profile',
  className,
}: UserPeekCardProps) {
  return (
    <div
      className={cn('min-w-[260px] rounded-md border p-3 shadow-md', className)}
      style={{
        background: 'var(--uix-surface)',
        borderColor: 'var(--uix-border-strong)',
        color: 'var(--uix-text)',
      }}
      // biome-ignore lint/a11y/useSemanticElements: <dialog> carries modal-state semantics; a hover-card peek is not modal.
      role="dialog"
    >
      <div className="flex items-center gap-2">
        <UserAvatar user={user} sizePx={32} />
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-medium">{user.display_name}</span>
          {user.role_label || user.group_label ? (
            <span className="truncate text-xs" style={{ color: 'var(--uix-text-hushed)' }}>
              {[user.role_label, user.group_label].filter(Boolean).join(' · ')}
            </span>
          ) : null}
        </div>
      </div>
      {recentTickets ? (
        <div className="mt-3">
          <p
            className="mb-1 text-xs uppercase tracking-wider"
            style={{ color: 'var(--uix-text-hushed)' }}
          >
            {recentTicketsLabel}
          </p>
          {recentTickets}
        </div>
      ) : null}
      {ownedCis ? (
        <div className="mt-3">
          <p
            className="mb-1 text-xs uppercase tracking-wider"
            style={{ color: 'var(--uix-text-hushed)' }}
          >
            {ownedCisLabel}
          </p>
          {ownedCis}
        </div>
      ) : null}
      {profileHref ? (
        <a
          href={profileHref}
          className="mt-3 inline-block text-xs underline decoration-dotted underline-offset-4"
        >
          {profileLabel}
        </a>
      ) : null}
    </div>
  );
}
