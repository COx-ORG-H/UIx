/* Date fields adopted with no call-site workaround (HAR-2432), in jsdom:
 *   - FilterPopover type="date" is the kit DatePicker; the value stays YYYY-MM-DD ('' for none);
 *   - DateRangePicker's name and invalid message are in its labels group (a prop still wins);
 *   - DateTimePicker names its time by the label's accessible text (no aria-hidden "*") and follows
 *     the label when its text changes after mount;
 *   - UixLabelsProvider `dateFormat` sets locale / formatDate / parseDate / placeholder for every
 *     date field; a prop still wins.
 * Renders the BUILT dist — run `npm run build` first. */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement as h, act, useState } from 'react';

let dom;
let createRoot;
let ui;
const OPEN = 'data-test-popover-open';
const EXPOSED = ['window', 'document', 'navigator', 'getComputedStyle', 'requestAnimationFrame', 'ResizeObserver', 'IntersectionObserver', 'MutationObserver', 'HTMLInputElement', 'IS_REACT_ACT_ENVIRONMENT'];
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
  expose('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
  expose('MutationObserver', window.MutationObserver);
  expose('HTMLInputElement', window.HTMLInputElement);
  expose('IS_REACT_ACT_ENVIRONMENT', true);
  const el = window.HTMLElement.prototype;
  el.showPopover = function showPopover() { this.setAttribute(OPEN, ''); };
  el.hidePopover = function hidePopover() { this.removeAttribute(OPEN); };
  ({ createRoot } = await import('react-dom/client'));
  ui = await import('../dist/index.js');
});
after(() => {
  dom.window.close();
  for (const name of EXPOSED) delete globalThis[name];
});

const render = (element) => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(element));
  return { host, unmount: () => { act(() => root.unmount()); host.remove(); } };
};
const type = (input, text) => act(() => {
  Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, text);
  input.dispatchEvent(new window.Event('input', { bubbles: true }));
});
const blur = (input) => act(() => { input.dispatchEvent(new window.FocusEvent('focusout', { bubbles: true })); });

test('FilterPopover type="date": a typed date reaches onValueChange as YYYY-MM-DD; cleared is ""', () => {
  const values = [];
  function Harness() {
    const [value, setValue] = useState('');
    return h(ui.FilterPopover, {
      label: 'Created', type: 'date', value, applyLabel: 'Apply', clearLabel: 'Clear', onApply() {}, onClear() {},
      onValueChange: (next) => { values.push(next); setValue(next); },
    });
  }
  const view = render(h(ui.UixLabelsProvider, { labels: { dateFormat: { locale: 'de' } } }, h(Harness)));
  const input = view.host.querySelector('input.uix-date-picker__input');
  assert.equal(view.host.querySelector('input[type="date"]'), null);
  assert.equal(input.getAttribute('placeholder'), 'DD.MM.YYYY', 'the provider locale (de) reaches the filter’s field');
  assert.equal(view.host.querySelector('label').htmlFor, input.id);
  type(input, '22.11.2026');
  blur(input);
  assert.deepEqual(values, ['2026-11-22']);
  type(input, '');
  blur(input);
  assert.deepEqual(values, ['2026-11-22', '']);
  view.unmount();
});

test('DateRangePicker: label and invalidMessage come from the labels group; a prop still wins', () => {
  const words = { dateRangePicker: { label: 'Zeitraum wählen', invalidMessage: 'Der Zeitraum ist ungültig.' } };
  const inline = render(h(ui.UixLabelsProvider, { labels: words },
    h(ui.DateRangePicker, { value: { start: '2026-11-28', end: '2026-11-22' }, onChange() {}, locale: 'de', visibleMonth: '2026-11-01' })));
  assert.equal(inline.host.querySelector('.uix-date-range-picker__header h3').textContent, 'Zeitraum wählen');
  assert.equal(inline.host.querySelector('[role="alert"]').textContent, 'Der Zeitraum ist ungültig.');
  assert.doesNotMatch(inline.host.textContent, /Choose date range|selected date range is invalid/);
  inline.unmount();
  const field = render(h(ui.UixLabelsProvider, { labels: words },
    h(ui.DateRangePicker, { mode: 'field', value: {}, onChange() {}, locale: 'de' })));
  assert.match(field.host.querySelector('.uix-date-range-field__trigger').textContent, /^Zeitraum wählen: /);
  assert.equal(field.host.querySelector('.uix-date-range-field__popover').getAttribute('aria-label'), 'Zeitraum wählen');
  field.unmount();
  const own = render(h(ui.UixLabelsProvider, { labels: words },
    h(ui.DateRangePicker, { mode: 'field', value: {}, onChange() {}, locale: 'de', label: 'Urlaub' })));
  assert.match(own.host.querySelector('.uix-date-range-field__trigger').textContent, /^Urlaub: /);
  own.unmount();
  assert.equal(ui.DEFAULT_DATE_RANGE_PICKER_LABELS.label, 'Choose date range');
  assert.equal(ui.DEFAULT_DATE_RANGE_PICKER_LABELS.invalidMessage, 'The selected date range is invalid.');
});

test('DateTimePicker: the time is named by the label’s accessible text, and follows it when it changes', async () => {
  let setLabel;
  function Late() {
    const [label, set] = useState(null);
    setLabel = set;
    return h('div', null,
      h('label', { htmlFor: 'late-start' }, label ?? '', h('span', { 'aria-hidden': 'true' }, ' *')),
      h(ui.DateTimePicker, { id: 'late-start', value: '2026-11-22T14:30', onValueChange() {}, locale: 'de', timeZoneLabel: null, labels: { timeOf: '{label}, Uhrzeit', time: 'Uhrzeit' } }));
  }
  const view = render(h(Late));
  const time = () => view.host.querySelector('input.uix-time-picker__input');
  assert.equal(time().getAttribute('aria-label'), 'Uhrzeit', 'no label text yet');
  act(() => setLabel('Beginn'));
  assert.equal(time().getAttribute('aria-label'), 'Beginn, Uhrzeit', 'the aria-hidden "*" is not part of the name');
  // the label's text changes without this component rendering again (a translation arriving)
  const label = view.host.querySelector('label');
  await act(async () => { label.firstChild.nodeValue = 'Geplanter Start'; await new Promise((resolve) => setTimeout(resolve, 0)); });
  assert.equal(time().getAttribute('aria-label'), 'Geplanter Start, Uhrzeit');
  view.unmount();
});

test('one UixLabelsProvider dateFormat formats every date field; a prop still wins', () => {
  const dateFormat = {
    locale: 'de',
    formatDate: (d) => d.split('-').reverse().join('.'),
    parseDate: (t) => (/^\d{2}\.\d{2}\.\d{4}$/.test(t) ? t.split('.').reverse().join('-') : null),
    placeholder: 'TT.MM.JJJJ',
  };
  const view = render(h(ui.UixLabelsProvider, { labels: { dateFormat } },
    h(ui.DatePicker, { value: '2026-11-02', onValueChange() {}, 'aria-label': 'a' }),
    h(ui.DatePicker, { value: '2026-11-02', onValueChange() {}, 'aria-label': 'b', formatDate: (d) => `[${d}]`, placeholder: 'own' }),
    h(ui.DateTimePicker, { value: '2026-11-02T08:05', onValueChange() {}, 'aria-label': 'c', timeZoneLabel: null }),
    h(ui.DateRangePicker, { mode: 'field', value: { start: '2026-11-02', end: '2026-11-09' }, onChange() {} }),
    h(ui.TimePicker, { value: '20:15', onValueChange() {}, 'aria-label': 'd' }),
    h(ui.TimePicker, { value: '20:15', onValueChange() {}, 'aria-label': 'e', locale: 'en-US' })));
  const byLabel = (name) => view.host.querySelector(`input[aria-label="${name}"]`);
  assert.equal(byLabel('a').value, '02.11.2026');
  assert.equal(byLabel('a').getAttribute('placeholder'), 'TT.MM.JJJJ');
  assert.equal(byLabel('b').value, '[2026-11-02]', 'the prop wins');
  assert.equal(byLabel('b').getAttribute('placeholder'), 'own');
  assert.equal(view.host.querySelector('.uix-date-time-picker input.uix-date-picker__input').value, '02.11.2026');
  assert.equal(view.host.querySelector('.uix-date-time-picker input.uix-time-picker__input').value, '08:05');
  assert.equal(view.host.querySelector('.uix-date-range-field__value').textContent, '02.11.2026 – 09.11.2026');
  assert.equal(byLabel('d').value, '20:15');
  assert.match(byLabel('e').value, /^8:15\sPM$/);
  type(byLabel('a'), '24.12.2026');
  blur(byLabel('a'));
  assert.equal(byLabel('a').value, '24.12.2026', 'the provider’s parser read it');
  view.unmount();
});
