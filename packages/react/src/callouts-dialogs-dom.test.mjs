/* The gaps TENSOR found moving its callouts and dialogs onto the kit (HAR-1614), in jsdom:
 *   1. Alert `onDismiss` + `dismissLabel` and a trailing `actions` slot;
 *   2. Alert forwards its ref (an edit drawer focuses its error message);
 *   3. Alert's text is in a `.uix-alert__content` column — that it grows, shrinks and wraps a
 *      long title at 320 px is layout, measured in tests/a11y/tensor-gaps.spec.mjs;
 *   4. Note `tone={undefined}` / `"neutral"` is the default look;
 *   5. StatusPill `size` sm / lg;
 *   6. PromptDialog `multiline`, `destructive`, an `error` slot and role="alertdialog";
 *   7. Popover `openOnHover`: opens on pointer or focus on its anchor, stays while either is on
 *      the anchor or the popover, closes after both left, and on Escape.
 * Renders the BUILT dist — run `npm run build` first.
 */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement as h, act, createRef, useRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

let dom;
let createRoot;
let ui;

const EXPOSED = ['window', 'document', 'navigator', 'getComputedStyle', 'requestAnimationFrame', 'ResizeObserver', 'IS_REACT_ACT_ENVIRONMENT'];
const expose = (name, value) => Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });

before(async () => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true, url: 'http://localhost/' });
  const { window } = dom;
  expose('window', window);
  expose('document', window.document);
  expose('navigator', window.navigator);
  expose('getComputedStyle', window.getComputedStyle.bind(window));
  expose('requestAnimationFrame', window.requestAnimationFrame.bind(window));
  expose('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  expose('IS_REACT_ACT_ENVIRONMENT', true);
  const dialog = window.HTMLDialogElement.prototype;
  dialog.showModal = function showModal() { this.setAttribute('open', ''); };
  dialog.close = function close() { this.removeAttribute('open'); };
  // Native Popover API (not in jsdom).
  const el = window.HTMLElement.prototype;
  el.showPopover = function showPopover() { this.setAttribute('data-test-popover-open', ''); };
  el.hidePopover = function hidePopover() { this.removeAttribute('data-test-popover-open'); };
  const matches = window.Element.prototype.matches;
  window.Element.prototype.matches = function patched(selector) {
    if (selector === ':popover-open') return this.hasAttribute('data-test-popover-open');
    // jsdom has no pointer: a test marks what the pointer is over
    if (selector === ':hover') return this.hasAttribute('data-test-hover');
    return matches.call(this, selector);
  };
  ({ createRoot } = await import('react-dom/client'));
  ui = await import('../dist/index.js');
});

after(() => {
  dom.window.close();
  for (const name of EXPOSED) delete globalThis[name];
});

const mount = (element) => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(element));
  return { host, rerender: (next) => act(() => root.render(next)), unmount: () => { act(() => root.unmount()); host.remove(); } };
};
const parse = (html) => new dom.window.DOMParser().parseFromString(html, 'text/html').body.firstElementChild;
const click = (el) => act(() => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true })));
const wait = (ms) => act(() => new Promise((resolve) => setTimeout(resolve, ms)));
const typeInto = (field, value) => act(() => {
  const proto = field.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(field, value);
  field.dispatchEvent(new window.Event('input', { bubbles: true }));
});

// ── Alert ────────────────────────────────────────────────────────────────────

test('Alert without the new props: the 2.31.0 markup plus a class on the text column', () => {
  assert.equal(
    renderToStaticMarkup(h(ui.Alert, { tone: 'warning', title: 'Maintenance tonight', icon: h('svg') }, 'From 22:00 to 23:00.')),
    '<div class="uix-alert uix-alert--warning" role="alert"><div class="uix-alert__icon"><svg></svg></div>'
    + '<div class="uix-alert__content"><div class="uix-alert__title">Maintenance tonight</div><div class="uix-alert__body">From 22:00 to 23:00.</div></div></div>',
  );
});

test('Alert onDismiss: a named × at the end; the label comes from the prop, the provider, then "Dismiss"', () => {
  const dismissed = [];
  const alert = (props) => h(ui.Alert, { tone: 'info', title: 'New release', onDismiss: () => dismissed.push(1), ...props }, 'Version 4 is out.');
  const { host, unmount } = mount(alert({}));
  const root = host.firstElementChild;
  const button = root.querySelector('.uix-alert__dismiss');
  assert.equal(button.tagName, 'BUTTON');
  assert.equal(button.getAttribute('type'), 'button');
  assert.equal(button.getAttribute('aria-label'), 'Dismiss');
  assert.equal(root.lastElementChild, button, 'after the text, at the end of the row');
  assert.ok(button.querySelector('svg'), 'an icon, not a text ×');
  assert.equal(button.textContent, '');
  click(button);
  assert.deepEqual(dismissed, [1]);
  assert.ok(host.querySelector('.uix-alert'), 'the alert does not hide itself: the consumer stops rendering it');
  unmount();

  const provided = mount(h(ui.UixLabelsProvider, { labels: { alert: { dismiss: 'Schließen' } } }, alert({})));
  assert.equal(provided.host.querySelector('.uix-alert__dismiss').getAttribute('aria-label'), 'Schließen');
  provided.unmount();
  const explicit = mount(h(ui.UixLabelsProvider, { labels: { alert: { dismiss: 'Schließen' } } }, alert({ dismissLabel: 'Hinweis ausblenden' })));
  assert.equal(explicit.host.querySelector('.uix-alert__dismiss').getAttribute('aria-label'), 'Hinweis ausblenden');
  explicit.unmount();
  assert.equal(parse(renderToStaticMarkup(h(ui.Alert, { title: 'Plain' }))).querySelector('.uix-alert__dismiss'), null, 'no × without onDismiss');
});

test('Alert actions: a trailing slot between the text and the ×', () => {
  const html = renderToStaticMarkup(h(ui.Alert, { title: 'Provider notice', actions: h(ui.Button, { size: 'xs', variant: 'ghost' }, 'Details'), onDismiss() {} }, 'Text'));
  const root = parse(html);
  assert.deepEqual([...root.children].map((c) => c.className.split(' ').pop()), ['uix-alert__content', 'uix-alert__actions', 'uix-alert__dismiss']);
  assert.equal(root.querySelector('.uix-alert__actions .uix-btn').textContent, 'Details');
  assert.equal(root.querySelector('.uix-alert__title .uix-btn'), null, 'the action is no longer squeezed into the title');
});

test('Alert forwards its ref to the alert element, so an error message can take focus', () => {
  const ref = createRef();
  const { host, unmount } = mount(h(ui.Alert, { ref, tone: 'danger', tabIndex: -1, title: 'Could not save' }, 'The name is taken.'));
  assert.equal(ref.current, host.firstElementChild);
  assert.equal(ref.current.getAttribute('role'), 'alert');
  act(() => ref.current.focus());
  assert.equal(document.activeElement, ref.current);
  unmount();
});

// ── Note, StatusPill ─────────────────────────────────────────────────────────

test('Note: tone undefined and "neutral" are the default look; the toned classes are unchanged', () => {
  const plain = '<div class="uix-note"><div class="uix-note__body">Text</div></div>';
  assert.equal(renderToStaticMarkup(h(ui.Note, null, 'Text')), plain);
  assert.equal(renderToStaticMarkup(h(ui.Note, { tone: undefined }, 'Text')), plain);
  assert.equal(renderToStaticMarkup(h(ui.Note, { tone: 'neutral' }, 'Text')), plain);
  for (const tone of ['info', 'success', 'warning', 'danger']) {
    assert.match(renderToStaticMarkup(h(ui.Note, { tone }, 'Text')), new RegExp(`^<div class="uix-note uix-note--${tone}">`));
  }
});

test('StatusPill size: sm and lg add a class, md and the default add none', () => {
  const cls = (props) => parse(renderToStaticMarkup(h(ui.StatusPill, { tone: 'success', ...props }, 'Operational'))).className;
  assert.equal(cls({}), 'uix-pill uix-pill--success');
  assert.equal(cls({ size: 'md' }), 'uix-pill uix-pill--success');
  assert.equal(cls({ size: 'sm' }), 'uix-pill uix-pill--success uix-pill--sm');
  assert.equal(cls({ size: 'lg' }), 'uix-pill uix-pill--success uix-pill--lg');
  assert.equal(cls({ size: 'lg', treatment: 'outline', className: 'mine' }), 'uix-pill uix-pill--success uix-pill--outline uix-pill--lg mine');
  assert.equal(parse(renderToStaticMarkup(h(ui.StatusPill, { size: 'lg', dot: true }, 'Up'))).querySelector('.uix-pill__dot').getAttribute('aria-hidden'), 'true');
});

// ── PromptDialog ─────────────────────────────────────────────────────────────

const prompt = (props) => h(ui.PromptDialog, {
  open: true, title: 'Force import', inputLabel: 'Reason', submitLabel: 'Import anyway', cancelLabel: 'Cancel', onSubmit() {}, onCancel() {}, ...props,
});

test('PromptDialog by default is unchanged: a dialog with a one-line input and a primary submit', () => {
  const { host, unmount } = mount(prompt({}));
  const dialog = host.querySelector('dialog');
  assert.equal(dialog.getAttribute('role'), 'dialog');
  assert.equal(dialog.hasAttribute('aria-describedby'), false);
  assert.equal(host.querySelector('textarea'), null);
  assert.ok(host.querySelector('input.uix-input'));
  assert.ok(host.querySelector('button[type="submit"]').classList.contains('uix-btn--primary'));
  assert.equal(host.querySelector('.uix-field__error'), null);
  unmount();
});

test('PromptDialog multiline: a labelled textarea; Enter adds a line, Ctrl/⌘+Enter and the button submit', () => {
  const submitted = [];
  const { host, unmount } = mount(prompt({ multiline: true, onSubmit: (v) => submitted.push(v), defaultValue: 'Duplicate of SAP 4711' }));
  const area = host.querySelector('textarea.uix-textarea');
  assert.ok(area, 'a textarea, not an input');
  assert.equal(host.querySelector('input.uix-input'), null);
  assert.equal(area.getAttribute('rows'), '4');
  assert.equal(host.querySelector(`label[for="${area.id}"]`).textContent, 'Reason');
  assert.equal(area.value, 'Duplicate of SAP 4711');

  typeInto(area, 'Line one\nLine two');
  const enter = new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
  act(() => { area.dispatchEvent(enter); });
  assert.equal(enter.defaultPrevented, false, 'a plain Enter is left to the textarea');
  assert.deepEqual(submitted, []);
  act(() => { area.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true, cancelable: true })); });
  assert.deepEqual(submitted, ['Line one\nLine two']);
  act(() => { area.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', metaKey: true, bubbles: true, cancelable: true })); });
  click(host.querySelector('button[type="submit"]'));
  assert.equal(submitted.length, 3);
  unmount();

  const tall = mount(prompt({ multiline: 8 }));
  assert.equal(tall.host.querySelector('textarea').getAttribute('rows'), '8');
  tall.unmount();
});

test('PromptDialog destructive: a danger submit and role="alertdialog" described by its description', () => {
  const { host, unmount } = mount(prompt({ destructive: true, multiline: true, description: 'This overwrites the SAP record.' }));
  const dialog = host.querySelector('dialog');
  assert.equal(dialog.getAttribute('role'), 'alertdialog');
  assert.equal(document.getElementById(dialog.getAttribute('aria-describedby')).textContent, 'This overwrites the SAP record.');
  const submit = host.querySelector('button[type="submit"]');
  assert.ok(submit.classList.contains('uix-btn--danger'));
  assert.equal(submit.classList.contains('uix-btn--primary'), false);
  unmount();

  // role can be set either way round
  const quiet = mount(prompt({ destructive: true, role: 'dialog' }));
  assert.equal(quiet.host.querySelector('dialog').getAttribute('role'), 'dialog');
  quiet.unmount();
  const loud = mount(prompt({ role: 'alertdialog' }));
  assert.equal(loud.host.querySelector('dialog').getAttribute('role'), 'alertdialog');
  assert.ok(loud.host.querySelector('button[type="submit"]').classList.contains('uix-btn--primary'));
  loud.unmount();
});

test('PromptDialog error: a server error is shown under the field and tied to it; a validate message replaces it', () => {
  const submitted = [];
  const view = mount(prompt({ multiline: true, error: 'The import service did not answer.', validate: (v) => (v.trim() ? undefined : 'Give a reason.'), onSubmit: (v) => submitted.push(v) }));
  const area = view.host.querySelector('textarea');
  let error = view.host.querySelector('.uix-field__error');
  assert.equal(error.textContent, 'The import service did not answer.');
  assert.equal(error.getAttribute('role'), 'alert');
  assert.equal(area.getAttribute('aria-describedby'), error.id);
  assert.equal(area.getAttribute('aria-invalid'), 'true');
  assert.ok(view.host.querySelector('dialog').hasAttribute('open'), 'the dialog stays open');

  click(view.host.querySelector('button[type="submit"]'));
  error = view.host.querySelector('.uix-field__error');
  assert.equal(error.textContent, 'Give a reason.', 'the local message takes the place of the server one');
  assert.deepEqual(submitted, []);
  typeInto(area, 'Because');
  click(view.host.querySelector('button[type="submit"]'));
  assert.deepEqual(submitted, ['Because']);
  assert.equal(view.host.querySelector('.uix-field__error').textContent, 'The import service did not answer.', 'valid again: the server error shows until the consumer clears it');
  view.rerender(prompt({ multiline: true }));
  assert.equal(view.host.querySelector('.uix-field__error'), null);
  assert.equal(view.host.querySelector('textarea').hasAttribute('aria-invalid'), false);
  view.unmount();
});

// ── Popover openOnHover ──────────────────────────────────────────────────────

function HoverCard({ openOnHover = { openDelay: 20, closeDelay: 20 }, popover }) {
  const anchorRef = useRef(null);
  return h('div', null,
    h('button', { ref: anchorRef, type: 'button', id: 'user' }, 'Ana Petrović'),
    h(ui.Popover, { id: 'card', anchor: anchorRef, openOnHover, popover }, h('a', { href: '/users/ana', id: 'profile' }, 'Open profile')),
    h('button', { type: 'button', id: 'elsewhere' }, 'Elsewhere'));
}
const isOpen = (el) => el.matches(':popover-open');
/** Move the test pointer: `:hover` is true for `over` only, and enter / leave events fire. */
const pointer = (from, over) => act(() => {
  if (from) { from.removeAttribute('data-test-hover'); from.dispatchEvent(new window.Event('pointerleave')); }
  if (over) { over.setAttribute('data-test-hover', ''); over.dispatchEvent(new window.Event('pointerenter')); }
});

test('Popover openOnHover: opens after the delay, stays while the pointer is on the anchor or the card, closes after it left both', async () => {
  const { host, unmount } = mount(h(HoverCard));
  const anchor = host.querySelector('#user');
  const card = host.querySelector('#card');
  assert.equal(card.getAttribute('popover'), 'manual', 'a hover card does not light-dismiss other popovers');

  pointer(null, anchor);
  assert.equal(isOpen(card), false, 'not before the open delay');
  await wait(50);
  assert.equal(isOpen(card), true);

  // the pointer travels from the anchor into the card
  pointer(anchor, card);
  await wait(50);
  assert.equal(isOpen(card), true, 'still wanted: the pointer is on the card');
  pointer(card, anchor);
  await wait(50);
  assert.equal(isOpen(card), true);

  pointer(anchor, null);
  assert.equal(isOpen(card), true, 'not before the close delay');
  await wait(50);
  assert.equal(isOpen(card), false);

  // a quick pass over the anchor never opens it
  pointer(null, anchor);
  pointer(anchor, null);
  await wait(60);
  assert.equal(isOpen(card), false);
  unmount();
});

test('Popover openOnHover: keyboard focus opens it at once, focus may move into the card, Escape closes and returns focus', async () => {
  const { host, unmount } = mount(h(HoverCard, { openOnHover: { openDelay: 400, closeDelay: 20 } }));
  const anchor = host.querySelector('#user');
  const card = host.querySelector('#card');
  const profile = host.querySelector('#profile');
  act(() => anchor.focus());
  await wait(10);
  assert.equal(isOpen(card), true, 'focus does not wait for the hover delay');

  act(() => profile.focus());
  await wait(50);
  assert.equal(isOpen(card), true, 'focus inside the card keeps it open');

  const escape = new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
  act(() => { profile.dispatchEvent(escape); });
  assert.equal(isOpen(card), false);
  assert.equal(document.activeElement, anchor, 'focus goes back to the anchor');
  await wait(50);
  assert.equal(isOpen(card), false, 'and that focus does not reopen it');

  // focus leaving both closes it
  act(() => anchor.blur());
  act(() => anchor.focus());
  await wait(10);
  assert.equal(isOpen(card), true);
  act(() => host.querySelector('#elsewhere').focus());
  await wait(50);
  assert.equal(isOpen(card), false);
  unmount();
});

test('Popover openOnHover: touch does not hover, the popover kind can still be chosen, and it is off by default', async () => {
  const { host, unmount } = mount(h(HoverCard, { popover: 'auto' }));
  const anchor = host.querySelector('#user');
  const card = host.querySelector('#card');
  assert.equal(card.getAttribute('popover'), 'auto');
  act(() => { const e = new window.Event('pointerenter'); e.pointerType = 'touch'; anchor.dispatchEvent(e); });
  await wait(50);
  assert.equal(isOpen(card), false, 'a touch is left to the anchor\'s own click');
  unmount();

  function Plain() {
    const anchorRef = useRef(null);
    return h('div', null, h('button', { ref: anchorRef, id: 'a' }, 'A'), h(ui.Popover, { id: 'p', anchor: anchorRef }, 'x'));
  }
  const plain = mount(h(Plain));
  assert.equal(plain.host.querySelector('#p').getAttribute('popover'), 'auto', 'default unchanged');
  pointer(null, plain.host.querySelector('#a'));
  await wait(350);
  assert.equal(isOpen(plain.host.querySelector('#p')), false);
  plain.unmount();
});
