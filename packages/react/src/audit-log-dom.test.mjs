/* HAR-987 (MEDx S50, POSx PRT-01 / INT-01) — AuditLog in jsdom: the entries (who, a labelled
 * action and its target, a relative time with the exact one, Details), the filters (chips that
 * open FilterEditors, a filter summary, Clear filters), "Show older entries" with its announcement,
 * a reload that keeps the rows (busy at once, dimmed after 300 ms), every state, and the words.
 * Renders the BUILT dist — run `npm run build` first; CI does. */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement as h, act, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

let dom;
let createRoot;
let ui;
const expose = (name, value) => Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });

before(async () => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true, url: 'http://localhost/' });
  expose('window', dom.window);
  expose('document', dom.window.document);
  expose('navigator', dom.window.navigator);
  expose('IS_REACT_ACT_ENVIRONMENT', true);
  // jsdom has no popover API: an "open" popover carries [data-open]
  dom.window.HTMLElement.prototype.togglePopover = function () { this.toggleAttribute('data-open'); };
  dom.window.HTMLElement.prototype.showPopover = function () { this.setAttribute('data-open', ''); };
  dom.window.HTMLElement.prototype.hidePopover = function () { this.removeAttribute('data-open'); };
  ({ createRoot } = await import('react-dom/client'));
  ui = await import('../dist/index.js');
});
after(() => {
  dom.window.close();
  for (const name of ['window', 'document', 'navigator', 'IS_REACT_ACT_ENVIRONMENT']) delete globalThis[name];
});

const mount = (element) => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(element));
  return { host, unmount: () => { act(() => root.unmount()); host.remove(); } };
};
const click = (el) => act(() => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true })));
const wait = (ms) => act(() => new Promise((r) => setTimeout(r, ms)));

const NOW = new Date('2026-10-22T12:00:00Z');
const ACTIONS = { viewed: { label: 'Opened', tone: 'info' }, edited: { label: 'Changed', tone: 'warning' }, exported: { label: 'Exported', tone: 'danger' } };
const ACTORS = [{ value: 'u1', label: 'Dr. Amra Kovač' }, { value: 'u2', label: 'Jonas Weber' }];
const EVENTS = [
  { id: 'e1', actor: 'Dr. Amra Kovač', action: 'viewed', target: 'Patient record 1042', at: '2026-10-22T11:30:00Z' },
  { id: 'e2', actor: 'Jonas Weber', action: 'edited', target: 'Allergies', at: '2026-10-21T08:05:00Z', detail: 'Added: penicillin' },
  { id: 'e3', actor: 'Support (POSx)', action: 'mystery', at: '2026-10-01T09:00:00Z' },
];

test('each entry: who, a labelled action and its target, a relative time with the exact one, Details', () => {
  const html = renderToStaticMarkup(h(ui.AuditLog, { events: EVENTS, actions: ACTIONS, now: NOW, locale: 'en-GB', timeZone: 'Europe/Sarajevo' }));
  assert.match(html, /^<section class="uix-audit-log" aria-label="Access history"><div class="uix-busy-region uix-audit-log__region">[\s\S]*?<ol class="uix-audit uix-audit-log__list">/, 'named once, by the section (PR #168 review)');
  assert.equal((html.match(/<li class="uix-audit__row uix-audit-log__row">/g) ?? []).length, 3);
  assert.match(html, /<span class="uix-audit__actor">Dr\. Amra Kovač<\/span>/);
  assert.match(html, /uix-pill--info[^>]*>Opened<\/span><span class="uix-audit-log__target">Patient record 1042<\/span>/);
  assert.match(html, /<time dateTime="2026-10-22T11:30:00.000Z"[^>]*>30 minutes ago<\/time><span class="uix-audit-log__exact">22 Oct 2026, 13:30<\/span>/, 'the exact time in the practice\'s zone (UTC+2 in October)');
  assert.match(html, /<details class="uix-audit-log__more"><summary class="uix-audit-log__more-summary"><span>Details<\/span><span class="uix-collapsible__chevron" aria-hidden="true"><svg[\s\S]*?<\/svg><\/span><\/summary><div class="uix-audit-log__detail">Added: penicillin<\/div><\/details>/, 'the kit chevron, not the native triangle (PR #168 review)');
  assert.match(html, /uix-pill--neutral[^>]*>mystery<\/span>/, 'an action without a label shows its key, neutral');
  assert.doesNotMatch(html, /uix-audit-log__filters/, 'no filter bar without onFiltersChange');
});

test('filters: a chip per filter opens its editor; applying reports the filters; the chip summarises; Clear filters', () => {
  const changes = [];
  function Log() {
    const [filters, setFilters] = useState({});
    return h(ui.AuditLog, { events: EVENTS, actions: ACTIONS, actors: ACTORS, now: NOW, filters, onFiltersChange: (f) => { changes.push(f); setFilters(f); }, formatDate: (d) => d.split('-').reverse().join('.') });
  }
  const t = mount(h(Log));
  const chips = () => [...t.host.querySelectorAll('.uix-audit-log__filters :is(button.uix-chip, .uix-chip__main)')];
  assert.deepEqual(chips().map((c) => c.textContent), ['When', 'Who', 'What']);
  assert.equal(t.host.querySelector('.uix-audit-log__filters').getAttribute('aria-label'), 'Filter the history');
  // What: tick "Exported", Apply
  click(chips()[2]);
  const pop = t.host.querySelectorAll('[popover]')[2];
  assert.ok(pop.hasAttribute('data-open'));
  const exported = [...pop.querySelectorAll('.uix-checkbox')].find((c) => c.textContent === 'Exported').querySelector('input');
  click(exported);
  click([...pop.querySelectorAll('button')].find((b) => b.textContent === 'Apply'));
  assert.deepEqual(changes.at(-1), { action: { kind: 'enum', values: ['exported'] } });
  assert.equal(pop.hasAttribute('data-open'), false, 'Apply closes the popover');
  assert.equal(chips()[2].textContent, 'What: Exported');
  assert.equal(chips()[0].classList.contains('uix-chip--add'), true, 'an unset filter is the dashed add chip');
  const remove = t.host.querySelector('.uix-audit-log__filters .uix-chip__remove');
  assert.ok(remove, 'a set filter has a × that clears it');
  click(remove);
  assert.deepEqual(changes.at(-1), {});
  click(chips()[2]);
  click([...t.host.querySelectorAll('[popover]')[2].querySelectorAll('.uix-checkbox input')].find((i) => i.closest('.uix-checkbox').textContent === 'Exported'));
  click([...t.host.querySelectorAll('[popover]')[2].querySelectorAll('button')].find((b) => b.textContent === 'Apply'));
  const clear = [...t.host.querySelectorAll('.uix-audit-log__filters button')].find((b) => b.textContent === 'Clear filters');
  click(clear);
  assert.deepEqual(changes.at(-1), {});
  t.unmount();
  // no actors: no Who filter
  const noActors = renderToStaticMarkup(h(ui.AuditLog, { events: EVENTS, actions: ACTIONS, filters: {}, onFiltersChange() {} }));
  assert.equal((noActors.match(/class="uix-chip uix-chip--add/g) ?? []).length, 2);
});

test('Show older entries: busy, then announces how many arrived', async () => {
  function Log() {
    const [events, setEvents] = useState(EVENTS.slice(0, 2));
    const [loading, setLoading] = useState(false);
    return h(ui.AuditLog, {
      events, actions: ACTIONS, now: NOW, hasMore: events.length < 3, loadingMore: loading,
      onLoadMore: () => { setLoading(true); setTimeout(() => { setEvents(EVENTS); setLoading(false); }, 20); },
    });
  }
  const t = mount(h(Log));
  const more = [...t.host.querySelectorAll('button')].find((b) => b.textContent === 'Show older entries');
  click(more);
  assert.equal(t.host.querySelector('[role="status"]').textContent, 'Loading older entries…');
  await wait(60);
  assert.equal(t.host.querySelectorAll('.uix-audit-log__row').length, 3);
  assert.equal(t.host.querySelector('[role="status"]').textContent, '1 older entries shown');
  assert.equal([...t.host.querySelectorAll('button')].some((b) => b.textContent === 'Show older entries'), false, 'no more to load');
  t.unmount();
});

test('a reload keeps the rows in a BusyRegion: busy at once, the bar only after 300 ms', async () => {
  const t = mount(h(ui.AuditLog, { events: EVENTS, actions: ACTIONS, now: NOW, refreshing: true }));
  const region = t.host.querySelector('.uix-busy-region');
  assert.ok(region.contains(t.host.querySelector('ol')));
  assert.equal(region.getAttribute('aria-busy'), 'true');
  assert.equal(region.querySelector('.uix-busy-bar').hasAttribute('data-shown'), false);
  assert.equal(t.host.querySelectorAll('.uix-audit-log__row').length, 3, 'the rows stay');
  await wait(320);
  assert.equal(region.querySelector('.uix-busy-bar').hasAttribute('data-shown'), true);
  t.unmount();
});

test('states: first load, empty, filtered empty, error with retry, forbidden; the words through the provider', () => {
  const render = (props) => renderToStaticMarkup(h(ui.UixLabelsProvider, { labels: { auditLog: { empty: 'Još nema pristupa', retry: 'Pokušaj ponovo', forbidden: 'Nemate pristup' } } },
    h(ui.AuditLog, { events: [], actions: ACTIONS, ...props })));
  assert.match(render({ status: 'loading' }), /role="status"[^>]*><span class="uix-visually-hidden">Loading the history<\/span>/);
  assert.match(render({}), /Još nema pristupa/);
  assert.match(render({ filters: { action: { kind: 'enum', values: ['edited'] } }, onFiltersChange() {} }), /Nothing matches these filters[\s\S]*Clear filters/);
  const error = render({ status: 'error', onRetry() {} });
  assert.match(error, /The history could not be loaded[\s\S]*>Pokušaj ponovo<\/button>/);
  assert.match(render({ status: 'forbidden' }), /Nemate pristup/);
});

/* PR #168 review */
test('review: a failed "Show older entries" says so beside the button, which tries again', async () => {
  const calls = [];
  function Log() {
    const [loading, setLoading] = useState(false);
    const [failed, setFailed] = useState(false);
    return h(ui.AuditLog, {
      events: EVENTS.slice(0, 2), actions: ACTIONS, now: NOW, hasMore: true, loadingMore: loading, loadMoreError: failed,
      onLoadMore: () => { calls.push('more'); setLoading(true); setFailed(false); setTimeout(() => { setLoading(false); setFailed(true); }, 20); },
    });
  }
  const t = mount(h(Log));
  click([...t.host.querySelectorAll('button')].find((b) => b.textContent === 'Show older entries'));
  assert.equal(t.host.querySelector('[role="status"]').textContent, 'Loading older entries…');
  await wait(60);
  assert.equal(t.host.querySelector('[role="status"]').textContent, '', 'not stuck on "Loading older entries…"');
  assert.equal(t.host.querySelector('.uix-audit-log__more-row [role="alert"]').textContent, 'The older entries could not be loaded.');
  const retry = [...t.host.querySelectorAll('.uix-audit-log__more-row button')].find((b) => b.textContent === 'Try again');
  assert.ok(retry, 'the button tries again');
  click(retry);
  assert.deepEqual(calls, ['more', 'more']);
  assert.equal(t.host.querySelector('.uix-audit-log__more-row [role="alert"]'), null, 'the failure goes while it tries again');
  await wait(60);
  t.unmount();
});

test('review: the Who chip names actors restored from a URL that are not among `actors`', async () => {
  const asked = [];
  const t = mount(h(ui.AuditLog, {
    events: EVENTS, actions: ACTIONS, actors: ACTORS, now: NOW, onFiltersChange() {},
    filters: { actor: { kind: 'enum', values: ['u1', 'usr_8f3a'] } },
    resolveActorLabels: async (ids) => { asked.push(ids); return [{ value: 'usr_8f3a', label: 'Lea Novak' }]; },
  }));
  await wait(10);
  assert.deepEqual(asked, [['usr_8f3a']], 'only the unknown id is asked for, once');
  const chip = [...t.host.querySelectorAll('.uix-audit-log__filters .uix-chip')].find((c) => /Who/.test(c.textContent));
  assert.match(chip.textContent, /Who: Dr\. Amra Kovač, Lea Novak/);
  assert.doesNotMatch(chip.textContent, /usr_8f3a/);
  t.unmount();
});

test('review: an unknown timeZone does not crash (the viewer\'s zone, one dev warning); an ISO time without an offset is UTC', () => {
  const warnings = [];
  const warn = console.warn;
  console.warn = (m) => warnings.push(String(m));
  try {
    const html = renderToStaticMarkup(h(ui.AuditLog, { events: EVENTS.slice(0, 1), actions: ACTIONS, now: NOW, locale: 'en-GB', timeZone: 'Mars/Olympus_Mons' }));
    assert.match(html, /30 minutes ago/);
    renderToStaticMarkup(h(ui.AuditLog, { events: EVENTS.slice(0, 1), actions: ACTIONS, now: NOW, locale: 'en-GB', timeZone: 'Mars/Olympus_Mons' }));
    assert.equal(warnings.filter((w) => /Mars\/Olympus_Mons/.test(w)).length, 1, 'warned once');
  } finally {
    console.warn = warn;
  }
  const local = renderToStaticMarkup(h(ui.AuditLog, { events: [{ ...EVENTS[0], at: '2026-10-22T11:30:00' }], actions: ACTIONS, now: NOW, locale: 'en-GB', timeZone: 'UTC' }));
  assert.match(local, /<time dateTime="2026-10-22T11:30:00.000Z"[^>]*>30 minutes ago<\/time><span class="uix-audit-log__exact">22 Oct 2026, 11:30<\/span>/);
});
