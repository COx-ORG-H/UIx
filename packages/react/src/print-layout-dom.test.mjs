/* PrintLayout, PrintSignature, PrintPageBreak (HAR-986, HAR-1252) in jsdom: the markup the print
 * stylesheet relies on.
 *
 * - the frame names its named page (`data-page`), size, orientation, isolate and single-page;
 * - the header, body and footer are separate parts (the print stylesheet repeats the first and last);
 * - a single page reports an overflow once, and again only when it changes; a page that fits
 *   reports nothing;
 * - PrintSignature: its caption from UixLabelsProvider `printLayout`, an explicit label wins;
 *   the stamp box only when asked.
 *
 * tests/a11y/print-layout.spec.mjs prints a real PDF in Chromium. Renders the BUILT dist — run
 * `npm run build` first; CI does.
 */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement as h, act } from 'react';

let dom;
let createRoot;
let ui;
let observers = [];
let frames = [];
let created = 0;

const expose = (name, value) => Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });

before(async () => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true });
  expose('window', dom.window);
  expose('document', dom.window.document);
  expose('navigator', dom.window.navigator);
  expose('IS_REACT_ACT_ENVIRONMENT', true);
  // a ResizeObserver the test can fire, and a frame that runs at once
  expose('ResizeObserver', class { constructor(callback) { created += 1; this.callback = callback; observers.push(this); } observe() {} unobserve() {} disconnect() { observers = observers.filter((o) => o !== this); } });
  // frames run when the test says, as a browser runs them after the observer's callback
  expose('requestAnimationFrame', (fn) => { frames.push(fn); return frames.length; });
  expose('cancelAnimationFrame', () => {});
  ({ createRoot } = await import('react-dom/client'));
  ui = await import('../dist/index.js');
});

after(() => {
  dom.window.close();
  for (const name of ['window', 'document', 'navigator', 'IS_REACT_ACT_ENVIRONMENT', 'ResizeObserver', 'requestAnimationFrame', 'cancelAnimationFrame']) delete globalThis[name];
});

const mount = (element) => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(element));
  return { host, unmount: () => { act(() => root.unmount()); host.remove(); } };
};
/** jsdom has no layout: give the page box a height and its content a scroll height. */
/** A resize: every observer's callback, then the frame it asked for. */
const resize = () => act(() => {
  observers.forEach((o) => o.callback([]));
  const due = frames;
  frames = [];
  due.forEach((fn) => fn(0));
});
const sizePage = (page, { content, box }) => {
  Object.defineProperty(page, 'scrollHeight', { configurable: true, get: () => content });
  Object.defineProperty(page, 'clientHeight', { configurable: true, get: () => box });
};

test('the frame: A4 portrait by default, its parts, isolate and page numbers', () => {
  const { host, unmount } = mount(h(ui.PrintLayout, { header: 'Dom zdravlja Centar', footer: 'Stranica' }, h('p', null, 'Nalaz')));
  const frame = host.querySelector('.uix-print-layout');
  assert.equal(host.firstElementChild.className, 'uix-print-preview', 'the page sits in its preview box');
  assert.equal(frame.className, 'uix-print-layout');
  assert.deepEqual({ ...frame.dataset }, { size: 'A4', orientation: 'portrait', page: 'uix-print-a4', isolate: '' });
  // a layout table: Chromium repeats a real <thead> and <tfoot> on every printed page
  const page = frame.firstElementChild;
  assert.equal(page.tagName, 'TABLE');
  assert.equal(page.className, 'uix-print-layout__page');
  assert.equal(page.getAttribute('role'), 'presentation');
  assert.deepEqual([...page.children].map((part) => `${part.tagName} ${part.className}`), ['THEAD uix-print-layout__header', 'TBODY uix-print-layout__main', 'TFOOT uix-print-layout__footer']);
  assert.equal(page.querySelector('td.uix-print-layout__body').textContent, 'Nalaz');
  assert.equal(page.querySelector('thead .uix-print-layout__bar').textContent, 'Dom zdravlja Centar');
  assert.equal(page.querySelector('tfoot .uix-print-layout__bar').textContent, 'Stranica');
  unmount();
});

test('the named page follows size, orientation, page numbers and single page', () => {
  const page = (props) => {
    const { host, unmount } = mount(h(ui.PrintLayout, props, 'x'));
    const value = host.querySelector('.uix-print-layout').dataset.page;
    unmount();
    return value;
  };
  assert.equal(page({ size: 'A5' }), 'uix-print-a5');
  assert.equal(page({ size: 'A5', orientation: 'landscape' }), 'uix-print-a5-landscape');
  assert.equal(page({ pageNumbers: false }), 'uix-print-a4-plain');
  assert.equal(page({ size: 'A4', orientation: 'landscape', singlePage: true }), 'uix-print-a4-landscape-plain');
  const { host, unmount } = mount(h(ui.PrintLayout, { isolate: false }, 'x'));
  assert.equal(host.querySelector('.uix-print-layout').hasAttribute('data-isolate'), false);
  assert.equal(host.querySelector('.uix-print-layout__header'), null, 'no header part without a header');
  unmount();
});

test('single page: an overflow is outlined and reported once; fitting again is reported once', () => {
  observers = [];
  frames = [];
  const seen = [];
  const { host, unmount } = mount(h(ui.PrintLayout, { size: 'A5', singlePage: true, onOverflowChange: (value) => seen.push(value) }, h('p', null, 'Poster')));
  const frame = host.querySelector('.uix-print-layout');
  assert.equal(frame.dataset.singlePage, '');
  assert.deepEqual(seen, [], 'a page that fits reports nothing');
  const page = frame.querySelector('.uix-print-layout__page');
  sizePage(page, { content: 900, box: 794 });
  resize();
  resize();
  assert.equal(frame.hasAttribute('data-overflowing'), true);
  assert.deepEqual(seen, [true], 'reported once');
  sizePage(page, { content: 700, box: 794 });
  resize();
  assert.equal(frame.hasAttribute('data-overflowing'), false);
  assert.deepEqual(seen, [true, false]);
  unmount();
});

test('single page: new children re-measure without a new observer (one subscription per page shape)', () => {
  observers = [];
  frames = [];
  const seen = [];
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  const render = (text) => act(() => root.render(h(ui.PrintLayout, { size: 'A5', singlePage: true, onOverflowChange: (value) => seen.push(value) }, h('p', null, text))));
  render('Poster 1');
  const before = created;
  for (let i = 2; i <= 5; i += 1) render(`Poster ${i}`);
  assert.equal(created, before, 'no observer was created again by a new child');
  // the kept observer still measures the new content
  const page = host.querySelector('.uix-print-layout__page');
  sizePage(page, { content: 900, box: 794 });
  resize();
  assert.deepEqual(seen, [true]);
  act(() => root.unmount());
  host.remove();
});

test('PrintSignature: words from the provider, an explicit label wins; the stamp only when asked', () => {
  const tree = h(ui.UixLabelsProvider, { labels: { printLayout: { signature: 'Potpis ljekara', stamp: 'Pečat' } } },
    h(ui.PrintSignature, { name: 'dr. Amra Hadžić', placeAndDate: 'Sarajevo, 22. 10. 2026.', stamp: true }),
    h(ui.PrintSignature, { label: 'Potpis pacijenta' }));
  const { host, unmount } = mount(tree);
  const [doctor, patient] = host.querySelectorAll('.uix-print-signature');
  assert.equal(doctor.querySelector('.uix-print-signature__caption').textContent, 'Potpis ljekara');
  assert.equal(doctor.querySelector('.uix-print-signature__name').textContent, 'dr. Amra Hadžić');
  assert.equal(doctor.querySelector('.uix-print-signature__place').textContent, 'Sarajevo, 22. 10. 2026.');
  assert.equal(doctor.querySelector('.uix-print-signature__stamp').textContent, 'Pečat');
  assert.equal(doctor.querySelector('.uix-print-signature__line').getAttribute('aria-hidden'), 'true');
  assert.equal(patient.querySelector('.uix-print-signature__caption').textContent, 'Potpis pacijenta');
  assert.equal(patient.querySelector('.uix-print-signature__stamp'), null);
  unmount();
  const english = mount(h(ui.PrintSignature, {}));
  assert.equal(english.host.querySelector('.uix-print-signature__caption').textContent, 'Signature');
  english.unmount();
});

test('PrintPageBreak is a presentational divider', () => {
  const { host, unmount } = mount(h(ui.PrintPageBreak, { className: 'x' }));
  assert.equal(host.firstElementChild.outerHTML, '<div class="uix-print-break x" role="presentation"></div>');
  unmount();
});
