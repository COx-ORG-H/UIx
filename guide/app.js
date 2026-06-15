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

  const init = () => {
    document.body.appendChild(probe);
    paintToggle();
    buildTokenReference();
    setupScrollspy();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
}
