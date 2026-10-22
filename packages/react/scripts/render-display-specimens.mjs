// Regenerates packages/tokens/docs/display-specimens.js: the docs specimens for the display
// components of batch 5 (QrCode HAR-1251, CodeDisplay HAR-1253, ContactCard HAR-1379, EventRow HAR-1370, PrintLayout HAR-986, …), from the BUILT package, so the styleguide shows
// exactly the markup the components render (the precedent is render-uxc-specimens.mjs).
//
//   npm run build:react   (or: npm run build -w @tensor_1/react)
//   node packages/react/scripts/render-display-specimens.mjs
//
// packages/react/src/display-specimens.test.mjs fails when the committed module differs.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { JSDOM } from 'jsdom';
import { createElement as h, act } from 'react';

const here = dirname(fileURLToPath(import.meta.url));
export const SPECIMEN_MODULE = join(here, '../../tokens/docs/display-specimens.js');

const GLOBALS = ['window', 'document', 'navigator', 'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame', 'ResizeObserver', 'HTMLElement', 'IS_REACT_ACT_ENVIRONMENT'];

const caption = (text) => `<div class="uix-guide__subhead" data-display-specimen>${text}</div>`;

/** The fixed clock of the countdown specimens. */
export const SPECIMEN_NOW = Date.UTC(2026, 9, 22, 10, 0, 0);

/** The campaign URL the SHOPx poster carries (HAR-1251). */
export const CAMPAIGN_URL = 'https://shopx.example/kampanja/ljetna-akcija-2026?trgovina=SA-0042';

/**
 * Render every specimen. Returns `{ [route]: html }`. Installs a jsdom for the duration and
 * removes it again, so a test that imports this can own its own globals.
 */
export async function renderDisplaySpecimens() {
  const saved = new Map(GLOBALS.map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true, url: 'http://localhost/' });
  const { window } = dom;
  const expose = (name, value) => Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
  expose('window', window);
  expose('document', window.document);
  expose('navigator', window.navigator);
  expose('getComputedStyle', window.getComputedStyle.bind(window));
  expose('requestAnimationFrame', window.requestAnimationFrame.bind(window));
  expose('cancelAnimationFrame', window.cancelAnimationFrame.bind(window));
  expose('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  expose('HTMLElement', window.HTMLElement);
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
      if (!ids.has(id)) { nextId += 1; ids.set(id, `dsp-${nextId}`); }
      return ids.get(id);
    });
    const html = (el) => stable(el.innerHTML);
    const specimens = {};
    const add = (route, block) => { specimens[route] = specimens[route] ? `${specimens[route]}\n${block}` : block; };

    // ── QrCode (HAR-1251): the poster symbol, the smallest documented size, a voucher at H ────
    const poster = mount(h(ui.QrCode, { value: CAMPAIGN_URL, label: 'QR code: open the summer campaign', size: 160 }));
    const smallest = mount(h(ui.QrCode, { value: CAMPAIGN_URL, label: 'QR code: open the summer campaign', size: 90 }));
    const voucher = mount(h(ui.QrCode, { value: 'VOUCHER:2026-10-22:00042', label: 'Voucher QR code', errorCorrection: 'H', size: 120 }));
    add('examples-data-display', [
      caption('QR code (React <code>QrCode</code>, <code>.uix-qr-code</code>) — a scannable SVG with the four-module quiet zone, ink on paper in both themes, in print and in forced colours; the kit encodes it (byte mode, L/M/Q/H). Left to right: a poster at 160 px, the smallest documented size (2 px per module, 90 px for this 66-character URL), a voucher at error correction H'),
      '<div data-qr-code-example class="uix-cluster" style="--gap:24px;align-items:flex-end">',
      html(poster), html(smallest), html(voucher),
      '</div>',
    ].join('\n'));

    // ── CodeDisplay (HAR-1253): live with copy, the last minute, expired; the clock is fixed ──
    const realNow = Date.now;
    Date.now = () => SPECIMEN_NOW;
    try {
      const at = (seconds) => new Date(SPECIMEN_NOW + seconds * 1000).toISOString();
      const live = mount(h(ui.CodeDisplay, { code: 'K7Q4PX9MW', label: 'Till pairing code', expiresAt: at(582), copyable: true }));
      const soon = mount(h(ui.CodeDisplay, { code: 'K7Q4PX9MW', label: 'Till pairing code', expiresAt: at(45) }));
      const expired = mount(h(ui.CodeDisplay, { code: 'K7Q4PX9MW', label: 'Till pairing code', expiresAt: at(-60), copyable: true }));
      const large = mount(h(ui.CodeDisplay, { code: 'VCHR7Q4PXZ9M', groupSize: 4, size: 'lg', label: 'Voucher code' }));
      add('examples-data-display', [
        caption('Code display (React <code>CodeDisplay</code>, <code>.uix-code-display</code>) — a one-time code in large monospace groups, spelled character by character to a screen reader; an optional countdown turns to a warning in its last minute and ends in an expired state said in words; copy is a <code>CopyButton</code> while the code is live. Left to right: live with copy, the last minute, expired, a voucher at <code>size="lg"</code>'),
        '<div data-code-display-example class="uix-cluster" style="--gap:32px;align-items:flex-start">',
        html(live), html(soon), html(expired), html(large),
        '</div>',
      ].join('\n'));
    } finally {
      Date.now = realNow;
    }

    // ── ContactCard (HAR-1379): reachable, erased, unavailable ─────────────────────────────
    const person = mount(h(ui.ContactCard, {
      name: 'Amra Hadžić', role: 'Practice manager · Dom zdravlja Centar', avatar: h(ui.Avatar, { size: 'lg' }, 'AH'),
      email: 'amra.hadzic@dom-zdravlja.example', phone: '+387 61 234 567', href: '#contact-card',
    }));
    const erased = mount(h(ui.ContactCard, { name: 'Edin Kovačević', email: 'edin@example.com', state: 'purged' }));
    const unavailable = mount(h(ui.ContactCard, { name: 'Selma Đurđević', role: 'Supplier', state: 'unavailable' }));
    add('examples-crm-itsm', [
      caption('Contact card (React <code>ContactCard</code>, <code>.uix-contact</code>) — name, role, the address and number as text, and Email / Call as <code>mailto:</code> / <code>tel:</code> links named for the person; an erased contact (<code>state="purged"</code>) shows a neutral placeholder and nothing that reaches anyone; an unavailable one keeps its name and says why the rest is missing'),
      '<div data-contact-card-example style="display:grid;grid-template-columns:repeat(auto-fit,minmax(15rem,1fr));gap:16px">',
      html(person), html(erased), html(unavailable),
      '</div>',
    ].join('\n'));

    // ── EventRow (HAR-1370): weekday, year and time in the tile, a <time>, a 4:3 thumbnail ──
    const cover = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="160" height="120"><rect width="160" height="120" fill="#1447e6"/><circle cx="118" cy="38" r="22" fill="#fef3d6"/><path d="M0 120 52 62l38 34 26-20 44 44z" fill="#047857"/></svg>')}`;
    const events = mount(h('div', { className: 'uix-card', style: { maxWidth: '40rem' } }, h('div', { className: 'uix-card__body' },
      h(ui.EventRow, { month: 'Oct', day: '22', title: 'Reading club', meta: 'Reading room, first floor' }),
      h(ui.EventRow, {
        weekday: 'Wed', month: 'Oct', day: '22', year: '2026', time: '18:00', dateTime: '2026-10-22T18:00+02:00',
        title: h('a', { href: '#editorial-home' }, 'Book launch and conversation with the author'), meta: 'National library · free entry',
        media: h('img', { src: cover, alt: '' }),
      }),
      h(ui.EventRow, { month: 'Nov', day: '3', time: '09:30', title: 'Workshop: the digital catalogue', meta: 'Room 2' }))));
    add('examples-editorial-home', [
      caption('Event rows with the new slots (React <code>EventRow</code> <code>weekday</code>, <code>year</code>, <code>time</code>, <code>dateTime</code>, <code>media</code>) — the tile widens to its longest line and is a <code>&lt;time&gt;</code> with a machine date; the thumbnail is 4:3, cropped to fill, and goes under the text on a phone'),
      `<div data-event-row-example>${html(events)}</div>`,
    ].join('\n'));

    // ── PrintLayout (HAR-986): an A5 one-page document with a header, a footer and a signature ──
    // `isolate={false}`: printing the docs page must not print only this specimen.
    const printed = mount(h(ui.PrintLayout, {
      size: 'A5', singlePage: true, isolate: false,
      header: h('div', null, h('strong', null, 'Health centre, Sarajevo'), h('div', null, 'Findings and opinion')),
      footer: h('span', null, 'Dr. Amra Hadžić, paediatrician'),
    },
    h('h3', { style: { margin: 0 } }, 'Findings and opinion'),
    h(ui.DescriptionList, { items: [{ term: 'Patient', description: 'Lejla Mehmedbašić' }, { term: 'Examined', description: '22 Oct 2026' }] }),
    h('p', { style: { margin: 0 } }, 'Clinical findings and the plan, as the product composes them. On paper the header and footer repeat on every page and the page number is printed in the margin.'),
    h(ui.PrintSignature, { placeAndDate: 'Sarajevo, 22 Oct 2026', name: 'Dr. Amra Hadžić', stamp: true })));
    add('examples-prose', [
      caption('Print layout (React <code>PrintLayout</code>, <code>PrintSignature</code>, <code>PrintPageBreak</code>, <code>.uix-print-layout</code>) — an A4 or A5 page with the paper’s margins, ink on paper in both themes; when printed, only the documents print, the header and footer repeat on every page, the page number sits in the margin, and <code>singlePage</code> keeps a poster or readout in one piece (outlined here when it does not fit). This preview is an A5 single page'),
      `<div data-print-layout-example>${html(printed)}</div>`,
    ].join('\n'));

    for (const { root, host } of roots) { act(() => root.unmount()); host.remove(); }
    return specimens;
  } finally {
    dom.window.close();
    for (const [name, descriptor] of saved) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
  }
}

/** The module text for a set of specimens: what the docs import. */
export const displaySpecimenModule = (specimens) => `/* GENERATED by packages/react/scripts/render-display-specimens.mjs — do not edit by hand.
 * The docs specimens for the display components of batch 5 (QrCode, CodeDisplay, ContactCard, EventRow, PrintLayout, …): the markup the built
 * React components render, in the states named in each caption. showcase-data.js appends each
 * block to its route.
 * packages/react/src/display-specimens.test.mjs fails when this file and the components differ. */
export const DISPLAY_SPECIMENS = ${JSON.stringify(specimens, null, 2)};
`;

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  writeFileSync(SPECIMEN_MODULE, displaySpecimenModule(await renderDisplaySpecimens()));
  console.log(`wrote ${SPECIMEN_MODULE}`);
}
