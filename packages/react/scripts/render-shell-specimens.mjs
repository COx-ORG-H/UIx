// Regenerates packages/tokens/docs/shell-specimens.js: the docs specimens for the app-shell,
// colour-policy and polish batch (HAR-1815, HAR-1371, HAR-1372, HAR-1818 …), from the BUILT
// package, so the styleguide shows exactly the markup the components render (the precedent is
// render-uxc-specimens.mjs).
//
//   npm run build -w @tensor_1/react
//   node packages/react/scripts/render-shell-specimens.mjs
//
// packages/react/src/shell-specimens.test.mjs fails when the committed module differs.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { JSDOM } from 'jsdom';
import { createElement as h, act } from 'react';

const here = dirname(fileURLToPath(import.meta.url));
export const SPECIMEN_MODULE = join(here, '../../tokens/docs/shell-specimens.js');

const GLOBALS = ['window', 'document', 'navigator', 'getComputedStyle', 'requestAnimationFrame', 'ResizeObserver', 'IntersectionObserver', 'MutationObserver', 'HTMLElement', 'matchMedia', 'localStorage', 'IS_REACT_ACT_ENVIRONMENT'];

const caption = (text) => `<div class="uix-guide__subhead" data-shell-specimen>${text}</div>`;

/**
 * Render every specimen. Returns `{ [route]: html }`. Installs a jsdom for the duration and
 * removes it again, so a test that imports this can own its own globals.
 */
export async function renderShellSpecimens() {
  const saved = new Map(GLOBALS.map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true, url: 'http://localhost/' });
  const { window } = dom;
  const expose = (name, value) => Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
  expose('window', window);
  expose('document', window.document);
  expose('navigator', window.navigator);
  expose('getComputedStyle', window.getComputedStyle.bind(window));
  expose('requestAnimationFrame', window.requestAnimationFrame.bind(window));
  expose('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  expose('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
  expose('MutationObserver', window.MutationObserver);
  expose('HTMLElement', window.HTMLElement);
  expose('localStorage', window.localStorage);
  // a light, wide, no-preference screen: the specimens show the defaults
  const mq = (query) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false });
  window.matchMedia = mq;
  expose('matchMedia', mq);
  expose('IS_REACT_ACT_ENVIRONMENT', true);

  try {
    const { createRoot } = await import('react-dom/client');
    const ui = await import(pathToFileURL(join(here, '../dist/index.js')).href);
    const roots = [];
    const mount = (element) => {
      const host = window.document.createElement('div');
      window.document.body.append(host);
      const root = createRoot(host);
      act(() => root.render(element));
      roots.push({ root, host });
      return host;
    };

    // React's generated ids differ between versions; the page gets stable ones.
    let nextId = 0;
    const ids = new Map();
    const stable = (html) => html.replace(/(:r[0-9a-z]+:|«r[0-9a-z]+»|_r_[0-9a-z]+_)/g, (id) => {
      if (!ids.has(id)) { nextId += 1; ids.set(id, `shell-${nextId}`); }
      return ids.get(id);
    });
    const html = (el) => stable(el.innerHTML);
    const out = {};
    const add = (route, block) => { out[route] = out[route] ? `${out[route]}\n${block}` : block; };

    // ── Inset (HAR-1818): a preview and a code sample inside a card body ───────────────────
    const preview = mount(h(ui.Card, { title: 'Current', subtitle: 'What visitors see at the top of every public page', style: { maxWidth: '36rem' } },
      h('div', { className: 'uix-stack', style: { '--gap': 'var(--uix-space-3)' } },
        h(ui.Inset, { role: 'group', 'aria-label': 'Header preview' },
          h('div', { className: 'uix-cluster', style: { justifyContent: 'space-between' } },
            h('strong', null, 'Gradska biblioteka Tuzla'),
            h('span', { className: 'uix-cluster', style: { '--gap': 'var(--uix-space-4)' } },
              h('span', null, 'Katalog'), h('span', null, 'Događaji'), h('span', null, 'Moj račun')))),
        h(ui.Inset, { padding: 'sm' }, h('code', null, '--uix-brand: #1447E6;')))));
    add('examples-data-display', [
      caption('Inset inside a card body (React <code>Inset</code>, <code>.uix-inset</code>) — a bordered, sunken well for a preview or a specimen; not a card in a card, so no second shadow and no card padding. <code>padding="sm"</code> for a dense card'),
      `<div data-card-inset-example>${html(preview)}</div>`,
    ].join('\n'));

    // ── AppShell layout="viewport" + the staff type presets (HAR-1815) ──────────────────────
    // The page cannot give a specimen the whole viewport: the shell is held at 30rem here.
    const navIcon = (d) => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }, h('path', { d }));
    const staffShell = mount(h(ui.AppShell, {
      layout: 'viewport', mainId: 'shell-viewport-main', style: { height: '30rem' }, 'aria-label': 'Staff shell specimen',
      sidebar: h(ui.Sidebar, { brand: 'Biblioteka', 'aria-label': 'Staff navigation' },
        h(ui.NavItem, { href: '#examples-navigation', icon: navIcon('M3 12l9-9 9 9M5 10v10h14V10'), active: true }, 'Pregled'),
        h(ui.NavItem, { href: '#examples-navigation', icon: navIcon('M4 19.5V4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20') }, 'Katalog'),
        h(ui.NavItem, { href: '#examples-navigation', icon: navIcon('M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-.01') }, 'Članovi')),
    },
    h(ui.PageHeader, { size: 'display', as: 'h2', eyebrow: 'Danas', title: 'Pregled', subtitle: 'Posudbe, rezervacije i zakašnjenja za ovu podružnicu.', actions: h(ui.Button, { variant: 'primary' }, 'Nova posudba') }),
    h('p', null, 'The viewport shell has no frame and no top-bar row; the sidebar and the main column run the full height.')));
    add('examples-navigation', [
      caption('App shell, full viewport (React <code>AppShell layout="viewport"</code>, <code>.uix-shell--viewport</code>) — an application’s shell: no frame, <code>100dvh</code> (held at 30rem on this page), no top-bar row, the staff main padding (wider on a wide screen), and below 40rem one column with the sidebar hidden for the phone nav tier. The title is the display preset of <code>PageHeader</code>'),
      // a page has one main landmark, the docs' own: the specimen's <main> is shown as a div
      `<div data-shell-viewport-example>${html(staffShell).replace(/<main\b/, '<div').replace(/<\/main>/, '</div>')}</div>`,
    ].join('\n'));

    // ── Sidebar actions + search, AccountMenu in the foot, the rail (HAR-1371) ─────────────
    const moonIcon = navIcon('M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z');
    const staffSidebar = (rail) => h(ui.Sidebar, {
      brand: 'Biblioteka', nav: rail ? 'rail' : 'full', 'aria-label': rail ? 'Staff navigation, rail' : 'Staff navigation', style: { height: '26rem' },
      actions: h(ui.Button, { size: 'sm', variant: 'ghost', icon: true, 'aria-label': 'Switch to dark mode' }, moonIcon),
      search: { label: 'Search', shortcut: ['Mod', 'K'], onActivate: () => {} },
      footer: h(ui.AccountMenu, { collapsed: rail, user: { name: 'Dževad Hodžić', sub: 'dzevad.hodzic@biblioteka.ba', status: 'online' } }),
    },
    h(ui.NavItem, { href: '#examples-navigation', icon: navIcon('M3 12l9-9 9 9M5 10v10h14V10'), active: true }, 'Overview'),
    h(ui.NavItem, { href: '#examples-navigation', icon: navIcon('M4 19.5V4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20') }, 'Catalogue'));
    const fullSidebar = mount(staffSidebar(false));
    const railSidebar = mount(staffSidebar(true));
    add('examples-navigation', [
      caption('Sidebar head actions, search row and account menu (React <code>Sidebar actions search footer</code>, <code>AccountMenu</code>) — a mode toggle beside the brand, a search row that shows its shortcut, and the signed-in person in the foot; in the rail each keeps its name as an icon button. <code>AppShell navHotkey="["</code> switches the rail at once and <code>navTierStorageKey</code> remembers it; <code>phoneNav="drawer"</code> moves the sidebar into a start-side drawer at 40rem and under'),
      '<div data-sidebar-account-example class="uix-cluster" style="--gap:24px;align-items:flex-start">',
      `<div style="width:var(--uix-sidebar-w);border:1px solid var(--uix-border);border-radius:var(--uix-radius-md);overflow:hidden">${html(fullSidebar)}</div>`,
      `<div style="border:1px solid var(--uix-border);border-radius:var(--uix-radius-md);overflow:hidden">${html(railSidebar)}</div>`,
      '</div>',
    ].join('\n'));

    const record = mount(h(ui.DetailPage, {
      variant: 'staff', back: { href: '#examples-workspace', label: 'Sve posudbe' }, eyebrow: 'Posudba', title: 'L-2026-0412',
      subtitle: 'Na zadnjem čitanju, rok vraćanja za tri dana.',
      metrics: [{ id: 'due', label: 'Rok', value: '25.10.2026' }, { id: 'renewals', label: 'Produženja', value: '1 / 2' }, { id: 'fee', label: 'Zakasnina', value: '0,00 KM' }],
    }, h(ui.Card, null,
      h(ui.SectionHead, { size: 'compact', as: 'h3', title: 'Primjerci' }),
      h(ui.Table, { 'aria-label': 'Primjerci' },
        h('thead', null, h('tr', null, h(ui.Th, null, 'Naslov'), h(ui.Th, null, 'Status'))),
        h('tbody', null,
          h('tr', null, h('td', null, h(ui.CellStrong, null, 'Na Drini ćuprija'), h(ui.CellSub, { tabular: true }, 'INV 0041-1187')), h('td', null, 'Posuđeno')),
          h('tr', null, h('td', null, h(ui.CellStrong, null, 'Derviš i smrt'), h(ui.CellSub, { tabular: true }, 'INV 0007-0310')), h('td', null, 'Posuđeno')))))));
    add('examples-workspace', [
      caption('Staff record page (React <code>DetailPage variant="staff"</code>, <code>.uix-detail-page--staff</code>) — the title at h2 / 1.15, the back link an inline hushed link without an underline, each metric an eyebrow over a regular, tabular h3 value; inside, a compact section head (<code>SectionHead size="compact"</code>, 15 px / 1.3 / 600) and read-back codes in tabular numerals (<code>CellSub tabular</code>)'),
      `<div data-detail-staff-example>${html(record)}</div>`,
    ].join('\n'));

    // ── DisplayPreferences + ThemeSwitcher (HAR-1372) ──────────────────────────────────────
    // Controlled with the defaults, so rendering the page writes nothing to <html>.
    const prefs = mount(h(ui.DisplayPreferences, { value: ui.DEFAULT_DISPLAY_PREFERENCES, onValueChange: () => {}, style: { maxWidth: '30rem' } }));
    const themeSwitcher = mount(h(ui.ThemeSwitcher, { value: 'system', onValueChange: () => {} }));
    const themeIcons = mount(h(ui.ThemeSwitcher, { value: 'dark', onValueChange: () => {}, display: 'icons' }));
    add('examples-form-controls', [
      caption('Display preferences (React <code>DisplayPreferences</code>, <code>ThemeSwitcher</code>, <code>useDisplayPreferences</code>, <code>displayPreferencesScript</code>) — theme, contrast, text size, motion and density as labelled radio groups; a change applies at once (no fade between themes) and is remembered; <code>system</code> follows the OS. The tokens read <code>data-theme</code>, <code>data-contrast</code>, <code>data-text-scale</code>, <code>data-motion</code> and <code>data-density</code> on <code>&lt;html&gt;</code>, and the script in the head sets them before the first paint'),
      html(prefs),
      `<div data-theme-switcher-example class="uix-cluster" style="--gap:16px">${html(themeSwitcher)}${html(themeIcons)}</div>`,
    ].join('\n'));

    for (const { root, host } of roots) { act(() => root.unmount()); host.remove(); }
    return out;
  } finally {
    dom.window.close();
    for (const [name, descriptor] of saved) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
  }
}

/** The module text for a set of specimens: what the docs import. */
export const shellSpecimenModule = (specimens) => `/* GENERATED by packages/react/scripts/render-shell-specimens.mjs — do not edit by hand.
 * The docs specimens for the app-shell, colour-policy and polish batch (HAR-1815, HAR-1371,
 * HAR-1372, HAR-1818): the markup the built React components render, in the states named in each
 * caption. showcase-data.js appends each block to its route.
 * packages/react/src/shell-specimens.test.mjs fails when this file and the components differ. */
export const SHELL_SPECIMENS = ${JSON.stringify(specimens, null, 2)};
`;

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  writeFileSync(SPECIMEN_MODULE, shellSpecimenModule(await renderShellSpecimens()));
  console.log(`wrote ${SPECIMEN_MODULE}`);
}
