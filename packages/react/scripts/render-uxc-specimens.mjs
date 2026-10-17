// Regenerates packages/tokens/docs/uxc-specimens.js: the docs specimens for the kit changes the
// TENSOR UX consistency audit of 2026-10-16 asked for (audit keys UXC-01..04: HAR-2029..2032),
// from the BUILT package, so the styleguide shows exactly the markup the components render (the
// precedent is render-older-gap-specimens.mjs).
//
//   npm run build:react   (or: npm run build -w @tensor_1/react)
//   node packages/react/scripts/render-uxc-specimens.mjs
//
// packages/react/src/uxc-specimens.test.mjs fails when the committed module differs.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { JSDOM } from 'jsdom';
import { createElement as h, act } from 'react';

const here = dirname(fileURLToPath(import.meta.url));
export const SPECIMEN_MODULE = join(here, '../../tokens/docs/uxc-specimens.js');

const OPEN = 'data-specimen-popover-open';
const GLOBALS = ['window', 'document', 'navigator', 'getComputedStyle', 'requestAnimationFrame', 'ResizeObserver', 'IntersectionObserver', 'HTMLElement', 'IS_REACT_ACT_ENVIRONMENT'];

const caption = (text) => `<div class="uix-guide__subhead" data-uxc>${text}</div>`;

/** A record's details with the long German labels and values TENSOR renders (HAR-1651). */
export const RECORD_DETAILS = [
  { term: 'Status', description: 'In Bearbeitung' },
  { term: 'Verantwortliche Gruppe', description: 'Netzwerkbetrieb, zweite Ebene' },
  { term: 'Neue Tickets pro Person und Stunde', description: '4' },
  { term: 'Konfigurationselement', description: 'srv-ledger-prod-eu-central-01.intern.example.com' },
];

/**
 * Render every specimen. Returns `{ [route]: html }`. Installs a jsdom for the duration and
 * removes it again, so a test that imports this can own its own globals.
 */
export async function renderUxcSpecimens() {
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
  expose('HTMLElement', window.HTMLElement);
  expose('IS_REACT_ACT_ENVIRONMENT', true);
  // jsdom has no top layer: a popover is "open" while it carries OPEN, a dialog while it has [open].
  const toggle = (target, newState) => { const event = new window.Event('toggle'); event.newState = newState; target.dispatchEvent(event); };
  window.HTMLElement.prototype.showPopover = function showPopover() { if (this.hasAttribute(OPEN)) return; this.setAttribute(OPEN, ''); toggle(this, 'open'); };
  window.HTMLElement.prototype.hidePopover = function hidePopover() { if (!this.hasAttribute(OPEN)) return; this.removeAttribute(OPEN); toggle(this, 'closed'); };
  const matches = window.Element.prototype.matches;
  window.Element.prototype.matches = function patched(selector) {
    return selector === ':popover-open' ? this.hasAttribute(OPEN) : matches.call(this, selector);
  };
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
    const stable = (html) => html.replace(/(:r[0-9a-z]+:|«r[0-9a-z]+»|_r_[0-9a-z]+_)/g, (id) => {
      if (!ids.has(id)) { nextId += 1; ids.set(id, `uxc-${nextId}`); }
      return ids.get(id);
    });
    const html = (el) => stable(el.innerHTML);

    // ── DescriptionList: label above value when the list is narrow (HAR-2032) ──────
    const narrow = mount(h(ui.DescriptionList, { items: RECORD_DETAILS }));
    const wide = mount(h(ui.DescriptionList, { items: RECORD_DETAILS }));
    const descriptionList = [
      caption('Description list at 320 px (React <code>DescriptionList</code>, <code>.uix-dl</code>) — below 22rem of its own width each label sits above its value, so a long label never squeezes the value or pushes it off a phone; wider, the labels form one column'),
      '<div class="uix-cluster" style="--gap:24px;align-items:flex-start">',
      `<div data-dl-narrow-example lang="de" class="uix-card" style="width:20rem;max-width:100%"><div class="uix-card__body">${html(narrow)}</div></div>`,
      `<div data-dl-wide-example lang="de" class="uix-card" style="width:36rem;max-width:100%"><div class="uix-card__body">${html(wide)}</div></div>`,
      '</div>',
    ].join('\n');

    // ── Drawer dirty: the "Discard changes?" step (HAR-2029) ───────────────────────
    // A form drawer with a changed field, after Escape: the step under the ×, focus on Keep editing.
    const noop = () => {};
    const drawerHost = mount(h(ui.Drawer, {
      open: true, onClose: noop, dirty: true, title: 'Edit notification template',
      footer: [h(ui.Button, { key: 'save', variant: 'primary' }, 'Save'), h(ui.DialogClose, { key: 'cancel' }, 'Cancel')],
    }, h(ui.Field, { label: 'Template name' }, h(ui.Input, { defaultValue: 'Incident created (v2)' }))));
    const drawerEl = drawerHost.querySelector('dialog');
    act(() => { drawerEl.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })); });
    const step = drawerEl.querySelector('[data-uix-discard-prompt]');
    if (!step?.hasAttribute(OPEN)) throw new Error('the dirty drawer did not open its discard step on Escape');
    // The static page cannot show a modal or a popover: the drawer becomes a framed panel and the
    // step sits where the browser places it, under the ×.
    step.removeAttribute('popover');
    step.removeAttribute(OPEN);
    step.setAttribute('style', 'position:absolute;top:56px;right:12px;margin:0');
    const discard = [
      caption('Drawer and Modal <code>dirty</code> (React <code>Drawer dirty</code>, <code>Modal dirty</code>, <code>DialogClose</code>) — Escape, the ×, a backdrop click or Cancel on a form with unsaved input asks first, with focus on Keep editing; <code>pending</code> makes them do nothing; a clean form closes at once'),
      `<div data-discard-prompt-example class="uix-drawer" style="position:relative;display:flex;flex-direction:column;transform:none;height:auto;max-height:none;width:min(420px,100%);margin:0;border:1px solid var(--uix-border);border-radius:var(--uix-radius-md)">${html(drawerEl)}</div>`,
    ].join('\n');

    // ── SearchBar (HAR-2030): the public 44 px field with text and a submit button, and the
    // header field, empty ───────────────────────────────────────────────────────────────────
    const portalSearch = mount(h(ui.SearchBar, {
      size: 'lg', submitButton: true, label: 'Search services', placeholder: 'What do you need?', value: 'Printer', onValueChange: noop,
    }));
    const headerSearch = mount(h(ui.SearchBar, { label: 'Search the portal', placeholder: 'Search' }));
    const searchBar = [
      caption('Search bar (React <code>SearchBar</code>, <code>.uix-searchbar</code>) — one search field everywhere: a magnifier, a clear button while there is text, Enter searches, Escape clears; <code>lg</code> is the 44 px public field with a submit button, <code>md</code> the header and toolbar field'),
      '<div data-search-bar-example class="uix-stack" style="--gap:16px;max-width:36rem">',
      html(portalSearch), html(headerSearch),
      '</div>',
    ].join('\n');

    for (const { root, host } of roots) { act(() => root.unmount()); host.remove(); }
    return {
      'examples-form-controls': searchBar,
      'examples-overlays': [descriptionList, discard].join('\n'),
    };
  } finally {
    dom.window.close();
    for (const [name, descriptor] of saved) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
  }
}

/** The module text for a set of specimens: what the docs import. */
export const uxcSpecimenModule = (specimens) => `/* GENERATED by packages/react/scripts/render-uxc-specimens.mjs — do not edit by hand.
 * The docs specimens for the kit changes the TENSOR UX consistency audit of 2026-10-16 asked for
 * (UXC-01..04): the markup the built React components render, in the states named in each
 * caption. showcase-data.js appends each block to its route.
 * packages/react/src/uxc-specimens.test.mjs fails when this file and the components differ. */
export const UXC_SPECIMENS = ${JSON.stringify(specimens, null, 2)};
`;

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  writeFileSync(SPECIMEN_MODULE, uxcSpecimenModule(await renderUxcSpecimens()));
  console.log(`wrote ${SPECIMEN_MODULE}`);
}
