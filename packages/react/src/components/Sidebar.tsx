"use client";

import { useEffect, useId, useRef, useState } from 'react';
import type { ReactNode, HTMLAttributes, AnchorHTMLAttributes } from 'react';
import { cx } from '../cx.js';

const ChevronIcon = () => (
  <svg className="uix-navgroup__chevron" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" aria-hidden="true">
    <path d="M2 4l4 4 4-4" />
  </svg>
);

export interface SidebarProps extends HTMLAttributes<HTMLElement> {
  collapsed?: boolean;
  nav?: 'full' | 'rail';
  onToggle?: () => void;
  brand?: ReactNode;
  toggleIcon?: ReactNode;
  children?: ReactNode;
  expandLabel?: string;
  collapseLabel?: string;
}

export function Sidebar({ collapsed, nav, onToggle, brand, toggleIcon, children, expandLabel = 'Expand sidebar', collapseLabel = 'Collapse sidebar', className, ...props }: SidebarProps) {
  const isCollapsed = collapsed ?? nav === 'rail';
  return (
    <nav className={cx('uix-sidebar', className)} data-collapsed={isCollapsed || undefined} data-nav={nav} {...props}>
      {(brand != null || onToggle) && (
        <div className="uix-sidebar__head">
          {brand && <div className="uix-sidebar__brand">{brand}</div>}
          {onToggle && (
            <button type="button" className="uix-sidebar__toggle" onClick={onToggle} aria-label={isCollapsed ? expandLabel : collapseLabel}>
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
        type="button"
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
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
}

export function NavGroup({ icon, label, children, defaultExpanded = true, expanded: controlledExpanded, onExpandedChange }: NavGroupProps) {
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const expanded = controlledExpanded ?? internalExpanded;
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panelRef.current?.toggleAttribute('inert', !expanded);
    if (!expanded && panelRef.current?.contains(document.activeElement)) triggerRef.current?.focus();
  }, [expanded]);

  const setExpanded = (next: boolean) => {
    if (!next && panelRef.current?.contains(document.activeElement)) triggerRef.current?.focus();
    if (controlledExpanded == null) setInternalExpanded(next);
    onExpandedChange?.(next);
  };

  return (
    <div className="uix-navgroup">
      <button
        ref={triggerRef}
        type="button"
        className="uix-navitem uix-navgroup__trigger"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => setExpanded(!expanded)}
      >
        {icon && <span className="uix-navitem__icon" aria-hidden="true">{icon}</span>}
        <span className="uix-navitem__label">{label}</span>
        <ChevronIcon />
      </button>
      <div ref={panelRef} id={panelId} className="uix-navgroup__panel" aria-hidden={!expanded}>
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
      <button type="button" className={cls} aria-current={active ? 'page' : undefined} {...(btnProps as HTMLAttributes<HTMLButtonElement>)}>
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
