/* docs.js — pure helpers (unit-tested in docs.test.js) + DOM wiring for the component explorer.
   The DOM block is guarded so this module imports cleanly under node:test (no DOM required),
   mirroring guide/app.js. Uses --uix-* tokens via docs.css; declares no tokens of its own. */

/* ----------------------------------------------------------------------------
 * Pure helpers (tested in docs.test.js)
 * --------------------------------------------------------------------------*/

/** URL-safe anchor slug: lowercased, non-alphanumerics collapsed to single hyphens, trimmed. */
export const slugify = (name) =>
  String(name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** Build the left-nav structure from a component list.
 *  Accepts strings ("Button") or objects ({ name, group? }). Returns an ordered array of
 *  { name, slug, href, group } — pure data the DOM layer renders into <a> links. */
export const componentNav = (list = []) =>
  list.map((item) => {
    const name = typeof item === 'string' ? item : item.name;
    const slug = slugify(name);
    return {
      name,
      slug,
      href: `#${slug}`,
      group: (typeof item === 'object' && item.group) || null,
    };
  });

// escape interpolated text (defense-in-depth; inputs here are first-party constants).
// Exported so the DOM layer and tests share one implementation.
export const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Render a props table as an HTML string from an array of prop descriptors:
 *  [{ name, type, default?, required?, description? }]. Returns a full <table class="uix-table">.
 *  Empty/absent list → a muted "No props documented." note. Pure (returns a string). */
export const renderPropsTable = (props = []) => {
  if (!Array.isArray(props) || props.length === 0) {
    return '<p class="uix-docs__empty">No props documented.</p>';
  }
  const head =
    '<thead><tr>' +
    '<th scope="col">Prop</th>' +
    '<th scope="col">Type</th>' +
    '<th scope="col">Default</th>' +
    '<th scope="col">Description</th>' +
    '</tr></thead>';
  const rows = props
    .map((p) => {
      const req = p.required ? ' <span class="uix-docs__req" aria-label="required">*</span>' : '';
      const def = p.default == null || p.default === '' ? '—' : `<code>${esc(p.default)}</code>`;
      const type = p.type == null || p.type === '' ? '—' : `<code>${esc(p.type)}</code>`;
      return (
        '<tr>' +
        `<td class="uix-cell-mono">${esc(p.name)}${req}</td>` +
        `<td>${type}</td>` +
        `<td>${def}</td>` +
        `<td>${esc(p.description == null ? '' : p.description)}</td>` +
        '</tr>'
      );
    })
    .join('');
  return `<table class="uix-table">${head}<tbody>${rows}</tbody></table>`;
};

/* ----------------------------------------------------------------------------
 * DOM wiring (browser only) — guarded exactly like guide/app.js
 * --------------------------------------------------------------------------*/
if (typeof document !== 'undefined') {
  const root = document.documentElement;
  const KEY = 'uix-theme';

  // The component catalog the explorer navigates. Regions per page stay EMPTY here —
  // they are keyed by data-region (overview / live-example / props-table / do-dont / a11y-notes)
  // and filled in by later slices.
  const COMPONENTS = [
    { name: 'Button', group: 'Form controls' },
    { name: 'Input', group: 'Form controls' },
    { name: 'Select', group: 'Form controls' },
    { name: 'Checkbox', group: 'Form controls' },
    { name: 'Table', group: 'Data display' },
    { name: 'Status Pill', group: 'Data display' },
    { name: 'App Shell', group: 'Navigation' },
    { name: 'Tabs', group: 'Navigation' },
    { name: 'Toast', group: 'Feedback' },
    { name: 'Modal', group: 'Feedback' },
  ];

  // ---- theme toggle (verbatim mechanism from index.html/app.js: [data-theme] + data-uix-theme-toggle) ----
  const nextTheme = (t) => (t === 'dark' ? 'light' : 'dark');
  const toggleBtn = document.querySelector('[data-uix-theme-toggle]');
  const paintToggle = () => {
    if (!toggleBtn) return;
    const dark = root.getAttribute('data-theme') === 'dark';
    toggleBtn.textContent = dark ? '☀' : '☾';
    toggleBtn.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
  };
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-uix-theme-toggle]')) {
      const next = nextTheme(root.getAttribute('data-theme') || 'light');
      root.setAttribute('data-theme', next);
      try { localStorage.setItem(KEY, next); } catch (_) { /* ignore */ }
      paintToggle();
    }
  });

  // ---- left nav: build links from the catalog ----
  const buildNav = () => {
    const host = document.querySelector('[data-uix-docs-nav]');
    if (!host) return;
    const items = componentNav(COMPONENTS);
    const groups = [];
    for (const it of items) {
      const g = it.group || 'Components';
      let bucket = groups.find((x) => x.group === g);
      if (!bucket) { bucket = { group: g, items: [] }; groups.push(bucket); }
      bucket.items.push(it);
    }
    host.innerHTML = groups
      .map(
        (bucket) =>
          `<div class="uix-docs__navgroup">${esc(bucket.group)}</div>` +
          bucket.items
            .map((it) => `<a class="uix-docs__navlink" href="${it.href}" data-slug="${esc(it.slug)}">${esc(it.name)}</a>`)
            .join('')
      )
      .join('');
  };

  // ---- title the current page from the hash (regions themselves stay empty) ----
  const paintTitle = () => {
    const items = componentNav(COMPONENTS);
    const slug = location.hash.replace(/^#/, '') || items[0]?.slug;
    const match = items.find((it) => it.slug === slug) || items[0];
    const titleEl = document.querySelector('[data-uix-docs-title]');
    if (titleEl && match) titleEl.textContent = match.name;
    document.querySelectorAll('[data-uix-docs-nav] .uix-docs__navlink').forEach((a) =>
      a.toggleAttribute('aria-current', a.dataset.slug === (match && match.slug)));
  };

  const init = () => {
    paintToggle();
    buildNav();
    paintTitle();
    window.addEventListener('hashchange', paintTitle);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
}
