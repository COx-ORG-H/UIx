/* HAR-1368 (TENSOR C11) — the text diff model and TextDiff. Renders the BUILT dist — run
 * `npm run build` first; CI does. */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement as h, act } from 'react';
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

const ops = (result) => result.ops.map((op) => [op.type, op.tokens.join('|')]);

test('model: line diff finds the inserted line instead of shifting everything after it', () => {
  const r = ui.diffText('a\nb\nc\nd', 'a\nnew\nb\nc\nd');
  assert.deepEqual(ops(r), [['equal', 'a'], ['insert', 'new'], ['equal', 'b|c|d']]);
  assert.equal(r.added, 1);
  assert.equal(r.removed, 0);
  assert.deepEqual(ops(ui.diffText('x\r\ny\r\n', 'x\nz\n')), [['equal', 'x'], ['delete', 'y'], ['insert', 'z'], ['equal', '']]);
  assert.deepEqual(ui.diffText('', '').ops, []);
  assert.deepEqual(ops(ui.diffText('', 'one')), [['insert', 'one']]);
});

test('model: a minimal edit script on shuffled input, and the edit budget falls back to one replacement', () => {
  const a = 'the quick brown fox jumps over the lazy dog'.split(' ');
  const b = 'the brown quick fox leaps over a lazy dog'.split(' ');
  const res = ui.diffTokens(a, b);
  const rebuilt = { before: [], after: [] };
  for (const op of res) {
    if (op.type !== 'insert') rebuilt.before.push(...op.tokens);
    if (op.type !== 'delete') rebuilt.after.push(...op.tokens);
  }
  assert.deepEqual(rebuilt, { before: a, after: b }, 'ops rebuild both sides');
  const edits = res.filter((op) => op.type !== 'equal').reduce((n, op) => n + op.tokens.length, 0);
  assert.equal(edits, 6, 'Myers: 3 deletions + 3 insertions is the shortest script');
  const capped = ui.diffTokens(['p', 'a', 'b', 'c', 's'], ['p', 'x', 'b', 'y', 's'], 1);
  assert.deepEqual(capped.map((op) => [op.type, op.tokens.join('')]), [['equal', 'p'], ['delete', 'abc'], ['insert', 'xby'], ['equal', 's']]);
  assert.equal(ui.diffText('a\nb', 'a\nc', { maxTokens: 1 }).status, 'too-large');
});

test('model: word diff counts words, joins changed words across a space, keeps punctuation apart', () => {
  const r = ui.diffText('Restart the API server, then check.', 'Restart the web proxy, then check.', { granularity: 'word' });
  assert.deepEqual(ops(r), [['equal', 'Restart| |the| '], ['delete', 'API| |server'], ['insert', 'web| |proxy'], ['equal', ',| |then| |check|.']]);
  assert.equal(r.added, 2);
  assert.equal(r.removed, 2);
  assert.deepEqual(ui.tokenizeText('Šta je novo?', 'word'), ['Šta', ' ', 'je', ' ', 'novo', '?']);
});

test('model: rows pair changed lines with word marks, and fold long unchanged runs', () => {
  const before = ['l1', 'l2', 'l3', 'l4', 'l5', 'Call the on-call engineer.', 'l7'].join('\n');
  const after = ['l1', 'l2', 'l3', 'l4', 'l5', 'Call the duty engineer.', 'l7', 'added'].join('\n');
  const rows = ui.textDiffRows(ui.diffText(before, after), { context: 1 });
  assert.deepEqual(rows.map((r) => r.kind), ['fold', 'equal', 'change', 'equal', 'insert']);
  assert.equal(rows[0].count, 4);
  assert.equal(rows[1].before.number, 5);
  const change = rows[2];
  assert.deepEqual(change.before.segments.filter((s) => s.changed).map((s) => s.text), ['on-call']);
  assert.deepEqual(change.after.segments.filter((s) => s.changed).map((s) => s.text), ['duty']);
  assert.equal(rows[4].after.number, 8);
  const rewritten = ui.textDiffRows(ui.diffText('alpha beta gamma', 'totally different words'));
  assert.deepEqual(rewritten.map((r) => r.kind), ['delete', 'insert'], 'a rewritten line is not paired');
  assert.deepEqual(rewritten[0].before.segments, [{ text: 'alpha beta gamma', changed: true }]);
});

test('model: lines pair by similarity, not position, so a renumbered list lines up', () => {
  const before = ['1. Drain the node.', '2. Restart the service.', '3. Watch for ten minutes.', '4. Close the incident.'].join('\n');
  const after = ['1. Drain the node.', '2. Confirm the standby is healthy.', '3. Restart the service.', '4. Watch for fifteen minutes.', '5. Close the incident.'].join('\n');
  const rows = ui.textDiffRows(ui.diffText(before, after));
  assert.deepEqual(rows.map((r) => r.kind), ['equal', 'insert', 'change', 'change', 'change']);
  assert.equal(rows[1].after.segments[0].text, '2. Confirm the standby is healthy.');
  const pairs = rows.slice(2).map((r) => [r.before.segments.map((s) => s.text).join(''), r.after.segments.map((s) => s.text).join('')]);
  assert.deepEqual(pairs, [
    ['2. Restart the service.', '3. Restart the service.'],
    ['3. Watch for ten minutes.', '4. Watch for fifteen minutes.'],
    ['4. Close the incident.', '5. Close the incident.'],
  ]);
  assert.deepEqual(rows[3].after.segments.filter((s) => s.changed).map((s) => s.text), ['4', 'fifteen']);
});

test('TextDiff split: headings, del/ins with spoken words and signs, summary (server-renderable)', () => {
  const html = renderToStaticMarkup(h(ui.TextDiff, {
    before: 'Title\nOld step', after: 'Title\nNew step', beforeLabel: 'Version 3', afterLabel: 'Version 4', label: 'Body changes',
  }));
  assert.match(html, /^<div role="group" aria-label="Body changes" class="uix-text-diff" data-view="split" data-granularity="line">/);
  assert.match(html, /<div class="uix-text-diff__summary">1 added, 1 removed<\/div>/);
  assert.match(html, /data-side="before">Version 3<\/span><span class="uix-text-diff__head" data-side="after">Version 4/);
  assert.match(html, /<del><span class="uix-visually-hidden">Removed: <\/span>Old<\/del> step/);
  assert.match(html, /<ins><span class="uix-visually-hidden">Added: <\/span>New<\/ins> step/);
  assert.match(html, /data-kind="delete"><span class="uix-text-diff__num" aria-hidden="true">2<\/span><span class="uix-text-diff__sign" aria-hidden="true">−<\/span>/);
  assert.match(renderToStaticMarkup(h(ui.TextDiff, { before: 'same', after: 'same' })), /No changes/);
  assert.match(renderToStaticMarkup(h(ui.TextDiff, { before: 'a\nb', after: 'c', maxTokens: 1 })), /too large to compare/);
});

test('TextDiff unified and word views, and the fold button keeps focus on the revealed lines', () => {
  const unified = renderToStaticMarkup(h(ui.TextDiff, { before: 'a\nb', after: 'a\nc', view: 'unified' }));
  assert.equal((unified.match(/class="uix-text-diff__row"/g) || []).length, 3, 'equal, removed, added');
  const word = renderToStaticMarkup(h(ui.TextDiff, { before: 'The cat sat.', after: 'The dog sat.', granularity: 'word', beforeLabel: 'Draft' }));
  assert.match(word, /<div class="uix-text-diff__head">Draft<\/div><div class="uix-text-diff__prose" data-side="before">The <del>/);
  assert.doesNotMatch(word, /uix-text-diff__heads/, 'each prose column carries its own heading, so stacking keeps it');

  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  const lines = Array.from({ length: 12 }, (_, i) => `line ${i + 1}`);
  act(() => root.render(h(ui.TextDiff, { before: lines.join('\n'), after: [...lines.slice(0, 11), 'changed'].join('\n'), context: 2 })));
  const fold = host.querySelector('.uix-text-diff__fold');
  assert.equal(fold.textContent, 'Show 9 unchanged lines');
  fold.focus();
  act(() => fold.dispatchEvent(new window.MouseEvent('click', { bubbles: true })));
  assert.equal(host.querySelector('.uix-text-diff__fold'), null);
  assert.equal(host.querySelectorAll('.uix-text-diff__row').length, 13, '11 unchanged + the old line 12 + its unrelated replacement');
  assert.equal(document.activeElement.textContent.includes('line 1'), true, 'focus lands on the first revealed line');
  act(() => root.unmount());
  host.remove();
});
