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

/** Escape, then promote `inline code` spans to <code>. Safe: esc runs first, and backticks
 *  are not among the escaped characters, so the span regex only ever sees first-party text. */
export const inlineCode = (s) =>
  esc(s).replace(/`([^`]+)`/g, '<code class="uix-code">$1</code>');

/** Map api.md props ({ name, type, optional }) into renderPropsTable's shape (required = !optional). */
export const apiToTableProps = (props = []) =>
  (Array.isArray(props) ? props : []).map((p) => ({
    name: p.name,
    type: p.type,
    required: !p.optional,
  }));

/** Render a bulleted list from string items (inline code honoured). Empty list → ''. */
export const renderList = (items = [], className = 'uix-docs__list') =>
  Array.isArray(items) && items.length
    ? `<ul class="${esc(className)}">${items.map((i) => `<li>${inlineCode(i)}</li>`).join('')}</ul>`
    : '';

/** The srcdoc for an isolated live-example frame in a forced theme. Loads the REAL main.css
 *  (relative to the explorer page) so the frame themes from the same --uix-* contract — no
 *  token values are duplicated here. `theme` scopes the :root dark selector inside the frame. */
export const frameDoc = (html, theme) =>
  '<!doctype html><html lang="en" data-theme="' + esc(theme) + '"><head><meta charset="utf-8">' +
  '<link rel="stylesheet" href="../styles/main.css">' +
  '<style>html,body{margin:0}body{padding:20px;background:var(--uix-bg-app);color:var(--uix-text);' +
  'font-family:var(--uix-font-sans,system-ui,sans-serif)}</style></head><body>' +
  String(html == null ? '' : html) + '</body></html>';

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

  // ---- data: the api-extractor-derived props index (fetched once, then cached) ----
  let componentsIndex = null; // { <slug>: component }
  const loadIndex = async () => {
    if (componentsIndex) return componentsIndex;
    componentsIndex = {};
    try {
      const res = await fetch('data/components.json', { cache: 'no-cache' });
      if (res.ok) {
        const data = await res.json();
        for (const c of data.components || []) componentsIndex[c.slug] = c;
      }
    } catch (_) { /* degrade to props-less pages */ }
    return componentsIndex;
  };
  const loadContent = async (slug) => {
    try {
      const res = await fetch(`content/${slug}.json`, { cache: 'no-cache' });
      return res.ok ? await res.json() : null;
    } catch (_) { return null; }
  };

  const fillRegion = (name, html) => {
    const el = document.querySelector(`[data-region="${name}"]`);
    if (el) el.innerHTML = html || '';
  };

  // Two isolated frames (light + dark) rendering the same example markup. srcdoc is set as a
  // property (not an attribute) so the markup needs no double-escaping; each frame auto-sizes on load.
  const renderLiveExample = (slug, html) => {
    if (!html) { fillRegion('live-example', ''); return; }
    fillRegion(
      'live-example',
      '<h2 class="uix-docs__h2">Live example</h2>' +
        '<div class="uix-docs__previews">' +
        ['light', 'dark']
          .map(
            (theme) =>
              `<figure class="uix-docs__preview"><figcaption class="uix-docs__preview-cap">${esc(theme)}</figcaption>` +
              `<iframe class="uix-docs__frame" data-theme-frame="${esc(theme)}" title="${esc(slug)} example — ${esc(theme)} theme" loading="lazy"></iframe></figure>`
          )
          .join('') +
        '</div>'
    );
    document.querySelectorAll('[data-region="live-example"] .uix-docs__frame').forEach((frame) => {
      const theme = frame.getAttribute('data-theme-frame');
      frame.addEventListener('load', () => {
        try {
          const h = frame.contentDocument.body.scrollHeight;
          if (h) frame.style.height = h + 'px';
        } catch (_) { /* cross-origin guard — never trips for srcdoc */ }
      });
      frame.srcdoc = frameDoc(html, theme);
    });
  };

  const renderPropsRegion = (comp) => {
    if (!comp) { fillRegion('props-table', ''); return; }
    const extendsNote = comp.extends
      ? `<p class="uix-docs__note">Also accepts every attribute of <code class="uix-code">${esc(comp.extends)}</code>.</p>`
      : '';
    fillRegion(
      'props-table',
      '<h2 class="uix-docs__h2">Props</h2>' + renderPropsTable(apiToTableProps(comp.props)) + extendsNote
    );
  };

  const renderDoDont = (content) => {
    if (!content || (!content.do?.length && !content.dont?.length)) { fillRegion('do-dont', ''); return; }
    fillRegion(
      'do-dont',
      '<h2 class="uix-docs__h2">Do &amp; don’t</h2><div class="uix-docs__dodont">' +
        `<div class="uix-docs__do"><h3 class="uix-docs__h3">Do</h3>${renderList(content.do)}</div>` +
        `<div class="uix-docs__dont"><h3 class="uix-docs__h3">Don’t</h3>${renderList(content.dont)}</div>` +
        '</div>'
    );
  };

  const renderOverview = (name, content) => {
    let html = '';
    if (content?.overview) html += `<p class="uix-docs__lede">${inlineCode(content.overview)}</p>`;
    if (content?.whenToUse?.length) {
      html += '<h2 class="uix-docs__h2">When to use</h2>' + renderList(content.whenToUse);
    }
    if (!html) html = `<p class="uix-docs__empty">Documentation for ${esc(name)} is coming soon.</p>`;
    fillRegion('overview', html);
  };

  const renderA11y = (content) => {
    if (!content?.a11yNotes?.length) { fillRegion('a11y-notes', ''); return; }
    fillRegion('a11y-notes', '<h2 class="uix-docs__h2">Accessibility</h2>' + renderList(content.a11yNotes));
  };

  // ---- render the current page from the hash: title + all five regions ----
  const renderPage = async () => {
    const items = componentNav(COMPONENTS);
    const slug = location.hash.replace(/^#/, '') || items[0]?.slug;
    const match = items.find((it) => it.slug === slug) || items[0];
    const name = match ? match.name : 'Component';
    const titleEl = document.querySelector('[data-uix-docs-title]');
    if (titleEl) titleEl.textContent = name;
    document.querySelectorAll('[data-uix-docs-nav] .uix-docs__navlink').forEach((a) =>
      a.toggleAttribute('aria-current', a.dataset.slug === (match && match.slug)));

    const index = await loadIndex();
    const comp = index[slug] || null;
    const content = await loadContent(slug);
    // guard against a race where the hash changed while awaiting
    if ((location.hash.replace(/^#/, '') || items[0]?.slug) !== slug) return;
    renderOverview(name, content);
    renderLiveExample(slug, content?.liveExampleHtml);
    renderPropsRegion(comp);
    renderDoDont(content);
    renderA11y(content);
    document.querySelector('.uix-docs__region[data-region="overview"]')?.scrollIntoView?.({ block: 'nearest' });
  };

  const init = () => {
    paintToggle();
    buildNav();
    renderPage();
    window.addEventListener('hashchange', renderPage);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
}
