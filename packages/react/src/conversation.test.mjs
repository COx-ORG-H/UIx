/* Comment variants + SaveStatus (RX-23 / HAR-366; findings LD-15, LD-13).
 *
 * LD-15: `Comment({ avatar, author, meta, children })` had no way to say "this was the
 * system, not a person", no way to quote the message being answered, and no mention
 * token in the React surface — so every product built its own conversation instead.
 * LD-13: 178 of 194 mutating files never confirm an outcome, and only 2 show a saving
 * state, because there was no piece to mount.
 *
 * Markup claims render with react-dom/server. The live-region claim is a DOM one — an
 * announcement only happens when the region is ALREADY in the tree and its text then
 * changes — so those run in jsdom across real state transitions.
 *
 * Renders the BUILT dist — run `npm run build` first; CI does.
 * Run: node --test (from packages/react), or npm test -w @tensor_1/react.
 */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement as h, act } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as uix from '../dist/index.js';

// A namespace import, so a missing export fails the tests that use it, one by one, instead
// of failing the whole file at link time and hiding which claims hold.
const { Comment, Comments } = uix;
const SaveStatus = uix.SaveStatus ?? (() => { throw new Error('SaveStatus is not exported from @tensor_1/react'); });

const render = (el) => renderToStaticMarkup(el);

/* ── Comment: the system variant ───────────────────────────────────────────────── */

test('Comment variant="system" is marked as the system, not as a person', () => {
  const html = render(h(Comment, { variant: 'system', meta: '22m ago' }, 'Status changed to In Progress'));

  assert.match(html, /class="uix-comment uix-comment--system"/, 'the system variant needs its own class to look different');
  assert.match(html, /data-variant="system"/, 'products and tests need a stable hook for the variant');
  // it must not be attributed to a person: the byline says who acted, and here that is the system
  assert.match(html, /class="uix-comment__author">System</, 'a system message must name the system in its byline');
  assert.match(html, /Status changed to In Progress/);
});

test('Comment variant="system" takes a translated system label', () => {
  const html = render(h(Comment, { variant: 'system', systemLabel: 'System', meta: 'vor 22 Min.' }, 'Status geändert'));
  assert.match(html, /class="uix-comment__author">System</);

  const german = render(h(Comment, { variant: 'system', systemLabel: 'Systemmeldung', meta: 'vor 22 Min.' }, 'Status geändert'));
  assert.match(german, /class="uix-comment__author">Systemmeldung</, 'every visible string must be translatable');
  assert.ok(!german.includes('>System<'), 'the English default leaked into a translated comment');
});

test('Comment defaults to the person variant and keeps its existing markup', () => {
  // the shape quiet-link.test.mjs and every consumer already depend on
  const html = render(h(Comment, { author: 'Ada Lovelace', meta: '22m ago' }, 'Looks right to me'));
  assert.match(html, /^<div class="uix-comment">/);
  assert.ok(!html.includes('uix-comment--system'));
  assert.ok(!html.includes('data-variant'));
  assert.match(html, /<span class="uix-comment__author">Ada Lovelace<\/span> · 22m ago/);
});

/* ── Comment: the reply quote ──────────────────────────────────────────────────── */

test('Comment replyTo renders a labelled quote of the message being answered', () => {
  const html = render(h(Comment, {
    author: 'Ada Lovelace',
    meta: '22m ago',
    replyTo: 'Can you confirm the maintenance window?',
  }, 'Confirmed for Friday'));

  assert.match(html, /<blockquote class="uix-comment__reply">/, 'a quote of another message is a blockquote');
  assert.match(html, /Can you confirm the maintenance window\?/);
  assert.match(html, /class="uix-comment__reply-label">In reply to</, 'the quote must say what it is');
  // the quote precedes the reply itself, or it reads as part of the answer
  assert.ok(html.indexOf('uix-comment__reply') < html.indexOf('Confirmed for Friday'));
});

test('Comment replyTo label is translatable and the slot takes rich content', () => {
  const html = render(h(Comment, {
    replyToLabel: 'Antwort auf',
    replyTo: h('a', { href: '/c/12' }, 'Wartungsfenster'),
  }, 'Bestätigt'));
  assert.match(html, /class="uix-comment__reply-label">Antwort auf</);
  assert.match(html, /<a href="\/c\/12">Wartungsfenster<\/a>/, 'the quote slot must accept a link to the message');
});

test('a comment with no reply renders no quote element at all', () => {
  const html = render(h(Comment, { author: 'Ada Lovelace' }, 'No context needed'));
  assert.ok(!html.includes('uix-comment__reply'), 'an empty quote slot must not leave an empty blockquote');
});

test('Comments container still exposes the thread as a polite log', () => {
  const html = render(h(Comments, null, h(Comment, { variant: 'system' }, 'Assigned to Ada')));
  assert.match(html, /<div role="log" class="uix-comments">/);
});

/* ── SaveStatus ────────────────────────────────────────────────────────────────── */

test('SaveStatus renders each state with its own label and hook', () => {
  for (const [state, label] of [['saving', 'Saving…'], ['saved', 'Saved'], ['failed', 'Could not save']]) {
    const html = render(h(SaveStatus, { state }));
    assert.match(html, new RegExp(`data-state="${state}"`), `${state} needs a stable hook`);
    assert.ok(html.includes(label), `${state} must say "${label}"; got ${html}`);
  }
});

test('SaveStatus labels are translatable, including the retry action', () => {
  const html = render(h(SaveStatus, {
    state: 'failed',
    labels: { saving: 'Wird gespeichert…', saved: 'Gespeichert', failed: 'Speichern fehlgeschlagen', retry: 'Erneut versuchen' },
    onRetry: () => {},
  }));
  assert.match(html, /Speichern fehlgeschlagen/);
  assert.match(html, /<button[^>]*>Erneut versuchen<\/button>/, 'a failed save must offer a way to try again');
  assert.ok(!html.includes('Could not save'), 'the English default leaked into a translated indicator');
});

test('SaveStatus offers retry only when it failed and a handler was given', () => {
  assert.ok(!render(h(SaveStatus, { state: 'failed' })).includes('<button'), 'no handler, no button');
  assert.ok(!render(h(SaveStatus, { state: 'saving', onRetry: () => {} })).includes('<button'), 'nothing to retry while saving');
  assert.ok(render(h(SaveStatus, { state: 'failed', onRetry: () => {} })).includes('<button'));
});

test('SaveStatus keeps a polite live region mounted while idle', () => {
  // A live region added at the same moment as its text announces nothing: the region has to
  // already be in the accessibility tree when the text arrives. So idle is not "render null".
  const html = render(h(SaveStatus, { state: 'idle' }));
  assert.match(html, /data-state="idle"/);
  assert.match(html, /aria-live="polite"/, 'the region must exist before the first state change');
  assert.match(html, /role="status"/);
  assert.ok(!/Saving|Saved|Could not save/.test(html), 'idle must not announce anything');
});

/* ── SaveStatus: the announcement itself, across real transitions ──────────────── */

let dom;
let createRoot;
const expose = (name, value) => Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });

before(async () => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true });
  expose('window', dom.window);
  expose('document', dom.window.document);
  expose('navigator', dom.window.navigator);
  expose('IS_REACT_ACT_ENVIRONMENT', true);
  ({ createRoot } = await import('react-dom/client'));
});

after(() => {
  dom.window.close();
  for (const name of ['window', 'document', 'navigator', 'IS_REACT_ACT_ENVIRONMENT']) delete globalThis[name];
});

test('SaveStatus announces idle → saving → saved through the SAME live region node', () => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  const show = (state) => act(() => { root.render(h(SaveStatus, { state })); });

  show('idle');
  const region = host.querySelector('[aria-live="polite"]');
  assert.ok(region, 'no live region while idle');
  assert.equal(region.textContent.trim(), '');

  show('saving');
  assert.equal(host.querySelector('[aria-live="polite"]'), region, 'the live region was replaced, so nothing is announced');
  assert.equal(region.textContent.trim(), 'Saving…');

  show('saved');
  assert.equal(host.querySelector('[aria-live="polite"]'), region, 'the live region was replaced between states');
  assert.equal(region.textContent.trim(), 'Saved');

  show('failed');
  assert.equal(host.querySelector('[aria-live="polite"]'), region);
  assert.equal(region.textContent.trim(), 'Could not save');

  act(() => root.unmount());
});

test('SaveStatus retry calls back and the button is reachable by keyboard', () => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  let retries = 0;
  act(() => { root.render(h(SaveStatus, { state: 'failed', onRetry: () => { retries += 1; } })); });

  const button = host.querySelector('button');
  assert.ok(button, 'a failed save offers no retry');
  assert.equal(button.type, 'button', 'a retry inside a form must not submit it');
  act(() => button.click());
  assert.equal(retries, 1);

  act(() => root.unmount());
});
