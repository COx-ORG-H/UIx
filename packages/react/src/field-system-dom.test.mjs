/* One field system (HAR-3100): what TENSOR's shared Form needs from the kit Field, so its
 * DefaultField can render through Field instead of copying its markup.
 *
 * - `labelId` puts an id on the label, so a control that is not a labelable element (a rich-text
 *   editor) can name itself with aria-labelledby;
 * - every ? without a `helpLabel` takes its name from the UixLabelsProvider `infoTip` template, so
 *   an app localises the ? once (`infoTip.about` with `{title}`, `infoTip.more` for a title that
 *   is not text); an own `helpLabel` still wins, and a blank template falls back to English;
 * - NumberInput holds a number: it reports `valueAsNumber` (NaN when emptied, never the typed
 *   text) and shows NaN or null as an empty field.
 *
 * Renders the BUILT dist — run `npm run build` first; CI does.
 */
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
  dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true });
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

/** Type into a controlled input the way a person does: the native setter, then an input event. */
const type = (input, text) => act(() => {
  Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, text);
  input.dispatchEvent(new window.Event('input', { bubbles: true }));
});

test('labelId: the label carries the id, with and without help, so aria-labelledby can point at it', () => {
  const plain = renderToStaticMarkup(h(ui.Field, { label: 'Notes', labelId: 'field-notes-label' }, h('div', { role: 'textbox', 'aria-labelledby': 'field-notes-label' })));
  assert.match(plain, /<label id="field-notes-label" class="uix-field__label" for="[^"]+">Notes<\/label>/);
  assert.match(plain, /<div role="textbox" aria-labelledby="field-notes-label"/);
  const helped = renderToStaticMarkup(h(ui.Field, { label: 'Notes', labelId: 'field-notes-label', help: 'What goes here.', required: true }, h(ui.Input, {})));
  assert.match(helped, /<div class="uix-field__label-row"><label id="field-notes-label" class="uix-field__label" for="[^"]+">Notes<\/label>/);
  // without labelId the label has no id, as before
  assert.doesNotMatch(renderToStaticMarkup(h(ui.Field, { label: 'Notes' }, h(ui.Input, {}))), /<label id=/);
});

test('the ? takes its name from the provider template; an own helpLabel wins; English without a provider', () => {
  const de = { infoTip: { about: 'Info: {title}', more: 'Mehr Informationen' } };
  const field = mount(h(ui.UixLabelsProvider, { labels: de }, h(ui.Field, { label: 'Kürzel', help: 'Das kurze Kürzel.' }, h(ui.Input, {}))));
  assert.equal(field.host.querySelector('.uix-infotip button, button[aria-describedby]').getAttribute('aria-label'), 'Info: Kürzel');
  field.unmount();

  const header = mount(h(ui.UixLabelsProvider, { labels: de }, h(ui.PageHeader, { title: h('span', null, 'Störungen'), help: 'Was eine Störung ist.' })));
  assert.equal(header.host.querySelector('button[aria-describedby]').getAttribute('aria-label'), 'Mehr Informationen', 'a title that is not text');
  header.unmount();

  const own = mount(h(ui.UixLabelsProvider, { labels: de }, h(ui.Card, { title: 'Kosten', help: 'Wie gerechnet wird.', helpLabel: 'Erklärung zu den Kosten' }, 'x')));
  assert.equal(own.host.querySelector('button[aria-describedby]').getAttribute('aria-label'), 'Erklärung zu den Kosten');
  own.unmount();

  const blank = mount(h(ui.UixLabelsProvider, { labels: { infoTip: { about: '  ' } } }, h(ui.SectionHead, { title: 'Recent', help: 'The last ten.' })));
  assert.equal(blank.host.querySelector('button[aria-describedby]').getAttribute('aria-label'), 'About: Recent', 'a blank template falls back');
  blank.unmount();

  const none = mount(h(ui.Field, { label: 'Code', help: 'Short.' }, h(ui.Input, {})));
  assert.equal(none.host.querySelector('button[aria-describedby]').getAttribute('aria-label'), 'About: Code');
  none.unmount();
});

test('the ? name is the same on the server: Field, PageHeader, Card and SectionHead render it in their markup', () => {
  const labels = { infoTip: { about: 'Info: {title}' } };
  for (const el of [
    h(ui.Field, { label: 'Name', help: 'Who.' }, h(ui.Input, {})),
    h(ui.PageHeader, { title: 'Name', help: 'Who.' }),
    h(ui.Card, { title: 'Name', help: 'Who.' }, 'x'),
    h(ui.SectionHead, { title: 'Name', help: 'Who.' }),
  ]) {
    assert.match(renderToStaticMarkup(h(ui.UixLabelsProvider, { labels }, el)), /aria-label="Info: Name"/);
  }
});

test('NumberInput reports a number, NaN when emptied, and never the typed text', () => {
  const seen = [];
  function Harness() {
    const [value, setValue] = useState(Number.NaN);
    return h(ui.NumberInput, { 'aria-label': 'Menge', value, onValueChange: (n) => { seen.push(n); setValue(n); } });
  }
  const { host, unmount } = mount(h(Harness));
  const input = host.querySelector('input');
  assert.equal(input.type, 'number');
  assert.equal(input.getAttribute('inputmode'), 'decimal');
  assert.equal(input.value, '', 'NaN shows an empty field');
  type(input, '12');
  assert.equal(input.value, '12', 'what was typed stays in the box');
  type(input, '12.5');
  type(input, '');
  assert.deepEqual(seen.slice(0, 2), [12, 12.5]);
  assert.ok(Number.isNaN(seen[2]), 'an emptied field is NaN, not 0 and not ""');
  assert.ok(seen.every((n) => typeof n === 'number'));
  unmount();
});

test('NumberInput: null is empty, a number is shown, undefined leaves the field uncontrolled; onChange still fires', () => {
  assert.match(renderToStaticMarkup(h(ui.NumberInput, { value: null, onValueChange: () => {} })), /value=""/);
  assert.match(renderToStaticMarkup(h(ui.NumberInput, { value: 3, onValueChange: () => {} })), /value="3"/);
  assert.doesNotMatch(renderToStaticMarkup(h(ui.NumberInput, {})), /value=/);
  let changed = 0;
  const { host, unmount } = mount(h(ui.NumberInput, { onChange: () => { changed += 1; } }));
  type(host.querySelector('input'), '4');
  assert.equal(changed, 1);
  unmount();
});

test('#245 review: NumberInput takes defaultValue, steps any, stays a number field, and a form value from undefined to a number never switches it', () => {
  const html = renderToStaticMarkup(h(ui.NumberInput, { defaultValue: 7 }));
  assert.match(html, /value="7"/);
  assert.match(html, /step="any"/, 'a decimal is never a step mismatch');
  assert.match(renderToStaticMarkup(h(ui.NumberInput, { type: 'text', value: 1, onValueChange: () => {} })), /type="number"/, 'a stray type cannot make it a text field');
  const errors = [];
  const error = console.error;
  console.error = (...args) => { errors.push(args.join(' ')); };
  try {
    function Form() {
      const [value, setValue] = useState(undefined);
      return h(ui.NumberInput, { 'aria-label': 'Menge', value, onValueChange: setValue });
    }
    const { host, unmount } = mount(h(Form));
    const input = host.querySelector('input');
    assert.equal(input.value, '', 'undefined shows an empty, controlled field');
    type(input, '3');
    assert.equal(input.value, '3');
    unmount();
  } finally {
    console.error = error;
  }
  assert.deepEqual(errors.filter((e) => /uncontrolled|controlled/.test(e)), [], 'no controlled/uncontrolled switch warning');
});

test('#245 review: a number title names its ?, a blank helpLabel falls back, messageId fixes the message line, error can be a node', () => {
  assert.match(renderToStaticMarkup(h(ui.SectionHead, { title: 2026, help: 'The year.' })), /aria-label="About: 2026"/);
  assert.match(renderToStaticMarkup(h(ui.Card, { title: 'Kosten', help: 'Wie.', helpLabel: '  ' }, 'x')), /aria-label="About: Kosten"/);
  const field = renderToStaticMarkup(h(ui.Field, { label: 'Code', messageId: 'field-code-msg', error: h('span', null, 'Too long. ', h('a', { href: '#rules' }, 'The rules')) }, h(ui.Input, { id: 'field-code' })));
  assert.match(field, /<div class="uix-field__msg" id="field-code-msg"><span class="uix-field__error" role="alert"><span>Too long. <a href="#rules">The rules<\/a><\/span><\/span><\/div>/);
  assert.match(field, /aria-describedby="field-code-msg"/);
  assert.match(field, /aria-invalid="true"/);
});
