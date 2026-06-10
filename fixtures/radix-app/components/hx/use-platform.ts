'use client';
/* @hx registry item — ported from @itsmx/shared-ui/src/use-platform.ts */

import { useEffect, useState } from 'react';

/**
 * Client-only macOS detection, for OS-aware keyboard-shortcut display
 * (⌘ vs Ctrl). Returns `false` during SSR AND the first client paint so
 * the server-rendered markup matches the first hydration render (no
 * hydration mismatch warning), then resolves the real platform in an
 * effect after mount.
 *
 * Consequence: a Mac user sees the non-Mac glyph ("Ctrl") for a single
 * frame before it corrects to "⌘"; every other platform is correct from
 * first paint. This is the standard SSR-safe pattern for OS-dependent
 * UI — the brief, one-frame correction is preferable to a hydration
 * mismatch or a layout-shifting placeholder.
 *
 * IMPORTANT: this hook governs DISPLAY only. The keyboard dispatcher
 * already maps the Mod modifier to Cmd-on-macOS / Ctrl-elsewhere on its
 * own (see @itsmx/shared-keyboard dispatcher.ts § defaultIsModPressed),
 * so the actual shortcut fires correctly regardless of what this returns.
 */
export const useIsMac = (): boolean => {
  const [isMac, setIsMac] = useState(false);
  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    // navigator.platform is deprecated but remains the most reliable Mac
    // signal across browsers; fall back to userAgentData / userAgent.
    const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
    const probe = nav.platform || nav.userAgentData?.platform || nav.userAgent || '';
    setIsMac(/Mac|iP(hone|od|ad)/.test(probe));
  }, []);
  return isMac;
};
