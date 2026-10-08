/* CollapsibleSection and Steps for TENSOR's detail sections and intake steps (HAR-1628), in jsdom:
 *   - `defaultOpen` with `persistKey`: what was remembered wins over the starting state, and a
 *     passed `open` no longer defeats it at mount (it still wins when the parent changes it);
 *   - `persistStorage`: sessionStorage (default) or localStorage;
 *   - `openRequest` already set at mount opens the section, and every request focuses the summary;
 *   - `compact` + `headingLevel`: a quiet row whose title is a heading and whose body is a region;
 *   - `<Steps progress={false}>`: steps that hold content, with no state drawn or announced;
 *   - `DescriptionItem termProps`, and `PromptDialog` / `ConfirmDialog` without `closeLabel`.
 * The earlier behaviour (lazy bodies, the plain markup, progress steps) is in
 * batch-a-dom.test.mjs. Renders the BUILT dist — run `npm run build` first.
 */
import test, { before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement as h, act } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

let dom;
let createRoot;
let ui;

const EXPOSED = ['window', 'document', 'navigator', 'getComputedStyle', 'requestAnimationFrame', 'IS_REACT_ACT_ENVIRONMENT'];
const expose = (name, value) => Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });

before(async () => {
  // A real origin, so the storages work (an opaque about:blank origin throws on access).
  dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true, url: 'http://localhost/' });
  const { window } = dom;
  expose('window', window);
  expose('document', window.document);
  expose('navigator', window.navigator);
  expose('getComputedStyle', window.getComputedStyle.bind(window));
  expose('requestAnimationFrame', window.requestAnimationFrame.bind(window));
  expose('IS_REACT_ACT_ENVIRONMENT', true);
  const dialog = window.HTMLDialogElement.prototype;
  dialog.showModal = function showModal() { this.setAttribute('open', ''); };
  dialog.close = function close() { this.removeAttribute('open'); };
  ({ createRoot } = await import('react-dom/client'));
  ui = await import('../dist/index.js');
});

after(() => {
  dom.window.close();
  for (const name of EXPOSED) delete globalThis[name];
});

beforeEach(() => {
  window.sessionStorage.clear();
  window.localStorage.clear();
});

const mount = (element) => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(element));
  return { host, rerender: (next) => act(() => root.render(next)), unmount: () => { act(() => root.unmount()); host.remove(); } };
};
const frame = () => act(() => new Promise((resolve) => setTimeout(resolve, 40)));
/** What a click on the summary does in a browser: flip `open`, then fire `toggle`. */
const toggle = (details) => act(() => { details.open = !details.open; details.dispatchEvent(new window.Event('toggle')); });
const KEY = 'uix:collapsible:';

// ── CollapsibleSection ───────────────────────────────────────────────────────

test('defaultOpen: open at first render, in the plain and the stateful section, and in server HTML', async () => {
  const plain = renderToStaticMarkup(h(ui.CollapsibleSection, { title: 'SLA', defaultOpen: true }, 'Body'));
  assert.match(plain, /^<details class="uix-collapsible" open="">/);
  const remembered = renderToStaticMarkup(h(ui.CollapsibleSection, { title: 'SLA', defaultOpen: true, persistKey: 'sla' }, 'Body'));
  assert.match(remembered, /^<details class="uix-collapsible" open="">/, 'the server HTML uses the default');
  assert.doesNotMatch(renderToStaticMarkup(h(ui.CollapsibleSection, { title: 'SLA' }, 'Body')), / open/);

  const { host, unmount } = mount(h(ui.CollapsibleSection, { title: 'SLA', defaultOpen: true, persistKey: 'fresh' }, 'Body'));
  await frame();
  assert.equal(host.querySelector('details').open, true, 'nothing remembered yet: the default applies');
  unmount();
});

test('defaultOpen + persistKey: what the person chose wins over the default, in both directions', async () => {
  // default open, remembered closed
  window.sessionStorage.setItem(`${KEY}a`, '0');
  const a = mount(h(ui.CollapsibleSection, { title: 'A', defaultOpen: true, persistKey: 'a' }, 'Body'));
  await frame();
  assert.equal(a.host.querySelector('details').open, false, 'remembered closed beats defaultOpen');
  // A browser fires `toggle` for the attribute changes React itself made (mounted open, then
  // closed by the remembered state). Those echoes must not be stored as the person's choice.
  act(() => a.host.querySelector('details').dispatchEvent(new window.Event('toggle')));
  assert.equal(window.sessionStorage.getItem(`${KEY}a`), '0', 'an echo of our own render does not overwrite the remembered state');
  assert.equal(a.host.querySelector('details').open, false);
  // the choice is remembered for the next mount
  toggle(a.host.querySelector('details'));
  assert.equal(window.sessionStorage.getItem(`${KEY}a`), '1');
  a.unmount();
  const again = mount(h(ui.CollapsibleSection, { title: 'A', defaultOpen: false, persistKey: 'a' }, 'Body'));
  await frame();
  assert.equal(again.host.querySelector('details').open, true, 'remembered open beats a closed default');
  again.unmount();
});

test('a passed open no longer defeats the remembered state at mount, and still wins when the parent changes it', async () => {
  window.sessionStorage.setItem(`${KEY}b`, '0');
  const Section = ({ open }) => h(ui.CollapsibleSection, { title: 'B', open, persistKey: 'b' }, 'Body');
  const { host, rerender, unmount } = mount(h(Section, { open: true }));
  await frame();
  const details = host.querySelector('details');
  assert.equal(details.open, false, 'in 2.31.0 `open` overrode the stored state on mount');
  rerender(h(Section, { open: true }));
  await frame();
  assert.equal(details.open, false, 'the same value again is not a change');
  rerender(h(Section, { open: false }));
  rerender(h(Section, { open: true }));
  await frame();
  assert.equal(details.open, true, 'a change from the parent applies');
  unmount();
});

test('persistStorage: sessionStorage by default, localStorage on request, never both', async () => {
  const session = mount(h(ui.CollapsibleSection, { title: 'S', persistKey: 's' }, 'Body'));
  toggle(session.host.querySelector('details'));
  assert.equal(window.sessionStorage.getItem(`${KEY}s`), '1');
  assert.equal(window.localStorage.getItem(`${KEY}s`), null);
  session.unmount();

  const local = mount(h(ui.CollapsibleSection, { title: 'L', persistKey: 'l', persistStorage: 'local' }, 'Body'));
  toggle(local.host.querySelector('details'));
  assert.equal(window.localStorage.getItem(`${KEY}l`), '1');
  assert.equal(window.sessionStorage.getItem(`${KEY}l`), null);
  local.unmount();

  // read back from localStorage on the next mount ("across sessions": sessionStorage is empty)
  window.sessionStorage.clear();
  const next = mount(h(ui.CollapsibleSection, { title: 'L', persistKey: 'l', persistStorage: 'local' }, 'Body'));
  await frame();
  assert.equal(next.host.querySelector('details').open, true);
  // and a section reading the other storage does not see it
  const other = mount(h(ui.CollapsibleSection, { title: 'L', persistKey: 'l' }, 'Body'));
  await frame();
  assert.equal(other.host.querySelector('details').open, false);
  next.unmount();
  other.unmount();
});

test('openRequest set at mount opens the section, mounts a lazy body and focuses the summary', async () => {
  window.sessionStorage.setItem(`${KEY}deep`, '0');
  const scrolled = [];
  window.HTMLElement.prototype.scrollIntoView = function scrollIntoView(options) { scrolled.push([this.tagName, options]); };
  const { host, unmount } = mount(h(ui.CollapsibleSection, { title: 'SLA', lazy: true, persistKey: 'deep', openRequest: 1728374400000 }, h('p', null, 'Chart')));
  await frame();
  const details = host.querySelector('details');
  assert.equal(details.open, true, 'a deep link that lands on a closed section opens it');
  assert.equal(host.querySelector('.uix-collapsible__body p')?.textContent, 'Chart');
  assert.equal(window.sessionStorage.getItem(`${KEY}deep`), '1');
  assert.equal(document.activeElement, host.querySelector('summary'), 'focus is on the summary');
  assert.deepEqual(scrolled, [['DETAILS', { block: 'nearest' }]]);
  unmount();
  delete window.HTMLElement.prototype.scrollIntoView;
});

test('openRequest: undefined and 0 at mount are not requests; each later value opens and focuses', async () => {
  const Section = ({ request }) => h(ui.CollapsibleSection, { title: 'SLA', openRequest: request }, 'Body');
  const zero = mount(h(Section, { request: 0 }));
  await frame();
  assert.equal(zero.host.querySelector('details').open, false, 'a counter that starts at 0 opens nothing');
  assert.notEqual(document.activeElement, zero.host.querySelector('summary'));

  zero.rerender(h(Section, { request: 1 }));
  await frame();
  const details = zero.host.querySelector('details');
  assert.equal(details.open, true);
  assert.equal(document.activeElement, zero.host.querySelector('summary'));

  // closed by hand, focus moved away, then requested again
  toggle(details);
  document.body.focus();
  zero.host.querySelector('summary').blur();
  zero.rerender(h(Section, { request: 2 }));
  await frame();
  assert.equal(details.open, true);
  assert.equal(document.activeElement, zero.host.querySelector('summary'));
  zero.unmount();
});

test('compact + headingLevel: a quiet row, the title a heading, the body a region named by it', () => {
  const html = renderToStaticMarkup(h(ui.CollapsibleSection, { title: 'Attachments', summary: '3 files', compact: true, headingLevel: 3 }, 'Body'));
  const doc = new dom.window.DOMParser().parseFromString(html, 'text/html');
  const details = doc.querySelector('details');
  assert.equal(details.className, 'uix-collapsible uix-collapsible--compact');
  const heading = details.querySelector('summary > h3');
  assert.ok(heading, 'the heading is a direct child of the summary (the one block a summary may hold)');
  assert.equal(heading.className, 'uix-collapsible__heading');
  const title = heading.querySelector('.uix-collapsible__title');
  assert.equal(title.textContent, 'Attachments');
  assert.equal(heading.querySelector('.uix-collapsible__meta').textContent, '3 files');
  const body = details.querySelector('.uix-collapsible__body');
  assert.equal(body.getAttribute('role'), 'region');
  assert.equal(body.getAttribute('aria-labelledby'), title.id);
  assert.ok(title.id);

  for (const level of [2, 4, 5, 6]) {
    assert.match(renderToStaticMarkup(h(ui.CollapsibleSection, { title: 'T', headingLevel: level }, 'x')), new RegExp(`<h${level} class="uix-collapsible__heading">`));
  }
  // compact alone changes only the class; the stateful section takes both props as well
  const quiet = renderToStaticMarkup(h(ui.CollapsibleSection, { title: 'T', compact: true }, 'x'));
  assert.match(quiet, /^<details class="uix-collapsible uix-collapsible--compact">/);
  assert.doesNotMatch(quiet, /role="region"|<h\d/);
  const stateful = renderToStaticMarkup(h(ui.CollapsibleSection, { title: 'T', compact: true, headingLevel: 4, persistKey: 'k' }, 'x'));
  assert.match(stateful, /uix-collapsible--compact/);
  assert.match(stateful, /<h4 class="uix-collapsible__heading">/);
  assert.match(stateful, /role="region" aria-labelledby="/);
  // none of the new props leaks onto the <details>
  const leak = renderToStaticMarkup(h(ui.CollapsibleSection, { title: 'T', compact: true, headingLevel: 3, defaultOpen: true, persistStorage: 'local', persistKey: 'k' }, 'x'));
  assert.doesNotMatch(leak, /persiststorage|headinglevel|defaultopen|compact=/i);
});

// ── Steps ────────────────────────────────────────────────────────────────────

test('Steps progress={false}: numbered sections that hold content, with no state drawn or announced', () => {
  const html = renderToStaticMarkup(h(ui.Steps, { progress: false, label: 'New change', headingLevel: 2 },
    h(ui.Step, { title: 'What is changing', description: 'One sentence is enough.' }, h('input', { 'aria-label': 'Summary' })),
    h(ui.Step, { title: 'When', state: 'current' }, h('p', null, 'Pick a window')),
    h(ui.Step, { title: 'Risk', state: 'error', href: '/x' })));
  const doc = new dom.window.DOMParser().parseFromString(html, 'text/html');
  const list = doc.querySelector('ol');
  assert.equal(list.getAttribute('aria-label'), 'New change');
  assert.equal(list.className, 'uix-steps uix-steps--list uix-steps--vertical uix-steps--sections', 'content steps are always vertical');
  const steps = [...list.querySelectorAll('li.uix-step')];
  assert.equal(steps.length, 3);
  for (const step of steps) {
    assert.equal(step.hasAttribute('data-state'), false, 'no state styling');
    assert.equal(step.hasAttribute('aria-current'), false, 'no current step');
    assert.equal(step.querySelector('.uix-visually-hidden'), null, 'no state word for a screen reader');
    assert.equal(step.querySelector('a, button.uix-step__action'), null, 'a heading title is never wrapped in a link or button');
  }
  assert.deepEqual(steps.map((s) => s.querySelector('.uix-step__marker').textContent), ['1', '2', '3'], 'the number, never ✓ or !');
  const [first, second, third] = steps;
  const title = first.querySelector('h2.uix-step__title');
  assert.equal(title.textContent, 'What is changing');
  const content = first.querySelector('.uix-step__content');
  assert.equal(content.getAttribute('role'), 'group');
  assert.equal(content.getAttribute('aria-labelledby'), title.id);
  assert.ok(content.querySelector('input[aria-label="Summary"]'), 'the children are rendered');
  assert.equal(first.querySelector('.uix-step__desc').textContent, 'One sentence is enough.');
  assert.equal(second.querySelector('.uix-step__content p').textContent, 'Pick a window');
  assert.equal(third.querySelector('.uix-step__content'), null, 'no empty content group');
  assert.equal(doc.querySelectorAll('.uix-step__connector[data-done]').length, 0);
});

test('Steps as a progress indicator is unchanged: state words, aria-current, the same markup as 2.31.0', () => {
  const html = renderToStaticMarkup(h(ui.Steps, { label: 'Intake' },
    h(ui.Step, { title: 'Scan', state: 'complete' }),
    h(ui.Step, { title: 'Review', state: 'current', description: 'Check the metadata' }),
    h(ui.Step, { title: 'Shelve', state: 'waiting' })));
  assert.match(html, /^<ol aria-label="Intake" class="uix-steps uix-steps--list uix-steps--horizontal">/);
  assert.match(html, /<li class="uix-step" data-state="done"><span class="uix-step__marker" aria-hidden="true"><svg/);
  assert.match(html, /<span class="uix-step__text"><span class="uix-step__action"><span class="uix-step__title">Scan<\/span><span class="uix-visually-hidden">, Completed<\/span><\/span><\/span>/);
  assert.match(html, /data-state="active" aria-current="step"/);
  assert.match(html, /Review<\/span><span class="uix-visually-hidden">, Current step<\/span>/);
  assert.doesNotMatch(html, /uix-step__content|uix-steps--sections/);
});

// ── DescriptionItem, dialogs ─────────────────────────────────────────────────

test('DescriptionItem and DescriptionList items take <dt> and <dd> attributes', () => {
  const html = renderToStaticMarkup(h(ui.DescriptionList, {
    items: [{ term: 'Zone', description: 'Europe/Sarajevo', termProps: { id: 'setting-zone' }, descriptionProps: { 'data-setting': 'zone' } }],
  }, h(ui.DescriptionItem, { term: 'Retention', termProps: { id: 'setting-retention', 'data-setting-id': 'audit.retention', className: 'anchor' }, descriptionProps: { title: 'days' } }, '90')));
  assert.match(html, /<dt id="setting-zone">Zone<\/dt><dd data-setting="zone">Europe\/Sarajevo<\/dd>/);
  assert.match(html, /<dt id="setting-retention" data-setting-id="audit\.retention" class="anchor">Retention<\/dt><dd title="days">90<\/dd>/);
  assert.match(renderToStaticMarkup(h(ui.DescriptionList, null, h(ui.DescriptionItem, { term: 'A' }, 'b'))), /<dt>A<\/dt><dd>b<\/dd>/, 'unchanged without them');
});

test('PromptDialog and ConfirmDialog need no closeLabel: the labels provider, then the default, names the button', async () => {
  const noop = () => {};
  const prompt = (extra) => h(ui.PromptDialog, { open: true, title: 'Rename', inputLabel: 'Name', submitLabel: 'Save', cancelLabel: 'Cancel', onSubmit: noop, onCancel: noop, ...extra });
  const confirm = (extra) => h(ui.ConfirmDialog, { open: true, title: 'Delete?', confirmLabel: 'Delete', cancelLabel: 'Cancel', onConfirm: noop, onCancel: noop, ...extra });
  const closeName = (view) => view.host.querySelector('.uix-dialog__close').getAttribute('aria-label');

  for (const dialog of [prompt, confirm]) {
    const bare = mount(dialog());
    await frame();
    assert.equal(closeName(bare), 'Close dialog');
    bare.unmount();
    const provided = mount(h(ui.UixLabelsProvider, { labels: { modal: { close: 'Dialog schließen' } } }, dialog()));
    await frame();
    assert.equal(closeName(provided), 'Dialog schließen');
    provided.unmount();
    const explicit = mount(h(ui.UixLabelsProvider, { labels: { modal: { close: 'Dialog schließen' } } }, dialog({ closeLabel: 'Abbrechen' })));
    await frame();
    assert.equal(closeName(explicit), 'Abbrechen', 'the prop still wins');
    explicit.unmount();
  }
});
