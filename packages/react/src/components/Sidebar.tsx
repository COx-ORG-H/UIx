"use client";

import { useState } from 'react';
import type { ReactNode, HTMLAttributes, AnchorHTMLAttributes } from 'react';
import { cx } from '../cx.js';

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
