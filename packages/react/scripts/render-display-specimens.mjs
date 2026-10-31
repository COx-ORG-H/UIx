// Regenerates packages/tokens/docs/display-specimens.js: the docs specimens for the display
// components of batch 5 (QrCode HAR-1251, CodeDisplay HAR-1253, ContactCard HAR-1379, EventRow HAR-1370, PrintLayout HAR-986, QrScanner HAR-1254, the resource day HAR-983, graph gaps HAR-1639), from the BUILT package, so the styleguide shows
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

    // ── MatrixInput (HAR-2752): levels, "not rated", an empty cell, help and an error ───────
    const criteria = [{ id: 'cost', label: 'Financial loss', description: 'Direct costs' }, { id: 'trust', label: 'Reputation' }, { id: 'law', label: 'Legal consequences' }];
    const horizons = [{ id: 'h4', label: '4 hours' }, { id: 'd1', label: '1 day' }, { id: 'd3', label: '3 days' }, { id: 'w1', label: '1 week' }];
    const levels = [
      { value: 'na', label: 'Not rated', unrated: true },
      { value: 'low', label: 'Low', tone: 'success' },
      { value: 'mid', label: 'Medium', tone: 'warning' },
      { value: 'high', label: 'High', tone: 'attention' },
      { value: 'top', label: 'Critical', tone: 'danger' },
    ];
    const matrixCell = (row, column) => {
      if (row === 'trust' && column === 'd1') return { help: 'Weigh the effect on customers and the press.' };
      if (row === 'trust' && column === 'd3') return { error: 'Choose a level.' };
      if (row === 'law' && column === 'h4') return { readOnly: true };
      return undefined;
    };
    const matrixInput = mount(h(ui.MatrixInput, {
      'aria-label': 'Impact per criterion over time',
      rows: criteria,
      columns: horizons,
      options: levels,
      value: { cost: { h4: 'low', d1: 'mid', d3: 'high', w1: 'top' }, trust: { h4: 'na' } },
      rowAxisLabel: 'Criterion',
      columnAxisLabel: 'Outage',
      labels: { empty: 'Choose' },
      getCell: matrixCell,
      onChange: () => {},
    }));
    add('examples-data-display', [
      caption('Matrix input (React <code>MatrixInput</code>, <code>.uix-matrix--input</code>) — a choice per row and column, filled from the keyboard: one tab stop, arrow keys between cells, Enter opens the choice. Here: levels with their words, "Not rated", an empty cell, a cell with help (the corner mark), one with an error and one read-only.'),
      '<div data-matrix-example>',
      html(matrixInput),
      '</div>',
    ].join('\n'));

    // ── MatrixHeatmap (HAR-2753): every band, a zero, a hidden zero, empty cells ─────────────
    const band = {
      low: { label: 'Low', tone: 'success' },
      mid: { label: 'Medium', tone: 'warning' },
      high: { label: 'High', tone: 'attention' },
      top: { label: 'Critical', tone: 'danger' },
      none: { label: 'None', tone: 'neutral' },
    };
    const matrixHeatmap = mount(h(ui.MatrixHeatmap, {
      'aria-label': 'Risks by impact and likelihood',
      rows: [{ id: 'severe', label: 'Severe' }, { id: 'moderate', label: 'Moderate' }, { id: 'minor', label: 'Minor' }],
      columns: [{ id: 'rare', label: 'Rare' }, { id: 'possible', label: 'Possible' }, { id: 'likely', label: 'Likely' }, { id: 'certain', label: 'Almost certain' }],
      cells: [
        { rowId: 'severe', columnId: 'rare', count: 2, band: band.mid },
        { rowId: 'severe', columnId: 'possible', count: 5, band: band.high },
        { rowId: 'severe', columnId: 'likely', count: 12, band: band.top },
        { rowId: 'severe', columnId: 'certain', count: 4, band: band.top },
        { rowId: 'moderate', columnId: 'rare', count: 0, band: band.low },
        { rowId: 'moderate', columnId: 'possible', count: 3, band: band.mid },
        { rowId: 'moderate', columnId: 'likely', count: 7, band: band.high },
        { rowId: 'minor', columnId: 'rare', count: 0, band: band.none, hideCount: true },
        { rowId: 'minor', columnId: 'possible', count: 1, band: band.low },
      ],
      rowAxisLabel: 'Impact',
      columnAxisLabel: 'Likelihood',
      labels: { empty: 'No data' },
    }));
    add('examples-data-display', [
      caption('Matrix heatmap (React <code>MatrixHeatmap</code>, <code>.uix-matrix--heatmap</code>) — how many items sit in each cell, its named band, and a way to the items behind it. Every cell is one control. A zero shows as "0"; "None" is a zero the caller chose to hide; a dashed cell has no data at all.'),
      '<div data-matrix-example>',
      html(matrixHeatmap),
      '</div>',
    ].join('\n'));

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

    // ── QrScanner (HAR-1254): idle (the explainer first), camera blocked, no camera API ──────
    // jsdom has no camera: each specimen gets the navigator it needs while it renders.
    const camera = (value) => Object.defineProperty(window.navigator, 'mediaDevices', { configurable: true, value });
    const scannerProps = {
      autoStart: false, decode: () => null, onResult: () => {},
      explainer: h('p', { style: { margin: 0 } }, 'The camera reads the voucher. The picture never leaves this device.'),
      manualEntry: h(ui.Field, { label: 'Voucher code' }, h(ui.Input, { id: 'specimen-manual-code' })),
    };
    camera({ getUserMedia: () => new Promise(() => {}) });
    const idle = mount(h(ui.QrScanner, scannerProps));
    camera({ getUserMedia: () => Promise.reject(Object.assign(new Error('blocked'), { name: 'NotAllowedError' })) });
    const denied = mount(h(ui.QrScanner, { ...scannerProps, manualEntry: h(ui.Field, { label: 'Voucher code' }, h(ui.Input, { id: 'specimen-manual-code-2' })) }));
    await act(async () => { [...denied.querySelectorAll('button')].find((b) => b.textContent === 'Use the camera').click(); });
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    camera(undefined);
    const unsupported = mount(h(ui.QrScanner, { ...scannerProps, manualEntry: h(ui.Field, { label: 'Voucher code' }, h(ui.Input, { id: 'specimen-manual-code-3' })) }));
    add('examples-form-controls', [
      caption('QR scanner (React <code>QrScanner</code>, <code>.uix-qr-scanner</code>) — a camera viewfinder for the product’s own decoder: it says why it wants the camera before the browser asks, says plainly when the camera is blocked, missing or unsupported and how to go on, and always keeps the manual field. Frames go to <code>decode</code> only. Left to right: before the camera starts, camera blocked, no camera API'),
      '<div data-qr-scanner-example class="uix-cluster" style="--gap:24px;align-items:flex-start">',
      `<div style="width:20rem;max-width:100%">${html(idle)}</div>`, `<div style="width:20rem;max-width:100%">${html(denied)}</div>`, `<div style="width:20rem;max-width:100%">${html(unsupported)}</div>`,
      '</div>',
    ].join('\n'));

    // ── SchedulingCalendar resource day (HAR-983): three practitioners, free / booked / off and no schedule ──
    const day = '2026-10-22';
    const at = (time) => new Date(`${day}T${time}:00+02:00`).toISOString();
    const people = [
      { id: 'p1', label: 'Dr. Amra Hadžić', description: 'Paediatrics' },
      { id: 'p2', label: 'Dr. Edin Kovačević', description: 'General practice' },
      { id: 'p3', label: 'Dr. Selma Đurđević', description: 'Paediatrics' },
    ];
    const spans = [
      { id: 'a1', resourceId: 'p1', start: at('08:00'), end: at('09:00'), kind: 'free' },
      { id: 'a2', resourceId: 'p1', start: at('09:00'), end: at('09:30'), kind: 'booked', label: 'Lejla M.' },
      { id: 'a3', resourceId: 'p1', start: at('09:30'), end: at('10:00'), kind: 'free' },
      { id: 'b1', resourceId: 'p2', start: at('08:00'), end: at('08:30'), kind: 'booked', label: 'Kenan S.' },
      { id: 'b2', resourceId: 'p2', start: at('08:30'), end: at('09:30'), kind: 'free' },
      { id: 'b3', resourceId: 'p2', start: at('09:30'), end: at('10:00'), kind: 'off', label: 'Break' },
      { id: 'c1', resourceId: 'p3', start: at('09:00'), end: at('10:00'), kind: 'free' },
    ];
    const resourceDay = mount(h(ui.SchedulingCalendar, {
      entries: [], anchorDate: day, timeZone: 'Europe/Sarajevo', view: 'day', showHeader: false, legend: [],
      resources: people, resourceSpans: spans, dayStart: '08:00', dayEnd: '10:00', resourceLayout: 'columns', onSelectSlot: () => {},
      // a fixed date text: Intl's default locale differs between machines (en-GB here, en-US on CI)
      formatDate: () => 'Thursday, 22 October 2026',
    }));
    add('examples-data-display', [
      caption('Day view by resource (React <code>SchedulingCalendar view="day" resources</code>) — one column per practitioner on a slot axis in the tenant’s zone; free spans are cut into bookable slots, bookings and time off stay whole, and time no span covers is hatched “no schedule”, never free. One tab stop; arrows move between slots and practitioners; below 480 px it is a list'),
      `<div data-resource-day-example style="max-width:48rem">${html(resourceDay)}</div>`,
    ].join('\n'));

    // ── RelationshipGraph gaps (HAR-1639): a missing relation, toned nodes, a legend that matches ──
    const k3 = mount(h(ui.RelationshipGraph, {
      layout: 'layered', controls: 'none', edgeLabels: 'always', height: '16rem', clusterThreshold: 0, showList: false,
      nodes: [
        { id: 'k1', label: 'Control K3.1', type: 'Control', depth: 0 },
        { id: 'k2', label: 'Control K3.2', type: 'Control', depth: 0 },
        { id: 'pay', label: 'Payments API', type: 'Application', tone: 'success', description: 'evidence present', depth: 1 },
        { id: 'ledger', label: 'Ledger database', type: 'Database', tone: 'danger', description: 'evidence missing', depth: 2 },
      ],
      edges: [
        { id: 'k1-pay', source: 'k1', target: 'pay', label: 'covers' },
        { id: 'pay-ledger', source: 'pay', target: 'ledger', label: 'writes to' },
        { id: 'k2-ledger', source: 'k2', target: 'ledger', label: 'covers', variant: 'dashed', tone: 'danger', description: 'expected, missing' },
      ],
      legend: [
        { id: 'missing', label: 'Expected, missing', tone: 'danger', variant: 'dashed' },
        { id: 'present', label: 'Evidence present', tone: 'success', shape: 'node' },
        { id: 'absent', label: 'Evidence missing', tone: 'danger', shape: 'node' },
      ],
    }));
    add('examples-data-display', [
      caption('Gaps on the map (React <code>RelationshipGraph</code> edge <code>variant</code> / <code>tone</code> / <code>description</code>, node <code>tone</code>, legend <code>tone</code> / <code>shape</code> / <code>variant</code>, <code>controls="none"</code>) — an expected relation that is missing is a dashed danger edge, crossing a column in a channel under it; nodes carry their state as a tone and in words; no root border in a map with several starting points; each node says its relationships to a screen reader'),
      `<div data-graph-gaps-example style="max-width:44rem">${html(k3)}</div>`,
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
 * The docs specimens for the display components of batch 5 (QrCode, CodeDisplay, ContactCard, EventRow, PrintLayout, QrScanner): the markup the built
 * React components render, in the states named in each caption. showcase-data.js appends each
 * block to its route.
 * packages/react/src/display-specimens.test.mjs fails when this file and the components differ. */
export const DISPLAY_SPECIMENS = ${JSON.stringify(specimens, null, 2)};
`;

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  writeFileSync(SPECIMEN_MODULE, displaySpecimenModule(await renderDisplaySpecimens()));
  console.log(`wrote ${SPECIMEN_MODULE}`);
}
