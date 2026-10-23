"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode, HTMLAttributes, MouseEvent } from 'react';
import { cx } from '../cx.js';
import { useUixLabels } from '../labels-context.js';
import { MenuIcon } from '../icons/components.js';
import { Drawer } from './Drawer.js';
import { ShellDrawerContext } from '../shell-context.js';

export type ShellNav = 'full' | 'rail' | 'hidden';

const NAV_TIERS: readonly ShellNav[] = ['full', 'rail', 'hidden'];
/** The phone breakpoint of the shell (HAR-1371): at or under it the phone nav tier applies. */
const PHONE = '(max-width: 40rem)';
// useLayoutEffect warns during SSR; fall back to useEffect on the server.
const useIsomorphicLayoutEffect = typeof document !== 'undefined' ? useLayoutEffect : useEffect;

const readTier = (key: string): ShellNav | undefined => {
  try {
    const stored = window.localStorage.getItem(key);
    return NAV_TIERS.includes(stored as ShellNav) ? (stored as ShellNav) : undefined;
  } catch { return undefined; }
};

/**
 * Whether a keydown that produced the hotkey's character should switch the tier. The character
 * decides, not the modifiers that typed it: on a German or Bosnian keyboard "[" is AltGr+8 /
 * AltGr+F, which Windows reports as Ctrl+Alt, and on a Mac it is Option+5 (altKey, no AltGraph).
 * So only ⌘ and a Ctrl without Alt (a real shortcut) are refused. Not while typing (in a field, a
 * contenteditable, also inside a shadow root), not on key repeat, not under a modal dialog.
 */
const isNavHotkey = (event: KeyboardEvent, key: string) => {
  if (event.key !== key || event.defaultPrevented || event.repeat || event.isComposing) return false;
  if (event.metaKey || (event.ctrlKey && !event.altKey)) return false;
  const target = ((typeof event.composedPath === 'function' ? event.composedPath()[0] : null) ?? event.target) as HTMLElement | null;
  if (target?.isContentEditable || target?.closest?.('input, textarea, select, [contenteditable=""], [contenteditable="true"], [role="textbox"], [role="combobox"]')) return false;
  const modalOpen = Array.from(document.querySelectorAll('dialog[open]')).some((dialog) => {
    try { return dialog.matches(':modal'); } catch { return true; }
  });
  return !modalOpen;
};

export interface AppShellProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * `frame` (default) is the bordered, rounded box the docs show a shell in. `viewport` is an
   * application's shell (HAR-1815): no frame, the full dynamic viewport height (`100dvh`), no fixed
   * top-bar row (the sidebar and main both run the full height; a `topbar`, if given, sits at the
   * top of the main column), main padding that widens on wide screens, and the phone nav tier by
   * default (`phoneNav`), so below 40rem it is one column with the sidebar in a drawer.
   */
  layout?: 'frame' | 'viewport';
  /**
   * Sidebar width tier: 'full' (default) → 'rail' (icon only) → 'hidden' (0). Controlled when
   * set; leave it out to let the shell keep the tier (`defaultNav`, `navHotkey`,
   * `navTierStorageKey`).
   */
  nav?: ShellNav;
  /** The starting tier when `nav` is not controlled. Default `full`. */
  defaultNav?: ShellNav;
  /**
   * Called with the tier the hotkey asks for, and once on mount with a remembered tier that
   * differs from `defaultNav` (HAR-1371), so a `Sidebar nav` you render can follow. With `nav`
   * controlled, set it from here.
   */
  onNavChange?: (nav: ShellNav) => void;
  /**
   * A key that switches the sidebar between `full` and `rail` (HAR-1371; MOTUS StaffShell), e.g.
   * `"["`. It is ignored while typing in a field or with Ctrl/⌘/Alt held, and from `hidden` it
   * goes to `full`. The switch is instant.
   */
  navHotkey?: string;
  /**
   * Remember the tier in `localStorage` under this key (HAR-1371), so a reload keeps the rail.
   * Applied before the first paint on the client; the server renders `defaultNav`.
   */
  navTierStorageKey?: string;
  /**
   * The phone nav tier (HAR-1371): at 40rem and under, the sidebar column is hidden and a menu
   * button (at the start of the topbar, or at the top of main) opens the sidebar in a start-side
   * `Drawer`, shown full whatever the tier. Following a link in it closes the drawer. Default
   * `drawer` with `layout="viewport"`, `none` with the frame; `none` keeps the sidebar column at
   * every width.
   */
  phoneNav?: 'drawer' | 'none';
  /** Back-compat alias for nav="rail". Ignored when `nav` is set. */
  collapsed?: boolean;
  /**
   * Immersive focus mode: hides the sidebar AND the topbar so a wide, many-column
   * table uses the whole frame. Provide `onExitFocus` to enable Esc-to-exit and
   * the floating exit control.
   */
  focus?: boolean;
  /** Called when the user presses Esc (or the exit control) while in focus mode. */
  onExitFocus?: () => void;
  /** Drop the content gutter so a genuinely wide table runs edge-to-edge. */
  mainBleed?: boolean;
  /** id given to `<main>` and targeted by the skip link. Override on collision (UIX-A11Y-2). */
  mainId?: string;
  sidebar?: ReactNode;
  topbar?: ReactNode;
  children?: ReactNode;
  /** TENSOR RX-125 (UIX-04): translatable; English default. */
  skipToContentLabel?: ReactNode;
  /** TENSOR RX-125 (UIX-04): translatable; English default. */
  exitFocusLabel?: ReactNode;
  /** The phone menu button's name. Default: `UixLabelsProvider` `appShell.openNav`, then "Open navigation". */
  openNavLabel?: string;
  /** The navigation drawer's title. Default: `appShell.navigation`, then "Navigation". */
  navigationLabel?: ReactNode;
}

export function AppShell({
  layout = 'frame',
  nav,
  defaultNav = 'full',
  onNavChange,
  navHotkey,
  navTierStorageKey,
  phoneNav: phoneNavProp,
  collapsed,
  focus,
  onExitFocus,
  mainBleed,
  mainId = 'uix-main',
  sidebar,
  topbar,
  children,
  skipToContentLabel: skipToContentLabelProp,
  exitFocusLabel: exitFocusLabelProp,
  openNavLabel: openNavLabelProp,
  navigationLabel: navigationLabelProp,
  className,
  ...props
}: AppShellProps) {
  const uixLabels = useUixLabels();
  const phoneNav = (phoneNavProp ?? (layout === 'viewport' ? 'drawer' : 'none')) === 'drawer';
  const skipToContentLabel = skipToContentLabelProp ?? uixLabels.appShell?.skipToContent ?? 'Skip to content';
  const exitFocusLabel = exitFocusLabelProp ?? uixLabels.appShell?.exitFocus ?? 'Esc · Exit focus';
  const openNavLabel = openNavLabelProp ?? uixLabels.appShell?.openNav ?? 'Open navigation';
  const navigationLabel = navigationLabelProp ?? uixLabels.appShell?.navigation ?? 'Navigation';

  const [ownNav, setOwnNav] = useState<ShellNav>(defaultNav);
  const controlled = nav != null || collapsed != null;
  const navState: ShellNav = nav ?? (collapsed != null ? (collapsed ? 'rail' : 'full') : ownNav);

  // The remembered tier, before the first paint so a reload does not flash the full sidebar.
  // Controlled, the app owns the state: the shell only reports what it remembered.
  useIsomorphicLayoutEffect(() => {
    if (!navTierStorageKey) return;
    const stored = readTier(navTierStorageKey);
    if (stored && stored !== (controlled ? navState : defaultNav)) {
      if (!controlled) setOwnNav(stored);
      onNavChange?.(stored);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navTierStorageKey]);

  const changeNav = useCallback((next: ShellNav) => {
    if (!controlled) setOwnNav(next);
    if (navTierStorageKey) { try { window.localStorage.setItem(navTierStorageKey, next); } catch { /* private mode */ } }
    onNavChange?.(next);
  }, [controlled, navTierStorageKey, onNavChange]);

  useEffect(() => {
    if (!navHotkey) return;
    const onKey = (event: KeyboardEvent) => {
      if (!isNavHotkey(event, navHotkey)) return;
      event.preventDefault();
      changeNav(navState === 'full' ? 'rail' : 'full');
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [navHotkey, navState, changeNav]);

  useEffect(() => {
    if (!focus || !onExitFocus) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onExitFocus();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [focus, onExitFocus]);

  // The phone drawer is only ever open at phone width: growing past it closes the drawer.
  const [drawerOpen, setDrawerOpen] = useState(false);
  useEffect(() => {
    if (!phoneNav || !drawerOpen || typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia(PHONE);
    const onChange = () => { if (!query.matches) setDrawerOpen(false); };
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, [phoneNav, drawerOpen]);

  const phoneButton = phoneNav && sidebar ? (
    <button type="button" className="uix-shell__nav-button uix-btn uix-btn--ghost uix-btn--icon" aria-label={openNavLabel} aria-haspopup="dialog" aria-expanded={drawerOpen} onClick={() => setDrawerOpen(true)}>
      <MenuIcon />
    </button>
  ) : null;
  // following a link in the drawer closes it; the new page is the answer to the tap
  const closeOnLink = (event: MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('a[href]')) setDrawerOpen(false);
  };
  // The drawer's copy of the sidebar mounts on open and stays until the close transition has
  // ended, so the drawer never slides out empty; closed, it is gone (the sidebar column keeps
  // its ids unique). The wait is the drawer's own computed exit duration, no number of ours.
  const [drawerMounted, setDrawerMounted] = useState(false);
  const drawerBodyRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (drawerOpen) { setDrawerMounted(true); return undefined; }
    const dialog = drawerBodyRef.current?.closest('dialog');
    if (!dialog) { setDrawerMounted(false); return undefined; }
    const style = getComputedStyle(dialog);
    const ms = (list: string) => list.split(',').map((v) => (v.trim().endsWith('ms') ? parseFloat(v) : parseFloat(v) * 1000) || 0);
    const durations = ms(style.transitionDuration);
    const delays = ms(style.transitionDelay);
    const exit = Math.max(0, ...durations.map((d, i) => d + (delays[i] ?? 0)));
    const timer = window.setTimeout(() => setDrawerMounted(false), exit);
    return () => window.clearTimeout(timer);
  }, [drawerOpen]);

  return (
    <div
      className={cx('uix-shell', layout === 'viewport' && 'uix-shell--viewport', className)}
      data-nav={navState !== 'full' ? navState : undefined}
      data-collapsed={collapsed && nav == null ? '' : undefined}
      data-focus={focus || undefined}
      data-phone-nav={phoneNav ? 'drawer' : undefined}
      {...props}
    >
      {/* First tab stop in the shell; tabIndex -1 on main makes the anchor jump move focus cross-browser (UIX-A11Y-2). */}
      <a className="uix-skiplink" href={`#${mainId}`}>{skipToContentLabel}</a>
      {sidebar && <div className="uix-shell__sidebar">{sidebar}</div>}
      {topbar && <div className="uix-shell__topbar">{phoneButton}{topbar}</div>}
      <main id={mainId} tabIndex={-1} className={cx('uix-shell__main', mainBleed && 'uix-shell__main--bleed')}>
        {!topbar && phoneButton && <div className="uix-shell__phone-bar">{phoneButton}</div>}
        {children}
      </main>
      {phoneButton && (
        <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} side="start" title={navigationLabel} className="uix-shell__nav-drawer">
          {(drawerOpen || drawerMounted) && (
            <ShellDrawerContext.Provider value>
              <div ref={drawerBodyRef} className="uix-shell__nav-drawer-body" onClick={closeOnLink}>{sidebar}</div>
            </ShellDrawerContext.Provider>
          )}
        </Drawer>
      )}
      {focus && onExitFocus && (
        <div className="uix-shell__focus-exit">
          <button type="button" className="uix-btn uix-btn--secondary uix-btn--sm" onClick={onExitFocus}>
            {exitFocusLabel}
          </button>
        </div>
      )}
    </div>
  );
}
