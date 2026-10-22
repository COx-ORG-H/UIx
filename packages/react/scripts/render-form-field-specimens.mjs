// Regenerates packages/tokens/docs/form-field-specimens.js: the docs specimens of the form-field
// batch (HAR-1799, HAR-1376, HAR-1835, HAR-1588, HAR-1377, HAR-2465 …), from the BUILT package, so
// the styleguide shows exactly the markup the components render (the precedent is
// render-uxc-specimens.mjs).
//
//   npm run build -w @tensor_1/react
//   node packages/react/scripts/render-form-field-specimens.mjs
//
// packages/react/src/form-field-specimens.test.mjs fails when the committed module differs.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { JSDOM } from 'jsdom';
import { createElement as h, act } from 'react';

const here = dirname(fileURLToPath(import.meta.url));
export const SPECIMEN_MODULE = join(here, '../../tokens/docs/form-field-specimens.js');

const GLOBALS = ['window', 'document', 'navigator', 'getComputedStyle', 'requestAnimationFrame', 'ResizeObserver', 'IntersectionObserver', 'MutationObserver', 'HTMLElement', 'IS_REACT_ACT_ENVIRONMENT'];

const caption = (text) => `<div class="uix-guide__subhead" data-form-fields>${text}</div>`;

/**
 * Render every specimen. Returns `{ [route]: html }`. Installs a jsdom for the duration and
 * removes it again, so a test that imports this can own its own globals.
 */
export async function renderFormFieldSpecimens() {
  const saved = new Map(GLOBALS.map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true, url: 'http://localhost/' });
  const { window } = dom;
  const expose = (name, value) => Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
  expose('window', window);
  expose('document', window.document);
  expose('navigator', window.navigator);
  expose('getComputedStyle', window.getComputedStyle.bind(window));
  expose('requestAnimationFrame', window.requestAnimationFrame.bind(window));
  expose('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  expose('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
  expose('MutationObserver', window.MutationObserver);
  expose('HTMLElement', window.HTMLElement);
  expose('IS_REACT_ACT_ENVIRONMENT', true);
  window.HTMLElement.prototype.showPopover = function showPopover() {};
  window.HTMLElement.prototype.hidePopover = function hidePopover() {};

  try {
    const { createRoot } = await import('react-dom/client');
    const ui = await import(pathToFileURL(join(here, '../dist/index.js')).href);
    const roots = [];
    const mount = (element) => {
      const host = window.document.createElement('div');
      window.document.body.append(host);
      const root = createRoot(host);
      act(() => root.render(element));
      roots.push({ root, host });
      return host;
    };
    // React's generated ids differ between versions; the page gets stable ones.
    let nextId = 0;
    const ids = new Map();
    const stable = (html) => html.replace(/(:r[0-9a-z]+:|«r[0-9a-z]+»|_r_[0-9a-z]+_)/g, (id) => {
      if (!ids.has(id)) { nextId += 1; ids.set(id, `ff-${nextId}`); }
      return ids.get(id);
    });
    const html = (el) => stable(el.innerHTML);
    const noop = () => {};
    const blocks = [];

    // ── CheckboxGroup (HAR-1799): a named group in three columns, and the same with its error ──
    const tags = ['Fiction', 'History', 'Poetry', 'Children', 'Reference', 'Local authors'];
    const group = (props, chosen) => mount(h(ui.CheckboxGroup, props, tags.map((tag) => h(ui.Checkbox, {
      key: tag, name: props.id, value: tag, label: tag, checked: chosen.includes(tag), onChange: noop,
    }))));
    blocks.push([
      caption('Checkbox group (React <code>CheckboxGroup</code>, <code>.uix-checkbox-group</code>) — a <code>&lt;fieldset&gt;</code> whose legend names the boxes, so each one is announced in its group; the field’s hint or error below, tied to the group; <code>columns</code> is a ceiling, a phone gets one column'),
      '<div data-checkbox-group-example class="uix-cluster" style="--gap:24px;align-items:flex-start">',
      `<div style="flex:1 1 24rem;max-width:36rem">${html(group({ id: 'ff-tags', label: 'Curated tags', hint: 'Shown on the book’s public page.', columns: 3, required: true }, ['History', 'Local authors']))}</div>`,
      `<div style="flex:1 1 16rem;max-width:24rem">${html(group({ id: 'ff-tags-error', label: 'Audience', error: 'Choose at least one audience.', columns: 2, required: true }, []))}</div>`,
      '</div>',
    ].join('\n'));

    // ── PasswordInput and OtpInput (HAR-1376): a sign-in step with the password revealed, and a
    // half-typed verification code ──────────────────────────────────────────────────────────────
    const password = mount(h(ui.Field, { label: 'Password', hint: 'At least 12 characters.', required: true },
      h(ui.PasswordInput, { id: 'ff-password', name: 'password', autoComplete: 'current-password', defaultValue: 'correct horse battery', defaultRevealed: true })));
    const passwordLg = mount(h(ui.Field, { label: 'New password' },
      h(ui.PasswordInput, { id: 'ff-password-lg', size: 'lg', autoComplete: 'new-password' })));
    const otp = mount(h(ui.Field, { label: 'Verification code', hint: 'Enter the 6 digits from your authenticator app.' },
      h(ui.OtpInput, { id: 'ff-otp', name: 'otp', groupSize: 3, defaultValue: '204' })));
    const otpError = mount(h(ui.Field, { label: 'Recovery code', error: 'That code was already used.' },
      h(ui.OtpInput, { id: 'ff-otp-recovery', mode: 'alphanumeric', length: 8, groupSize: 4, defaultValue: 'K7Q2M9XD' })));
    blocks.push([
      caption('Password and one-time code (React <code>PasswordInput</code>, <code>OtpInput</code>, <code>InputGroup trailingAction</code>) — the reveal toggle is a pressed-state button inside the field, shown here pressed, and a click on it keeps the caret in the field; the code is ONE input drawn as cells, so autofill, paste and screen readers see one field'),
      '<div data-sign-in-example class="uix-cluster" style="--gap:24px;align-items:flex-start">',
      `<div class="uix-stack" style="flex:1 1 18rem;max-width:24rem">${html(password)}${html(passwordLg)}</div>`,
      `<div class="uix-stack" style="flex:1 1 18rem;max-width:24rem">${html(otp)}${html(otpError)}</div>`,
      '</div>',
    ].join('\n'));

    // ── TimePicker (HAR-1835): German 24 h with min / max, en-US 12 h, a refused draft, and the
    // DateTimePicker that now uses it for its time ──────────────────────────────────────────────
    const opens = mount(h(ui.Field, { label: 'Opens at', hint: 'Between 08:00 and 18:00, in 30-minute steps.', required: true },
      h(ui.TimePicker, { id: 'ff-opens', name: 'opens', value: '09:30', onValueChange: noop, locale: 'de', minuteStep: 30, min: '08:00', max: '18:00' })));
    const quiet = mount(h(ui.Field, { label: 'Quiet hours start' },
      h(ui.TimePicker, { id: 'ff-quiet', value: '22:00', onValueChange: noop, locale: 'en-US' })));
    const refused = mount(h(ui.Field, { label: 'Closes at' },
      h(ui.TimePicker, { id: 'ff-closes', value: '17:00', onValueChange: noop, locale: 'de', max: '18:00' })));
    const closes = refused.querySelector('input.uix-time-picker__input');
    act(() => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(closes, '19:30');
      closes.dispatchEvent(new window.Event('input', { bubbles: true }));
    });
    act(() => { closes.dispatchEvent(new window.FocusEvent('focusout', { bubbles: true })); });
    const starts = mount(h(ui.Field, { label: 'Planned start' },
      h(ui.DateTimePicker, { id: 'ff-starts', value: '2026-11-22T14:30', onValueChange: noop, locale: 'de', timeZone: 'Europe/Vienna', timeZoneLabel: 'Vienna', today: '2026-11-10' })));
    blocks.push([
      caption('Time of day (React <code>TimePicker</code>, also the time of <code>DateTimePicker</code>) — the locale’s clock (14:30 in German, 10:00 PM in en-US), typed times read on Enter or blur (<code>1430</code>, <code>9</code>, <code>2:30 pm</code>), ArrowUp / ArrowDown step the hour or the minutes under the caret, the clock button lists the times at <code>minuteStep</code>; a time outside <code>min</code> / <code>max</code> is refused with the reason'),
      '<div data-time-picker-example class="uix-cluster" style="--gap:24px;align-items:flex-start">',
      `<div class="uix-stack" style="flex:1 1 14rem;max-width:20rem">${html(opens)}${html(quiet)}${html(refused)}</div>`,
      `<div style="flex:1 1 18rem;max-width:26rem">${html(starts)}</div>`,
      '</div>',
    ].join('\n'));

    // ── FilterPopover type="date" (HAR-2432): the kit DatePicker, in German from one provider ──────
    const dataBlocks = [];
    const filterDate = mount(h(ui.UixLabelsProvider, { labels: { dateFormat: { locale: 'de' }, datePicker: { open: 'Datum wählen', openSelected: 'Datum ändern, {date}', calendar: 'Kalender' } } },
      h(ui.FilterPopover, { label: 'Erstellt ab', type: 'date', value: '2026-11-22', onValueChange: noop, applyLabel: 'Anwenden', clearLabel: 'Zurücksetzen', onApply: noop, onClear: noop })));
    // The page shows the filter as the popover's content; the app owns the popover itself.
    filterDate.querySelector('.uix-filter-popover').classList.add('uix-popover');
    dataBlocks.push([
      caption('Filter popover on a date (React <code>FilterPopover type="date"</code>) — the kit’s <code>DatePicker</code>, never the browser’s date input; the value stays <code>YYYY-MM-DD</code>, and <code>UixLabelsProvider dateFormat</code> sets the format of every date field at once (German here)'),
      `<div data-filter-date-example lang="de" style="width:18rem;max-width:100%">${html(filterDate)}</div>`,
    ].join('\n'));

    for (const { root, host } of roots) { act(() => root.unmount()); host.remove(); }
    return { 'examples-form-controls': blocks.join('\n'), 'examples-data-display': dataBlocks.join('\n') };
  } finally {
    dom.window.close();
    for (const [name, descriptor] of saved) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
  }
}

/** The module text for a set of specimens: what the docs import. */
export const formFieldSpecimenModule = (specimens) => `/* GENERATED by packages/react/scripts/render-form-field-specimens.mjs — do not edit by hand.
 * The docs specimens of the form-field batch (HAR-1799 …): the markup the built React components
 * render, in the states named in each caption. showcase-data.js appends each block to its route.
 * packages/react/src/form-field-specimens.test.mjs fails when this file and the components differ. */
export const FORM_FIELD_SPECIMENS = ${JSON.stringify(specimens, null, 2)};
`;

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  writeFileSync(SPECIMEN_MODULE, formFieldSpecimenModule(await renderFormFieldSpecimens()));
  console.log(`wrote ${SPECIMEN_MODULE}`);
}
