import type { ReactNode, HTMLAttributes } from 'react';
import { cx } from '../cx.js';

export interface AppShellProps extends HTMLAttributes<HTMLDivElement> {
  collapsed?: boolean;
  sidebar?: ReactNode;
  topbar?: ReactNode;
  children?: ReactNode;
}

export function AppShell({ collapsed, sidebar, topbar, children, className, ...props }: AppShellProps) {
  return (
    <div className={cx('uix-shell', className)} data-collapsed={collapsed || undefined} {...props}>
      {sidebar && <div className="uix-shell__sidebar">{sidebar}</div>}
      {topbar && <div className="uix-shell__topbar">{topbar}</div>}
      <main className="uix-shell__main">{children}</main>
    </div>
  );
}
