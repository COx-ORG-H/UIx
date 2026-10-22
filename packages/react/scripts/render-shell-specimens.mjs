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
