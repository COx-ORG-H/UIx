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
  return () => mql.removeEventListener('change', onChange);
}

/** Non-hook read for event handlers and effects. `false` where there is no `matchMedia` (SSR, tests). */
export function prefersReducedMotion(): boolean {
  return typeof matchMedia !== 'undefined' && matchMedia(QUERY).matches;
}

/** True while the user asks for reduced motion; re-renders when the setting changes. `false` on the server. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, prefersReducedMotion, () => false);
}
