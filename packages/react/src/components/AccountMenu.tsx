"use client";

import type { ReactNode } from 'react';
import { cx } from '../cx.js';
import { useUixLabels } from '../labels-context.js';
import { ChevronsUpDownIcon } from '../icons/components.js';
import { Avatar } from './Avatar.js';
import type { AvatarPresence } from './Avatar.js';
import { Menu } from './Menu.js';
import type { Placement } from '../overlay-position.js';
import { useInShellDrawer } from '../shell-context.js';

export interface AccountMenuUser {
  /** The person's name, shown on the trigger and used for the avatar's initials. */
  name: string;
  /** A second line: an email, a role, a branch. */
  sub?: ReactNode;
  /** A photo URL, or your own avatar content. Without it the avatar shows the initials. */
  avatar?: string | ReactNode;
  /** A presence dot on the avatar (`online`, `busy`, `away`, `offline`). */
  status?: AvatarPresence;
}

export interface AccountMenuLabels {
  /** The menu's name (`aria-label` of the list). Default "Account". */
  menu: string;
}

export const DEFAULT_ACCOUNT_MENU_LABELS: AccountMenuLabels = { menu: 'Account' };

export interface AccountMenuProps {
  user: AccountMenuUser;
  /**
   * The menu's rows: `MenuItem` (profile, preferences, sign out with `tone="danger"`),
   * `MenuRadioGroup` for a presence choice, `MenuSeparator`.
   */
  items?: ReactNode;
  /**
   * The rail form: the trigger shows the avatar only; the name stays the button's accessible
   * name. Pair it with `Sidebar nav="rail"`.
   */
  collapsed?: boolean;
  /** Where the menu opens. Default `top-start`: the trigger usually sits at the bottom of a sidebar. */
  placement?: Placement;
  labels?: Partial<AccountMenuLabels>;
  className?: string;
}

/** Up to two initials from a name, first and last word: "Ada Lovelace" → "AL", "Dževad Hodžić" → "DH". */
export function accountInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  const first = [...words[0]][0] ?? '';
  const last = words.length > 1 ? [...words[words.length - 1]][0] ?? '' : '';
  return (first + last).toLocaleUpperCase();
}

/**
 * The signed-in person's menu (HAR-1371; MOTUS C-2, TENSOR B15): an avatar with the name and a
 * second line as the trigger of a `Menu`. Put it in `Sidebar footer`. The rows are yours.
 */
export function AccountMenu({ user, items, collapsed = false, placement = 'top-start', labels: labelOverrides, className }: AccountMenuProps) {
  const uixLabels = useUixLabels();
  const labels = { ...DEFAULT_ACCOUNT_MENU_LABELS, ...uixLabels.accountMenu, ...labelOverrides };
  // in AppShell's phone drawer the sidebar is full, so the trigger is too
  const inDrawer = useInShellDrawer();
  const rail = collapsed && !inDrawer;
  const photo = typeof user.avatar === 'string' ? user.avatar : undefined;
  const custom = typeof user.avatar === 'string' ? undefined : user.avatar;
  const trigger = (
    <button type="button" className={cx('uix-account-menu', rail && 'uix-account-menu--collapsed', className)}>
      {/* the initials are a picture of the name, which the button already says */}
      <Avatar src={photo} alt="" presence={user.status} className="uix-account-menu__avatar">
        {custom ?? (photo ? null : <span aria-hidden="true">{accountInitials(user.name)}</span>)}
      </Avatar>
      <span className="uix-account-menu__text">
        <span className="uix-account-menu__name">{user.name}</span>
        {user.sub != null && <span className="uix-account-menu__sub">{user.sub}</span>}
      </span>
      <ChevronsUpDownIcon className="uix-account-menu__chevron" />
    </button>
  );
  return <Menu trigger={trigger} label={labels.menu} placement={placement}>{items}</Menu>;
}
