'use client';

/* @uix registry item — ported from @itsmx/shared-ui/src/cheat-sheet.tsx */

import { type ReactNode, useEffect } from 'react';
import { useIsMac } from './use-platform';

/**
 * KEY-01.4 — `?` Cheat Sheet.
 *
 * Per Docs/keyboard-interaction.md § Discoverability point 1: pressing
 * `?` opens a modal listing every shortcut active in the current scope,
 * grouped by category, with localized labels.
 *
 * The cheat sheet itself is screen-reader-labelled and keyboard-only
 * navigable: Escape closes; Tab traverses any focusable element inside.
 */

/**
 * Minimal local shapes for the host's keyboard system. The cheat sheet
 * does not own a shortcut registry — the consumer wires its own in via
 * the `shortcuts`, `isScopeActive`, and `formatChord` props.
 */
export interface KeyChord {
  readonly key: string; // canonical KeyboardEvent.key
  readonly meta?: boolean; // platform meta — Cmd on macOS, Ctrl elsewhere
  readonly shift?: boolean;
  readonly alt?: boolean;
}

export type ShortcutTrigger =
  | { readonly kind: 'chord'; readonly chord: KeyChord }
  | { readonly kind: 'sequence'; readonly chords: ReadonlyArray<KeyChord> };

export type ShortcutScope = string;

export type ShortcutCategory = string;

export interface ShortcutDescriptor {
  readonly id: string; // stable action identifier
  readonly scope: ShortcutScope;
  readonly trigger: ShortcutTrigger;
  readonly labelKey: string; // resolved to a display label via `resolveLabel`
  readonly category: ShortcutCategory;
  readonly requiresPermission: string | null;
  readonly requiresFeatureFlag: string | null;
}

export interface CheatSheetProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly resolveLabel: (labelKey: string) => string;
  readonly permissions: { has: (perm: string) => boolean };
  readonly featureFlags: { enabled: (key: string) => boolean };
  /** The currently-active non-global scope, from the host's scope resolver. */
  readonly activeScope: ShortcutScope;
  /** Every registered shortcut, from the host's keyboard registry. */
  readonly shortcuts: ReadonlyArray<ShortcutDescriptor>;
  /** Host's scope matcher: is a shortcut's `scope` active given `activeScope`? */
  readonly isScopeActive: (scope: ShortcutScope, activeScope: ShortcutScope) => boolean;
  /** Host's chord formatter (e.g. renders meta as ⌘ on macOS, Ctrl elsewhere). */
  readonly formatChord: (chord: KeyChord, isMac: boolean) => string;
  /** Display order for categories; categories absent from this list are not shown. */
  readonly categoryOrder: ReadonlyArray<ShortcutCategory>;
}

const formatTrigger = (
  s: ShortcutDescriptor,
  isMac: boolean,
  formatChord: (chord: KeyChord, isMac: boolean) => string,
): string => {
  if (s.trigger.kind === 'chord') return formatChord(s.trigger.chord, isMac);
  return s.trigger.chords.map((c) => formatChord(c, isMac)).join(' then ');
};

export function CheatSheet({
  open,
  onOpenChange,
  resolveLabel,
  permissions,
  featureFlags,
  activeScope,
  shortcuts,
  isScopeActive,
  formatChord,
  categoryOrder,
}: CheatSheetProps): ReactNode {
  const isMac = useIsMac();
  // Escape closes the sheet.
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onOpenChange(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onOpenChange]);

  if (!open) return null;

  const visible = shortcuts.filter(
    (s) =>
      isScopeActive(s.scope, activeScope) &&
      (!s.requiresPermission || permissions.has(s.requiresPermission)) &&
      (!s.requiresFeatureFlag || featureFlags.enabled(s.requiresFeatureFlag)),
  );

  const groups = new Map<ShortcutCategory, ShortcutDescriptor[]>();
  for (const s of visible) {
    const arr = groups.get(s.category) ?? [];
    arr.push(s);
    groups.set(s.category, arr);
  }

  const orderedCategories = categoryOrder.filter((c) => groups.has(c));

  return (
    // biome-ignore lint/a11y/useSemanticElements: ARIA dialog on <div> is the canonical overlay pattern (<dialog> doesn't compose with fixed-overlay layout); Escape closes via the useEffect above + the close button has aria-label.
    // biome-ignore lint/a11y/useKeyWithClickEvents: backdrop click-to-dismiss is supplementary to Escape (the keyboard close path).
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cheat-sheet-title"
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-[10vh]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false);
      }}
    >
      <div className="w-full max-w-2xl overflow-hidden rounded-lg border border-uix-line bg-uix-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-uix-line px-4 py-3">
          <h2 id="cheat-sheet-title" className="text-sm font-medium text-uix-text">
            Keyboard shortcuts
          </h2>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close cheat sheet"
            className="text-xs text-uix-hushed hover:text-uix-text"
          >
            Esc
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-4 py-3">
          {orderedCategories.length === 0 ? (
            <p className="py-6 text-center text-sm text-uix-hushed">
              No shortcuts available in the current context.
            </p>
          ) : (
            orderedCategories.map((cat) => {
              const list = groups.get(cat) ?? [];
              return (
                <section key={cat} className="mb-4 last:mb-0">
                  <h3 className="mb-2 text-[0.65rem] uppercase tracking-widest text-uix-hushed">
                    {cat}
                  </h3>
                  <ul className="space-y-1">
                    {list.map((s) => (
                      <li
                        key={s.id}
                        className="flex items-center justify-between gap-3 rounded px-2 py-1 text-sm hover:bg-uix-hover/50"
                      >
                        <span className="text-uix-text">{resolveLabel(s.labelKey)}</span>
                        <kbd className="rounded border border-uix-line bg-uix-hover px-1.5 py-0.5 text-[0.65rem] font-mono text-uix-hushed">
                          {formatTrigger(s, isMac, formatChord)}
                        </kbd>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
