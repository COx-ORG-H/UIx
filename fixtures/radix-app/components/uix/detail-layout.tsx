'use client';

/* @uix registry item — ported from @itsmx/shared-ui/src/detail-layout.tsx */

import { ChevronLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { Markdown } from './markdown';
import { cn } from './utils';

/**
 * UI-PRIM-01 / addendum 5 — universal entity detail-page primitive.
 *
 * Per Docs/design-system.md § 6 and Docs/build-plan.md § UI-PRIM-01:
 * back link → eyebrow + h1 → tab nav → optional metric row →
 * content + right rail. Every entity detail page in the platform
 * composes from this primitive; no detail page rolls its own layout.
 *
 * Purely presentational — takes data + slots as props and emits
 * events. No DB, no tRPC, no router import (the consumer wires the
 * `tabs` href + active resolution to its own router because the
 * primitive must work in apps/web (Next.js), apps/admin (Next.js),
 * and apps/portal-public (Next.js) without choosing one).
 */

export interface DetailLayoutTab {
  readonly id: string;
  /** Resolver-passed label. */
  readonly label: ReactNode;
  /** Caller-provided href. */
  readonly href: string;
  readonly active?: boolean;
  /** Optional badge / count next to the tab label. */
  readonly badge?: ReactNode;
  readonly disabled?: boolean;
}

export interface DetailLayoutMetric {
  readonly id: string;
  /** Resolver-passed label. */
  readonly label: ReactNode;
  /** Value to display. Pre-formatted by the caller. */
  readonly value: ReactNode;
  /** Optional secondary hint below the value. */
  readonly hint?: ReactNode;
}

export interface DetailLayoutProps {
  /** href to return to the list view. */
  backHref: string;
  /** Resolver-passed label for the back link (e.g. "Back to incidents"). */
  backLabel: ReactNode;
  /** Resolver-passed eyebrow (typically the entity-kind label). */
  eyebrow?: ReactNode;
  /** Primary heading — the entity's title. */
  title: ReactNode;
  /** Optional description / subtitle. */
  description?: ReactNode;
  /** Optional header CTA slot (right-aligned). */
  actions?: ReactNode;
  /** Optional tab nav. Render is suppressed when omitted. */
  tabs?: ReadonlyArray<DetailLayoutTab>;
  /** Optional metric row above the content. */
  metrics?: ReadonlyArray<DetailLayoutMetric>;
  /** Optional right rail slot. */
  rightRail?: ReactNode;
  /** Page body content (inside the active tab when tabs are present). */
  children: ReactNode;
  className?: string;
}

export function DetailLayout({
  backHref,
  backLabel,
  eyebrow,
  title,
  description,
  actions,
  tabs,
  metrics,
  rightRail,
  children,
  className,
}: DetailLayoutProps) {
  return (
    <div className={cn('mx-auto w-full max-w-6xl px-6 py-6', className)}>
      <a
        href={backHref}
        className="inline-flex items-center gap-1 text-sm"
        style={{ color: 'var(--uix-text-hushed)' }}
      >
        <ChevronLeft size={14} strokeWidth={1.75} aria-hidden="true" />
        {backLabel}
      </a>

      <header className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {eyebrow ? (
            <p
              className="text-xs uppercase tracking-widest"
              style={{ color: 'var(--uix-text-hushed)' }}
            >
              {eyebrow}
            </p>
          ) : null}
          <h1
            className="mt-1 text-2xl font-normal tracking-tight"
            style={{ color: 'var(--uix-text)' }}
          >
            {title}
          </h1>
          {description ? (
            // `div`, not `p`: `description` is a ReactNode and callers may
            // pass block content (e.g. <Markdown/> renders <p>/<ul>/<pre>),
            // which is invalid nested inside a <p>. Renders identically for
            // the plain-string subtitle case.
            //
            // Incident UX quick wins: a STRING description is the
            // ticket/request body — render it through the safe <Markdown/>
            // renderer (incident + service-request detail both pass their
            // `description` column here). Non-string ReactNodes (a custom
            // subtitle element) pass through untouched.
            <div className="mt-1 max-w-2xl text-sm" style={{ color: 'var(--uix-text-hushed)' }}>
              {typeof description === 'string' ? <Markdown>{description}</Markdown> : description}
            </div>
          ) : null}
        </div>
        {actions ? <div className="flex flex-shrink-0 items-center gap-2">{actions}</div> : null}
      </header>

      {tabs && tabs.length > 0 ? (
        <nav
          aria-label="Detail tabs"
          className="mt-5 flex gap-1 border-b"
          style={{ borderColor: 'var(--uix-border)' }}
        >
          {tabs.map((tab) => (
            <a
              key={tab.id}
              href={tab.disabled ? undefined : tab.href}
              aria-current={tab.active ? 'page' : undefined}
              aria-disabled={tab.disabled || undefined}
              className={cn(
                'relative -mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm transition-colors',
                tab.disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
              )}
              style={{
                borderColor: tab.active ? 'var(--uix-text)' : 'transparent',
                color: tab.active ? 'var(--uix-text)' : 'var(--uix-text-hushed)',
              }}
            >
              {tab.label}
              {tab.badge ? (
                <span
                  className="rounded-full px-1.5 py-0.5 text-[0.65rem] tabular-nums"
                  style={{
                    background: 'var(--uix-bg-hover)',
                    color: 'var(--uix-text-hushed)',
                  }}
                >
                  {tab.badge}
                </span>
              ) : null}
            </a>
          ))}
        </nav>
      ) : null}

      {metrics && metrics.length > 0 ? (
        <div
          className="mt-4 grid gap-3"
          style={{
            gridTemplateColumns: `repeat(${metrics.length}, minmax(140px, 1fr))`,
          }}
        >
          {metrics.map((m) => (
            <div
              key={m.id}
              className="rounded-md border p-3"
              style={{
                background: 'var(--uix-surface)',
                borderColor: 'var(--uix-border)',
              }}
            >
              <p
                className="text-xs uppercase tracking-wider"
                style={{ color: 'var(--uix-text-hushed)' }}
              >
                {m.label}
              </p>
              <p
                className="mt-1 text-2xl font-normal tabular-nums"
                style={{ color: 'var(--uix-text)' }}
              >
                {m.value}
              </p>
              {m.hint ? (
                <p className="text-xs" style={{ color: 'var(--uix-text-hushed)' }}>
                  {m.hint}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      <div className={cn('mt-6 grid gap-6', rightRail ? 'md:grid-cols-[1fr_320px]' : '')}>
        <div className="min-w-0">{children}</div>
        {rightRail ? <aside className="space-y-4">{rightRail}</aside> : null}
      </div>
    </div>
  );
}
