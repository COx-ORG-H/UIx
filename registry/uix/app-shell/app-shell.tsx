'use client';

/* @uix registry item — sidebar + topbar + content application shell */

import { ChevronRight, Menu, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { cn } from './utils';

/**
 * Application shell: skip link → sidebar → (topbar + main). THE consumer of
 * the reserved sidebar tokens.
 *
 * Token consumption — every sidebar surface reads the 8 shadcn-bridge sidebar
 * slots (`--sidebar`, `--sidebar-foreground`, `--sidebar-border`,
 * `--sidebar-accent`, `--sidebar-accent-foreground`, `--sidebar-primary`,
 * `--sidebar-primary-foreground`, `--sidebar-ring`), NOT --uix-* directly, so
 * re-pointing the `--sidebar*` names inside the consumer's @uix-overrides
 * fence re-skins the whole rail (e.g. an inverted/dark-brand sidebar) without
 * touching this file. Width comes from the contract token `--uix-sidebar-w`
 * (248px) via the `w-[var(--uix-sidebar-w)]` utilities. Topbar and content
 * sit on --uix-* directly (bg-uix-app etc.). Dark mode is automatic — the
 * variables flip underneath.
 *
 * Framework-agnostic links — nav items render plain `<a href>` by default
 * (same precedent as detail-layout). Router consumers wrap or replace via
 * `renderNavLink`, which receives the item and the fully-styled default
 * anchor. Next.js recipe:
 *
 *   <AppShell
 *     renderNavLink={(item, a) => (
 *       <Link href={item.href} {...a.props}>{a.props.children}</Link>
 *     )}
 *     ...
 *   />
 *
 * (spreading `a.props` keeps the default styling + aria-current; `next/*`
 * stays out of the vendored code). `<Breadcrumbs/>` takes the same shape via
 * its own `renderLink` prop.
 *
 * Mount ONCE, at the app root (the layout): the shell owns min-h-svh, the
 * skip link, and the mobile drawer's fixed positioning — avoid
 * transform/filter ancestors so `fixed` stays viewport-relative.
 *
 * Collapse: `collapsed`/`defaultCollapsed`/`onCollapsedChange` follow the
 * standard controlled/uncontrolled prop pattern. Collapsing hides the desktop
 * sidebar ENTIRELY — an icon-rail collapse mode is out of scope.
 */

export interface AppShellNavItem {
  id: string;
  label: ReactNode;
  href: string;
  icon?: ReactNode;
  active?: boolean;
  badge?: ReactNode;
}

export interface AppShellNavSection {
  id: string;
  /** Optional eyebrow heading above the section's items. */
  label?: ReactNode;
  items: ReadonlyArray<AppShellNavItem>;
}

export interface BreadcrumbItem {
  id: string;
  label: ReactNode;
  /** Last item typically omits href → rendered as <span aria-current="page">. */
  href?: string;
}

export interface AppShellLabels {
  /** aria-label for the nav landmarks. Default 'Primary'. */
  navLabel?: string;
  /** aria-label for the mobile hamburger. Default 'Open navigation'. */
  openNav?: string;
  /** aria-label for the drawer close button. Default 'Close navigation'. */
  closeNav?: string;
  /** Skip-link text. Default 'Skip to content'. */
  skipToContent?: string;
  /** aria-label for the breadcrumb nav. Default 'Breadcrumbs'. */
  breadcrumbsLabel?: string;
  /** aria-label for the desktop collapse toggle (expanded state). Default 'Collapse navigation'. */
  collapseNav?: string;
  /** aria-label for the desktop collapse toggle (collapsed state). Default 'Expand navigation'. */
  expandNav?: string;
}

export interface AppShellProps {
  nav: ReadonlyArray<AppShellNavSection>;
  /**
   * Router escape hatch: receives the item and the fully-styled default <a>;
   * wrap or replace it (see the Next.js recipe in the header doc). Keeps
   * next/* out of vendored code.
   */
  renderNavLink?: (item: AppShellNavItem, defaultAnchor: ReactElement) => ReactElement;
  /** Sidebar header slot. */
  logo?: ReactNode;
  sidebarFooter?: ReactNode;
  /** Right side of the topbar. */
  topbar?: ReactNode;
  /** Rendered on the left of the topbar via <Breadcrumbs/>. */
  breadcrumbs?: ReadonlyArray<BreadcrumbItem>;
  /** Controlled desktop collapse (sidebar hidden entirely). */
  collapsed?: boolean;
  defaultCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  labels?: AppShellLabels;
  className?: string;
  children: ReactNode;
}

/* -------------------------------------------------------------- nav body */

// Shared between the desktop aside and the mobile drawer so the nav markup
// exists exactly once.
function NavSections({
  nav,
  renderNavLink,
}: {
  nav: ReadonlyArray<AppShellNavSection>;
  renderNavLink?: (item: AppShellNavItem, defaultAnchor: ReactElement) => ReactElement;
}) {
  return (
    <>
      {nav.map((section) => (
        <div key={section.id} className="mb-4 last:mb-0">
          {section.label ? (
            <p
              className="mb-1 px-3 text-[11px] uppercase"
              style={{
                letterSpacing: 'var(--uix-tracking-eyebrow)',
                color: 'color-mix(in srgb, var(--sidebar-foreground) 55%, transparent)',
              }}
            >
              {section.label}
            </p>
          ) : null}
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const anchor = (
                <a
                  href={item.href}
                  aria-current={item.active ? 'page' : undefined}
                  className={cn(
                    'relative flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px]',
                    item.active ? '' : 'hover:bg-[var(--sidebar-accent)]',
                  )}
                  style={{
                    transitionDuration: 'var(--uix-dur)',
                    transitionTimingFunction: 'var(--uix-ease-out)',
                    outlineColor: 'var(--sidebar-ring)',
                    ...(item.active
                      ? {
                          background: 'var(--sidebar-accent)',
                          color: 'var(--sidebar-accent-foreground)',
                        }
                      : {
                          color:
                            'color-mix(in srgb, var(--sidebar-foreground) 78%, transparent)',
                        }),
                  }}
                >
                  {item.active ? (
                    // 2px active indicator on the sidebar-primary emphasis slot;
                    // inset-y-1 keeps it clear of the anchor's rounded corners.
                    <span
                      aria-hidden="true"
                      className="absolute inset-y-1 left-0 w-0.5 rounded-full"
                      style={{ background: 'var(--sidebar-primary)' }}
                    />
                  ) : null}
                  {item.icon ? (
                    <span aria-hidden="true" className="inline-flex shrink-0 items-center">
                      {item.icon}
                    </span>
                  ) : null}
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {item.badge != null ? (
                    <span className="ml-auto shrink-0">{item.badge}</span>
                  ) : null}
                </a>
              );
              return (
                <li key={item.id}>{renderNavLink ? renderNavLink(item, anchor) : anchor}</li>
              );
            })}
          </ul>
        </div>
      ))}
    </>
  );
}

/* ------------------------------------------------------------ breadcrumbs */

export interface BreadcrumbsProps {
  items: ReadonlyArray<BreadcrumbItem>;
  /** aria-label for the nav landmark. Default 'Breadcrumbs'. */
  label?: string;
  /** Router escape hatch — same contract as AppShell's renderNavLink. */
  renderLink?: (item: BreadcrumbItem, defaultAnchor: ReactElement) => ReactElement;
  className?: string;
}

export function Breadcrumbs({ items, label, renderLink, className }: BreadcrumbsProps): ReactElement {
  return (
    <nav aria-label={label ?? 'Breadcrumbs'} className={cn('min-w-0', className)}>
      <ol className="flex min-w-0 items-center gap-1.5 text-sm">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          const ariaCurrent = isLast ? ('page' as const) : undefined;
          let node: ReactElement;
          if (item.href) {
            const anchor = (
              <a
                href={item.href}
                aria-current={ariaCurrent}
                className="truncate text-uix-hushed transition-colors hover:text-uix-text"
              >
                {item.label}
              </a>
            );
            node = renderLink ? renderLink(item, anchor) : anchor;
          } else {
            node = (
              <span aria-current={ariaCurrent} className="truncate text-uix-text">
                {item.label}
              </span>
            );
          }
          return (
            <li key={item.id} className="flex min-w-0 items-center gap-1.5">
              {i > 0 ? (
                <span aria-hidden="true" className="shrink-0 text-uix-muted">
                  <ChevronRight size={12} strokeWidth={1.75} />
                </span>
              ) : null}
              {node}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/* -------------------------------------------------------------- app shell */

const topbarBtnCls =
  'h-8 w-8 shrink-0 items-center justify-center rounded-md text-uix-hushed transition-colors hover:bg-uix-hover hover:text-uix-text';

export function AppShell({
  nav,
  renderNavLink,
  logo,
  sidebarFooter,
  topbar,
  breadcrumbs,
  collapsed,
  defaultCollapsed,
  onCollapsedChange,
  labels = {},
  className,
  children,
}: AppShellProps): ReactElement {
  const navLabel = labels.navLabel ?? 'Primary';

  // Desktop collapse — controlled (`collapsed`) or uncontrolled
  // (`defaultCollapsed` + internal state); onCollapsedChange fires either way.
  const [uncontrolledCollapsed, setUncontrolledCollapsed] = useState(defaultCollapsed ?? false);
  const isCollapsed = collapsed ?? uncontrolledCollapsed;
  const toggleCollapsed = (): void => {
    const next = !isCollapsed;
    if (collapsed === undefined) setUncontrolledCollapsed(next);
    onCollapsedChange?.(next);
  };

  // Mobile drawer — open focuses the drawer's close button; close returns
  // focus to the hamburger; Escape and backdrop click both close.
  const [mobileOpen, setMobileOpen] = useState(false);
  const hamburgerRef = useRef<HTMLButtonElement | null>(null);
  const drawerCloseRef = useRef<HTMLButtonElement | null>(null);

  const closeMobile = useCallback((): void => {
    setMobileOpen(false);
    hamburgerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeMobile();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [mobileOpen, closeMobile]);

  useEffect(() => {
    if (mobileOpen) drawerCloseRef.current?.focus();
  }, [mobileOpen]);

  const sidebarSurface = {
    background: 'var(--sidebar)',
    color: 'var(--sidebar-foreground)',
    borderColor: 'var(--sidebar-border)',
  } as const;

  return (
    <div className={cn('flex min-h-svh bg-uix-app text-uix-text', className)}>
      {/* Skip link — first in DOM; visually appears only on focus. */}
      <a
        href="#uix-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:border focus:border-uix-line focus:bg-uix-surface focus:px-3 focus:py-2 focus:text-sm focus:text-uix-text focus:shadow-uix-popover focus:outline-none focus:ring-2 focus:ring-uix-ring"
      >
        {labels.skipToContent ?? 'Skip to content'}
      </a>

      {/* Desktop sidebar — hidden entirely while collapsed (no icon rail). */}
      {!isCollapsed ? (
        <aside
          id="uix-desktop-nav"
          className="hidden border-r md:flex md:w-[var(--uix-sidebar-w)] md:flex-col"
          style={sidebarSurface}
        >
          {logo ? (
            <div
              className="flex h-14 shrink-0 items-center border-b px-4"
              style={{ borderColor: 'var(--sidebar-border)' }}
            >
              {logo}
            </div>
          ) : null}
          <nav aria-label={navLabel} className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
            <NavSections nav={nav} renderNavLink={renderNavLink} />
          </nav>
          {sidebarFooter ? (
            <div
              className="shrink-0 border-t px-4 py-3"
              style={{ borderColor: 'var(--sidebar-border)' }}
            >
              {sidebarFooter}
            </div>
          ) : null}
        </aside>
      ) : null}

      {/* Mobile off-canvas drawer + backdrop. */}
      {mobileOpen ? (
        <div className="md:hidden">
          {/* biome-ignore lint/a11y/useKeyWithClickEvents: backdrop click-to-dismiss is supplementary to Escape (the keyboard close path). */}
          {/* biome-ignore lint/a11y/noStaticElementInteractions: same — purely supplementary dismiss surface. */}
          <div
            aria-hidden="true"
            className="fixed inset-0 z-30"
            style={{ background: 'color-mix(in srgb, var(--uix-text) 32%, transparent)' }}
            onClick={closeMobile}
          />
          <div
            id="uix-mobile-nav"
            role="dialog"
            aria-modal="true"
            aria-label={navLabel}
            className="fixed inset-y-0 left-0 z-40 flex w-[var(--uix-sidebar-w)] flex-col border-r"
            style={sidebarSurface}
          >
            <div
              className="flex h-14 shrink-0 items-center justify-between gap-2 border-b px-4"
              style={{ borderColor: 'var(--sidebar-border)' }}
            >
              <div className="min-w-0 truncate">{logo}</div>
              <button
                ref={drawerCloseRef}
                type="button"
                aria-label={labels.closeNav ?? 'Close navigation'}
                onClick={closeMobile}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-[var(--sidebar-accent)] focus-visible:outline-2 focus-visible:outline-offset-[-2px]"
                style={{ outlineColor: 'var(--sidebar-ring)' }}
              >
                <X size={16} strokeWidth={1.75} aria-hidden="true" />
              </button>
            </div>
            <nav aria-label={navLabel} className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
              <NavSections nav={nav} renderNavLink={renderNavLink} />
            </nav>
            {sidebarFooter ? (
              <div
                className="shrink-0 border-t px-4 py-3"
                style={{ borderColor: 'var(--sidebar-border)' }}
              >
                {sidebarFooter}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Main column: topbar + content. */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-uix-line bg-uix-app px-4">
          <button
            ref={hamburgerRef}
            type="button"
            aria-expanded={mobileOpen}
            aria-controls="uix-mobile-nav"
            aria-label={labels.openNav ?? 'Open navigation'}
            onClick={() => setMobileOpen(true)}
            className={cn('inline-flex md:hidden', topbarBtnCls)}
          >
            <Menu size={16} strokeWidth={1.75} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-expanded={!isCollapsed}
            aria-controls="uix-desktop-nav"
            aria-label={
              isCollapsed
                ? (labels.expandNav ?? 'Expand navigation')
                : (labels.collapseNav ?? 'Collapse navigation')
            }
            onClick={toggleCollapsed}
            className={cn('hidden md:inline-flex', topbarBtnCls)}
          >
            {isCollapsed ? (
              <PanelLeftOpen size={16} strokeWidth={1.75} aria-hidden="true" />
            ) : (
              <PanelLeftClose size={16} strokeWidth={1.75} aria-hidden="true" />
            )}
          </button>
          {breadcrumbs && breadcrumbs.length > 0 ? (
            <Breadcrumbs items={breadcrumbs} label={labels.breadcrumbsLabel} />
          ) : null}
          {topbar ? (
            <div className="ml-auto flex shrink-0 items-center gap-2">{topbar}</div>
          ) : null}
        </header>
        <main id="uix-main" className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
