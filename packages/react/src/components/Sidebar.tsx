"use client";

import { useEffect, useId, useRef, useState } from 'react';
import type { ReactNode, HTMLAttributes, ButtonHTMLAttributes, AnchorHTMLAttributes } from 'react';
import { cx } from '../cx.js';
import { useAnchoredPosition } from '../hooks/useAnchoredPosition.js';

const ChevronIcon = () => (
  <svg className="uix-navgroup__chevron" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" aria-hidden="true">
    <path d="M2 4l4 4 4-4" />
  </svg>
);

export interface SidebarProps extends HTMLAttributes<HTMLElement> {
  collapsed?: boolean;
  onToggle?: () => void;
  brand?: ReactNode;
  toggleIcon?: ReactNode;
  children?: ReactNode;
}

export function Sidebar({ collapsed, onToggle, brand, toggleIcon, children, className, ...props }: SidebarProps) {
  return (
    <nav className={cx('uix-sidebar', className)} data-collapsed={collapsed || undefined} {...props}>
      {(brand != null || onToggle) && (
        <div className="uix-sidebar__head">
          {brand && <div className="uix-sidebar__brand">{brand}</div>}
          {onToggle && (
            <button className="uix-sidebar__toggle" onClick={onToggle} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
              {toggleIcon ?? (
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                  <rect x="3" y="4" width="12" height="1.5" rx=".75" />
                  <rect x="3" y="8.25" width="8" height="1.5" rx=".75" />
                  <rect x="3" y="12.5" width="12" height="1.5" rx=".75" />
                </svg>
              )}
            </button>
          )}
        </div>
      )}
      {children}
    </nav>
  );
}

export interface SidebarSectionProps {
  label?: string;
  children?: ReactNode;
}

export function SidebarSection({ label, children }: SidebarSectionProps) {
  return (
    <>
      {label && <div className="uix-sidebar__eyebrow">{label}</div>}
      {children}
    </>
  );
}

export interface NavSectionProps extends HTMLAttributes<HTMLDivElement> {
  icon?: ReactNode;
  children?: ReactNode;
}

/**
 * NON-INTERACTIVE section header — the static counterpart to `NavItem`.
 * `NavItem` is for focusable elements only (`<a href>`/`<button>`): it ships a
 * pointer cursor + hover highlight, which on a `<span>` is a false affordance.
 * A header that only labels a run of items renders as this `<div>` (no pointer,
 * no hover, not focusable). A header that collapses its group is `NavGroup`;
 * one that navigates is a plain `NavItem`.
 */
export function NavSection({ icon, children, className, ...props }: NavSectionProps) {
  return (
    <div className={cx('uix-navsection', className)} {...props}>
      {icon && <span className="uix-navsection__icon" aria-hidden="true">{icon}</span>}
      <span className="uix-navsection__label">{children}</span>
    </div>
  );
}

export interface SidebarIdentityProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Org/tenant display name — the top line. */
  orgName: string;
  /** Org mark. Defaults to a rounded-square initials avatar derived from `orgName`. */
  orgAvatar?: ReactNode;
  /** Signed-in user's name — the second line (omit to render org only). */
  userName?: ReactNode;
  /** Small user avatar shown before the name on the user line. */
  userAvatar?: ReactNode;
  /** Non-interactive first row of the menu (e.g. the account email). */
  menuLabel?: ReactNode;
  /** Menu items — compose `SidebarIdentityItem` / `SidebarIdentitySep` (or raw `<li>`s). */
  children?: ReactNode;
  /** Optional dev-only section, visually fenced at the menu bottom. Render it only in dev builds. */
  devSection?: ReactNode;
}

/**
 * "Identity at the top" sidebar header (Linear/Notion pattern): org/tenant + user
 * as ONE disclosure button opening an account menu. The menu is a native
 * `[popover]` — Escape closes it, light-dismiss works, and focus returns to the
 * trigger without any JS of ours; positioning uses the kit's flip/shift engine.
 * In the collapsed rail the trigger shrinks to the org mark (CSS-driven).
 */
export function SidebarIdentity({
  orgName, orgAvatar, userName, userAvatar, menuLabel, children, devSection, className, ...props
}: SidebarIdentityProps) {
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);

  const reposition = useAnchoredPosition(triggerRef, menuRef, {
    open, placement: 'bottom-start', offset: 4,
  });

  useEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const sync = () => {
      const isOpen = el.matches(':popover-open');
      if (isOpen) reposition();
      setOpen(isOpen);
    };
    el.addEventListener('toggle', sync);
    return () => el.removeEventListener('toggle', sync);
  }, [reposition]);

  const initials = orgName.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  // `popover`/`popovertarget` are valid HTML attributes absent from React 18's DOM types.
  const popoverAttr = { popover: 'auto' } as Record<string, string>;
  const targetAttr = { popovertarget: id } as Record<string, string>;

  return (
    <div className={className} {...props}>
      <button ref={triggerRef} type="button" className="uix-identity" aria-expanded={open} {...targetAttr}>
        {orgAvatar ?? <span className="uix-avatar uix-avatar--org" aria-hidden="true">{initials}</span>}
        <span className="uix-identity__lines">
          <span className="uix-identity__org">{orgName}</span>
          {userName != null && (
            <span className="uix-identity__user">
              {userAvatar}
              <span>{userName}</span>
            </span>
          )}
        </span>
        <svg className="uix-identity__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m7 15 5 5 5-5" /><path d="m7 9 5-5 5 5" />
        </svg>
      </button>
      <ul ref={menuRef} id={id} className="uix-popover uix-menu" {...popoverAttr}>
        {menuLabel != null && <li className="uix-menu__label" style={{ textTransform: 'none', letterSpacing: 0 }}>{menuLabel}</li>}
        {children}
        {devSection != null && (
          <li className="uix-menu__dev">
            <div className="uix-menu__label">Dev only</div>
            {devSection}
          </li>
        )}
      </ul>
    </div>
  );
}

export interface SidebarIdentityItemProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: ReactNode;
  danger?: boolean;
  children?: ReactNode;
}

/** One account-menu action (profile / settings / theme / sign-out slots). */
export function SidebarIdentityItem({ icon, danger, children, className, ...props }: SidebarIdentityItemProps) {
  return (
    <li>
      <button type="button" className={cx('uix-menu__item', danger && 'uix-menu__item--danger', className)} {...props}>
        {icon}
        {children}
      </button>
    </li>
  );
}

/** Separator between account-menu groups. */
export function SidebarIdentitySep() {
  return <li className="uix-menu__sep" role="separator" />;
}

export interface SidebarFooterProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

/**
 * Quiet utility strip pinned to the sidebar bottom (help / theme / collapse /
 * settings slots). Compose `SidebarUtil` buttons; a `SidebarFooterSpacer`
 * pushes what follows to the far end. Stacks vertically in the collapsed rail.
 */
export function SidebarFooter({ children, className, ...props }: SidebarFooterProps) {
  return (
    <div className={cx('uix-sidebar__footer', className)} {...props}>
      {children}
    </div>
  );
}

export interface SidebarUtilProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Accessible name — required: these are icon-only buttons. */
  label: string;
  children?: ReactNode;
}

/** One ghost icon button in the utility footer. */
export function SidebarUtil({ label, children, className, ...props }: SidebarUtilProps) {
  return (
    <button type="button" className={cx('uix-sidebar__util', className)} aria-label={label} {...props}>
      {children}
    </button>
  );
}

/** Flex spacer for the utility footer (e.g. right-align the settings gear). */
export function SidebarFooterSpacer() {
  return <span className="uix-sidebar__footer-spacer" />;
}

export interface NavItemProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  icon?: ReactNode;
  badge?: ReactNode;
  active?: boolean;
  as?: 'a' | 'button';
  children?: ReactNode;
}

export function NavItem({ icon, badge, active, as: Tag = 'a', children, className, ...props }: NavItemProps) {
  if (Tag === 'button') {
    const { href: _href, ...btnProps } = props as Record<string, unknown>;
    return (
      <button
        className={cx('uix-navitem', className)}
        aria-current={active ? 'page' : undefined}
        {...(btnProps as HTMLAttributes<HTMLButtonElement>)}
      >
        {icon && <span className="uix-navitem__icon" aria-hidden="true">{icon}</span>}
        <span className="uix-navitem__label">{children}</span>
        {badge != null && <span className="uix-navitem__badge">{badge}</span>}
      </button>
    );
  }

  return (
    <a
      className={cx('uix-navitem', className)}
      aria-current={active ? 'page' : undefined}
      {...(props as AnchorHTMLAttributes<HTMLAnchorElement>)}
    >
      {icon && <span className="uix-navitem__icon" aria-hidden="true">{icon}</span>}
      <span className="uix-navitem__label">{children}</span>
      {badge != null && <span className="uix-navitem__badge">{badge}</span>}
    </a>
  );
}

export interface NavGroupProps {
  icon?: ReactNode;
  label: ReactNode;
  children?: ReactNode;
  defaultExpanded?: boolean;
}

export function NavGroup({ icon, label, children, defaultExpanded = true }: NavGroupProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="uix-navgroup">
      <button
        className="uix-navitem uix-navgroup__trigger"
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
      >
        {icon && <span className="uix-navitem__icon" aria-hidden="true">{icon}</span>}
        <span className="uix-navitem__label">{label}</span>
        <ChevronIcon />
      </button>
      <div className="uix-navgroup__panel">
        <div>{children}</div>
      </div>
    </div>
  );
}

export interface SubNavItemProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  active?: boolean;
  as?: 'a' | 'button';
  children?: ReactNode;
}

export function SubNavItem({ active, as: Tag = 'a', children, className, ...props }: SubNavItemProps) {
  const cls = cx('uix-navitem uix-subitem', className);
  if (Tag === 'button') {
    const { href: _href, ...btnProps } = props as Record<string, unknown>;
    return (
      <button className={cls} aria-current={active ? 'page' : undefined} {...(btnProps as HTMLAttributes<HTMLButtonElement>)}>
        <span className="uix-navitem__label">{children}</span>
      </button>
    );
  }
  return (
    <a className={cls} aria-current={active ? 'page' : undefined} {...(props as AnchorHTMLAttributes<HTMLAnchorElement>)}>
      <span className="uix-navitem__label">{children}</span>
    </a>
  );
}
