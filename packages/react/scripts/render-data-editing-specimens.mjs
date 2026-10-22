// Regenerates packages/tokens/docs/data-editing-specimens.js: the docs specimens for the data,
// editing and navigation batch (HAR-1380, HAR-1375, HAR-987, HAR-1388 and their siblings), from
// the BUILT package, so the styleguide shows exactly the markup the components render (the
// precedent is render-uxc-specimens.mjs; a module of its own, so parallel batches do not
// rewrite one file).
//
//   npm run build -w @tensor_1/react
//   node packages/react/scripts/render-data-editing-specimens.mjs
//
// packages/react/src/data-editing-specimens.test.mjs fails when the committed module differs.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { JSDOM } from 'jsdom';
import { createElement as h, act } from 'react';

const here = dirname(fileURLToPath(import.meta.url));
export const SPECIMEN_MODULE = join(here, '../../tokens/docs/data-editing-specimens.js');

const GLOBALS = ['window', 'document', 'navigator', 'getComputedStyle', 'requestAnimationFrame', 'ResizeObserver', 'IntersectionObserver', 'MutationObserver', 'HTMLElement', 'HTMLInputElement', 'HTMLTextAreaElement', 'Node', 'IS_REACT_ACT_ENVIRONMENT'];

const caption = (text) => `<div class="uix-guide__subhead" data-data-editing>${text}</div>`;

/** The specimens each builder adds, by docs route. A builder gets `{ ui, mount, html }`. */
const BUILDERS = [
  // ── Segmented link mode (HAR-1380): a language switcher is navigation ─────────────────────
  ({ ui, mount, html }) => {
    const short = mount(h(ui.LocaleSwitcher, {
      label: 'Language', current: 'de',
      locales: [{ code: 'bs', label: 'BS', href: '#lang-bs' }, { code: 'de', label: 'DE', href: '#lang-de' }, { code: 'en', label: 'EN', href: '#lang-en' }],
    }));
    const long = mount(h(ui.Segmented, { selection: 'link', value: 'bs', 'aria-label': 'Jezik' },
      h(ui.SegmentedOption, { value: 'bs', href: '#jezik-bs', hrefLang: 'bs', lang: 'bs' }, 'Bosanski'),
      h(ui.SegmentedOption, { value: 'de', href: '#jezik-de', hrefLang: 'de', lang: 'de' }, 'Deutsch'),
      h(ui.SegmentedOption, { value: 'en', href: '#jezik-en', hrefLang: 'en', lang: 'en' }, 'English')));
    return {
      'examples-navigation': [
        caption('Language switcher (React <code>LocaleSwitcher</code>, <code>Segmented selection="link"</code>) — navigation, not a choice: a named <code>&lt;nav&gt;</code> of links with <code>lang</code> and <code>hreflang</code>, the current language lifted and marked <code>aria-current="page"</code>; Tab visits each link'),
        '<div data-segmented-link-example class="uix-cluster" style="--gap:24px;align-items:center">',
        html(short), html(long),
        '</div>',
      ].join('\n'),
    };
  },
  // ── InlineEdit as a record field (HAR-1833): an object value, an icon trigger, a read-only
  //    reason, and a failed save with Try again ─────────────────────────────────────────────
  ({ ui, mount, html, window }) => {
    const failing = mount(h(ui.InlineEdit, {
      label: 'Title', value: 'Printer offline',
      onSave: () => Promise.reject(new Error('The server did not answer in time.')),
      renderError: (_error, { message, retry }) => h('span', { className: 'uix-cluster', style: { alignItems: 'center' } },
        h('span', null, message), h(ui.Button, { size: 'sm', variant: 'link', onClick: retry }, 'Try again')),
    }));
    // Open the editor, type, and fail the save, so the page shows the error state.
    act(() => failing.querySelector('button.uix-inline-edit__view').dispatchEvent(new window.MouseEvent('click', { bubbles: true })));
    const input = failing.querySelector('input');
    act(() => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, 'Printer offline on the 3rd floor');
      input.dispatchEvent(new window.Event('input', { bubbles: true }));
    });
    return {
      deferred: async () => {
        await act(async () => {
          input.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
          for (let i = 0; i < 5; i += 1) await Promise.resolve();
        });
        const row = (term, field) => h(ui.DescriptionItem, { term }, field);
        const record = mount(h(ui.DescriptionList, null,
          row('Owner', h(ui.InlineEdit, { label: 'Owner', value: { id: 'u2', name: 'Jonas Weber' }, renderView: (v) => v.name, equals: (a, b) => a?.id === b?.id, commit: 'change', onSave() {} })),
          row('Ticket', h(ui.InlineEdit, { label: 'Ticket', value: 'INC-20417', trigger: 'icon', renderView: (v) => h('a', { className: 'uix-link', href: '#inline-edit-ticket' }, v), onSave() {} })),
          row('Source', h(ui.InlineEdit, { label: 'Source', value: 'Imported from ServiceNow', readOnlyReason: 'Set by the integration.', onSave() {} })),
          row('Title', h('span', { 'data-failing': '' }))));
        const markup = html(record).replace('<span data-failing=""></span>', html(failing));
        return {
          'examples-form-controls': [
            caption('Inline edit as a record field (React <code>InlineEdit</code>, HAR-1833) — an object value shown by <code>renderView</code>; <code>trigger="icon"</code> when the value is itself a link, the pencil named only "Edit Ticket"; a <code>readOnlyReason</code> instead of an edit control; a failed save keeps the draft, with Try again from <code>renderError</code>'),
            `<div data-inline-edit-record-example style="max-width:40rem">${markup}</div>`,
          ].join('\n'),
        };
      },
    };
  },
];

/**
 * Render every specimen. Returns `{ [route]: html }`. Installs a jsdom for the duration and
 * removes it again, so a test that imports this can own its own globals.
 */
export async function renderDataEditingSpecimens() {
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
  expose('HTMLInputElement', window.HTMLInputElement);
  expose('HTMLTextAreaElement', window.HTMLTextAreaElement);
  expose('Node', window.Node);
  expose('IS_REACT_ACT_ENVIRONMENT', true);
  const dialog = window.HTMLDialogElement.prototype;
  dialog.showModal = function showModal() { this.setAttribute('open', ''); };
  dialog.close = function close() { this.removeAttribute('open'); };

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
    const stable = (markup) => markup.replace(/(:r[0-9a-z]+:|«r[0-9a-z]+»|_r_[0-9a-z]+_)/g, (id) => {
      if (!ids.has(id)) { nextId += 1; ids.set(id, `dex-${nextId}`); }
      return ids.get(id);
    });
    const html = (el) => stable(el.innerHTML);

    const byRoute = {};
    for (const build of BUILDERS) {
      let blocks = build({ ui, mount, html, window });
      // A builder that has to wait (a save that fails) returns `deferred`.
      if (typeof blocks.deferred === 'function') blocks = await blocks.deferred();
      for (const [route, markup] of Object.entries(blocks)) {
        byRoute[route] = byRoute[route] ? `${byRoute[route]}\n${markup}` : markup;
      }
    }
    for (const { root, host } of roots) { act(() => root.unmount()); host.remove(); }
    return Object.fromEntries(Object.entries(byRoute).sort(([a], [b]) => a.localeCompare(b)));
  } finally {
    dom.window.close();
    for (const [name, descriptor] of saved) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
  }
}

/** The module text for a set of specimens: what the docs import. */
export const dataEditingSpecimenModule = (specimens) => `/* GENERATED by packages/react/scripts/render-data-editing-specimens.mjs — do not edit by hand.
 * The docs specimens for the data, editing and navigation batch: the markup the built React
 * components render, in the states named in each caption. showcase-data.js appends each block
 * to its route. packages/react/src/data-editing-specimens.test.mjs fails when this file and the
 * components differ. */
export const DATA_EDITING_SPECIMENS = ${JSON.stringify(specimens, null, 2)};
`;

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  writeFileSync(SPECIMEN_MODULE, dataEditingSpecimenModule(await renderDataEditingSpecimens()));
  console.log(`wrote ${SPECIMEN_MODULE}`);
}
