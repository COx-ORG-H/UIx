/* uix-styleguide app.js — pure helpers (unit-tested) + DOM wiring for the showcase.
   The DOM block is guarded so this module imports cleanly under node:test. */
import { icon } from '../assets/icons.js';

/* ----------------------------------------------------------------------------
 * Pure helpers (tested in app.test.js)
 * --------------------------------------------------------------------------*/

/** Stored theme wins; otherwise fall back to the OS preference. */
export const resolveTheme = (stored, osDark) => stored ?? (osDark ? 'dark' : 'light');

/** Toggle between the two themes. */
export const nextTheme = (t) => (t === 'dark' ? 'light' : 'dark');

/** Immutably toggle membership of `id` in a Set (favorites / expanded / pinned state). */
export const toggleSet = (set, id) => {
  const s = new Set(set);
  s.has(id) ? s.delete(id) : s.add(id);
  return s;
};

/** Stable sort by key + direction; case-insensitive + numeric-aware for strings. */
export const sortRows = (rows, key, dir = 'asc') => {
  const sign = dir === 'desc' ? -1 : 1;
  return [...rows].sort((a, b) => {
    const av = a[key], bv = b[key];
    if (av === bv) return 0;
    const cmp = (typeof av === 'string' && typeof bv === 'string')
      ? av.localeCompare(bv, undefined, { numeric: true, sensitivity: 'base' })
      : (av > bv ? 1 : -1);
    return cmp * sign;
  });
};

/** Filter rows by { field: Set<allowed> }. Absent/empty set = no filter on that field. */
export const filterRows = (rows, filters = {}) =>
  rows.filter((r) => Object.entries(filters).every(([k, set]) => !set || set.size === 0 || set.has(r[k])));

/** Pinned rows (from the full set, always present) first, then the visible/filtered rest. */
export const mergePinned = (allRows, visibleRows, pinnedIds, idKey = 'id') => {
  const pinned = pinnedIds instanceof Set ? pinnedIds : new Set(pinnedIds);
  const pinnedRows = [...pinned].map((id) => allRows.find((r) => r[idKey] === id)).filter(Boolean);
  const rest = visibleRows.filter((r) => !pinned.has(r[idKey]));
  return [...pinnedRows, ...rest];
};

/** Parse a CSS color (#rgb, #rrggbb, rgb()/rgba()) to [r,g,b] (0-255). Alpha ignored. */
export const parseColor = (str) => {
  const s = String(str).trim();
  if (s.startsWith('#')) {
    let h = s.slice(1);
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h.slice(0, 6), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const m = s.match(/-?\d*\.?\d+/g);
  if (m && m.length >= 3) return [+m[0], +m[1], +m[2]];
  return [0, 0, 0];
};

const _lin = (c) => {
  c /= 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
};
const _lum = ([r, g, b]) => 0.2126 * _lin(r) + 0.7152 * _lin(g) + 0.0722 * _lin(b);

/** WCAG contrast ratio between two CSS colors (1–21). */
export const getContrast = (a, b) => {
  const L1 = _lum(parseColor(a));
  const L2 = _lum(parseColor(b));
  const hi = Math.max(L1, L2);
  const lo = Math.min(L1, L2);
  return (hi + 0.05) / (lo + 0.05);
};

/** AA verdict from a ratio: 'AA' (>=4.5), 'AA-lg' (>=3), else 'FAIL'. */
export const aaVerdict = (ratio) => (ratio >= 4.5 ? 'AA' : ratio >= 3 ? 'AA-lg' : 'FAIL');

/* ----------------------------------------------------------------------------
 * DOM wiring (browser only)
 * --------------------------------------------------------------------------*/
if (typeof document !== 'undefined') {
  const root = document.documentElement;
  const KEY = 'uix-theme';

  // a hidden probe lets us resolve var()/color-mix() to concrete rgb() values
  const probe = document.createElement('span');
  probe.setAttribute('aria-hidden', 'true');
  probe.style.cssText = 'position:absolute;left:-9999px;width:0;height:0';

  const resolveColor = (expr) => {
    probe.style.color = '';
    probe.style.color = expr;
    return getComputedStyle(probe).color; // e.g. "rgb(20, 71, 230)"
  };

  // ---- theme toggle ----
  const toggleBtn = document.querySelector('[data-uix-theme-toggle]');
  const paintToggle = () => {
    if (!toggleBtn) return;
    const dark = root.getAttribute('data-theme') === 'dark';
    toggleBtn.innerHTML = icon(dark ? 'sun' : 'moon');
    toggleBtn.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
  };

  // ---- token reference ----
  const swatch = (name) =>
    `<div class="uix-swatch">
       <span class="uix-swatch__chip" style="background:var(${name})"></span>
       <code class="uix-swatch__name">${esc(name)}</code>
       <span class="uix-swatch__val">${esc(resolveColor(`var(${name})`))}</span>
     </div>`;

  const contrastRow = (fg, bg, label) => {
    const ratio = getContrast(resolveColor(`var(${bg})`), resolveColor(`var(${fg})`));
    const v = aaVerdict(ratio);
    return `<div class="uix-contrast" data-pass="${v}">
       <span class="uix-contrast__demo" style="background:var(${bg});color:var(${fg})">Aa</span>
       <code>${esc(label)}</code>
       <span class="uix-contrast__ratio">${ratio.toFixed(2)}:1 · ${v}</span>
     </div>`;
  };

  const fill = (sel, html) => { const el = document.querySelector(sel); if (el) el.innerHTML = html; };

  // escape interpolated text (defense-in-depth; all inputs here are first-party constants)
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const buildTokenReference = () => {
    const surfaces = ['--uix-bg-app', '--uix-bg-subtle', '--uix-bg-hover', '--uix-bg-active',
      '--uix-surface', '--uix-surface-2', '--uix-surface-3', '--uix-border', '--uix-border-strong'];
    const text = ['--uix-text', '--uix-text-hushed', '--uix-text-muted'];
    const accent = ['--uix-accent', '--uix-accent-dark', '--uix-accent-light', '--uix-link', '--uix-ring', '--uix-brand-muted'];
    const status = ['--uix-success', '--uix-success-bg', '--uix-warning', '--uix-warning-bg',
      '--uix-info', '--uix-info-bg', '--uix-danger', '--uix-danger-bg'];
    const chart = ['--uix-chart-1', '--uix-chart-2', '--uix-chart-3', '--uix-chart-4',
      '--uix-chart-5', '--uix-chart-6', '--uix-chart-7', '--uix-chart-8', '--uix-chart-neutral'];

    fill('#ref-surfaces', surfaces.map(swatch).join(''));
    fill('#ref-text', text.map(swatch).join(''));
    fill('#ref-accent', accent.map(swatch).join(''));
    fill('#ref-status', status.map(swatch).join(''));
    fill('#ref-chart', chart.map(swatch).join(''));

    fill('#ref-contrast', [
      contrastRow('--uix-text', '--uix-bg-app', 'text on bg-app'),
      contrastRow('--uix-text', '--uix-surface', 'text on surface'),
      contrastRow('--uix-text-muted', '--uix-bg-app', 'text-muted on bg-app'),
      contrastRow('--uix-accent-fg', '--uix-accent', 'accent-fg on accent'),
      contrastRow('--uix-success-fg', '--uix-success', 'success-fg on success'),
      contrastRow('--uix-warning-fg', '--uix-warning', 'warning-fg on warning'),
      contrastRow('--uix-info-fg', '--uix-info', 'info-fg on info'),
      contrastRow('--uix-danger-fg', '--uix-danger', 'danger-fg on danger'),
    ].join(''));
  };

  // ---- scrollspy ----
  const setupScrollspy = () => {
    const links = [...document.querySelectorAll('[data-uix-nav] a')];
    const byId = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            links.forEach((l) => l.removeAttribute('aria-current'));
            byId.get(e.target.id)?.setAttribute('aria-current', 'true');
          }
        });
      },
      { rootMargin: '-40% 0px -55% 0px' }
    );
    document.querySelectorAll('main section[id]').forEach((s) => obs.observe(s));
  };

  // ---- global click delegation: theme toggle + copy ----
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-uix-theme-toggle]')) {
      const next = nextTheme(root.getAttribute('data-theme') || 'light');
      root.setAttribute('data-theme', next);
      localStorage.setItem(KEY, next);
      paintToggle();
      buildTokenReference();
      return;
    }
    const copyBtn = e.target.closest('[data-uix-copy]');
    if (copyBtn) {
      const tpl = copyBtn.closest('[data-uix-example]')?.querySelector('template');
      if (tpl && navigator.clipboard) {
        navigator.clipboard.writeText(tpl.innerHTML.trim());
        copyBtn.dataset.copied = '1';
        setTimeout(() => delete copyBtn.dataset.copied, 1200);
      }
    }
  });

  // ---- sidebar: favorites, collapsible groups, collapsed rail ----
  const setupSidebar = () => {
    const sidebar = document.querySelector('[data-uix-sidebar]');
    if (!sidebar) return;
    let favs = new Set();
    const favList = sidebar.querySelector('[data-uix-fav-list]');
    const renderFavs = () => {
      if (!favList) return;
      favList.innerHTML = favs.size
        ? [...favs].map((id) => {
            const src = sidebar.querySelector(`[data-uix-fav="${CSS.escape(id)}"]`)?.closest('.uix-navitem');
            const label = src?.querySelector('.uix-navitem__label')?.textContent ?? id;
            return `<div class="uix-navitem"><span class="uix-navitem__label">${esc(label)}</span></div>`;
          }).join('')
        : `<div class="uix-sidebar__eyebrow" style="text-transform:none;letter-spacing:0">No favorites yet</div>`;
    };
    sidebar.addEventListener('click', (e) => {
      const star = e.target.closest('[data-uix-fav]');
      if (star) {
        e.preventDefault();
        const id = star.getAttribute('data-uix-fav');
        favs = toggleSet(favs, id);
        star.toggleAttribute('data-on', favs.has(id));
        renderFavs();
        return;
      }
      const trig = e.target.closest('.uix-navgroup__trigger');
      if (trig) { trig.setAttribute('aria-expanded', trig.getAttribute('aria-expanded') === 'true' ? 'false' : 'true'); return; }
      if (e.target.closest('[data-uix-collapse]')) {
        sidebar.toggleAttribute('data-collapsed');
        sidebar.closest('.uix-shell')?.toggleAttribute('data-collapsed');
      }
    });
    renderFavs();
  };

  // ---- data table: sort, two-row filters, pinning, density/zebra toggles ----
  const initTable = (root) => {
    const table = root.querySelector('.uix-table');
    const tbody = root.querySelector('tbody[data-uix-rows]');
    if (!tbody) return;
    const allRows = [...tbody.querySelectorAll('tr')].map((tr) => ({ el: tr, id: tr.dataset.id, status: tr.dataset.status, type: tr.dataset.type }));
    let sortIdx = null, sortDir = 'asc';
    const filters = { status: new Set(), type: new Set() };
    let pinned = new Set();
    const cellText = (tr, i) => tr.children[i]?.textContent.trim() ?? '';

    const render = () => {
      let visible = allRows.filter((r) =>
        (!filters.status.size || filters.status.has(r.status)) &&
        (!filters.type.size || filters.type.has(r.type)));
      if (sortIdx != null) {
        const s = sortDir === 'desc' ? -1 : 1;
        visible = [...visible].sort((a, b) => cellText(a.el, sortIdx).localeCompare(cellText(b.el, sortIdx), undefined, { numeric: true, sensitivity: 'base' }) * s);
      }
      const pinnedRows = [...pinned].map((id) => allRows.find((r) => r.id === id)).filter(Boolean);
      const rest = visible.filter((r) => !pinned.has(r.id));
      tbody.replaceChildren(...[...pinnedRows, ...rest].map((r) => r.el));
      allRows.forEach((r) => r.el.removeAttribute('data-pinned'));
      pinnedRows.forEach((r) => r.el.setAttribute('data-pinned', ''));
    };

    root.querySelectorAll('th[data-sort]').forEach((th) => {
      th.addEventListener('click', () => {
        const idx = [...th.parentElement.children].indexOf(th);
        if (sortIdx === idx) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
        else { sortIdx = idx; sortDir = 'asc'; }
        root.querySelectorAll('th[data-sort]').forEach((h) => h.removeAttribute('aria-sort'));
        th.setAttribute('aria-sort', sortDir === 'asc' ? 'ascending' : 'descending');
        render();
      });
    });
    root.querySelectorAll('[data-filter]').forEach((chip) => {
      chip.addEventListener('click', () => {
        const f = chip.dataset.filter, v = chip.dataset.value;
        filters[f] = toggleSet(filters[f], v);
        chip.toggleAttribute('data-on', filters[f].has(v));
        render();
      });
    });
    tbody.addEventListener('click', (e) => {
      const pin = e.target.closest('[data-uix-pin]');
      if (!pin) return;
      const id = pin.closest('tr').dataset.id;
      pinned = toggleSet(pinned, id);
      pin.toggleAttribute('data-on', pinned.has(id));
      render();
    });
    root.querySelector('[data-uix-density]')?.addEventListener('click', () => table.classList.toggle('uix-table--compact'));
    root.querySelector('[data-uix-zebra]')?.addEventListener('click', () => table.classList.toggle('uix-table--no-zebra'));
  };
  const setupTables = () => document.querySelectorAll('[data-uix-table]').forEach(initTable);

  const init = () => {
    document.body.appendChild(probe);
    paintToggle();
    buildTokenReference();
    setupScrollspy();
    setupSidebar();
    setupTables();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
}
