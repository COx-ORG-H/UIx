/* uix-styleguide app.js — pure helpers (unit-tested) + DOM wiring for the showcase.
   The DOM block is guarded so this module imports cleanly under node:test. */
import { icon, iconNames } from '../assets/icons.js';
import { initCharts, refreshCharts } from './charts.js';

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

/** Clamp a peek index when stepping by `d` across `n` records (no wrap). */
export const peekStep = (i, d, n) => Math.min(n - 1, Math.max(0, i + d));

/* ── engine-aligned table helpers ──────────────────────────────────────────────
 * Ports of @tensor_1/react's table-engine (multiSort / toggleSort / searchRows /
 * highlightSegments / selection / clampWidth) so the vanilla styleguide sorts,
 * searches, and selects identically to the React layer. Directions use the
 * vanilla 'asc'/'desc' convention; the DOM maps them to aria-sort names. */

/** Stable multi-column sort. `keys` = [{field, dir}], first is primary; numeric-aware,
 *  case-insensitive, nulls first. `getField(row, field)` reads the sort value (so the
 *  same fn drives object rows and live <tr>s). New array; input is not mutated. */
export const multiSort = (rows, keys, getField = (r, f) => r[f]) => {
  if (!keys.length) return rows.slice();
  const cmp = (a, b) => {
    if (a == null && b == null) return 0;
    if (a == null) return -1;
    if (b == null) return 1;
    if (typeof a === 'number' && typeof b === 'number') return a - b;
    return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
  };
  return rows
    .map((row, i) => ({ row, i }))
    .sort((x, y) => {
      for (const k of keys) {
        const c = cmp(getField(x.row, k.field), getField(y.row, k.field));
        if (c) return k.dir === 'desc' ? -c : c;
      }
      return x.i - y.i; // stable
    })
    .map((w) => w.row);
};

/** Toggle a field in a multi-sort key list. Non-additive replaces the list with this
 *  field (cycling asc → desc → off); additive adds/updates it as a secondary key,
 *  dropping it when it cycles off. Mirrors the engine's toggleSort. */
export const toggleSortKeys = (keys, field, additive = false) => {
  const cur = keys.find((k) => k.field === field)?.dir;
  const next = cur === 'asc' ? 'desc' : cur === 'desc' ? 'off' : 'asc';
  if (!additive) return next === 'off' ? [] : [{ field, dir: next }];
  const rest = keys.filter((k) => k.field !== field);
  return next === 'off' ? rest : [...rest, { field, dir: next }];
};

/** Rows where any of `fields` (default: every value) contains `query` (case-insensitive). */
export const searchRows = (rows, query, fields = null) => {
  const q = String(query).trim().toLowerCase();
  if (!q) return rows.slice();
  return rows.filter((r) =>
    (fields ? fields.map((f) => r[f]) : Object.values(r)).some((v) => v != null && String(v).toLowerCase().includes(q)));
};

/** Split `text` into { text, match } segments for <mark> rendering (case-insensitive). */
export const highlightSegments = (text, query) => {
  const q = String(query).trim();
  if (!q) return [{ text, match: false }];
  const out = [];
  const lower = text.toLowerCase();
  const ql = q.toLowerCase();
  let i = 0;
  for (;;) {
    const hit = lower.indexOf(ql, i);
    if (hit === -1) { if (i < text.length) out.push({ text: text.slice(i), match: false }); break; }
    if (hit > i) out.push({ text: text.slice(i, hit), match: false });
    out.push({ text: text.slice(hit, hit + q.length), match: true });
    i = hit + q.length;
  }
  return out;
};

/** Header select-all tri-state ('none' | 'some' | 'all') against the page's ids. */
export const selectAllState = (selected, pageIds) => {
  const on = pageIds.filter((id) => selected.has(id)).length;
  return on === 0 ? 'none' : on === pageIds.length ? 'all' : 'some';
};

/** Toggle every id on the current page on/off from the header checkbox. New Set. */
export const togglePage = (selected, pageIds) => {
  const next = new Set(selected);
  const all = pageIds.every((id) => next.has(id));
  for (const id of pageIds) all ? next.delete(id) : next.add(id);
  return next;
};

/** Clamp a dragged column width to a sane min (and optional max), rounded. */
export const clampWidth = (width, min = 64, max = Infinity) => Math.max(min, Math.min(max, Math.round(width)));

/** Density tiers, in cycle order (standard is the default). */
export const DENSITIES = ['compact', 'standard', 'comfortable'];

/** Default per-table view preferences. */
export const defaultViewPrefs = () => ({ density: 'standard', zebra: true, freeze: true, hiddenCols: [] });

/** Parse + normalize stored view prefs. `legacyColsRaw` migrates the old `uix-cols-<id>` array
 *  (bare number[] of hidden column indices) when no new prefs exist yet. */
export const readViewPrefs = (raw, legacyColsRaw) => {
  const d = defaultViewPrefs();
  let p = {};
  try { p = raw ? JSON.parse(raw) : {}; } catch { p = {}; }
  if (!raw && legacyColsRaw) {
    try { const cols = JSON.parse(legacyColsRaw); if (Array.isArray(cols)) p.hiddenCols = cols; } catch { /* ignore */ }
  }
  return {
    density: DENSITIES.includes(p.density) ? p.density : d.density,
    zebra: typeof p.zebra === 'boolean' ? p.zebra : d.zebra,
    freeze: typeof p.freeze === 'boolean' ? p.freeze : d.freeze,
    hiddenCols: Array.isArray(p.hiddenCols) ? p.hiddenCols.filter(Number.isInteger) : d.hiddenCols,
  };
};

/** Serialize view prefs for localStorage. */
export const writeViewPrefs = (prefs) => JSON.stringify(prefs);

/** Toggle the current user's reaction to `emoji`. State = [{emoji, count, mine}]. Immutable;
 *  reactions whose count falls to 0 are dropped. */
export const toggleReaction = (reactions, emoji) => {
  const list = reactions.map((r) => ({ ...r }));
  const found = list.find((r) => r.emoji === emoji);
  if (found) {
    found.count += found.mine ? -1 : 1;
    found.mine = !found.mine;
    return list.filter((r) => r.count > 0);
  }
  return [...list, { emoji, count: 1, mine: true }];
};

/** Append a toast and cap the queue at `max` (oldest dropped). */
export const enqueueToast = (list, toast, max = 3) => [...list, toast].slice(-max);
/** Remove a toast by id. */
export const dequeueToast = (list, id) => list.filter((t) => t.id !== id);

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
      refreshCharts();
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
    const iconCell = e.target.closest('[data-icon-copy]');
    if (iconCell && navigator.clipboard) {
      navigator.clipboard.writeText(iconCell.dataset.iconCopy);
      iconCell.dataset.copied = '1';
      setTimeout(() => delete iconCell.dataset.copied, 1200);
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
            const icon = src?.querySelector('.uix-navitem__icon')?.outerHTML ?? '';
            return `<div class="uix-navitem">${icon}<span class="uix-navitem__label">${esc(label)}</span></div>`;
          }).join('')
        : `<div class="uix-sidebar__eyebrow" style="text-transform:none;letter-spacing:0">No favorites yet</div>`;
      if (sidebar.hasAttribute('data-collapsed')) setRailTitles(true);
    };
    // icon-only rail needs hover tooltips + keeps an accessible hint
    const setRailTitles = (on) => {
      sidebar.querySelectorAll('.uix-navitem').forEach((it) => {
        const label = it.querySelector('.uix-navitem__label')?.textContent?.trim();
        if (on && label) it.setAttribute('title', label);
        else it.removeAttribute('title');
      });
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
      const toggle = e.target.closest('[data-uix-collapse]');
      if (toggle) {
        const collapsed = sidebar.toggleAttribute('data-collapsed');
        sidebar.closest('.uix-shell')?.toggleAttribute('data-collapsed', collapsed);
        toggle.setAttribute('aria-label', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
        toggle.setAttribute('aria-expanded', String(!collapsed));
        setRailTitles(collapsed);
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
    let sortKeys = [];   // [{ field: colIndex, dir: 'asc'|'desc' }] — multi-sort; ⇧+click adds a secondary key
    let query = '';
    const filters = { status: new Set(), type: new Set() };
    let pinned = new Set();
    const cellText = (tr, i) => tr.children[i]?.textContent.trim() ?? '';
    const headers = [...table.querySelectorAll('thead th')];
    // primary (flex) column: where search matches get highlighted (plain-text subject). Cache the
    // original text per row so the highlight can be rebuilt/cleared without losing the source string.
    const primaryIdx = headers.findIndex((h) => h.classList.contains('uix-col--flex'));
    allRows.forEach((r) => {
      r.primaryCell = primaryIdx >= 0 ? r.el.children[primaryIdx] : null;
      r.primaryText = r.primaryCell ? r.primaryCell.textContent : '';
    });

    const applyHighlight = () => {
      if (primaryIdx < 0) return;
      allRows.forEach((r) => {
        if (!r.primaryCell) return;
        r.primaryCell.innerHTML = query.trim()
          ? highlightSegments(r.primaryText, query).map((seg) =>
              seg.match ? `<mark class="uix-mark">${esc(seg.text)}</mark>` : esc(seg.text)).join('')
          : esc(r.primaryText);
      });
    };

    const render = () => {
      // filter chips + free-text search (searchRows semantics over the row's rendered text)
      const q = query.trim().toLowerCase();
      let visible = allRows.filter((r) =>
        (!filters.status.size || filters.status.has(r.status)) &&
        (!filters.type.size || filters.type.has(r.type)) &&
        (!q || r.el.textContent.toLowerCase().includes(q)));
      // stable multi-column sort, reading each key's cell text at its column index
      if (sortKeys.length) visible = multiSort(visible, sortKeys, (r, idx) => cellText(r.el, idx));
      const pinnedRows = [...pinned].map((id) => allRows.find((r) => r.id === id)).filter(Boolean);
      const rest = visible.filter((r) => !pinned.has(r.id));
      tbody.replaceChildren(...[...pinnedRows, ...rest].map((r) => r.el));
      allRows.forEach((r) => r.el.removeAttribute('data-pinned'));
      pinnedRows.forEach((r) => r.el.setAttribute('data-pinned', ''));
      applyHighlight();
    };

    // paint aria-sort + the multi-sort ordinal badge (.uix-table th[data-sort-order]) from the keys
    const paintSort = () => {
      root.querySelectorAll('th[data-sort]').forEach((h) => {
        const idx = [...h.parentElement.children].indexOf(h);
        const pos = sortKeys.findIndex((k) => k.field === idx);
        if (pos < 0) { h.removeAttribute('aria-sort'); h.removeAttribute('data-sort-order'); return; }
        h.setAttribute('aria-sort', sortKeys[pos].dir === 'desc' ? 'descending' : 'ascending');
        if (sortKeys.length > 1) h.setAttribute('data-sort-order', String(pos + 1)); // ordinal only for a real multi-sort
        else h.removeAttribute('data-sort-order');
      });
    };
    root.querySelectorAll('th[data-sort]').forEach((th) => {
      th.tabIndex = 0;                       // keyboard-reachable
      th.setAttribute('role', 'button');
      const doSort = (additive) => {
        const idx = [...th.parentElement.children].indexOf(th);
        sortKeys = toggleSortKeys(sortKeys, idx, additive); // ⇧ adds/keeps this as a secondary key
        paintSort();
        render();
      };
      th.addEventListener('click', (e) => doSort(e.shiftKey));
      th.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); doSort(e.shiftKey); } });
    });

    // free-text search box (filters rows + highlights matches in the primary cell)
    const searchInput = root.querySelector('input[type="search"]');
    searchInput?.addEventListener('input', () => { query = searchInput.value; render(); });

    // column resize: drag a header's right edge. table-layout:fixed honours the explicit width;
    // clampWidth keeps it sane. Skip the frozen identifier column (index 0).
    if (table.classList.contains('uix-table--fixed')) {
      headers.forEach((th, idx) => {
        if (idx === 0) return;
        const grip = document.createElement('span');
        grip.className = 'uix-table__resize';
        grip.setAttribute('aria-hidden', 'true');
        th.appendChild(grip);            // header is already position:sticky, so the grip anchors to it
        grip.addEventListener('click', (e) => e.stopPropagation()); // a drag near the edge must not sort
        grip.addEventListener('pointerdown', (e) => {
          e.preventDefault(); e.stopPropagation();
          const startX = e.clientX, startW = th.getBoundingClientRect().width;
          grip.setAttribute('data-drag', '');
          grip.setPointerCapture(e.pointerId);
          const onMove = (ev) => { th.style.width = clampWidth(startW + (ev.clientX - startX)) + 'px'; };
          const onUp = () => { grip.removeAttribute('data-drag'); grip.removeEventListener('pointermove', onMove); grip.removeEventListener('pointerup', onUp); };
          grip.addEventListener('pointermove', onMove);
          grip.addEventListener('pointerup', onUp);
        });
      });
    }
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
    // ---- consolidated View menu: density / zebra / freeze / columns, persisted per table id ----
    const key = 'uix-view-' + (root.id || 'tbl');
    const prefs = readViewPrefs(localStorage.getItem(key), localStorage.getItem('uix-cols-' + (root.id || 'tbl')));
    const save = () => localStorage.setItem(key, writeViewPrefs(prefs));

    const viewBtn = root.querySelector('[popovertarget="viewmenu"]');
    if (viewBtn) viewBtn.innerHTML = icon('sliders-horizontal', 'sm') + ' View ▾';
    const viewPop = root.querySelector('[data-uix-viewmenu]');
    if (viewBtn && viewPop) {
      viewPop.addEventListener('beforetoggle', (e) => {
        if (e.newState !== 'open') return;
        const r = viewBtn.getBoundingClientRect();
        viewPop.style.top = (r.bottom + 6) + 'px';
        viewPop.style.right = (window.innerWidth - r.right) + 'px';
        viewPop.style.left = 'auto';
        viewPop.style.bottom = 'auto';
      });
      viewPop.addEventListener('toggle', (e) => {
        if (e.newState !== 'open') return;
        document.addEventListener('scroll', () => viewPop.hidePopover(), { once: true, passive: true, capture: true });
      });
    }

    // density (segmented)
    const applyDensity = () => {
      if (prefs.density === 'standard') table.removeAttribute('data-density');
      else table.setAttribute('data-density', prefs.density);
      root.querySelectorAll('[data-uix-density] [data-density]').forEach((b) =>
        b.setAttribute('aria-pressed', String(b.dataset.density === prefs.density)));
    };
    root.querySelector('[data-uix-density]')?.addEventListener('click', (e) => {
      const b = e.target.closest('[data-density]'); if (!b) return;
      prefs.density = b.dataset.density; applyDensity(); save();
    });

    // zebra + freeze (switches)
    const zebraEl = root.querySelector('[data-uix-zebra]');
    const freezeEl = root.querySelector('[data-uix-freeze]');
    const applyZebra = () => { table.classList.toggle('uix-table--no-zebra', !prefs.zebra); if (zebraEl) zebraEl.checked = prefs.zebra; };
    const applyFreeze = () => { table.classList.toggle('uix-table--pinned-col', prefs.freeze); if (freezeEl) freezeEl.checked = prefs.freeze; };
    zebraEl?.addEventListener('change', () => { prefs.zebra = zebraEl.checked; applyZebra(); save(); });
    freezeEl?.addEventListener('change', () => { prefs.freeze = freezeEl.checked; applyFreeze(); save(); });

    // columns (checklist inside the menu) — reuses the `headers` list captured above
    const colMenu = root.querySelector('[data-uix-colmenu]');
    if (colMenu) {
      const hidden = new Set(prefs.hiddenCols);
      const applyCols = () => headers.forEach((th, i) => {
        const off = hidden.has(i);
        table.querySelectorAll(`tr > *:nth-child(${i + 1})`).forEach((c) => { c.hidden = off; });
      });
      // first column (frozen id) + empty headers (pin) are not toggleable
      colMenu.innerHTML = headers.map((th, i) => (i > 0 && th.textContent.trim())
        ? `<label class="uix-menu__item"><input type="checkbox" data-col="${i}" ${hidden.has(i) ? '' : 'checked'}> ${esc(th.textContent.trim())}</label>`
        : '').join('');
      colMenu.addEventListener('change', (e) => {
        const cb = e.target.closest('[data-col]'); if (!cb) return;
        const i = +cb.dataset.col;
        cb.checked ? hidden.delete(i) : hidden.add(i);
        prefs.hiddenCols = [...hidden]; save(); applyCols();
      });
      applyCols();
    }

    applyDensity(); applyZebra(); applyFreeze();
  };
  const setupTables = () => document.querySelectorAll('[data-uix-table], [data-uix-table-v2]').forEach(initTable);

  // Open a native <dialog> as a modal. Flushing layout + style first establishes the closed-state
  // baseline so the @starting-style entrance transition reliably fires on the FIRST open after load
  // (Chromium otherwise batches the display:none→shown change and skips the entrance — the panel
  // appears parked off-screen / at opacity:0 until a second open).
  const openModal = (dlg) => {
    if (!dlg?.showModal) return;
    void dlg.offsetWidth;
    void getComputedStyle(dlg).transform;
    dlg.showModal();
  };

  // ---- overlays: open/close (native <dialog>), backdrop click, Esc is native ----
  const setupOverlays = () => {
    document.querySelectorAll('[data-uix-open]').forEach((btn) =>
      btn.addEventListener('click', () => openModal(document.querySelector(btn.getAttribute('data-uix-open')))));
    document.addEventListener('click', (e) => {
      const close = e.target.closest('[data-uix-close]');
      if (close) { close.closest('dialog')?.close(); return; }
      if (e.target.tagName === 'DIALOG') e.target.close();   // click on the backdrop
    });
  };

  // ---- side-peek drawer: ↑/↓ navigate records, title link "navigates" (no-op here) ----
  const setupPeek = () => {
    const peek = document.querySelector('[data-uix-peek-dialog]');
    if (!peek) return;
    const records = [...document.querySelectorAll('[data-uix-table] tbody tr')].map((tr) => ({
      id: tr.dataset.id, subject: tr.children[1]?.textContent.trim() ?? '',
    }));
    let i = 0;
    const titleEl = peek.querySelector('[data-peek-title]');
    const subEl = peek.querySelector('[data-peek-sub]');
    const show = () => { const r = records[i]; if (!r) return; if (titleEl) titleEl.textContent = r.id; if (subEl) subEl.textContent = r.subject; };
    const openAt = (idx) => { i = Math.max(0, idx); show(); openModal(peek); };
    document.querySelectorAll('[data-uix-open-peek]').forEach((btn) =>
      btn.addEventListener('click', () => openAt(0)));
    // Clicking a ticket row opens the peek at that record — the queue's primary affordance.
    // Delegated per table; ignore clicks on in-row controls (pin button, links, inputs) and match
    // the row to its record by data-id so it survives sort/filter/pin re-ordering.
    document.querySelectorAll('[data-uix-table]').forEach((tableRoot) => {
      const body = tableRoot.querySelector('tbody');
      if (!body) return;
      tableRoot.setAttribute('data-uix-rowpeek', '');
      body.addEventListener('click', (e) => {
        if (e.target.closest('button, a, input, label, select, textarea')) return;
        const tr = e.target.closest('tr[data-id]'); if (!tr) return;
        const idx = records.findIndex((r) => r.id === tr.dataset.id);
        if (idx >= 0) openAt(idx);
      });
    });
    peek.querySelector('[data-peek-prev]')?.addEventListener('click', () => { i = peekStep(i, -1, records.length); show(); });
    peek.querySelector('[data-peek-next]')?.addEventListener('click', () => { i = peekStep(i, +1, records.length); show(); });
    peek.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); i = peekStep(i, +1, records.length); show(); }
      if (e.key === 'ArrowUp') { e.preventDefault(); i = peekStep(i, -1, records.length); show(); }
    });
  };

  // ---- ⌘K command palette ----
  const setupCmdk = () => {
    const dlg = document.querySelector('[data-uix-cmdk-dialog]');
    if (!dlg) return;
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openModal(dlg); }
    });
  };

  // ---- toasts ----
  const setupToasts = () => {
    const ICONS = { success: icon('check'), danger: icon('x'), info: icon('search') };
    const ensureToaster = () => {
      let t = document.querySelector('.uix-toaster');
      if (!t) { t = document.createElement('div'); t.className = 'uix-toaster'; document.body.appendChild(t); }
      return t;
    };
    const push = ({ title = 'Saved', msg = '', tone = 'success' }) => {
      const t = ensureToaster();
      const el = document.createElement('div');
      el.className = `uix-toast uix-toast--${tone}`;
      el.innerHTML = `<span class="uix-toast__icon">${ICONS[tone] || ''}</span><div class="uix-toast__body"><div class="uix-toast__title">${esc(title)}</div>${msg ? `<div class="uix-toast__msg">${esc(msg)}</div>` : ''}</div><button class="uix-toast__close" aria-label="Dismiss">✕</button>`;
      t.appendChild(el);
      while (t.children.length > 3) t.firstElementChild.remove();
      const leave = () => { el.setAttribute('data-leaving', ''); setTimeout(() => el.remove(), 220); };
      el.querySelector('.uix-toast__close').addEventListener('click', leave);
      setTimeout(leave, 4000);
    };
    document.addEventListener('uix:toast', (e) => push(e.detail));
    document.querySelectorAll('[data-uix-toast]').forEach((btn) =>
      btn.addEventListener('click', () => push({ title: btn.dataset.toastTitle, msg: btn.dataset.toastMsg, tone: btn.dataset.toastTone })));
  };

  // ---- command-palette-style rich select (trigger + popover; optional search) ----
  // Mouse: click an option. Keyboard: the popovertarget button opens it, then
  // Arrow/Home/End move a [data-active] highlight and Enter selects (Esc closes
  // via the Popover API). Drives both .uix-listbox and .uix-cmdk option lists.
  const setupRichSelect = () => {
    document.querySelectorAll('[data-uix-richselect]').forEach((rs) => {
      const pop = rs.querySelector('[popover]');
      const trigger = rs.querySelector('.uix-select-trigger');
      const label = rs.querySelector('[data-rs-label]');
      if (!pop) return;
      const search = pop.querySelector('input');
      const options = [...pop.querySelectorAll('[data-rs-option]')];
      // a11y: the options style off [aria-selected], which is only a valid ARIA attribute on
      // role=option inside a role=listbox — tag them so the popover is a real listbox.
      pop.setAttribute('role', 'listbox');
      options.forEach((o) => o.setAttribute('role', 'option'));
      const visible = () => options.filter((o) => !o.hidden);
      const setActive = (opt) => {
        options.forEach((o) => o.removeAttribute('data-active'));
        if (opt) { opt.setAttribute('data-active', ''); opt.scrollIntoView({ block: 'nearest' }); }
      };
      const choose = (opt) => {
        if (!opt) return;
        options.forEach((o) => o.removeAttribute('aria-selected'));
        opt.setAttribute('aria-selected', 'true');
        if (label) label.textContent = opt.textContent.trim();
        pop.hidePopover();
        trigger?.focus();
      };
      search?.addEventListener('input', () => {
        const q = search.value.toLowerCase();
        options.forEach((o) => { o.hidden = !o.textContent.toLowerCase().includes(q); });
        setActive(visible()[0]);
      });
      pop.addEventListener('click', (e) => {
        const opt = e.target.closest('[data-rs-option]');
        if (opt) choose(opt);
      });
      rs.addEventListener('keydown', (e) => {
        if (!pop.matches(':popover-open')) return;
        const vis = visible(); if (!vis.length) return;
        const idx = vis.findIndex((o) => o.hasAttribute('data-active'));
        if (e.key === 'ArrowDown') { e.preventDefault(); setActive(vis[Math.min(idx + 1, vis.length - 1)] || vis[0]); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(vis[Math.max(idx - 1, 0)]); }
        else if (e.key === 'Home') { e.preventDefault(); setActive(vis[0]); }
        else if (e.key === 'End') { e.preventDefault(); setActive(vis[vis.length - 1]); }
        else if (e.key === 'Enter') { e.preventDefault(); choose(vis[idx] || vis[0]); }
      });
      pop.addEventListener('toggle', (e) => {
        if (e.newState === 'open') {
          if (search) { search.value = ''; options.forEach((o) => { o.hidden = false; }); }
          setActive(options.find((o) => o.getAttribute('aria-selected') === 'true') || visible()[0]);
          if (search) setTimeout(() => search.focus(), 0);
        } else {
          setActive(null);
        }
      });
    });
  };

  // ---- form microinteractions: inline validation (on blur) + submit-button morph ----
  const setupForms = () => {
    document.querySelectorAll('[data-uix-validate]').forEach((input) => {
      const field = input.closest('.uix-field');
      const ok = field?.querySelector('[data-field-success]');
      const err = field?.querySelector('[data-field-error]');
      const check = field?.querySelector('[data-field-check]');
      input.addEventListener('blur', () => {
        const val = input.value.trim();
        if (!val) { input.removeAttribute('data-valid'); input.setAttribute('aria-invalid', 'false'); [ok, err, check].forEach((e) => e && (e.hidden = true)); return; }
        const valid = input.type === 'email' ? /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(val) : val.length > 1;
        input.toggleAttribute('data-valid', valid);
        input.setAttribute('aria-invalid', valid ? 'false' : 'true');
        if (ok) ok.hidden = !valid;
        if (check) check.hidden = !valid;
        if (err) err.hidden = valid;
      });
    });
    document.querySelectorAll('[data-uix-submit-demo]').forEach((btn) => {
      const original = btn.innerHTML;
      btn.addEventListener('click', () => {
        if (btn.dataset.busy) return;
        btn.dataset.busy = '1';
        btn.innerHTML = '<span class="uix-spinner" style="width:14px;height:14px;border-color:currentColor;border-right-color:transparent"></span> Submitting…';
        setTimeout(() => {
          btn.innerHTML = '✓ Submitted';
          setTimeout(() => { btn.innerHTML = original; delete btn.dataset.busy; }, 1500);
        }, 1100);
      });
    });
  };

  // ---- image lightbox: click a [data-uix-lightbox] thumbnail → enlarge in a <dialog> ----
  const setupLightbox = () => {
    document.querySelectorAll('[data-uix-icon]').forEach((el) => { el.innerHTML = icon(el.dataset.uixIcon); });
    const dlg = document.querySelector('[data-uix-lightbox-dialog]');
    if (!dlg) return;
    const img = dlg.querySelector('img');
    document.addEventListener('click', (e) => {
      const t = e.target.closest('[data-uix-lightbox]'); if (!t) return;
      img.src = t.dataset.src; img.alt = t.querySelector('img')?.alt || '';
      openModal(dlg);
    });
  };

  // ---- emoji reactions: pills with counts + an add-reaction picker popover ----
  const EMOJI_SET = ['✅', '👍', '👀', '🎉', '🚀', '🔥', '⚠️', '❓', '🚫', '📌'];
  const setupReactions = () => {
    document.querySelectorAll('[data-uix-reactions]').forEach((host, idx) => {
      let state = [];
      try { state = JSON.parse(host.dataset.reactions || '[]'); } catch { state = []; }
      const pid = 'uix-rx-' + idx;
      const render = () => {
        host.innerHTML =
          state.map((r) => `<button class="uix-reaction" type="button" data-emoji="${r.emoji}" ${r.mine ? 'data-mine' : ''} aria-pressed="${r.mine}">${r.emoji} <span class="uix-reaction__count">${r.count}</span></button>`).join('') +
          `<button class="uix-reaction-add" type="button" popovertarget="${pid}" aria-label="Add reaction" style="anchor-name:--${pid}">${icon('smile-plus', 'sm')}</button>` +
          `<div id="${pid}" popover class="uix-popover" style="position-anchor:--${pid}; top:anchor(bottom); left:anchor(left); margin-top:6px"><div class="uix-emoji-picker">${EMOJI_SET.map((e) => `<button class="uix-emoji-picker__btn" type="button" data-pick="${e}">${e}</button>`).join('')}</div></div>`;
      };
      host.addEventListener('click', (e) => {
        const pill = e.target.closest('[data-emoji]');
        const pick = e.target.closest('[data-pick]');
        const emoji = pill?.dataset.emoji || pick?.dataset.pick;
        if (!emoji) return;
        state = toggleReaction(state, emoji);
        if (pick) document.getElementById(pid)?.hidePopover();
        render();
      });
      render();
    });
  };

  // ---- icon inventory (Icons section): sizes row + click-to-copy grid ----
  const buildIconInventory = () => {
    const sizes = document.querySelector('[data-uix-icon-sizes]');
    if (sizes) sizes.innerHTML = ['sm', 'md', 'lg'].map((sz) =>
      `<span style="display:inline-flex;flex-direction:column;align-items:center;gap:6px;color:var(--uix-text)">${icon('star', sz)}<code style="font-size:var(--uix-text-eyebrow);color:var(--uix-text-muted)">${sz}</code></span>`).join('');
    const grid = document.querySelector('[data-uix-icon-grid]');
    if (grid) grid.innerHTML = iconNames().map((n) =>
      `<button class="uix-icon-cell" type="button" data-icon-copy="${esc(n)}">${icon(n)}<code>${esc(n)}</code></button>`).join('');
  };

  const setupPeekV2 = () => {
    const peek = document.querySelector('[data-uix-peek-dialog-v2]');
    if (!peek) return;
    const records = [...document.querySelectorAll('[data-uix-table-v2] tbody tr[data-id]')].map((tr) => ({
      id: tr.dataset.id, subject: tr.children[1]?.textContent.trim() ?? '',
    }));
    if (!records.length) return;
    let i = 0;
    const titleEl = peek.querySelector('[data-peek-title-v2]');
    const subEl = peek.querySelector('[data-peek-sub-v2]');
    const show = () => { const r = records[i]; if (!r) return; if (titleEl) titleEl.textContent = r.id; if (subEl) subEl.textContent = r.subject; };
    const openAt = (idx) => { i = Math.max(0, idx); show(); openModal(peek); };
    const toast = (title) => document.dispatchEvent(new CustomEvent('uix:toast', { detail: { title, tone: 'info' } }));
    document.querySelectorAll('[data-uix-table-v2]').forEach((tableRoot) => {
      const body = tableRoot.querySelector('tbody');
      if (!body) return;
      tableRoot.setAttribute('data-uix-rowpeek', '');
      body.addEventListener('click', (e) => {
        if (e.target.closest('[data-uix-goto]')) return;
        if (e.target.closest('button, a, input, label, select, textarea')) return;
        const tr = e.target.closest('tr[data-id]'); if (!tr) return;
        const idx = records.findIndex((r) => r.id === tr.dataset.id);
        if (idx >= 0) openAt(idx);
      });
      body.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-uix-goto]'); if (!btn) return;
        toast(`Opening ${btn.dataset.uixGoto}…`);
      });
    });
    peek.querySelector('[data-peek-prev-v2]')?.addEventListener('click', () => { i = peekStep(i, -1, records.length); show(); });
    peek.querySelector('[data-peek-next-v2]')?.addEventListener('click', () => { i = peekStep(i, +1, records.length); show(); });
    peek.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); i = peekStep(i, +1, records.length); show(); }
      if (e.key === 'ArrowUp') { e.preventDefault(); i = peekStep(i, -1, records.length); show(); }
    });
    peek.querySelector('[data-peek-open-full-v2]')?.addEventListener('click', () => {
      const r = records[i]; if (r) toast(`Opening ${r.id}…`);
    });
  };

  // ---- app-shell width tiers + focus mode + full-bleed (mirrors the React AppShell props) ----
  // data-nav (full|rail|hidden) and full-bleed persist; focus mode is transient (Esc / exit control
  // leaves it) so a reload never strands you in an immersive view.
  const setupShell = () => {
    const shell = document.querySelector('[data-uix-shell]');
    if (!shell) return;
    const KEY = 'uix-shell-demo';
    const navBtns = [...document.querySelectorAll('[data-uix-shell-nav] [data-nav]')];
    const railSidebar = shell.querySelector('[data-uix-shell-sidebar]');
    const main = shell.querySelector('[data-uix-shell-main]');
    const bleedInput = document.querySelector('[data-uix-shell-bleed]');
    const exitHost = shell.querySelector('[data-uix-shell-exit]');
    const focusBtns = [...document.querySelectorAll('[data-uix-shell-focus]')];

    let prefs = { nav: 'full', bleed: false };
    try { prefs = { ...prefs, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { /* ignore */ }
    const save = () => localStorage.setItem(KEY, JSON.stringify(prefs));

    const applyNav = () => {
      // match the React contract: omit data-nav for the default 'full' tier, set it for rail/hidden
      if (prefs.nav === 'full') shell.removeAttribute('data-nav');
      else shell.setAttribute('data-nav', prefs.nav);
      // keep the inner sidebar's collapsed rail in step so labels hide at the rail width
      railSidebar?.toggleAttribute('data-collapsed', prefs.nav === 'rail');
      navBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.nav === prefs.nav)));
    };
    const applyBleed = () => {
      main?.classList.toggle('uix-shell__main--bleed', prefs.bleed);
      if (bleedInput) bleedInput.checked = prefs.bleed;
    };
    const setFocus = (on) => {
      shell.toggleAttribute('data-focus', on);
      if (exitHost) exitHost.hidden = !on;
      focusBtns.forEach((b) => b.setAttribute('aria-pressed', String(on)));
    };

    navBtns.forEach((b) => b.addEventListener('click', () => { prefs.nav = b.dataset.nav; applyNav(); save(); }));
    bleedInput?.addEventListener('change', () => { prefs.bleed = bleedInput.checked; applyBleed(); save(); });
    focusBtns.forEach((b) => b.addEventListener('click', () => setFocus(!shell.hasAttribute('data-focus'))));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && shell.hasAttribute('data-focus')) setFocus(false); });

    applyNav(); applyBleed();
  };

  const init = () => {
    document.body.appendChild(probe);
    paintToggle();
    buildTokenReference();
    buildIconInventory();
    setupScrollspy();
    setupSidebar();
    setupShell();
    setupTables();
    setupOverlays();
    setupPeek();
    setupPeekV2();
    setupCmdk();
    setupToasts();
    setupRichSelect();
    setupForms();
    setupReactions();
    setupLightbox();
    initCharts();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
}
