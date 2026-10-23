/* HAR-1369 (MOTUS B-A9) — DiffViewer names, values and provenance for people; MatchReview adopt
 * mode, in jsdom:
 *   - DiffViewer `labelFor` replaces the JSON path (and names the regions and buttons when it is
 *     text), `renderValue(value, path, side)` replaces JSON.stringify, `provenance(path, side)`
 *     shows under each value; without them the rendering is what it was;
 *   - MatchReview `fieldMode="adopt"`: per candidate a table of the record now against the
 *     candidate, a checkbox per differing field ("Same" otherwise), `onAdopt(candidateId,
 *     fieldIds)` with a pending state only after 300 ms, a provenance disclosure, and the words
 *     through `UixLabelsProvider`.
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

const base = { title: 'Derviš i smrt', authors: [{ name: 'Meša Selimović' }], year: 1966 };
const current = { title: 'Derviš i smrt', authors: [{ name: 'Mesa Selimovic' }], year: 1966 };
const incoming = { title: 'Derviš i smrt', authors: [{ name: 'Meša Selimović' }], year: 1967 };
const NAMES = { '$.authors': 'Authors', '$.year': 'Year of first edition' };
/** What a product shows instead of JSON: the authors' names, a number as it is. */
const show = (value) => (Array.isArray(value) ? value.map((a) => a.name).join(', ') : String(value));

test('DiffViewer labelFor names the entry and its regions and buttons; renderValue and provenance show per side', () => {
  const seen = [];
  const html = renderToStaticMarkup(h(ui.DiffViewer, {
    base, current, incoming,
    labelFor: (path) => NAMES[path],
    renderValue: (value, path, side) => { seen.push(`${path}:${side}`); return value === undefined ? undefined : h('span', { className: 'v' }, show(value)); },
    provenance: (path, side) => (side === 'incoming' ? `Registry (DNB), ${path === '$.year' ? '12 Oct' : '3 Oct'}` : side === 'current' ? 'Edited by Ana' : null),
  }));
  assert.match(html, /<span class="uix-diff-viewer__name">Authors<\/span>/);
  assert.doesNotMatch(html, /<code>\$\.authors/, 'the path is not shown');
  assert.match(html, /aria-label="Incoming value for Year of first edition"/);
  assert.match(html, /aria-label="Accept incoming for Authors"/);
  assert.match(html, /<span class="v">Mesa Selimovic<\/span>/, 'the product shows a name, not JSON');
  assert.match(html, /<div class="uix-diff-viewer__value"><span class="v">1967<\/span><\/div><div class="uix-diff-viewer__provenance">Registry \(DNB\), 12 Oct<\/div>/);
  assert.match(html, /<div class="uix-diff-viewer__provenance">Edited by Ana<\/div>/);
  assert.equal((html.match(/uix-diff-viewer__provenance/g) ?? []).length, 4, 'two entries × current and incoming; base has none');
  assert.ok(seen.includes('$.year:base') && seen.includes('$.authors:current'));
  assert.doesNotMatch(html, /<pre>/, 'no JSON once renderValue is given');
});

test('DiffViewer without the hooks renders as before; a non-text label keeps the path in names', () => {
  const plain = renderToStaticMarkup(h(ui.DiffViewer, { base, current, incoming }));
  assert.match(plain, /<span class="uix-diff-viewer__name"><code>\$\.year<\/code><\/span>/);
  assert.match(plain, /<pre>1967<\/pre>/);
  const rich = renderToStaticMarkup(h(ui.DiffViewer, { base, current, incoming, labelFor: (path) => h('em', null, path.slice(2)) }));
  assert.match(rich, /<span class="uix-diff-viewer__name"><em>year<\/em><\/span>/);
  assert.match(rich, /aria-label="Accept incoming for \$\.year"/, 'a node label cannot name a button: the path does');
  const de = renderToStaticMarkup(h(ui.UixLabelsProvider, { labels: { diffViewer: { acceptIncoming: 'Übernehmen', acceptIncomingFor: 'Übernehmen für {path}' } } }, h(ui.DiffViewer, { base, current, incoming })));
  assert.match(de, />Übernehmen<\/button>/);
});

const FIELDS = [{ id: 'title', label: 'Title' }, { id: 'author', label: 'Author' }, { id: 'year', label: 'Year' }, { id: 'isbn', label: 'ISBN' }];
const RECORD = { title: 'Derviš i smrt', author: 'Mesa Selimovic', year: 1966, isbn: null };
const CANDIDATES = [
  { id: 'dnb-1', confidence: 0.92, record: { title: 'Derviš i smrt', author: 'Meša Selimović', year: 1966, isbn: '978-3-10-071506-8' } },
  { id: 'wd-7', confidence: 0.61, record: { title: 'Death and the Dervish', author: 'Meša Selimović', year: 1966, isbn: null }, status: 'resolved', decision: 'dismissed' },
];

test('MatchReview adopt: a compare table per candidate, checkboxes only where values differ, onAdopt with the chosen fields', async () => {
  const adopted = [];
  const decisions = [];
  let settle;
  const t = mount(h(ui.MatchReview, {
    fieldMode: 'adopt', incoming: RECORD, incomingLabel: 'Katalogeintrag', fields: FIELDS, candidates: CANDIDATES,
    candidateLabel: (c) => (c.id === 'dnb-1' ? 'DNB' : 'Wikidata'),
    provenance: (c) => `Retrieved from ${c.id} on 22 Oct 2026`,
    onDecision: (id, action) => decisions.push(`${id}:${action}`),
    onAdopt: (id, fieldIds) => { adopted.push([id, fieldIds]); return new Promise((resolve) => { settle = resolve; }); },
  }));
  const sections = [...t.host.querySelectorAll('.uix-match-review__candidate')];
  assert.equal(sections.length, 2);
  assert.equal(sections[0].querySelector('h3').textContent, 'DNB');
  assert.equal(sections[0].getAttribute('aria-labelledby'), sections[0].querySelector('h3').id);
  const rows = [...sections[0].querySelectorAll('tbody tr')];
  assert.deepEqual(rows.map((r) => [r.querySelector('th').textContent, r.hasAttribute('data-differs')]), [['Title', false], ['Author', true], ['Year', false], ['ISBN', true]]);
  assert.equal(rows[0].querySelector('.uix-match-review__same').textContent, 'Same');
  const boxes = [...sections[0].querySelectorAll('input[type="checkbox"]')];
  assert.deepEqual(boxes.map((b) => b.getAttribute('aria-label')), ['Adopt Author from DNB', 'Adopt ISBN from DNB']);
  const adopt = [...sections[0].querySelectorAll('button')].find((b) => b.textContent.startsWith('Adopt'));
  assert.equal(adopt.textContent, 'Adopt 0 fields');
  assert.equal(adopt.disabled, true, 'nothing chosen yet');
  click(boxes[1]);
  assert.equal(adopt.textContent, 'Adopt 1 field', 'one field: the One label (PR #168 review)');
  click(boxes[0]);
  assert.equal(adopt.textContent, 'Adopt 2 fields');
  click(adopt);
  assert.deepEqual(adopted, [['dnb-1', ['author', 'isbn']]], 'in field order');
  assert.equal(adopt.getAttribute('aria-busy'), 'true', 'busy for assistive technology at once');
  assert.equal(adopt.querySelector('[data-uix-btn-busy]'), null, 'no spinner in the first 300 ms');
  await act(async () => { await new Promise((r) => setTimeout(r, 320)); });
  assert.ok(adopt.querySelector('[data-uix-btn-busy]'), 'the spinner after 300 ms');
  await act(async () => { settle(); await Promise.resolve(); await Promise.resolve(); });
  assert.equal(sections[0].querySelector('[role="status"]').textContent, '2 fields adopted from DNB');
  assert.equal(boxes.every((b) => !b.checked), true, 'the choice is cleared after adopting');
  // provenance disclosure, and a resolved candidate's controls are disabled
  const summary = sections[0].querySelector('details.uix-match-review__provenance summary');
  assert.equal(summary.textContent, 'Where this candidate comes from');
  assert.ok(summary.querySelector('.uix-collapsible__chevron[aria-hidden="true"] svg'), 'the kit chevron, not the native triangle (PR #168 review)');
  assert.match(sections[0].querySelector('.uix-match-review__provenance-body').textContent, /dnb-1/);
  assert.equal(sections[1].querySelector('input').disabled, true);
  assert.equal(sections[1].querySelector('.uix-pill').textContent.includes('Dismissed'), true);
  click([...sections[0].querySelectorAll('button')].find((b) => b.textContent === 'Dismiss'));
  assert.deepEqual(decisions, ['dnb-1:dismiss']);
  t.unmount();
});

test('MatchReview adopt: a rejected onAdopt keeps the choice and says so; German words through the provider', async () => {
  const t = mount(h(ui.UixLabelsProvider, { labels: { matchReview: { adoptSelectedOne: '{count} Feld übernehmen', adoptSelectedMany: '{count} Felder übernehmen', adoptField: '{field} von {candidate} übernehmen', adoptFailed: 'Übernehmen fehlgeschlagen.', same: 'Gleich', candidate: 'Kandidat {id}' } } },
    h(ui.MatchReview, { fieldMode: 'adopt', incoming: RECORD, fields: FIELDS, candidates: [CANDIDATES[0]], onDecision() {}, onAdopt: () => Promise.reject(new Error('down')) })));
  assert.equal(t.host.querySelector('h3').textContent, 'Kandidat dnb-1');
  const box = t.host.querySelector('input[type="checkbox"]');
  assert.equal(box.getAttribute('aria-label'), 'Author von Kandidat dnb-1 übernehmen');
  click(box);
  click([...t.host.querySelectorAll('button')].find((b) => b.textContent === '1 Feld übernehmen'));
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
  assert.equal(t.host.querySelector('.uix-match-review__result--failed').textContent, 'Übernehmen fehlgeschlagen.');
  assert.equal(box.checked, true, 'the choice is kept for another try');
  t.unmount();
});

test('MatchReview adopt: a consumer that resolves the candidate in onAdopt still hears "adopted" (PR #168 review)', async () => {
  function Owner() {
    const [candidates, setCandidates] = useState([CANDIDATES[0]]);
    return h(ui.MatchReview, {
      fieldMode: 'adopt', incoming: RECORD, fields: FIELDS, candidates, candidateLabel: () => 'DNB', onDecision() {},
      onAdopt: async (id) => { setCandidates((list) => list.map((c) => (c.id === id ? { ...c, status: 'resolved', decision: 'accepted' } : c))); },
    });
  }
  const t = mount(h(Owner));
  const region = t.host.querySelector('[role="status"]');
  assert.ok(region, 'the region is there before anything is said');
  click(t.host.querySelector('input[type="checkbox"]'));
  click([...t.host.querySelectorAll('button')].find((b) => b.textContent === 'Adopt 1 field'));
  await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });
  assert.equal(t.host.querySelector('.uix-match-review__candidate').dataset.status, 'resolved');
  assert.equal(t.host.querySelector('[role="status"]'), region, 'the same region, still mounted');
  assert.equal(region.textContent, '1 field adopted from DNB');
  assert.equal([...t.host.querySelectorAll('button')].some((b) => b.textContent === 'Dismiss'), false, 'a resolved candidate has no actions');
  t.unmount();
});

test('MatchReview decide mode is unchanged', () => {
  const html = renderToStaticMarkup(h(ui.MatchReview, { incoming: RECORD, fields: FIELDS, candidates: CANDIDATES, onDecision() {} }));
  assert.match(html, /<table class="uix-table uix-match-review__table">/);
  assert.doesNotMatch(html, /uix-match-review__candidate/);
});
