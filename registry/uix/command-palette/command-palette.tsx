'use client';
/* @uix registry item — ported from @itsmx/shared-ui/src/command-palette.tsx */

import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useIsMac } from './use-platform';

/**
 * KEY-01.3 — Command Palette (Cmd/Ctrl+K).
 *
 * The most important keyboard feature per Docs/keyboard-interaction.md
 * § Layer 1. Three intents in one combobox:
 *   - Actions: every shortcut the user has permission for, by label
 *   - Navigation: jump to module/screen
 *   - Entity-jump: type a natural ID (INC-12345, SRV-00123, CHG-00789)
 *
 * Action/Navigation entries come from the host-supplied `shortcuts`
 * prop; entity-jump entries come from `entityResolvers` injected by
 * the host so the UI package stays DB-free.
 *
 * Labels are resolved per shortcut via `resolveLabel(labelKey)`; the
 * host wires this to useTranslations (CUS-03). Defaults to the
 * `labelKey` itself so the palette renders SOMETHING even if a
 * caller forgets to wire the resolver — better visible-but-ugly than
 * silently empty.
 *
 * Filtering:
 *   - Permissions + feature flags are evaluated at render time; the
 *     palette never shows an action the user can't perform.
 *   - Fuzzy search is a simple lowercase-substring + token-prefix
 *     match. Not Levenshtein — too aggressive surfaces wrong actions.
 */

/**
 * Minimal keyboard shapes consumed by the palette. The host supplies
 * shortcut descriptors and a chord formatter via props; the palette
 * has no dependency on any particular keyboard/shortcut system.
 */
export interface KeyChord {
  readonly key: string; // canonical KeyboardEvent.key; letters lowercased
  readonly meta?: boolean; // platform meta — Cmd on macOS, Ctrl elsewhere
  readonly shift?: boolean;
  readonly alt?: boolean;
}

export type ShortcutTrigger =
  | { readonly kind: 'chord'; readonly chord: KeyChord }
  | { readonly kind: 'sequence'; readonly chords: ReadonlyArray<KeyChord> };

export interface ShortcutDescriptor {
  readonly id: string; // stable action identifier, e.g. 'incident.assign'
  readonly trigger: ShortcutTrigger;
  readonly labelKey: string;
  readonly requiresPermission: string | null;
  readonly requiresFeatureFlag: string | null;
}

export interface EntityJumpHit {
  readonly id: string; // stable target identifier, e.g. an audit-safe key
  readonly label: string;
  readonly subtitle?: string;
  readonly href: string;
}

export interface EntityJumpResolver {
  /**
   * Pattern that triggers this resolver (e.g. /^INC-\d+$/i). Matches
   * against the trimmed search query.
   */
  readonly pattern: RegExp;
  /**
   * Resolve hits for the matched query. Async so callers can hit a
   * remote API; the palette debounces invocations.
   */
  readonly resolve: (query: string) => Promise<ReadonlyArray<EntityJumpHit>>;
}

export interface NavigationEntry {
  readonly id: string; // e.g. 'nav.incidents'
  readonly labelKey: string;
  readonly href: string;
  readonly category?: 'navigation';
}

export interface CommandPaletteProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  /** Resolves a labelKey to its display string. Fall through to the key when missing. */
  readonly resolveLabel: (labelKey: string) => string;
  /** Caller's permission checker — same shape the dispatcher uses. */
  readonly permissions: { has: (perm: string) => boolean };
  /** Caller's feature-flag checker. */
  readonly featureFlags: { enabled: (key: string) => boolean };
  /** Shortcut descriptors to list as actions — supplied by the host's keyboard system. */
  readonly shortcuts: ReadonlyArray<ShortcutDescriptor>;
  /** Formats a key chord for display (e.g. "⌘K" on macOS, "Ctrl+K" elsewhere) — supplied by the host's keyboard system. */
  readonly formatChordForDisplay: (chord: KeyChord, isMac: boolean) => string;
  /** Static navigation entries (not bound to a key, but always listed). */
  readonly navigation: ReadonlyArray<NavigationEntry>;
  /** Optional entity-jump resolvers (e.g. INC-, CHG-, SRV-). */
  readonly entityResolvers?: ReadonlyArray<EntityJumpResolver>;
  /**
   * Invoked when the user selects an action shortcut. The host wires this
   * to the same handler the on-screen button calls (Hard Rule 19).
   */
  readonly onAction: (actionId: string) => void;
  /**
   * Invoked when the user selects a navigation entry or an entity jump.
   * The host wires this to its router (Next.js link push).
   */
  readonly onNavigate: (href: string) => void;
}

interface PaletteItem {
  readonly key: string; // stable React key
  readonly kind: 'action' | 'navigation' | 'entity';
  readonly label: string;
  readonly subtitle?: string;
  readonly hint?: string; // keyboard shortcut hint
  readonly invoke: () => void;
}

const matchesQuery = (query: string, label: string): boolean => {
  if (!query) return true;
  const ql = query.toLowerCase();
  const ll = label.toLowerCase();
  if (ll.includes(ql)) return true;
  // Token-prefix: tokens in label starting with each query token (cheap)
  const qTokens = ql.split(/\s+/).filter(Boolean);
  const lTokens = ll.split(/\s+/).filter(Boolean);
  return qTokens.every((qt) => lTokens.some((lt) => lt.startsWith(qt)));
};

const formatHint = (
  desc: ShortcutDescriptor,
  isMac: boolean,
  formatChordForDisplay: (chord: KeyChord, isMac: boolean) => string,
): string => {
  if (desc.trigger.kind === 'chord') return formatChordForDisplay(desc.trigger.chord, isMac);
  return desc.trigger.chords.map((c) => formatChordForDisplay(c, isMac)).join(' then ');
};

export function CommandPalette({
  open,
  onOpenChange,
  resolveLabel,
  permissions,
  featureFlags,
  shortcuts,
  formatChordForDisplay,
  navigation,
  entityResolvers,
  onAction,
  onNavigate,
}: CommandPaletteProps): ReactNode {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [entityHits, setEntityHits] = useState<ReadonlyArray<EntityJumpHit>>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const isMac = useIsMac();

  // Stable empty-array default — destructure default `= []` creates a
  // fresh reference every render and would infinite-loop the resolver
  // useEffect below via setEntityHits([]) feedback.
  const resolvers = useMemo(() => entityResolvers ?? [], [entityResolvers]);

  // Reset state every time the palette opens — Cmd+K should feel fresh,
  // not pre-loaded with the last query.
  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActiveIndex(0);
    setEntityHits([]);
    // Microtask: focus after the dialog is in the DOM.
    queueMicrotask(() => inputRef.current?.focus());
  }, [open]);

  // Entity-jump resolution. Debounced to avoid hammering the resolver on
  // every keypress. Cancellation via a closure flag so a slow earlier
  // result can't clobber a fresh fast one. Guarded against the empty-
  // hits no-op feedback loop.
  useEffect(() => {
    if (!open) return;
    const trimmed = query.trim();
    const matched = resolvers.filter((r) => r.pattern.test(trimmed));
    if (matched.length === 0) {
      // Only update state if it actually changed — avoids re-render churn.
      setEntityHits((prev) => (prev.length === 0 ? prev : []));
      return;
    }
    let cancelled = false;
    const handle = setTimeout(async () => {
      const results = await Promise.all(matched.map((r) => r.resolve(trimmed)));
      if (cancelled) return;
      setEntityHits(results.flat());
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [open, query, resolvers]);

  // Compose the filtered item list. Re-computed each render — the
  // shortcut list is in-memory and cheap to walk.
  const items = useMemo<ReadonlyArray<PaletteItem>>(() => {
    const actionItems: PaletteItem[] = shortcuts
      .filter(
        (s) =>
          (!s.requiresPermission || permissions.has(s.requiresPermission)) &&
          (!s.requiresFeatureFlag || featureFlags.enabled(s.requiresFeatureFlag)),
      )
      .map((s) => {
        const label = resolveLabel(s.labelKey);
        return {
          key: `action:${s.id}`,
          kind: 'action' as const,
          label,
          hint: formatHint(s, isMac, formatChordForDisplay),
          invoke: () => {
            onAction(s.id);
            onOpenChange(false);
          },
        };
      })
      .filter((it) => matchesQuery(query, it.label));

    const navItems: PaletteItem[] = navigation
      .map((n) => ({
        key: `nav:${n.id}`,
        kind: 'navigation' as const,
        label: resolveLabel(n.labelKey),
        invoke: () => {
          onNavigate(n.href);
          onOpenChange(false);
        },
      }))
      .filter((it) => matchesQuery(query, it.label));

    const entityItems: PaletteItem[] = entityHits.map((h) => ({
      key: `entity:${h.id}`,
      kind: 'entity' as const,
      label: h.label,
      // Conditional spread because exactOptionalPropertyTypes is on —
      // `subtitle: string | undefined` doesn't satisfy `subtitle?: string`.
      ...(h.subtitle ? { subtitle: h.subtitle } : {}),
      invoke: () => {
        onNavigate(h.href);
        onOpenChange(false);
      },
    }));

    return [...entityItems, ...actionItems, ...navItems];
  }, [
    query,
    entityHits,
    shortcuts,
    navigation,
    permissions,
    featureFlags,
    resolveLabel,
    formatChordForDisplay,
    onAction,
    onNavigate,
    onOpenChange,
    isMac,
  ]);

  // Keep activeIndex inside bounds when items change under us.
  useEffect(() => {
    if (activeIndex >= items.length) setActiveIndex(Math.max(0, items.length - 1));
  }, [items.length, activeIndex]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => Math.min(items.length - 1, i + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => Math.max(0, i - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        items[activeIndex]?.invoke();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onOpenChange(false);
      }
    },
    [items, activeIndex, onOpenChange],
  );

  if (!open) return null;

  return (
    // biome-ignore lint/a11y/useSemanticElements: ARIA dialog on <div> is the canonical overlay pattern (<dialog> doesn't compose with fixed-overlay layout); Escape closes via the combobox onKeyDown.
    // biome-ignore lint/a11y/useKeyWithClickEvents: backdrop click-to-dismiss is supplementary to Escape (the keyboard close path).
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 p-4 pt-[10vh]"
      onClick={(e) => {
        // Click outside the inner panel dismisses.
        if (e.target === e.currentTarget) onOpenChange(false);
      }}
    >
      <div className="w-full max-w-xl overflow-hidden rounded-lg border border-[var(--border)] bg-[rgb(var(--surface))] shadow-2xl">
        <div className="border-b border-[var(--border)] px-3 py-2">
          <input
            ref={inputRef}
            role="combobox"
            aria-expanded="true"
            aria-controls="command-palette-listbox"
            aria-activedescendant={items[activeIndex] ? `cp-item-${activeIndex}` : undefined}
            type="text"
            placeholder="Search actions, pages, INC-…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={onKeyDown}
            className="w-full bg-transparent text-sm text-[rgb(var(--text-primary))] placeholder:text-[rgb(var(--text-muted))] focus:outline-none"
          />
        </div>
        {/* biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: WAI-ARIA combobox-with-listbox pattern uses <ul role=listbox> by spec; focus stays on the combobox input and aria-activedescendant points at the current option. */}
        {/* biome-ignore lint/a11y/useSemanticElements: <select> doesn't render custom rich rows (icons + hints). */}
        {/* biome-ignore lint/a11y/useFocusableInteractive: per the combobox pattern, the listbox itself is not focusable — focus stays on the input. */}
        <ul id="command-palette-listbox" role="listbox" className="max-h-80 overflow-y-auto py-1">
          {items.length === 0 ? (
            <li className="px-3 py-4 text-center text-xs text-[rgb(var(--text-primary)/0.6)]">
              No matches
            </li>
          ) : (
            items.map((it, i) => (
              // biome-ignore lint/a11y/useKeyWithClickEvents: keyboard activation routes through the combobox onKeyDown → Enter handler; click is the mouse-only path.
              // biome-ignore lint/a11y/useFocusableInteractive: option focus is virtual via aria-activedescendant per ARIA combobox spec; making it tabbable would break that contract.
              <li
                key={it.key}
                id={`cp-item-${i}`}
                // biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: WAI-ARIA listbox option pattern uses <li role=option>; focus stays on the combobox input via aria-activedescendant.
                // biome-ignore lint/a11y/useSemanticElements: <option> only works inside <select> which can't render rich rows.
                role="option"
                aria-selected={i === activeIndex}
                className={[
                  'flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-sm',
                  i === activeIndex
                    ? 'bg-[rgb(var(--bg-hover))] text-[rgb(var(--text-primary))]'
                    : 'text-[rgb(var(--text-primary)/0.6)] hover:bg-[rgb(var(--bg-hover))]/60',
                ].join(' ')}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => it.invoke()}
              >
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-[rgb(var(--text-primary))]">{it.label}</span>
                  {it.subtitle ? (
                    <span className="truncate text-xs text-[rgb(var(--text-primary)/0.6)]">
                      {it.subtitle}
                    </span>
                  ) : null}
                </span>
                {it.hint ? (
                  <kbd className="shrink-0 rounded border border-[var(--border)] bg-[rgb(var(--bg-hover))] px-1.5 py-0.5 text-[0.65rem] font-mono text-[rgb(var(--text-primary)/0.6)]">
                    {it.hint}
                  </kbd>
                ) : (
                  <span className="shrink-0 text-[0.6rem] uppercase tracking-wider text-[rgb(var(--text-primary)/0.6)]">
                    {it.kind}
                  </span>
                )}
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
