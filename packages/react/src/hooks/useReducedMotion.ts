"use client";

import { useSyncExternalStore } from 'react';

/* `prefers-reduced-motion: reduce`, live. The stylesheets already follow the preference (motion.css:
 * movement drops out of transitions, looping indicators pulse instead of turning); this hook is for
 * motion that JavaScript drives — a swipe that follows the pointer, a scripted scroll, a pan or zoom
 * glide, a chart's own animation — so it can skip the travel and land on the end state. Keep fades:
 * reduced motion removes movement, not feedback. */
const QUERY = '(prefers-reduced-motion: reduce)';

function subscribe(onChange: () => void) {
  if (typeof matchMedia === 'undefined') return () => {};
  const mql = matchMedia(QUERY);
  mql.addEventListener('change', onChange);
  // the in-app preference (HAR-1372): <html data-motion="reduce">, set by useDisplayPreferences
  const observer = typeof MutationObserver === 'function' && typeof document !== 'undefined'
    ? new MutationObserver(onChange) : null;
  observer?.observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion'] });
  return () => { mql.removeEventListener('change', onChange); observer?.disconnect(); };
}

/**
 * Non-hook read for event handlers and effects: the OS setting, or the in-app preference
 * `<html data-motion="reduce">` (HAR-1372). `false` where there is no `matchMedia` (SSR, tests).
 */
export function prefersReducedMotion(): boolean {
  if (typeof document !== 'undefined' && document.documentElement.getAttribute('data-motion') === 'reduce') return true;
  return typeof matchMedia !== 'undefined' && matchMedia(QUERY).matches;
}

/** True while the user asks for reduced motion; re-renders when the setting changes. `false` on the server. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, prefersReducedMotion, () => false);
}
