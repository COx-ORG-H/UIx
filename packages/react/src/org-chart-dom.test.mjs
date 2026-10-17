/* OrgChart (HAR-1807) in jsdom:
 *   - the WAI-ARIA tree: levels, set sizes, aria-expanded only on people with reports, one tab stop;
 *   - the card: name, title, team, location, initials or photo, badge; the report count is read
 *     in the item's description and shown on the toggle;
 *   - reports load on expand; a failure shows an error row whose Enter retries; a row of people
 *     without reports is stacked;
 *   - click: a card selects, the report count toggles without selecting;
 *   - the chart keyboard model (↑ manager, ↓ first report, ← → same level, stacked ↑ ↓, Home/End,
 *     Enter opens, Space toggles); the list model is measured in tests/a11y/org-chart.spec.mjs,
 *     because jsdom has no container queries;
 *   - revealId waits for a lazily loaded reporting line, then focuses the person once;
 *   - zoom steps, translated words, server rendering.
 * Renders the BUILT dist — run `npm run build` first.
 */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement as h, act } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

let dom;
let createRoot;
let ui;
const EXPOSED = ['window', 'document', 'navigator', 'CSS', 'IS_REACT_ACT_ENVIRONMENT', 'getComputedStyle'];
const expose = (name, value) => Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });

before(async () => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true });
  expose('window', dom.window);
  expose('document', dom.window.document);
  expose('navigator', dom.window.navigator);
  expose('getComputedStyle', dom.window.getComputedStyle.bind(dom.window));
  expose('CSS', { escape: (value) => String(value).replace(/["\\]/g, '\\$&') });
  expose('IS_REACT_ACT_ENVIRONMENT', true);
  ({ createRoot } = await import('react-dom/client'));
  ui = await import('../dist/index.js');
});
after(() => {
  dom.window.close();
  for (const name of EXPOSED) delete globalThis[name];
});

const CEO = { id: 'ceo', name: 'Mira Kovač', title: 'Vorstandsvorsitzende', team: 'Vorstand', location: 'München', reportCount: 2, badge: 'Sie' };
const HEADS = [
  { id: 'cio', name: 'Jan Novak', title: 'Bereichsleiter IT', team: 'IT', location: 'München', reportCount: 3 },
  { id: 'cfo', name: 'Ana Petrović', title: 'Bereichsleiterin Finanzen', photo: '/avatars/3.png', reportCount: 0 },
];
const STAFF = [
  { id: 's1', name: 'Ben Ali', title: 'Administrator' },
  { id: 's2', name: 'Eva Roth', title: 'Administratorin' },
  { id: 's3', name: 'Ida Lang', title: 'Analystin' },
];

/** A loader the test settles by hand. */
function deferred() {
  const calls = [];
  const load = (node) => new Promise((resolve, reject) => { calls.push({ id: node.id, resolve, reject }); });
  return { calls, load };
}
const flush = () => act(async () => { await Promise.resolve(); });

function mount(props) {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  let current = { nodes: [CEO], 'aria-label': 'Organigramm', ...props };
  const render = (next = {}) => { current = { ...current, ...next }; act(() => root.render(h(ui.OrgChart, current))); };
  render();
  const item = (id) => host.querySelector(`[role="treeitem"][data-id="${id}"]`);
  const names = () => [...host.querySelectorAll('.uix-org-chart__name')].map((el) => el.textContent);
  const key = (id, k) => act(() => { item(id).dispatchEvent(new window.KeyboardEvent('keydown', { key: k, bubbles: true })); });
  const click = (el) => act(() => { el.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); });
  return { host, render, item, names, key, click, unmount: () => { act(() => root.unmount()); host.remove(); } };
}

test('renders a WAI-ARIA tree of person cards with one tab stop', () => {
  const t = mount({ nodes: [{ ...CEO, children: HEADS }], defaultExpanded: new Set(['ceo']) });
  const tree = t.host.querySelector('[role="tree"]');
  assert.equal(tree.getAttribute('aria-label'), 'Organigramm');
  assert.deepEqual(t.names(), ['Mira Kovač', 'Jan Novak', 'Ana Petrović']);
  const ceo = t.item('ceo');
  assert.equal(ceo.getAttribute('aria-level'), '1');
  assert.equal(ceo.getAttribute('aria-expanded'), 'true');
  assert.equal(t.item('cio').getAttribute('aria-level'), '2');
  assert.equal(t.item('cio').getAttribute('aria-setsize'), '2');
  assert.equal(t.item('cfo').getAttribute('aria-posinset'), '2');
  assert.equal(t.item('cfo').getAttribute('aria-expanded'), null, 'no reports, no aria-expanded');
  assert.equal(t.item('cio').getAttribute('aria-expanded'), 'false', 'reports not loaded yet are still expandable');
  // the name labels the item; title, team, location and the report count describe it
  const name = document.getElementById(ceo.getAttribute('aria-labelledby'));
  assert.equal(name.textContent, 'Mira Kovač');
  const desc = document.getElementById(ceo.getAttribute('aria-describedby')).textContent;
  for (const part of ['Vorstandsvorsitzende', 'Vorstand', 'München', '2 direct reports']) assert.ok(desc.includes(part), desc);
  assert.equal(ceo.querySelector('.uix-org-chart__badge').textContent, 'Sie');
  assert.equal(ceo.querySelector('.uix-avatar').textContent, 'MK');
  assert.equal(t.item('cfo').querySelector('.uix-avatar img').getAttribute('src'), '/avatars/3.png');
  assert.equal(t.item('cfo').querySelector('.uix-avatar img').getAttribute('alt'), '', 'the photo is decorative next to the name');
  assert.equal(ceo.querySelector('.uix-org-chart__toggle').textContent, '2');
  assert.equal(t.item('cfo').querySelector('.uix-org-chart__toggle'), null);
  assert.equal(t.host.querySelectorAll('[role="treeitem"][tabindex="0"]').length, 1);
  assert.equal(ceo.getAttribute('tabindex'), '0');
  t.unmount();
});

test('loads reports on expand, stacks a row without reports, and retries a failed load', async () => {
  const d = deferred();
  const t = mount({ loadChildren: d.load });
  t.click(t.item('ceo').querySelector('.uix-org-chart__toggle'));
  assert.equal(d.calls.length, 1);
  assert.equal(d.calls[0].id, 'ceo');
  assert.equal(t.item('ceo').getAttribute('aria-busy'), 'true');
  assert.ok(t.item('ceo::uix-loading'), 'a loading row stands in for the reports');
  await act(async () => { d.calls[0].resolve(HEADS); });
  assert.equal(t.item('ceo::uix-loading'), null);
  assert.deepEqual(t.names(), ['Mira Kovač', 'Jan Novak', 'Ana Petrović']);
  assert.equal(t.item('ceo').querySelector(':scope > [role="group"]').hasAttribute('data-stack'), false, 'a row with a manager in it stays side by side');

  t.click(t.item('cio').querySelector('.uix-org-chart__toggle'));
  assert.equal(d.calls[1].id, 'cio');
  await act(async () => { d.calls[1].reject(new Error('offline')); });
  const failed = t.item('cio::uix-error');
  assert.ok(failed, 'the failed load is a row the keyboard reaches');
  assert.ok(failed.textContent.includes('Could not load.'));
  t.key('cio::uix-error', 'Enter');
  assert.equal(d.calls.length, 3, 'Enter on the error row retries');
  assert.ok(t.item('cio::uix-loading'));
  await act(async () => { d.calls[2].resolve(STAFF); });
  assert.deepEqual(t.names(), ['Mira Kovač', 'Jan Novak', 'Ben Ali', 'Eva Roth', 'Ida Lang', 'Ana Petrović'], 'reports render inside their manager');
  assert.equal(t.item('cio').querySelector(':scope > [role="group"]').hasAttribute('data-stack'), true, 'people without reports are stacked');

  // collapsing and expanding again does not load twice
  t.click(t.item('cio').querySelector('.uix-org-chart__toggle'));
  t.click(t.item('cio').querySelector('.uix-org-chart__toggle'));
  assert.equal(d.calls.length, 3);
  t.unmount();
});

test('stackLeaves={false} keeps every row side by side', () => {
  const t = mount({ nodes: [{ ...HEADS[0], children: STAFF }], defaultExpanded: new Set(['cio']), stackLeaves: false });
  assert.equal(t.item('cio').querySelector(':scope > [role="group"]').hasAttribute('data-stack'), false);
  t.unmount();
});

test('a click on a card selects; a click on the report count only toggles', () => {
  const selected = [];
  const toggled = [];
  const t = mount({ nodes: [{ ...CEO, children: HEADS }], onSelect: (id) => selected.push(id), onToggle: (id, open) => toggled.push([id, open]) });
  t.click(t.item('ceo').querySelector('.uix-org-chart__toggle'));
  assert.deepEqual(selected, []);
  assert.deepEqual(toggled, [['ceo', true]]);
  t.click(t.item('cio').querySelector('.uix-org-chart__name'));
  assert.deepEqual(selected, ['cio'], 'the clicked person only, not their manager');
  t.render({ selected: 'cio' });
  assert.equal(t.item('cio').getAttribute('aria-selected'), 'true');
  assert.equal(t.item('ceo').getAttribute('aria-selected'), 'false');
  t.unmount();
});

test('chart keyboard: ↓ expands then enters, ↑ manager, ← → same level, Home/End, Enter, Space', () => {
  const selected = [];
  const second = { id: 'coo', name: 'Olga Berg', reportCount: 1, children: [{ id: 'o1', name: 'Paul Kern' }] };
  const t = mount({
    nodes: [{ ...CEO, reportCount: 3, children: [{ ...HEADS[0], children: STAFF }, HEADS[1], second] }],
    onSelect: (id) => selected.push(id),
  });
  const focused = () => document.activeElement?.dataset?.id;
  act(() => t.item('ceo').focus());
  t.key('ceo', 'ArrowDown');
  assert.equal(t.item('ceo').getAttribute('aria-expanded'), 'true', '↓ on a collapsed manager expands');
  assert.equal(focused(), 'ceo');
  t.key('ceo', 'ArrowDown');
  assert.equal(focused(), 'cio', '↓ again enters the first report');
  t.key('cio', 'ArrowRight');
  assert.equal(focused(), 'cfo');
  t.key('cfo', 'ArrowRight');
  assert.equal(focused(), 'coo');
  t.key('coo', 'ArrowLeft');
  assert.equal(focused(), 'cfo');
  t.key('cfo', 'ArrowUp');
  assert.equal(focused(), 'ceo', '↑ goes to the manager');
  // into the stacked column under cio
  t.key('ceo', 'ArrowDown');
  t.key('cio', ' ');
  assert.equal(t.item('cio').getAttribute('aria-expanded'), 'true', 'Space toggles');
  t.key('cio', 'ArrowDown');
  assert.equal(focused(), 's1');
  t.key('s1', 'ArrowDown');
  assert.equal(focused(), 's2', '↓ moves down a stacked column');
  t.key('s2', 'ArrowUp');
  assert.equal(focused(), 's1');
  t.key('s1', 'ArrowUp');
  assert.equal(focused(), 'cio', '↑ from the top of a column goes to the manager');
  // ← → walk the whole level, across managers
  t.key('cio', 'ArrowRight');
  t.key('cfo', 'ArrowRight');
  t.key('coo', 'ArrowDown');
  t.key('coo', 'ArrowDown');
  assert.equal(focused(), 'o1');
  t.key('o1', 'ArrowLeft');
  assert.equal(focused(), 's3', '← reaches the last person of the neighbouring team');
  t.key('s3', 'Home');
  assert.equal(focused(), 'ceo');
  t.key('ceo', 'End');
  assert.equal(focused(), 'o1');
  t.key('o1', 'Enter');
  assert.deepEqual(selected, ['o1'], 'Enter opens the person');
  t.key('o1', ' ');
  assert.deepEqual(selected, ['o1', 'o1'], 'Space on someone without reports opens them');
  assert.equal(t.host.querySelectorAll('[role="treeitem"][tabindex="0"]').length, 1);
  assert.equal(t.item('o1').getAttribute('tabindex'), '0', 'the tab stop follows focus');
  // collapsing a manager while a report has focus moves focus to the manager
  act(() => t.item('s2').focus());
  t.click(t.item('cio').querySelector('.uix-org-chart__toggle'));
  assert.equal(focused(), 'cio');
  t.unmount();
});

test('revealId waits for the lazily loaded reporting line, then focuses the person once', async () => {
  const d = deferred();
  const revealed = [];
  const t = mount({
    loadChildren: d.load,
    expanded: new Set(['ceo', 'cio']),
    revealId: 's2',
    onReveal: (id) => revealed.push(id),
  });
  assert.equal(d.calls.length, 1, 'the expanded manager loads at once');
  await act(async () => { d.calls[0].resolve(HEADS); });
  assert.equal(d.calls[1].id, 'cio', 'then the next manager on the line');
  assert.deepEqual(revealed, []);
  await act(async () => { d.calls[1].resolve(STAFF); });
  assert.deepEqual(revealed, ['s2']);
  assert.equal(document.activeElement, t.item('s2'));
  t.render({ selected: 's2' });
  await flush();
  assert.deepEqual(revealed, ['s2'], 'a re-render does not reveal again');
  t.unmount();
});

test('zoom: the buttons step, reset and stop at the ends', () => {
  const t = mount({ defaultZoom: 0.3 });
  const tree = t.host.querySelector('[role="tree"]');
  const zoom = () => tree.style.getPropertyValue('--org-chart-zoom');
  const button = (name) => [...t.host.querySelectorAll('.uix-org-chart__toolbar button')].find((b) => b.getAttribute('aria-label')?.startsWith(name) || b.textContent === name);
  assert.equal(t.host.querySelector('[role="toolbar"]').getAttribute('aria-label'), 'Zoom');
  assert.equal(zoom(), '0.3');
  t.click(button('Zoom out'));
  assert.equal(zoom(), '0.25');
  assert.equal(button('Zoom out').disabled, true);
  t.click(button('Zoom in'));
  assert.equal(zoom(), '0.33');
  const reset = button('33%');
  assert.equal(reset.getAttribute('aria-label'), '33%, reset to 100%', 'the name starts with the visible level');
  t.click(reset);
  assert.equal(zoom(), '1');
  assert.equal(ui.orgChartZoomStep(1, 1), 1.1);
  assert.equal(ui.orgChartZoomStep(1.5, 1), 1.5);
  assert.equal(ui.orgChartZoomStep(0.6, -1), 0.5);
  t.unmount();
});

test('every word is translatable, by prop or by UixLabelsProvider', async () => {
  const de = {
    loading: 'Wird geladen…', error: 'Konnte nicht geladen werden.', retry: 'Erneut versuchen',
    reportsOne: '{count} direkt unterstellte Person', reportsMany: '{count} direkt unterstellte Personen',
    expand: 'Mitarbeitende zeigen', collapse: 'Mitarbeitende ausblenden', toolbar: 'Zoom',
    zoomIn: 'Vergrößern', zoomOut: 'Verkleinern', fit: 'Einpassen', zoomLevel: '{percent} %',
    resetZoom: '{percent}, auf 100 % zurücksetzen',
  };
  const html = renderToStaticMarkup(h(ui.UixLabelsProvider, { labels: { orgChart: de } }, h(ui.OrgChart, { nodes: [CEO, { ...HEADS[0], reportCount: 1 }], 'aria-label': 'Organigramm' })));
  for (const word of ['2 direkt unterstellte Personen', '1 direkt unterstellte Person', 'Mitarbeitende zeigen', 'Vergrößern', 'Verkleinern', 'Einpassen', '100 %', '100 %, auf 100 % zurücksetzen']) {
    assert.ok(html.includes(word), `renders "${word}"`);
  }
  for (const english of ['direct report', 'Show reports', 'Zoom in', 'Fit<']) assert.ok(!html.includes(english), `no "${english}"`);
  // and per instance
  const d = deferred();
  const t = mount({ loadChildren: d.load, labels: { loading: 'Wird geladen…' }, defaultExpanded: new Set(['ceo']) });
  assert.ok(t.item('ceo::uix-loading').textContent.includes('Wird geladen…'));
  t.unmount();
  assert.equal(ui.orgChartInitials('Ana-Maria  de la Cruz'), 'AC');
  assert.equal(ui.orgChartInitials('Élodie'), 'É');
  assert.equal(ui.orgChartInitials('  '), '');
});

test('renders on the server', () => {
  const html = renderToStaticMarkup(h(ui.OrgChart, { nodes: [{ ...CEO, children: HEADS }], defaultExpanded: new Set(['ceo']), 'aria-label': 'Org' }));
  assert.ok(html.includes('class="uix-org-chart"'));
  assert.ok(html.includes('role="tree"'));
  assert.ok(html.includes('Jan Novak'));
});
