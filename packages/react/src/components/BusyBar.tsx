"use client";

import { useDelayedPending } from '../hooks/useDelayedPending.js';

/**
 * The top indeterminate bar of a `BusyRegion` or a refreshing `TableWrap` (HAR-2582). It
 * appears after 300 ms of `busy` and stays at least 500 ms; the parent dims its content
 * while the bar shows (`:has(> .uix-busy-bar[data-shown])`), so the parent itself stays a
 * server component. Decorative: the parent carries `aria-busy`.
 */
export function BusyBar({ busy }: { busy: boolean }) {
  const shown = useDelayedPending(busy);
  return <span className="uix-busy-bar" aria-hidden="true" data-shown={shown || undefined} />;
}
