"use client";

import { useEffect } from 'react';
import type { ReactNode, HTMLAttributes } from 'react';
import { cx } from '../cx.js';

export type ShellNav = 'full' | 'rail' | 'hidden';

export interface AppShellProps extends HTMLAttributes<HTMLDivElement> {
  /** Sidebar width tier: 'full' (default) → 'rail' (icon only) → 'hidden' (0). */
  nav?: ShellNav;
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
}

export function AppShell({
  nav,
  collapsed,
  focus,
  onExitFocus,
  mainBleed,
  mainId = 'uix-main',
  sidebar,
  topbar,
  children,
  className,
  ...props
}: AppShellProps) {
  const navState: ShellNav = nav ?? (collapsed ? 'rail' : 'full');

  useEffect(() => {
    if (!focus || !onExitFocus) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onExitFocus();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [focus, onExitFocus]);

  return (
    <div
      className={cx('uix-shell', className)}
      data-nav={navState !== 'full' ? navState : undefined}
      data-collapsed={collapsed && nav == null ? '' : undefined}
      data-focus={focus || undefined}
      {...props}
    >
      {/* First tab stop in the shell; tabIndex -1 on main makes the anchor jump move focus cross-browser (UIX-A11Y-2). */}
      <a className="uix-skiplink" href={`#${mainId}`}>Skip to content</a>
      {sidebar && <div className="uix-shell__sidebar">{sidebar}</div>}
      {topbar && <div className="uix-shell__topbar">{topbar}</div>}
      <main id={mainId} tabIndex={-1} className={cx('uix-shell__main', mainBleed && 'uix-shell__main--bleed')}>{children}</main>
      {focus && onExitFocus && (
        <div className="uix-shell__focus-exit">
          <button type="button" className="uix-btn uix-btn--secondary uix-btn--sm" onClick={onExitFocus}>
            Esc · Exit focus
          </button>
        </div>
      )}
    </div>
  );
}
