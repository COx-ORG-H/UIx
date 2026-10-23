"use client";

import { forwardRef, useEffect, useId, useRef, useState } from 'react';
import type { ReactNode, HTMLAttributes, AnchorHTMLAttributes, Ref } from 'react';
import { cx } from '../cx.js';
import { useUixLabels } from '../labels-context.js';
import { SearchIcon } from '../icons/components.js';
import { KbdCombo, ariaKeyShortcuts, useKbdPlatform } from './Kbd.js';
import type { KeyShortcut } from './Kbd.js';

const ChevronIcon = () => (
  <svg className="uix-navgroup__chevron" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" aria-hidden="true">
    <path d="M2 4l4 4 4-4" />
  </svg>
);

/** The search row under the sidebar head (HAR-1371): it opens your search or command palette. */
export interface SidebarSearch {
  /** The row's words, e.g. "Search". In the rail they are the button's name only. */
  label: ReactNode;
  /**
   * The keys that open the same search, shown at the end of the row and given to assistive
   * technology as `aria-keyshortcuts`, e.g. `['Mod', 'K']`. Showing them does not bind them:
   * your command palette (or app) listens for the keys.
   */
  shortcut?: KeyShortcut;
  onActivate: () => void;
}

export interface SidebarProps extends HTMLAttributes<HTMLElement> {
  collapsed?: boolean;
  nav?: 'full' | 'rail';
  onToggle?: () => void;
  brand?: ReactNode;
  toggleIcon?: ReactNode;
  /**
   * Controls in the head beside the brand (HAR-1371): a mode toggle, a "…" utility `Menu`,
   * collapse-all. Icon buttons (`Button icon size="sm"`) fit the row. Hidden in the rail.
   */
  actions?: ReactNode;
  /** A search row under the head that opens your search (HAR-1371). */
  search?: SidebarSearch;
  /**
   * A slot pinned to the bottom of the sidebar (HAR-1371), for an `AccountMenu`. In the rail it
   * keeps what it renders; give an `AccountMenu` `collapsed` there.
   */
  footer?: ReactNode;
  children?: ReactNode;
  expandLabel?: string;
  collapseLabel?: string;
}

export function Sidebar({ collapsed, nav, onToggle, brand, toggleIcon, actions, search, footer, children, expandLabel: expandLabelProp, collapseLabel: collapseLabelProp, className, ...props }: SidebarProps) {
  const uixLabels = useUixLabels();
  const expandLabel = expandLabelProp ?? uixLabels.sidebar?.expand ?? 'Expand sidebar';
  const collapseLabel = collapseLabelProp ?? uixLabels.sidebar?.collapse ?? 'Collapse sidebar';
  const isCollapsed = collapsed ?? nav === 'rail';
  const platform = useKbdPlatform();
  return (
    <nav className={cx('uix-sidebar', className)} data-collapsed={isCollapsed || undefined} data-nav={nav} {...props}>
      {(brand != null || onToggle || actions != null) && (
        <div className="uix-sidebar__head">
          {brand && <div className="uix-sidebar__brand">{brand}</div>}
          {actions != null && <div className="uix-sidebar__actions">{actions}</div>}
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
      {search && (
        <button
          type="button"
          className="uix-sidebar__search"
          onClick={search.onActivate}
          aria-keyshortcuts={search.shortcut ? ariaKeyShortcuts(search.shortcut, platform) : undefined}
        >
          <SearchIcon className="uix-sidebar__search-icon" />
          <span className="uix-sidebar__search-label">{search.label}</span>
          {search.shortcut && <KbdCombo className="uix-sidebar__search-keys" keys={[...search.shortcut]} platform={platform} aria-hidden="true" />}
        </button>
      )}
      {children}
      {footer != null && <div className="uix-sidebar__foot">{footer}</div>}
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
  /**
   * A second line under the label (a sub-label, a count, a long German term); it wraps,
   * and the row grows to fit (HAR-1355; TENSOR B31). Hidden in the rail.
   */
  description?: ReactNode;
  children?: ReactNode;
}

/**
 * One navigation row: a link (`as="a"`, default) or, for a row that acts in place (a mode toggle,
 * an account menu), a `button`. The forwarded ref reaches the rendered `<a>` or `<button>`
 * (HAR-1810), so a row can anchor a `Popover` (`anchor={ref}`); `popoverTarget` and other button
 * attributes pass through with `as="button"`.
 */
export const NavItem = forwardRef<HTMLAnchorElement | HTMLButtonElement, NavItemProps>(function NavItem(
  { icon, badge, active, as: Tag = 'a', description, children, className, ...props },
  ref,
) {
  const text = description == null
    ? <span className="uix-navitem__label">{children}</span>
    : <span className="uix-navitem__text"><span className="uix-navitem__label">{children}</span><span className="uix-navitem__desc">{description}</span></span>;
  const multiline = description == null ? undefined : true;
  if (Tag === 'button') {
    const { href: _href, ...btnProps } = props as Record<string, unknown>;
    return (
      <button
        ref={ref as Ref<HTMLButtonElement>}
        type="button"
        className={cx('uix-navitem', className)}
        aria-current={active ? 'page' : undefined}
        data-multiline={multiline}
        {...(btnProps as HTMLAttributes<HTMLButtonElement>)}
      >
        {icon && <span className="uix-navitem__icon" aria-hidden="true">{icon}</span>}
        {text}
        {badge != null && <span className="uix-navitem__badge">{badge}</span>}
      </button>
    );
  }

  return (
    <a
      ref={ref as Ref<HTMLAnchorElement>}
      className={cx('uix-navitem', className)}
      aria-current={active ? 'page' : undefined}
      data-multiline={multiline}
      {...(props as AnchorHTMLAttributes<HTMLAnchorElement>)}
    >
      {icon && <span className="uix-navitem__icon" aria-hidden="true">{icon}</span>}
      {text}
      {badge != null && <span className="uix-navitem__badge">{badge}</span>}
    </a>
  );
});
NavItem.displayName = 'NavItem';

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

/** A nested navigation row. Like `NavItem`, it forwards its ref to the `<a>` or `<button>` (HAR-1810). */
export const SubNavItem = forwardRef<HTMLAnchorElement | HTMLButtonElement, SubNavItemProps>(function SubNavItem(
  { active, as: Tag = 'a', children, className, ...props },
  ref,
) {
  const cls = cx('uix-navitem uix-subitem', className);
  if (Tag === 'button') {
    const { href: _href, ...btnProps } = props as Record<string, unknown>;
    return (
      <button ref={ref as Ref<HTMLButtonElement>} type="button" className={cls} aria-current={active ? 'page' : undefined} {...(btnProps as HTMLAttributes<HTMLButtonElement>)}>
        <span className="uix-navitem__label">{children}</span>
      </button>
    );
  }
  return (
    <a ref={ref as Ref<HTMLAnchorElement>} className={cls} aria-current={active ? 'page' : undefined} {...(props as AnchorHTMLAttributes<HTMLAnchorElement>)}>
      <span className="uix-navitem__label">{children}</span>
    </a>
  );
});
SubNavItem.displayName = 'SubNavItem';
