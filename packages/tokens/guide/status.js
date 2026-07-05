/* status.js — maturity badges for the styleguide (A11Y-5).
 * Pure badge helpers (unit-tested in status.test.js under node:test) + a DOM block, guarded like
 * app.js, that reads a COMMITTED mirror of packages/react/component-status.json (guide/component-
 * status.js — no network fetch, keeps the build-free / no-flash invariant) and stamps a
 * Draft/Beta/Stable badge onto every [data-uix-status] demo block. Badges carry accessible TEXT,
 * not colour alone; styled from --uix-* tokens in guide.css. */

/* ----------------------------------------------------------------------------
 * Pure helpers (tested in status.test.js)
 * --------------------------------------------------------------------------*/

export const STATUS_LABELS = { draft: 'Draft', beta: 'Beta', stable: 'Stable' };

/** Badge descriptor for a status value. Unknown/absent → a neutral "Unknown" badge (never throws). */
export const badge = (status) => {
  const key = STATUS_LABELS[status] ? status : 'unknown';
  const label = STATUS_LABELS[status] || 'Unknown';
  return { status: key, label, className: `uix-badge uix-badge--${key}` };
};

/** Resolve a component id's status from a status registry object ({ <id>: { status } }). */
export const statusFor = (registry, id) => {
  const entry = registry && registry[id];
  return entry && entry.status ? entry.status : null;
};

/** Full HTML string for a badge (accessible text; title carries the same word). */
export const badgeHtml = (status) => {
  const b = badge(status);
  return `<span class="${b.className}" title="Maturity: ${b.label}">${b.label}</span>`;
};

/* ----------------------------------------------------------------------------
 * DOM wiring (browser only) — guarded like app.js
 * --------------------------------------------------------------------------*/
if (typeof document !== 'undefined') {
  const paint = (registry) => {
    for (const el of document.querySelectorAll('[data-uix-status]')) {
      if (el.querySelector(':scope > .uix-badge')) continue; // idempotent
      const id = el.getAttribute('data-uix-status');
      const status = statusFor(registry, id) || 'draft';
      el.insertAdjacentHTML('beforeend', ' ' + badgeHtml(status));
    }
  };
  const init = async () => {
    let registry = {};
    try {
      const mod = await import('./component-status.js'); // committed mirror; no network
      registry = mod.componentStatus || {};
    } catch (_) { /* mirror missing → badges default to Draft */ }
    paint(registry);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
}
