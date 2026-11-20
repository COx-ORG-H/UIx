/* DataWorkspace column resize (roadmap #11) in jsdom: which headers get a grip and what it says,
 * the keyboard path (one commit per key up), a drag (one commit on release), the width popover,
 * widths into the <colgroup> and the table's floors, the labels, and no grips in the cards step.
 * jsdom has no layout, so drawn widths are 0 here; the browser measures are in
 * tests/a11y/column-resize.spec.mjs. Renders the BUILT dist — run `npm run build` first; CI does. */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement as h, act } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

let dom;
let createRoot;
let ui;
const expose = (name, value) => Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
let workspaceWidth = 0;
const observers = [];
class FakeResizeObserver {
  constructor(callback) { this.callback = callback; this.targets = []; observers.push(this); }
  observe(el) { this.targets.push(el); }
  unobserve() {}
  disconnect() { this.targets = []; }
}

before(async () => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true, url: 'http://localhost/' });
  expose('window', dom.window);
  expose('document', dom.window.document);
  expose('navigator', dom.window.navigator);
  for (const name of ['Element', 'HTMLElement', 'Node']) expose(name, dom.window[name]);
  expose('getComputedStyle', dom.window.getComputedStyle.bind(dom.window));
  // drafts are drawn on the next frame: run frames at once so a drag reads in order
  expose('requestAnimationFrame', (cb) => { cb(0); return 1; });
  expose('cancelAnimationFrame', () => {});
  expose('ResizeObserver', FakeResizeObserver);
  expose('IS_REACT_ACT_ENVIRONMENT', true);
  const proto = dom.window.HTMLElement.prototype;
  proto.showPopover = function () { this.setAttribute('data-open', ''); };
  proto.hidePopover = function () { this.removeAttribute('data-open'); };
  proto.togglePopover = function () { this.toggleAttribute('data-open'); };
  proto.setPointerCapture = function () {};
  proto.releasePointerCapture = function () {};
  const rect = dom.window.Element.prototype.getBoundingClientRect;
  dom.window.Element.prototype.getBoundingClientRect = function () {
    if (this.classList?.contains('uix-data-workspace')) return { x: 0, y: 0, top: 0, left: 0, right: workspaceWidth, bottom: 400, width: workspaceWidth, height: 400 };
    return rect.call(this);
  };
  const matches = dom.window.Element.prototype.matches;
  dom.window.Element.prototype.matches = function (selector) { return selector === ':popover-open' ? this.hasAttribute('data-open') : matches.call(this, selector); };
  ({ createRoot } = await import('react-dom/client'));
  ui = await import('../dist/index.js');
});
after(() => {
  dom.window.close();
  for (const name of ['Element', 'HTMLElement', 'Node', 'window', 'document', 'navigator', 'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame', 'ResizeObserver', 'IS_REACT_ACT_ENVIRONMENT']) delete globalThis[name];
});

const mount = (element) => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(element));
  return { host, render: (next) => act(() => root.render(next)), unmount: () => { act(() => root.unmount()); host.remove(); } };
};
const fire = (el, type, init = {}, Ctor = window.MouseEvent) => act(() => { el.dispatchEvent(new Ctor(type, { bubbles: true, cancelable: true, ...init })); });
const key = (el, type, k, init = {}) => fire(el, type, { key: k, ...init }, window.KeyboardEvent);

const ROWS = [{ id: 'INC-1', title: 'Disk pressure', status: 'Open', who: 'M. Okafor', updated: '12.10.2026' }];
const COLUMNS = [
  { id: 'title', header: 'Title', cell: (r) => r.title, className: 'uix-col--flex', sortable: true },
  { id: 'status', header: 'Status', cell: (r) => r.status, className: 'uix-col--w-md' },
  { id: 'who', header: h('span', null, 'Assignee'), label: 'Assignee', cell: (r) => r.who, minWidth: '7rem' },
  { id: 'updated', header: 'Updated', cell: (r) => r.updated, className: 'uix-col--w-sm', resizable: false },
];
const props = (extra = {}) => ({ label: 'Incidents', rows: ROWS, getRowId: (r) => r.id, columns: COLUMNS, ...extra });
const ID = { header: 'ID', text: (r) => r.id };
const grip = (host, name) => [...host.querySelectorAll('[role="separator"]')].find((el) => el.getAttribute('aria-label') === `Resize ${name}`);
const colOf = (host, index) => host.querySelectorAll('colgroup col')[index];

test('no onColumnWidthsChange: no grips, the layout as before', () => {
  const html = renderToStaticMarkup(h(ui.DataWorkspace, props()));
  assert.doesNotMatch(html, /data-resize|role="separator"/);
});

test('every resizable header gets a separator grip outside its sort button, named, with its bounds', () => {
  const html = renderToStaticMarkup(h(ui.DataWorkspace, props({ idColumn: ID, sort: null, onSortChange() {}, onColumnWidthsChange() {} })));
  const doc = new JSDOM(html).window.document;
  const names = [...doc.querySelectorAll('[role="separator"]')].map((el) => el.getAttribute('aria-label'));
  assert.deepEqual(names, ['Resize ID', 'Resize Title', 'Resize Status', 'Resize Assignee'], 'not Updated (resizable: false)');
  for (const el of doc.querySelectorAll('[role="separator"]')) {
    assert.equal(el.getAttribute('aria-orientation'), 'vertical');
    assert.equal(el.getAttribute('tabindex'), '0');
    assert.equal(el.closest('button'), null, 'never inside the sort button');
    const hint = doc.getElementById(el.getAttribute('aria-describedby'));
    assert.ok(hint?.hasAttribute('hidden'), 'described by a hidden hint, which is not part of the header name');
    assert.match(hint.textContent, /arrow keys/);
  }
  const bounds = (name) => { const el = [...doc.querySelectorAll('[role="separator"]')].find((g) => g.getAttribute('aria-label') === `Resize ${name}`); return [el.getAttribute('aria-valuemin'), el.getAttribute('aria-valuemax')]; };
  assert.deepEqual(bounds('ID'), ['132', '960'], 'the id column: the md tier');
  assert.deepEqual(bounds('Title'), ['340', '960'], 'a flex column: the title floor');
  assert.deepEqual(bounds('Status'), ['92', '960'], 'the scale\'s first tier');
  assert.deepEqual(bounds('Assignee'), ['112', '960'], 'its own minWidth (7rem)');
  assert.ok(doc.querySelector('table').classList.contains('uix-table--fixed'), 'resize uses the fixed layout');
  assert.equal(doc.querySelector('th[data-sort] .uix-th__sortbtn').textContent, 'Title');
});

test('columnWidths size the <col>s and the table floors; with no column left to take the slack the table is as wide as its columns', () => {
  // the flex Title keeps the slack: the table still fills (no width), its floors include the set widths
  const filling = renderToStaticMarkup(h(ui.DataWorkspace, props({ columnWidths: { status: 250 }, onColumnWidthsChange() {} })));
  assert.match(filling, /<col class="uix-col--w-md" style="width:250px"\/>/);
  assert.match(filling, /<table class="uix-table uix-table--fixed" style="min-width:calc\(var\(--uix-col-title-min\) \+ 250px \+ 7rem \+ var\(--uix-col-w-sm\)\)"/);
  // Title set too: nothing takes the slack, so the table's width is the sum of its columns
  const exact = renderToStaticMarkup(h(ui.DataWorkspace, props({ columnWidths: { status: 250, title: 400 }, onColumnWidthsChange() {} })));
  assert.match(exact, /<col class="uix-col--flex" style="width:400px"\/>/);
  assert.match(exact, /style="min-width:calc\(400px \+ 250px \+ 7rem \+ var\(--uix-col-w-sm\)\);width:calc\(400px \+ 250px \+ 7rem \+ var\(--uix-col-w-sm\)\)"/);
});

test('keys draft the width and commit once, on key up', () => {
  const commits = [];
  const t = mount(h(ui.DataWorkspace, props({ columnWidths: { status: 176 }, onColumnWidthsChange: (w) => commits.push(w) })));
  const g = grip(t.host, 'Status');
  assert.equal(g.getAttribute('aria-valuenow'), '176');
  key(g, 'keydown', 'ArrowRight');
  key(g, 'keydown', 'ArrowRight');
  assert.equal(colOf(t.host, 1).style.width, '192px', 'the draft is drawn');
  assert.equal(commits.length, 0, 'nothing committed while the key is held');
  key(g, 'keyup', 'ArrowRight');
  assert.deepEqual(commits, [{ status: 192 }]);
  key(g, 'keydown', 'ArrowRight', { shiftKey: true });
  key(g, 'keyup', 'ArrowRight');
  assert.deepEqual(commits.at(-1), { status: 208 }, 'Shift: the next stop of the scale, from the committed 176 (controlled: the product kept 176)');
  key(g, 'keydown', 'Home');
  key(g, 'keyup', 'Home');
  assert.deepEqual(commits.at(-1), { status: 92 });
  key(g, 'keydown', 'Tab');
  key(g, 'keyup', 'Tab');
  assert.equal(commits.length, 3, 'other keys do nothing');
  t.unmount();
});

test('without columnWidths the workspace keeps the widths itself', () => {
  const commits = [];
  const t = mount(h(ui.DataWorkspace, props({ onColumnWidthsChange: (w) => commits.push(w) })));
  const g = grip(t.host, 'Status');
  key(g, 'keydown', 'End');
  key(g, 'keyup', 'End');
  assert.deepEqual(commits, [{ status: 960 }]);
  assert.equal(colOf(t.host, 1).style.width, '960px');
  assert.equal(grip(t.host, 'Status').getAttribute('aria-valuenow'), '960');
  t.unmount();
});

test('a drag drafts per move and commits once, on release; a press without a move commits nothing', () => {
  const commits = [];
  const t = mount(h(ui.DataWorkspace, props({ columnWidths: { status: 176 }, onColumnWidthsChange: (w) => commits.push(w) })));
  const g = grip(t.host, 'Status');
  fire(g, 'pointerdown', { button: 0, clientX: 100 });
  fire(g, 'pointermove', { clientX: 101 });
  assert.equal(colOf(t.host, 1).style.width, '176px', 'under the drag threshold');
  fire(g, 'pointermove', { clientX: 120 });
  fire(g, 'pointermove', { clientX: 140 });
  assert.equal(colOf(t.host, 1).style.width, '216px');
  assert.equal(commits.length, 0);
  fire(g, 'pointerup', { clientX: 140 });
  assert.deepEqual(commits, [{ status: 216 }]);
  // Escape mid-drag puts it back
  fire(g, 'pointerdown', { button: 0, clientX: 100 });
  fire(g, 'pointermove', { clientX: 160 });
  assert.equal(colOf(t.host, 1).style.width, '236px');
  key(document.body, 'keydown', 'Escape');
  fire(g, 'pointerup', { clientX: 160 });
  assert.equal(colOf(t.host, 1).style.width, '176px');
  assert.equal(commits.length, 1);
  t.unmount();
});

test('Enter opens the width popover: − / + step along the scale, Default width clears the column', () => {
  const commits = [];
  const t = mount(h(ui.DataWorkspace, props({ columnWidths: { status: 176, title: 400 }, onColumnWidthsChange: (w) => commits.push(w) })));
  const g = grip(t.host, 'Status');
  key(g, 'keydown', 'Enter');
  const dialog = document.getElementById(g.getAttribute('aria-controls'));
  assert.ok(dialog.hasAttribute('data-open'));
  assert.equal(dialog.getAttribute('role'), 'dialog');
  assert.equal(dialog.getAttribute('aria-label'), 'Width of Status');
  const field = dialog.querySelector('input[type="number"]');
  assert.equal(field.value, '176');
  assert.equal(dialog.querySelector(`label[for="${field.id}"]`).textContent, 'Width of Status');
  const button = (name) => [...dialog.querySelectorAll('button')].find((b) => (b.getAttribute('aria-label') ?? b.textContent) === name);
  fire(button('Wider'), 'click');
  assert.deepEqual(commits.at(-1), { status: 208, title: 400 });
  fire(button('Narrower'), 'click');
  assert.deepEqual(commits.at(-1), { status: 132, title: 400 });
  fire(button('Default width'), 'click');
  assert.deepEqual(commits.at(-1), { title: 400 });
  assert.ok(!dialog.hasAttribute('data-open'), 'closed');
  t.unmount();
});

test('the words come from UixLabelsProvider and labels', () => {
  const html = renderToStaticMarkup(h(ui.UixLabelsProvider, { labels: { dataWorkspace: { resizeColumn: 'Breite von {column} ändern', resizeHint: 'Ziehen oder Pfeiltasten' } } },
    h(ui.DataWorkspace, props({ onColumnWidthsChange() {}, labels: { columnWidth: 'Breite: {column}' } }))));
  assert.match(html, /aria-label="Breite von Status ändern"/);
  assert.match(html, /Ziehen oder Pfeiltasten/);
  assert.match(html, /aria-label="Breite: Status"/);
});

test('the cards step has no grips', () => {
  workspaceWidth = 500;
  const t = mount(h(ui.DataWorkspace, props({ mobile: 'cards', onColumnWidthsChange() {} })));
  assert.ok(t.host.querySelector('table').classList.contains('uix-table--cards'));
  assert.equal(t.host.querySelectorAll('[data-resize]').length, 0);
  t.unmount();
  workspaceWidth = 0;
});
