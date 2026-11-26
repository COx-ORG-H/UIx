/* Comment threads as approved for TENSOR's worklog (HAR-4713, TENSOR ADR-0360, canvas v50).
 *
 * - no words of its own: every comment word comes from UixLabelsProvider `comments` (the de pack
 *   here), English only without a provider, and an explicit prop still wins;
 * - audience: a lock badge on internal, an envelope badge on outside, each frame by data-audience;
 * - the "Neu" chip never shows on the viewer's own entry, and an own reply folds like any other;
 * - the fold names how many replies it hides, in the locale's plural form;
 * - the composer offers internal first, names the person in hint, choice and commit button;
 * - one new-since notice: divider, count row, show button, a stepper only above one entry;
 * - the draft marker on a thread whose composer is closed;
 * - useCommentDrafts: a draft per thread, discard asks only when there is text, leaving the page
 *   asks (beforeunload) while any thread holds an unsent reply.
 *
 * Renders the BUILT dist — run `npm run build` first; CI does. */
import test, { before, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement as h, act } from 'react';
import { renderToStaticMarkup as render } from 'react-dom/server';
import * as ui from '../dist/index.js';
import { de } from '../dist/locales/de.js';
import { ThumbsUpIcon } from '../dist/icons.js';

const inDe = (element) => render(h(ui.UixLabelsProvider, { labels: de }, element));
const count = (html, pattern) => (html.match(pattern) ?? []).length;

test('English without a provider, German from the de pack, and an explicit prop wins', () => {
  const english = render(h(ui.Comment, { author: 'Mia', audience: { kind: 'internal' }, isNew: true, replyTo: 'Sophie' }, 'Text'));
  assert.match(english, /uix-comment__audience" data-audience="internal"><svg[^]*?<\/svg>Internal</);
  assert.match(english, /uix-comment__unread">New</);
  assert.match(english, /In reply to/);
  const german = inDe(h(ui.Comment, { author: 'Mia', audience: { kind: 'internal' }, isNew: true, replyTo: 'Sophie' }, 'Text'));
  assert.match(german, /<\/svg>Intern</);
  assert.match(german, /uix-comment__unread">Neu</);
  assert.match(german, /Antwort auf/);
  assert.match(inDe(h(ui.Comment, { variant: 'system' }, 'Zugewiesen')), /uix-comment__author">System</);
  assert.match(inDe(h(ui.Comment, { replyTo: 'x', replyToLabel: 'Bezug' }, 'y')), /Bezug/);
  const outside = inDe(h(ui.Comment, { author: 'Sophie Wagner', audience: { kind: 'external', label: 'Von der Meldenden · per E-Mail' } }, 'Frage'));
  assert.match(outside, /data-audience="external"/);
  assert.match(outside, /uix-comment__audience" data-audience="external"><svg[^]*?<\/svg>Von der Meldenden · per E-Mail</);
});

test('the new chip never shows on the viewer\'s own entry, whatever marks it new', () => {
  assert.doesNotMatch(inDe(h(ui.Comment, { author: 'Ich', isNew: true, own: true }, 'x')), /uix-comment__unread|data-new/);
  assert.doesNotMatch(inDe(h(ui.Comment, { author: 'Ich', unreadLabel: 'Neu', own: true }, 'x')), /uix-comment__unread/);
  assert.match(inDe(h(ui.Comment, { author: 'Lena', isNew: true }, 'x')), /data-new=""[^]*uix-comment__unread">Neu/);
  assert.doesNotMatch(inDe(h(ui.Comment, { author: 'Lena' }, 'x')), /uix-comment__unread/);
});

const thread = (replies, extra = {}) => h(ui.CommentThread, { root: h(ui.Comment, { author: 'Sophie' }, 'Root'), replies, ...extra });

test('the fold keeps the last three and new replies, folds an own "new" reply, and counts in the locale', () => {
  const replies = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => ({ id, content: id, unread: id === 'a' || id === 'b', own: id === 'b' }));
  const html = inDe(thread(replies));
  assert.match(html, /<li id="a" tabindex="-1">a<\/li><li id="b" tabindex="-1" hidden="">b<\/li><li id="c" tabindex="-1" hidden="">c<\/li>/);
  assert.match(html, />2 weitere Antworten</);
  assert.match(html, /aria-label="Antworten"/);
  const one = inDe(thread(['a', 'b', 'c', 'd'].map((id) => ({ id, content: id }))));
  assert.match(one, />1 weitere Antwort</);
  assert.equal(count(inDe(thread(['a', 'b', 'c'].map((id) => ({ id, content: id })))), /aria-expanded/g), 0, 'three replies need no fold');
  // the 2.71 function prop still works
  assert.match(render(thread(replies, { showEarlierLabel: (n) => `${n} earlier` })), />2 earlier</);
});

test('the composer: internal first, the person named in hint, choice and button, the frame by audience', () => {
  const internal = inDe(h(ui.CommentComposer, { recipient: 'Sophie Wagner', external: true, audience: 'internal', onAudienceChange() {} }));
  assert.match(internal, /data-audience="internal"/);
  assert.match(internal, /role="radiogroup"[^>]*aria-label="Wer sieht die Antwort\?"/);
  assert.ok(internal.indexOf('>Intern<') < internal.indexOf('>An Sophie Wagner<'), 'Intern comes first');
  assert.match(internal, /uix-composer__hint">Sophie Wagner sieht das nicht\.</);
  assert.match(internal, /<\/svg>Intern speichern<\/button>|<\/svg>Intern speichern</);
  const outside = inDe(h(ui.CommentComposer, { recipient: 'Sophie Wagner', external: true, audience: 'external', onAudienceChange() {} }));
  assert.match(outside, /data-audience="external"/);
  assert.match(outside, /Geht per E-Mail an Sophie Wagner\./);
  assert.match(outside, /An Sophie Wagner senden/);
  assert.ok(outside.indexOf('>Intern<') < outside.indexOf('>An Sophie Wagner<'), 'the order never follows the selection');
  // the effective audience travels with the form
  assert.match(internal, /<input type="hidden" name="audience" value="internal"\/>/);
  assert.match(outside, /<input type="hidden" name="audience" value="external"\/>/);
  // locked internal: a badge, no switch, the hint still names the person
  const locked = inDe(h(ui.CommentComposer, { recipient: 'Sophie Wagner', audience: 'external' }));
  assert.match(locked, /data-audience="internal"/);
  assert.doesNotMatch(locked, /radiogroup|senden/);
  assert.match(locked, /Sophie Wagner sieht das nicht\./);
  assert.match(locked, /<input type="hidden" name="audience" value="internal"\/>/, 'a locked thread submits internal');
  // no person known
  assert.match(inDe(h(ui.CommentComposer, {})), /Nur Ihr Team sieht das\./);
  const unnamed = inDe(h(ui.CommentComposer, { external: true, audience: 'external', onAudienceChange() {} }));
  assert.match(unnamed, />Per E-Mail</);
  assert.match(unnamed, /Wird per E-Mail versendet\./);
  assert.match(unnamed, /Per E-Mail senden/);
  // an explicit undefined word keeps the word below it
  assert.match(inDe(h(ui.CommentComposer, { recipient: 'Sophie Wagner', external: true, audience: 'external', onAudienceChange() {}, labels: { send: undefined } })), /An Sophie Wagner senden/);
  assert.match(render(h(ui.UixLabelsProvider, { labels: { comments: { newCount: undefined } } }, h(ui.CommentNewNotice, { count: 2, onShow() {} }))), /2 new replies/);
  // explicit words still win, one field at a time
  const custom = inDe(h(ui.CommentComposer, { recipient: 'Sophie Wagner', internal: { submitLabel: 'Notiz speichern' } }));
  assert.match(custom, /Notiz speichern/);
  assert.match(custom, /Sophie Wagner sieht das nicht\./);
});

test('the new-since notice: nothing at 0; one entry has no stepper; more step with named buttons', () => {
  assert.equal(inDe(h(ui.CommentNewNotice, { count: 0, onShow() {} })), '');
  const single = inDe(h(ui.CommentNewNotice, { count: 1, onShow() {}, onStep() {} }));
  assert.match(single, /role="separator" aria-label="Neu seit Ihrem letzten Besuch"/);
  assert.match(single, /uix-comment-new__summary">1 neue Antwort</);
  assert.equal(count(single, /<button/g), 1, 'only the show button');
  assert.match(single, /Anzeigen<svg/);
  assert.doesNotMatch(single, /role="status"/);
  const many = inDe(h(ui.CommentNewNotice, { count: 3, current: 2, onShow() {}, onStep() {}, summary: '3 neue Antworten in 2 früheren Threads' }));
  assert.match(many, /uix-comment-new__summary">3 neue Antworten in 2 früheren Threads</);
  assert.match(many, /role="status">2 von 3</);
  assert.match(many, /aria-label="Vorherige neue Antwort"/);
  assert.match(many, /aria-label="Nächste neue Antwort"/);
  assert.equal(count(many, /<button/g), 3);
  assert.match(inDe(h(ui.CommentNewNotice, { count: 3, current: 9, onShow() {}, onStep() {} })), /3 von 3/, 'current is clamped');
  assert.equal(count(inDe(h(ui.CommentNewNotice, { count: 3, onShow() {} })), /<button/g), 1, 'no onStep, no stepper');
  assert.match(inDe(h(ui.CommentNewNotice, { count: 3, current: Number.NaN, onShow() {}, onStep() {} })), /1 von 3/, 'NaN reads as the first');
  // the show button is described by the count line; the arrow follows the direction
  assert.match(single, /<span id="([^"]+)" class="uix-comment-new__summary">[^]*aria-describedby="\1"/);
  const arrow = (html) => html.slice(html.lastIndexOf('Anzeigen'));
  assert.notEqual(arrow(inDe(h(ui.CommentNewNotice, { count: 1, onShow() {} }))), arrow(inDe(h(ui.CommentNewNotice, { count: 1, direction: 'below', onShow() {} }))));
});

test('the draft marker shows while the composer is closed, as a button when it can reopen it', () => {
  const marked = inDe(thread([], { draft: '  Wir prüfen den Vorfall mit dem Betreiber.  ' }));
  assert.match(marked, /<p class="uix-comment-thread__draft"><span class="uix-comment-thread__draft-tag">Entwurf<\/span><span class="uix-comment-thread__draft-text">Wir prüfen den Vorfall mit dem Betreiber\.<\/span><\/p>/);
  assert.match(inDe(thread([], { draft: 'x', onResumeDraft() {} })), /<button type="button" class="uix-comment-thread__draft">/);
  assert.doesNotMatch(inDe(thread([], { draft: 'x', composer: h('textarea') })), /draft-tag/);
  assert.doesNotMatch(inDe(thread([], { draft: '   ' })), /draft-tag|uix-comment-thread__rail/);
  // `composer={open && <CommentComposer />}` gives false while closed: the marker shows, no empty rail
  const closed = inDe(thread([], { draft: 'Erste Zeile\n\nzweite Zeile', composer: false }));
  assert.match(closed, /draft-text">Erste Zeile</);
  assert.doesNotMatch(closed, /zweite Zeile/);
  assert.doesNotMatch(inDe(thread([], { composer: false })), /uix-comment-thread__rail/);
  // a long first line is cut, so the button's name stays short
  const long = inDe(thread([], { draft: 'x'.repeat(500), onResumeDraft() {} }));
  assert.match(long, /draft-text">x{119}…</);
  // the cut never splits an emoji into a lone surrogate
  const emoji = inDe(thread([], { draft: `${'a'.repeat(118)}😀😀😀` }));
  assert.match(emoji, /draft-text">a{118}😀…</);
});

test('a reply\'s unread and own reach its Comment through the thread, and an explicit prop wins', () => {
  const html = inDe(thread([
    { id: 'n', unread: true, content: h(ui.Comment, { author: 'Lena' }, 'neu') },
    { id: 'o', unread: true, own: true, content: h(ui.Comment, { author: 'Ich' }, 'eigen') },
    { id: 's', content: h(ui.Comment, { author: 'Mia' }, 'gesehen') },
    { id: 'x', content: h(ui.Comment, { author: 'Mia', isNew: true }, 'explizit') },
  ]));
  const item = (id) => html.slice(html.indexOf(`id="${id}"`), html.indexOf('</li>', html.indexOf(`id="${id}"`)));
  assert.match(item('n'), /uix-comment__unread">Neu</);
  assert.doesNotMatch(item('o'), /uix-comment__unread/);
  assert.doesNotMatch(item('s'), /uix-comment__unread/);
  assert.match(item('x'), /uix-comment__unread">Neu</);
  assert.match(inDe(h(ui.Comment, { author: 'Mia', labels: { new: 'Ungelesen' }, isNew: true }, 'x')), />Ungelesen</);
});

test('attachments and actions have their own slots under the body', () => {
  const html = render(h(ui.Comment, {
    author: 'Mia',
    attachments: h('ul', { className: 'uix-file-rows' }, h(ui.FileRow, { as: 'li', name: 'log.txt', size: 10, state: 'idle' })),
    actions: h(ui.CommentReaction, { label: 'Daumen hoch, 1, Mia Koch', glyph: h(ThumbsUpIcon, { size: 14 }), count: 1, pressed: false }),
  }, 'Body'));
  assert.match(html, /Body<div class="uix-comment__files"><ul class="uix-file-rows"><li[^>]*uix-file-row/);
  assert.match(html, /<div class="uix-comment__actions"><button[^>]*aria-label="Daumen hoch, 1, Mia Koch" aria-pressed="false"><span aria-hidden="true"><svg/);
});

// ---------- useCommentDrafts, in jsdom ----------

let dom;
let createRoot;
let root;
let host;
const expose = (name, value) => Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
const GLOBALS = ['window', 'document', 'navigator', 'HTMLElement', 'getComputedStyle', 'requestAnimationFrame', 'ResizeObserver', 'IS_REACT_ACT_ENVIRONMENT'];

before(async () => {
  dom = new JSDOM('<!doctype html><html lang="de"><body></body></html>', { pretendToBeVisual: true });
  expose('window', dom.window);
  expose('document', dom.window.document);
  expose('navigator', dom.window.navigator);
  expose('HTMLElement', dom.window.HTMLElement);
  expose('getComputedStyle', dom.window.getComputedStyle.bind(dom.window));
  expose('requestAnimationFrame', dom.window.requestAnimationFrame.bind(dom.window));
  expose('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  expose('IS_REACT_ACT_ENVIRONMENT', true);
  const dialog = dom.window.HTMLDialogElement.prototype;
  dialog.showModal = function showModal() { this.setAttribute('open', ''); };
  dialog.close = function close() {
    if (!this.hasAttribute('open')) return;
    this.removeAttribute('open');
    this.dispatchEvent(new dom.window.Event('close'));
  };
  ({ createRoot } = await import('react-dom/client'));
});

after(() => {
  dom.window.close();
  for (const name of GLOBALS) delete globalThis[name];
});

afterEach(async () => {
  if (root) await act(async () => root.unmount());
  root = null;
  host?.remove();
});

function Drafts({ api }) {
  const drafts = ui.useCommentDrafts();
  api.drafts = drafts;
  return h('div', null, drafts.dialog);
}

const mount = async (element) => {
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root.render(h(ui.UixLabelsProvider, { labels: de }, element)));
  return host;
};
const click = async (el) => act(async () => {
  el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));
});
const leaveCancelled = () => {
  const event = new window.Event('beforeunload', { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
};

test('useCommentDrafts: one draft per thread; blank discards at once; text asks, names the person, keeps or discards', async () => {
  const api = {};
  const el = await mount(h(Drafts, { api }));
  assert.equal(leaveCancelled(), false, 'nothing to lose yet');
  await act(async () => { api.drafts.set('t1', 'Wir prüfen'); api.drafts.set('t2', '   '); });
  assert.equal(api.drafts.get('t1'), 'Wir prüfen');
  assert.equal(api.drafts.has('t2'), false, 'white space is not a draft');
  assert.deepEqual(api.drafts.unsent, ['t1']);
  assert.equal(leaveCancelled(), true, 'leaving asks while a reply is unsent');

  let discarded = 0;
  let kept = 0;
  let now;
  await act(async () => { now = api.drafts.discard('t2', { onDiscard: () => { discarded += 1; } }); });
  assert.equal(now, true);
  assert.equal(discarded, 1);
  assert.equal(el.querySelector('dialog[open]'), null, 'a blank draft does not ask');

  await act(async () => { now = api.drafts.discard('t1', { recipient: 'Sophie Wagner', onDiscard: () => { discarded += 1; }, onKeep: () => { kept += 1; } }); });
  assert.equal(now, false);
  const dialog = el.querySelector('dialog[open]');
  assert.ok(dialog, 'the question opens');
  assert.match(dialog.textContent, /Ungesendete Antwort verwerfen\?/);
  assert.match(dialog.textContent, /Ihre Antwort an Sophie Wagner ist noch nicht gesendet\./);
  const button = (name) => [...dialog.querySelectorAll('button')].find((b) => b.textContent === name);
  assert.equal(document.activeElement, button('Weiter schreiben'), 'the safe choice has focus');
  await click(button('Weiter schreiben'));
  assert.equal(kept, 1);
  assert.equal(api.drafts.get('t1'), 'Wir prüfen', 'keeping keeps the text');

  await act(async () => { api.drafts.discard('t1', { onDiscard: () => { discarded += 1; } }); });
  await click(button('Verwerfen'));
  assert.equal(discarded, 2);
  assert.equal(api.drafts.get('t1'), '');
  assert.deepEqual(api.drafts.unsent, []);
  assert.equal(leaveCancelled(), false, 'nothing left to lose');
});

test('useCommentDrafts: in-app leaving asks with the count of unsent replies; clear after a send disarms it', async () => {
  const api = {};
  const el = await mount(h(Drafts, { api }));
  let went = 0;
  await act(async () => { api.drafts.set('a', 'eins'); api.drafts.set('b', 'zwei'); });
  await act(async () => { api.drafts.confirmLeave(() => { went += 1; }); });
  const dialog = el.querySelector('dialog[open]');
  assert.ok(dialog);
  assert.match(dialog.textContent, /2 Antworten sind noch nicht gesendet\./);
  const button = (name) => [...dialog.querySelectorAll('button')].find((b) => b.textContent === name);
  await click(button('Weiter schreiben'));
  assert.equal(went, 0);
  await act(async () => { api.drafts.clear('a'); api.drafts.clear('b'); });
  let now;
  await act(async () => { now = api.drafts.confirmLeave(() => { went += 1; }); });
  assert.equal(now, true);
  assert.equal(went, 1);
});

test('the fold opens and closes in place, keeps focus on its button and names both states', async () => {
  const replies = ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id, content: id }));
  const el = await mount(thread(replies));
  const fold = el.querySelector('button[aria-expanded]');
  assert.equal(fold.textContent, '2 weitere Antworten');
  assert.equal(el.querySelector('#a').hidden, true);
  fold.focus();
  await click(fold);
  assert.equal(fold.getAttribute('aria-expanded'), 'true');
  assert.equal(fold.textContent, 'Frühere Antworten ausblenden');
  assert.equal(el.querySelector('#a').hidden, false);
  assert.equal(document.activeElement, fold);
  await click(fold);
  assert.equal(el.querySelector('#a').hidden, true);
});

test('the stepper calls onStep(-1) for previous and onStep(1) for next; show calls onShow', async () => {
  const steps = [];
  let shown = 0;
  const el = await mount(h(ui.CommentNewNotice, { count: 3, onShow: () => { shown += 1; }, onStep: (step) => steps.push(step) }));
  const named = (name) => el.querySelector(`button[aria-label="${name}"]`);
  await click(named('Vorherige neue Antwort'));
  await click(named('Nächste neue Antwort'));
  await click([...el.querySelectorAll('button')].find((b) => b.textContent === 'Anzeigen'));
  assert.deepEqual(steps, [-1, 1]);
  assert.equal(shown, 1);
});

test('useCommentDrafts: a second discard replaces the first, whose onKeep runs; set then discard asks', async () => {
  const api = {};
  const el = await mount(h(Drafts, { api }));
  const log = [];
  let now;
  await act(async () => {
    api.drafts.set('a', 'eins');
    now = api.drafts.discard('a', { onKeep: () => log.push('keep a'), onDiscard: () => log.push('discard a') });
  });
  assert.equal(now, false, 'the text set in the same handler is seen');
  await act(async () => { api.drafts.set('b', 'zwei'); api.drafts.discard('b', { recipient: 'Sophie Wagner', onDiscard: () => log.push('discard b') }); });
  assert.deepEqual(log, ['keep a']);
  const dialogs = [...el.querySelectorAll('dialog[open]')];
  assert.equal(dialogs.length, 1);
  assert.match(dialogs[0].textContent, /an Sophie Wagner/);
  await click([...dialogs[0].querySelectorAll('button')].find((b) => b.textContent === 'Verwerfen'));
  assert.deepEqual(log, ['keep a', 'discard b']);
  assert.equal(api.drafts.get('a'), 'eins');
  assert.equal(api.drafts.get('b'), '');
});

test('useCommentDrafts: get and has change identity when a draft changes, so memoised children update', async () => {
  const api = {};
  await mount(h(Drafts, { api }));
  const before = api.drafts.has;
  await act(async () => { api.drafts.set('a', 'eins'); });
  assert.notEqual(api.drafts.has, before);
  assert.equal(api.drafts.has('a'), true);
  const leave = api.drafts;
  await act(async () => { leave.confirmLeave(() => {}); });
  assert.match(document.querySelector('dialog[open]').textContent, /Verlassen, ohne zu senden\?/);
});
