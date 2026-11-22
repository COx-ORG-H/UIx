/* The forms error-recovery layer (UIx enterprise UX study, "First five" #2) in jsdom:
 *
 * - ErrorSummary: "There is a problem", one entry per error linking to its control, the same text
 *   as the field, focus on appear and on a new focusKey, role="alert" on an inner element, a single
 *   error still gets a summary, a form-level entry has no link, a link focuses its control, the
 *   page title carries "Error: " while it shows, labels from UixLabelsProvider;
 * - Field: errorAnnounce assertive / polite / off, the hidden "Error:" prefix;
 * - useFormErrors: an empty field is not flagged on blur, a filled one is (politely); an error
 *   clears on the fixing change and waits for the next blur once fixed; submit flags all, silently
 *   at the fields, with the summary; server errors clear when their field changes;
 * - useLeaveGuard: beforeunload only while dirty / saving / failed; confirm() proceeds at once when
 *   inactive, asks with "Discard changes?" when active, Discard proceeds, Keep editing stays;
 * - ConflictNotice + mergeRecordConflict: who and when, the fields they changed, Reload keeps yours,
 *   a field you both changed needs a choice before Apply.
 *
 * Renders the BUILT dist — run `npm run build` first; CI does. tests/a11y/form-errors.spec.mjs runs
 * the same flows in Chromium with axe. */
import test, { before, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement as h, act, useState } from 'react';

let dom;
let createRoot;
let ui;
let root;
let host;

const expose = (name, value) => Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });

before(async () => {
  dom = new JSDOM('<!doctype html><html lang="en"><head><title>Edit incident</title></head><body></body></html>', { pretendToBeVisual: true });
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
  ui = await import('../dist/index.js');
});

after(() => {
  dom.window.close();
  for (const name of ['window', 'document', 'navigator', 'HTMLElement', 'getComputedStyle', 'requestAnimationFrame', 'ResizeObserver', 'IS_REACT_ACT_ENVIRONMENT']) delete globalThis[name];
});

afterEach(async () => {
  if (root) await act(async () => root.unmount());
  root = null;
  host?.remove();
  document.title = 'Edit incident';
});

const render = async (element) => {
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root.render(element));
  return host;
};

const click = async (el) => act(async () => {
  el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));
});
const type = async (input, value) => act(async () => {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(input, value);
  input.dispatchEvent(new window.Event('input', { bubbles: true }));
});
const blur = async (input) => act(async () => {
  input.focus();
  input.blur();
});
const submit = async (form) => act(async () => {
  form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
});

// ---------- ErrorSummary ----------

for (const kind of ['missing', 'disabled', 'hidden-input', 'non-focusable']) {
  test(`ErrorSummary: an unavailable ${kind} target keeps navigation and focus in the summary`, async () => {
    const target = kind === 'missing' ? null
      : kind === 'non-focusable' ? h('div', { id: 'unavailable' }, 'Field group')
      : h('input', { id: 'unavailable', disabled: kind === 'disabled', type: kind === 'hidden-input' ? 'hidden' : 'text' });
    const el = await render(h('div', null,
      h(ui.ErrorSummary, { errors: [{ message: 'Check the unavailable field', target: 'unavailable' }] }),
      target,
    ));
    const summary = el.querySelector('.uix-validation-summary');
    const link = summary.querySelector('a');
    assert.equal(link.getAttribute('tabindex'), '0', 'recovery links explicitly participate in sequential focus');
    link.focus();
    const event = new window.MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
    await act(async () => link.dispatchEvent(event));
    assert.equal(event.defaultPrevented, true, 'no hash navigation to an unavailable target');
    assert.ok(document.activeElement === summary, 'the summary remains a usable focus destination');
  });
}

test('ErrorSummary: passive renders and message changes do not steal focus; a changed focusKey requests it once', async () => {
  let focused = 0;
  const content = (message, focusKey) => h('div', null,
    h('input', { id: 'working' }),
    h(ui.ErrorSummary, {
      errors: [{ message, target: 'working' }], autoFocus: false, focusKey,
      onFocus: () => { focused += 1; },
    }),
  );
  const el = await render(content('Enter a title', 0));
  const input = el.querySelector('input');
  input.focus();
  await act(async () => root.render(content('Use a shorter title', 0)));
  assert.equal(document.activeElement, input);
  assert.equal(focused, 0);
  await act(async () => root.render(content('Use a shorter title', 1)));
  assert.equal(document.activeElement, el.querySelector('.uix-validation-summary'));
  assert.equal(focused, 1);
  input.focus();
  await act(async () => root.render(content('Use a different title', 1)));
  assert.equal(document.activeElement, input);
  assert.equal(focused, 1);
});

test('ErrorSummary: heading, one linked entry per error, form-level entry unlinked, focus, alert inside', async () => {
  const el = await render(h('div', null,
    h('input', { id: 'title' }),
    h(ui.ErrorSummary, { errors: [{ message: 'Enter a title', target: 'title' }, { message: 'The change window overlaps a freeze' }] }),
  ));
  const summary = el.querySelector('.uix-validation-summary');
  assert.ok(summary, 'renders over .uix-validation-summary');
  assert.equal(summary.getAttribute('tabindex'), '-1');
  assert.equal(document.activeElement, summary, 'takes focus when it appears');
  assert.equal(summary.getAttribute('role'), null, 'the focus target is not the alert');
  const alert = summary.querySelector('[role="alert"]');
  assert.ok(alert, 'role="alert" sits on an inner element (GOV.UK v4.4.0)');
  assert.equal(alert.querySelector('h2').textContent, 'There is a problem');
  const items = [...summary.querySelectorAll('li')];
  assert.equal(items.length, 2);
  const link = items[0].querySelector('a');
  assert.equal(link.getAttribute('href'), '#title');
  assert.equal(link.textContent, 'Enter a title');
  assert.equal(items[1].querySelector('a'), null, 'a form-level error is text, not a link');
  await click(link);
  assert.equal(document.activeElement, el.querySelector('#title'), 'the link focuses its control');
});

test('ErrorSummary: a single error still gets the summary; no errors renders nothing', async () => {
  const el = await render(h(ui.ErrorSummary, { errors: [{ message: 'Enter a title', target: 'title' }] }));
  assert.equal(el.querySelectorAll('.uix-validation-summary li').length, 1);
  assert.equal(el.querySelector('h2').textContent, 'There is a problem');
  await act(async () => root.render(h(ui.ErrorSummary, { errors: [] })));
  assert.equal(el.innerHTML, '');
});

test('ErrorSummary: page title starts with "Error: " while it shows, once, and is restored', async () => {
  const el = await render(h('div', null,
    h(ui.ErrorSummary, { errors: [{ message: 'Enter a title' }] }),
    h(ui.ErrorSummary, { errors: [{ message: 'Enter a team' }], autoFocus: false }),
  ));
  assert.ok(el);
  assert.equal(document.title, 'Error: Edit incident');
  await act(async () => root.render(h('div', null, h(ui.ErrorSummary, { errors: [] }), h(ui.ErrorSummary, { errors: [{ message: 'Enter a team' }] }))));
  assert.equal(document.title, 'Error: Edit incident', 'still one prefix while one summary shows');
  await act(async () => root.render(h('div', null)));
  assert.equal(document.title, 'Edit incident');
  assert.equal(ui.errorTitle('Error: Edit incident'), 'Error: Edit incident', 'errorTitle is idempotent');
  assert.equal(ui.errorTitle('Vorfall', 'Fehler: '), 'Fehler: Vorfall');
});

test('ErrorSummary: a new focusKey takes focus back; labels come from the provider', async () => {
  const Harness = ({ k }) => h(ui.UixLabelsProvider, { labels: { errorSummary: { title: 'Es gibt ein Problem', errorPrefix: 'Fehler:' } } },
    h('input', { id: 'other' }),
    h(ui.ErrorSummary, { errors: [{ message: 'Titel eingeben', target: 'other' }], focusKey: k }));
  const el = await render(h(Harness, { k: 1 }));
  assert.equal(el.querySelector('h2').textContent, 'Es gibt ein Problem');
  assert.equal(document.title, 'Fehler: Edit incident');
  el.querySelector('#other').focus();
  await act(async () => root.render(h(Harness, { k: 1 })));
  assert.equal(document.activeElement, el.querySelector('#other'), 'the same key does not steal focus');
  await act(async () => root.render(h(Harness, { k: 2 })));
  assert.equal(document.activeElement, el.querySelector('.uix-validation-summary'));
});

// ---------- Field ----------

test('Field: errorAnnounce picks the live behaviour; errorPrefix is visually hidden text', async () => {
  const el = await render(h('div', null,
    h(ui.Field, { label: 'A', error: 'Enter A' }, h('input', { id: 'a' })),
    h(ui.Field, { label: 'B', error: 'Enter B', errorAnnounce: 'polite', errorPrefix: 'Error:' }, h('input', { id: 'b' })),
    h(ui.Field, { label: 'C', error: 'Enter C', errorAnnounce: 'off' }, h('input', { id: 'c' })),
  ));
  const [a, b, c] = [...el.querySelectorAll('.uix-field')];
  assert.equal(a.querySelector('.uix-field__error').getAttribute('role'), 'alert', 'default unchanged');
  assert.equal(a.querySelector('.uix-visually-hidden'), null, 'no prefix unless asked');
  assert.equal(b.querySelector('.uix-field__error').getAttribute('role'), null);
  assert.equal(b.querySelector('.uix-field__msg').getAttribute('aria-live'), null, 'the visible line (hint, warning) is never live');
  assert.equal(b.querySelector('[data-uix-field-announce]').getAttribute('aria-live'), 'polite');
  assert.equal(b.querySelector('[data-uix-field-announce]').textContent, 'Error: Enter B', 'a hidden region holds the error only');
  assert.equal(b.querySelector('.uix-visually-hidden').textContent, 'Error: ');
  assert.equal(b.querySelector('.uix-field__error').textContent, 'Error: Enter B');
  assert.equal(c.querySelector('.uix-field__error').getAttribute('role'), null);
  assert.equal(c.querySelector('.uix-field__msg').getAttribute('aria-live'), null);
  assert.equal(c.querySelector('[data-uix-field-announce]').textContent, '', 'off: the region is there, empty');
  assert.equal(a.querySelector('[data-uix-field-announce]'), null, 'assertive: no extra region');
  assert.equal(c.querySelector('input').getAttribute('aria-invalid'), 'true', 'still invalid and described');
});

// ---------- useFormErrors ----------

const validate = (v) => ({
  title: !v.title.trim() ? 'Enter a title' : v.title.length > 10 ? 'Title must be 10 characters or fewer' : undefined,
  team: !v.team ? 'Enter a team' : undefined,
});

function Form({ onValid = () => {}, api = {} }) {
  const [values, setValues] = useState({ title: '', team: '' });
  const form = ui.useFormErrors({ values, validate, idPrefix: 'f' });
  api.form = form;
  const input = (name) => h(ui.Field, { label: name, ...form.field(name) },
    h('input', { ...form.control(name), value: values[name], onChange: (e) => { const next = e.currentTarget.value; setValues((v) => ({ ...v, [name]: next })); } }));
  return h('form', { noValidate: true, onSubmit: form.handleSubmit(onValid) },
    h(ui.ErrorSummary, form.summary),
    input('title'),
    input('team'),
    h('button', { type: 'submit' }, 'Save'));
}

const fieldOf = (el, name) => el.querySelector(`#f-${name}`).closest('.uix-field');
const errorOf = (el, name) => fieldOf(el, name).querySelector('.uix-field__error')?.textContent.replace(/^Error: /, '') ?? null;

test('useFormErrors: leaving an empty field flags nothing; leaving a filled wrong one flags it politely', async () => {
  const el = await render(h(Form));
  const title = el.querySelector('#f-title');
  await blur(title);
  assert.equal(errorOf(el, 'title'), null, 'an empty field waits for submit');
  await type(title, 'Far too long a title');
  assert.equal(errorOf(el, 'title'), null, 'nothing while typing');
  await blur(title);
  assert.equal(errorOf(el, 'title'), 'Title must be 10 characters or fewer');
  assert.equal(fieldOf(el, 'title').querySelector('[data-uix-field-announce]').textContent, 'Error: Title must be 10 characters or fewer', 'announced politely');
  assert.equal(el.querySelector('.uix-validation-summary'), null, 'no summary before a submit');
});

test('useFormErrors: an error clears on the fixing change, and once fixed waits for the next blur', async () => {
  const el = await render(h(Form));
  const title = el.querySelector('#f-title');
  await type(title, 'Far too long a title');
  await blur(title);
  await type(title, 'Short');
  assert.equal(errorOf(el, 'title'), null, 'cleared on the keystroke that fixes it');
  await type(title, 'Long again, too long');
  assert.equal(errorOf(el, 'title'), null, 'not flagged again mid-typing');
  await blur(title);
  assert.equal(errorOf(el, 'title'), 'Title must be 10 characters or fewer');
});

test('useFormErrors: a failed submit shows every error, silent at the fields, and a focused summary with the same words', async () => {
  let saved = 0;
  const el = await render(h(Form, { onValid: () => { saved += 1; } }));
  await submit(el.querySelector('form'));
  assert.equal(saved, 0);
  const summary = el.querySelector('.uix-validation-summary');
  assert.equal(document.activeElement, summary);
  assert.equal(document.title, 'Error: Edit incident');
  const links = [...summary.querySelectorAll('a')];
  assert.deepEqual(links.map((a) => a.getAttribute('href')), ['#f-title', '#f-team'], 'in form order, to the controls');
  assert.deepEqual(links.map((a) => a.textContent), [errorOf(el, 'title'), errorOf(el, 'team')], 'word for word the field messages');
  for (const name of ['title', 'team']) {
    const field = fieldOf(el, name);
    assert.equal(field.querySelector('[data-uix-field-announce]').textContent, '', 'the summary announced it');
    assert.equal(field.querySelector('.uix-field__error').getAttribute('role'), null);
    assert.equal(field.querySelector('.uix-visually-hidden').textContent, 'Error: ');
    assert.equal(field.querySelector('input').getAttribute('aria-invalid'), 'true');
  }
  // Fixing one field takes it out of the summary; fixing both removes the summary and the title prefix.
  await type(el.querySelector('#f-title'), 'Outage');
  assert.deepEqual([...el.querySelectorAll('.uix-validation-summary a')].map((a) => a.textContent), ['Enter a team']);
  await type(el.querySelector('#f-team'), 'Network');
  assert.equal(el.querySelector('.uix-validation-summary'), null);
  assert.equal(document.title, 'Edit incident');
  await submit(el.querySelector('form'));
  assert.equal(saved, 1, 'a valid submit calls onValid');
});

test('useFormErrors: a second failed submit takes focus back to the summary', async () => {
  const el = await render(h(Form));
  await submit(el.querySelector('form'));
  el.querySelector('#f-team').focus();
  await submit(el.querySelector('form'));
  assert.equal(document.activeElement, el.querySelector('.uix-validation-summary'));
});

test('useFormErrors: server errors show in the field and summary, and clear when the field changes', async () => {
  const api = {};
  const el = await render(h(Form, { api }));
  await type(el.querySelector('#f-title'), 'Outage');
  await type(el.querySelector('#f-team'), 'Network');
  await act(async () => api.form.setServerErrors({ title: 'An incident with this title is already open' }, ['The change window overlaps a freeze']));
  assert.equal(errorOf(el, 'title'), 'An incident with this title is already open');
  const items = [...el.querySelectorAll('.uix-validation-summary li')].map((li) => li.textContent);
  assert.deepEqual(items, ['The change window overlaps a freeze', 'An incident with this title is already open']);
  assert.equal(document.activeElement, el.querySelector('.uix-validation-summary'));
  await type(el.querySelector('#f-title'), 'Outage 2');
  assert.equal(errorOf(el, 'title'), null, 'a server error goes once its field changes');
  assert.deepEqual([...el.querySelectorAll('.uix-validation-summary li')].map((li) => li.textContent), ['The change window overlaps a freeze']);
  await act(async () => api.form.reset());
  assert.equal(el.querySelector('.uix-validation-summary'), null);
});

// ---------- useLeaveGuard ----------

function Guarded({ dirty, saveState, fields, api }) {
  const leave = ui.useLeaveGuard({ dirty, saveState, fields });
  api.leave = leave;
  return h('div', null, leave.dialog);
}

const beforeUnloadCancelled = () => {
  const event = new window.Event('beforeunload', { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
};

test('useLeaveGuard: beforeunload only while dirty, saving or failed', async () => {
  const api = {};
  await render(h(Guarded, { dirty: false, api }));
  assert.equal(api.leave.active, false);
  assert.equal(beforeUnloadCancelled(), false);
  for (const props of [{ dirty: true }, { saveState: 'saving' }, { saveState: 'failed' }]) {
    await act(async () => root.render(h(Guarded, { ...props, api })));
    assert.equal(api.leave.active, true, JSON.stringify(props));
    assert.equal(beforeUnloadCancelled(), true, JSON.stringify(props));
  }
  await act(async () => root.render(h(Guarded, { dirty: false, saveState: 'saved', api })));
  assert.equal(beforeUnloadCancelled(), false, 'disarmed once saved');
});

test('useLeaveGuard: confirm proceeds at once when clean, asks when dirty; Discard proceeds, Keep editing stays', async () => {
  const api = {};
  const el = await render(h(Guarded, { dirty: false, api }));
  let went = 0;
  let stayed = 0;
  let now;
  await act(async () => { now = api.leave.confirm(() => { went += 1; }, () => { stayed += 1; }); });
  assert.equal(now, true);
  assert.equal(went, 1);
  await act(async () => root.render(h(Guarded, { dirty: true, fields: ['Impact', 'Description'], api })));
  await act(async () => { now = api.leave.confirm(() => { went += 1; }, () => { stayed += 1; }); });
  assert.equal(now, false);
  const dialog = el.querySelector('dialog[open]');
  assert.ok(dialog, 'the step opens');
  assert.match(dialog.textContent, /Discard changes\?/, 'the DiscardPrompt title');
  assert.match(dialog.textContent, /Your changes to Impact and Description will be lost\./);
  const button = (name) => [...dialog.querySelectorAll('button')].find((b) => b.textContent === name);
  assert.equal(document.activeElement, button('Keep editing'), 'the safe choice has focus');
  await click(button('Keep editing'));
  assert.equal(stayed, 1);
  assert.equal(went, 1);
  await act(async () => { api.leave.confirm(() => { went += 1; }); });
  await click(button('Discard'));
  assert.equal(went, 2);
});

// ---------- ConflictNotice / mergeRecordConflict ----------

const BASE = { title: 'Mail outage', priority: 'P3', assignee: 'Ana', notes: '' };
const YOURS = { title: 'Mail outage', priority: 'P2', assignee: 'Ana', notes: 'Restarted relay' };
const THEIRS = { title: 'Mail outage EU', priority: 'P1', assignee: 'Ana', notes: '' };

test('mergeRecordConflict: their changes in, yours kept; a field both changed takes theirs unless kept', () => {
  const changes = ui.recordConflictChanges(BASE, YOURS, THEIRS);
  assert.deepEqual(changes.map((c) => [c.path, c.overlap]), [['$.priority', true], ['$.title', false]], 'only what they changed; notes is yours alone');
  assert.deepEqual(ui.mergeRecordConflict(BASE, YOURS, THEIRS), { title: 'Mail outage EU', priority: 'P1', assignee: 'Ana', notes: 'Restarted relay' });
  assert.deepEqual(ui.mergeRecordConflict(BASE, YOURS, THEIRS, { '$.priority': 'skip' }).priority, 'P2');
  assert.deepEqual(ui.mergeRecordConflict({ a: { b: 1, c: 1 } }, { a: { b: 2, c: 1 } }, { a: { b: 1, c: 3 } }), { a: { b: 2, c: 3 } }, 'nested paths');
  assert.deepEqual(ui.mergeRecordConflict({ a: 1, x: 1 }, { a: 1, x: 1 }, { a: 1 }), { a: 1 }, 'a removed field goes');
});

test('ConflictNotice: who and when, the fields they changed, the overlap, Reload keeps yours, Apply needs a choice', async () => {
  let reloaded;
  let applied;
  const el = await render(h(ui.ConflictNotice, {
    base: BASE, yours: YOURS, theirs: THEIRS, changedBy: 'Alex', changedAt: '14:02',
    labelFor: (path) => ({ '$.priority': 'Priority', '$.title': 'Title' })[path],
    onReload: (merged) => { reloaded = merged; },
    onApply: (merged, resolutions) => { applied = { merged, resolutions }; },
  }));
  const banner = el.querySelector('.uix-alert');
  assert.equal(banner.getAttribute('role'), null, 'the focus target is not the alert (GOV.UK v4.4.0)');
  assert.equal(banner.getAttribute('tabindex'), '-1');
  assert.ok(banner.classList.contains('uix-alert--warning'), 'attention, not critical');
  const alert = banner.querySelector('[role="alert"]');
  assert.equal(alert.querySelector('.uix-conflict-notice__title').textContent, 'Alex changed this at 14:02 while you were editing');
  assert.equal(alert.querySelector('button'), null, 'the buttons are outside the alert');
  assert.match(alert.textContent, /Your changes are not saved yet, and they are still here\./);
  assert.equal(alert.querySelector('.uix-conflict-notice__fields').textContent, 'Priority and Title');
  assert.ok(banner.querySelector('.uix-conflict-notice__actions button'), 'the actions sit under the text, not in the side slot');
  assert.equal(banner.querySelector('.uix-alert__actions'), null);
  assert.match(alert.textContent, /You both changed Priority\./);
  const button = (name) => [...el.querySelectorAll('button')].find((b) => b.textContent === name);
  assert.equal(button('Review changes').getAttribute('aria-expanded'), 'true', 'opens itself when a field needs a choice');
  assert.ok(el.querySelector('.uix-diff-viewer'), 'the comparison is a DiffViewer');
  assert.match(el.querySelector('.uix-diff-viewer').textContent, /You both changed/, 'groups say who changed what');
  assert.doesNotMatch(el.querySelector('.uix-diff-viewer').textContent, /"P3"/, 'values read as text, not JSON');
  await click(button('Apply'));
  assert.equal(applied, undefined, 'Apply waits for a choice on Priority');
  assert.equal(button('Apply').getAttribute('aria-disabled'), 'true');
  await click(el.querySelector('button[aria-label="Keep yours for Priority"]'));
  await click(button('Apply'));
  assert.deepEqual(applied.merged, { title: 'Mail outage EU', priority: 'P2', assignee: 'Ana', notes: 'Restarted relay' });
  await click(button('Reload latest'));
  assert.deepEqual(reloaded, { title: 'Mail outage EU', priority: 'P1', assignee: 'Ana', notes: 'Restarted relay' });
});

test('ConflictNotice: nobody named, no overlap: the plain title, the comparison closed, no Apply without onApply', async () => {
  const el = await render(h(ui.ConflictNotice, {
    base: { a: 1, b: 1 }, yours: { a: 2, b: 1 }, theirs: { a: 1, b: 3 }, onReload: () => {},
  }));
  assert.equal(el.querySelector('.uix-conflict-notice__title').textContent, 'Changed by someone else while you were editing');
  assert.doesNotMatch(el.textContent, /You both changed/);
  const review = el.querySelector('.uix-conflict-notice__review');
  assert.equal(review.hidden, true);
  const toggle = [...el.querySelectorAll('button')].find((b) => b.textContent === 'Review changes');
  await click(toggle);
  assert.equal(review.hidden, false);
  assert.equal([...el.querySelectorAll('button')].find((b) => b.textContent === 'Apply'), undefined);
});

// ---------- review findings (PR #306) ----------

test('useFormErrors: resubmitting a value the server refused does not save, and keeps it in the summary', async () => {
  const api = {};
  let saved = 0;
  const el = await render(h(Form, { api, onValid: () => { saved += 1; } }));
  await type(el.querySelector('#f-title'), 'Outage');
  await type(el.querySelector('#f-team'), 'Network');
  await act(async () => api.form.setServerErrors({ title: 'An incident with this title is already open' }));
  el.querySelector('#f-team').focus();
  await submit(el.querySelector('form'));
  assert.equal(saved, 0, 'the same refused value is not sent again');
  assert.deepEqual([...el.querySelectorAll('.uix-validation-summary a')].map((a) => a.textContent), ['An incident with this title is already open']);
  assert.equal(document.activeElement, el.querySelector('.uix-validation-summary'));
  await type(el.querySelector('#f-title'), 'Outage 2');
  await submit(el.querySelector('form'));
  assert.equal(saved, 1, 'a changed value goes');
});

test('useFormErrors: a field flagged on blur and then listed by a submit is silent at the field', async () => {
  const el = await render(h(Form));
  const title = el.querySelector('#f-title');
  await type(title, 'Far too long a title');
  await blur(title);
  assert.notEqual(fieldOf(el, 'title').querySelector('[data-uix-field-announce]').textContent, '');
  await submit(el.querySelector('form'));
  assert.equal(fieldOf(el, 'title').querySelector('[data-uix-field-announce]').textContent, '', 'the summary speaks for it');
});

test('useFormErrors: a listed field whose message changes leaves the summary and is announced at the field', async () => {
  const el = await render(h(Form));
  await submit(el.querySelector('form'));
  const before = [...el.querySelectorAll('.uix-validation-summary a')].map((a) => a.textContent);
  assert.deepEqual(before, ['Enter a title', 'Enter a team']);
  await type(el.querySelector('#f-title'), 'Far too long a title');
  assert.deepEqual([...el.querySelectorAll('.uix-validation-summary a')].map((a) => a.textContent), ['Enter a team'], 'the alert region does not change words mid-typing');
  assert.equal(errorOf(el, 'title'), 'Title must be 10 characters or fewer');
  assert.equal(fieldOf(el, 'title').querySelector('[data-uix-field-announce]').textContent, 'Error: Title must be 10 characters or fewer');
});

test('useErrorTitle: a title that already said "Error: " keeps it when the summary goes', async () => {
  document.title = 'Error: Existing page';
  await render(h(ui.ErrorSummary, { errors: [{ message: 'Enter a title' }] }));
  assert.equal(document.title, 'Error: Existing page', 'not prefixed twice');
  await act(async () => root.render(h(ui.ErrorSummary, { errors: [] })));
  assert.equal(document.title, 'Error: Existing page', 'a prefix the hook did not add stays');
});

test('useLeaveGuard: a second attempt while asking sends the first one back (its stay runs)', async () => {
  const api = {};
  const el = await render(h(Guarded, { dirty: true, api }));
  const log = [];
  await act(async () => { api.leave.confirm(() => log.push('go 1'), () => log.push('stay 1')); });
  await act(async () => { api.leave.confirm(() => log.push('go 2'), () => log.push('stay 2')); });
  assert.deepEqual(log, ['stay 1']);
  const dialog = el.querySelector('dialog[open]');
  await click([...dialog.querySelectorAll('button')].find((b) => b.textContent === 'Discard'));
  assert.deepEqual(log, ['stay 1', 'go 2']);
});

test('mergeRecordConflict: a removed subtree goes; __proto__ and dotted keys stay plain fields', () => {
  assert.deepEqual(ui.mergeRecordConflict({ profile: { name: 'A' }, x: 1 }, { profile: { name: 'A' }, x: 2 }, { x: 1 }), { x: 2 }, 'no empty profile left behind');
  const theirs = JSON.parse('{"title":"T","__proto__":{"isAdmin":true}}');
  const merged = ui.mergeRecordConflict({ title: 'T' }, { title: 'T' }, theirs);
  assert.equal(merged.isAdmin, undefined, 'no inherited property');
  assert.equal(Object.getPrototypeOf(merged), Object.prototype);
  assert.ok(Object.prototype.hasOwnProperty.call(merged, '__proto__'), 'kept as an own field');
  assert.deepEqual(merged['__proto__'], { isAdmin: true });
  const dotted = ui.mergeRecordConflict({ 'a.b': 1 }, { 'a.b': 1 }, { 'a.b': 2 });
  assert.deepEqual(dotted, { 'a.b': 2 }, 'a key with a dot is one key');
  assert.equal(ui.recordConflictChanges({ 'a.b': 1 }, { 'a.b': 1 }, { 'a.b': 2 })[0].path, '$.a\\.b');
});

test('ConflictNotice: a later conflict on the same field with other values asks again', async () => {
  const props = (theirs) => ({ base: { p: 'P3' }, yours: { p: 'P2' }, theirs, onReload: () => {}, onApply: () => {} });
  const el = await render(h(ui.ConflictNotice, props({ p: 'P1' })));
  await click(el.querySelector('button[aria-label="Keep yours for p"]'));
  const apply = () => [...el.querySelectorAll('button')].find((b) => b.textContent === 'Apply');
  assert.equal(apply().getAttribute('aria-disabled'), null);
  await act(async () => root.render(h(ui.ConflictNotice, props({ p: 'P4' }))));
  assert.equal(apply().getAttribute('aria-disabled'), 'true', 'the earlier choice does not carry over');
});
