"use client";

import { useSyncExternalStore } from 'react';

/* Reduced transparency (the display preference's transparency axis). The stylesheets already follow
 * it: under <html data-transparency="reduce">, and under data-contrast="more", which implies it,
 * --uix-scrim-blur, --uix-arrive-blur and --uix-swap-blur are 0px, the progress overlay drops its
 * blur and the scrims are firmer (display-preferences.css). This is for blur or glass that
 * JavaScript draws: blurIn already asks it.
 *
 * The attributes are the whole answer. `prefers-reduced-transparency` reaches them through the
 * `system` choice (useDisplayPreferences and displayPreferencesScript resolve it); reading the media
 * query here as well would override a person who chose `standard`. Only Chromium reports that query
 * (Firefox ships it off, WebKit declines), which is why the axis is in the app at all. */
const ATTRIBUTES = ['data-transparency', 'data-contrast'];

function subscribe(onChange: () => void) {
  if (typeof MutationObserver !== 'function' || typeof document === 'undefined') return () => {};
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ATTRIBUTES });
  return () => observer.disconnect();
}

/**
 * Non-hook read for event handlers and effects: `<html data-transparency="reduce">`, or
 * `data-contrast="more"`, which implies it. `false` on the server.
 */
export function prefersReducedTransparency(): boolean {
  if (typeof document === 'undefined') return false;
  const root = document.documentElement;
  return root.getAttribute('data-transparency') === 'reduce' || root.getAttribute('data-contrast') === 'more';
}

/** True while blur and see-through layers should give way to solid ones; re-renders when that changes. `false` on the server. */
export function useReducedTransparency(): boolean {
  return useSyncExternalStore(subscribe, prefersReducedTransparency, () => false);
}
