// Regenerates packages/tokens/docs/older-gap-specimens.js: the docs specimens for the date
// fields (HAR-1383), RadioCard (HAR-1373), Avatar presence (HAR-1374), the lazy Tree (HAR-1382)
// and the EntityPicker hints (HAR-1648), from the BUILT package, so the styleguide shows exactly
// the markup the components render (the precedent is render-scheduling-calendar-specimen.mjs).
//
//   npm run build:react   (or: npm run build -w @tensor_1/react)
//   node packages/react/scripts/render-older-gap-specimens.mjs
//
// The static docs have no React runtime, and several of these states only exist after an
// interaction (an open calendar, a loading row, a list that was cut off). So the components are
// mounted in jsdom, driven into the state, and their DOM is written out. Every date is formatted
// by an injected `formatDate` or a fixed English table, never by Intl, so the markup does not
// depend on the ICU version of the Node that renders it.
// packages/react/src/older-gap-specimens.test.mjs fails when the committed module differs.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { JSDOM } from 'jsdom';
import { createElement as h, act } from 'react';

const here = dirname(fileURLToPath(import.meta.url));
export const SPECIMEN_MODULE = join(here, '../../tokens/docs/older-gap-specimens.js');

const OPEN = 'data-specimen-popover-open';
const GLOBALS = ['window', 'document', 'navigator', 'getComputedStyle', 'requestAnimationFrame', 'ResizeObserver', 'IntersectionObserver', 'HTMLInputElement', 'IS_REACT_ACT_ENVIRONMENT'];

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
/** A product date format with no Intl: 18 Nov 2026. */
const formatDate = (date) => `${Number(date.slice(8))} ${MONTHS[Number(date.slice(5, 7)) - 1].slice(0, 3)} ${date.slice(0, 4)}`;
const parseDate = (text) => {
  const match = /^(\d{1,2}) (\w{3}) (\d{4})$/.exec(text.trim());
  const month = match ? MONTHS.findIndex((name) => name.startsWith(match[2])) : -1;
  return month < 0 ? null : `${match[3]}-${String(month + 1).padStart(2, '0')}-${match[1].padStart(2, '0')}`;
};

const caption = (text) => `<div class="uix-guide__subhead" data-older-gaps>${text}</div>`;

/**
 * Render every specimen. Returns `{ [route]: html }`. Installs a jsdom for the duration and
 * removes it again, so a test that imports this can own its own globals.
 */
export async function renderOlderGapSpecimens() {
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
  expose('HTMLInputElement', window.HTMLInputElement);
  expose('IS_REACT_ACT_ENVIRONMENT', true);
  const proto = window.HTMLElement.prototype;
  const toggle = (target, newState) => { const event = new window.Event('toggle'); event.newState = newState; target.dispatchEvent(event); };
  proto.showPopover = function showPopover() { if (this.hasAttribute(OPEN)) return; this.setAttribute(OPEN, ''); toggle(this, 'open'); };
  proto.hidePopover = function hidePopover() { if (!this.hasAttribute(OPEN)) return; this.removeAttribute(OPEN); toggle(this, 'closed'); };
  const matches = window.Element.prototype.matches;
  window.Element.prototype.matches = function patched(selector) {
    return selector === ':popover-open' ? this.hasAttribute(OPEN) : matches.call(this, selector);
  };

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
    const click = (el) => act(() => { el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true, button: 0 })); });
    const type = (input, text) => act(() => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, text);
      input.dispatchEvent(new window.Event('input', { bubbles: true }));
    });
    const blur = (input) => act(() => { input.dispatchEvent(new window.FocusEvent('focusout', { bubbles: true })); });
    const settle = () => act(async () => { for (let i = 0; i < 6; i += 1) await new Promise((resolve) => setTimeout(resolve, 0)); });

    // React's generated ids differ between versions; the page gets stable ones.
    let nextId = 0;
    const ids = new Map();
    const stable = (html) => html
      .replace(new RegExp(` ${OPEN}=""`, 'g'), '')
      .replace(/(:r[0-9a-z]+:|«r[0-9a-z]+»|_r_[0-9a-z]+_)/g, (id) => {
        if (!ids.has(id)) { nextId += 1; ids.set(id, `older-gap-${nextId}`); }
        return ids.get(id);
      });
    const html = (el) => stable(el.innerHTML);

    const noop = () => {};
    const dateProps = { today: '2026-11-10', locale: 'en-GB', formatDate, parseDate, placeholder: 'D Mon YYYY' };
    const weekend = (date) => [0, 6].includes(new Date(`${date}T00:00:00Z`).getUTCDay());

    // ── Date fields ────────────────────────────────────────────────────────────
    const due = mount(h(ui.Field, { label: 'Due date', hint: 'Working days only' },
      h(ui.DatePicker, { ...dateProps, value: '2026-11-18', onValueChange: noop, isUnavailable: weekend })));
    const refused = mount(h(ui.Field, { label: 'Review date' },
      h(ui.DatePicker, { ...dateProps, value: null, onValueChange: noop })));
    type(refused.querySelector('.uix-date-picker__input'), 'next week');
    blur(refused.querySelector('.uix-date-picker__input'));
    const starts = mount(h(ui.Field, { label: 'Starts' },
      h(ui.DateTimePicker, { ...dateProps, value: '2026-11-22T14:30', onValueChange: noop, timeZone: 'Europe/Vienna', timeZoneLabel: 'CET', minuteStep: 15 })));
    await settle();
    const period = mount(h(ui.Field, { label: 'Period' },
      h(ui.DateRangePicker, { mode: 'field', value: { start: '2026-11-16', end: '2026-11-27' }, onChange: noop, locale: 'en-GB', formatDate, today: '2026-11-10', label: 'Period' })));
    await settle();

    // The open calendar, as it sits in the popover. Its day names come from Intl; they are
    // replaced by the fixed table so the page does not follow the ICU of this Node.
    const opened = mount(h(ui.DatePicker, { ...dateProps, value: '2026-11-18', onValueChange: noop, isUnavailable: weekend, 'aria-label': 'Due date' }));
    click(opened.querySelector('.uix-date-picker__toggle'));
    const calendar = opened.querySelector('.uix-date-picker__calendar');
    const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    calendar.querySelectorAll('[data-date]').forEach((day) => {
      const date = day.getAttribute('data-date');
      const at = new Date(`${date}T00:00:00Z`);
      day.setAttribute('aria-label', `${WEEKDAYS[at.getUTCDay()]}, ${at.getUTCDate()} ${MONTHS[at.getUTCMonth()]} ${at.getUTCFullYear()}`);
    });
    calendar.querySelector('.uix-date-picker__month').textContent = 'November 2026';
    calendar.querySelector('.uix-date-picker__grid').setAttribute('aria-label', 'November 2026');
    [...calendar.querySelectorAll('.uix-date-range-picker__weekdays span')].forEach((span, index) => { span.textContent = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index]; });
    // The static page cannot open a popover: the toggle's name keeps the product format too.
    for (const host of [due, starts, opened]) {
      host.querySelectorAll('.uix-date-picker__toggle').forEach((button) => {
        const value = host.querySelector('.uix-date-picker__input').value;
        button.setAttribute('aria-label', `Change date, ${value}`);
      });
    }

    const dates = [
      caption('Date fields (React <code>DatePicker</code>, <code>DateTimePicker</code>, <code>DateRangePicker mode="field"</code>) — a typed date with a calendar button, a date and time with the zone shown, and a range trigger; text that is not a date is refused with the reason'),
      '<div data-date-fields-example class="uix-stack" style="--gap:16px;max-width:22rem">',
      html(due), html(refused), html(starts), html(period),
      '</div>',
      caption('The calendar the button opens — one month; arrows by day and week, Home / End, PageUp / PageDown; days that cannot be chosen are struck through and still read out'),
      `<div class="uix-popover uix-date-picker__popover" role="group" aria-label="Calendar" style="display:inline-block">${stable(calendar.outerHTML)}</div>`,
    ].join('\n');

    // ── RadioCard ──────────────────────────────────────────────────────────────
    const card = (value, title, description, extra = {}) => h(ui.RadioCard, { key: value, name: 'older-gap-rollout', value, title, description, onChange: noop, ...extra });
    const cards = mount(h(ui.RadioGroup, { variant: 'card', label: 'Rollout' },
      card('single', 'One site', 'Vienna only, for a first week of feedback.'),
      card('team', 'One team', 'The service desk in every site.', { checked: true }),
      card('legacy', 'Legacy tenants', 'Not available on this plan.', { disabled: true }),
      card('all', 'Everyone', 'All sites and teams at once.')));
    const radioCards = [
      caption('Radio cards (React <code>RadioGroup variant="card"</code>, <code>RadioCard</code>) — a native radio group drawn as cards: one tab stop, arrow keys choose, the choice is a border and a check mark'),
      `<div data-radio-card-example>${html(cards)}</div>`,
    ].join('\n');

    // ── EntityPicker hints ─────────────────────────────────────────────────────
    const people = ['Amra Hodžić', 'Jonas Weber', 'Mira Novak', 'Tarik Begić', 'Lena Schmid', 'Jonas Wendt', 'Jona Weiss', 'Johanna Maier', 'Jovan Ilić'].map((title, index) => ({ id: `p${index}`, title, meta: ['Service desk'] }));
    const picker = (label) => h(ui.Field, { label }, h(ui.EntityPicker, {
      label, value: null, onValueChange: noop, minQueryLength: 2, delay: 0,
      onSearch: async (query) => {
        const found = people.filter((option) => option.title.toLowerCase().includes(query.toLowerCase()));
        return { options: found.slice(0, 3), hasMore: found.length > 3 };
      },
    }));
    // The open list is placed by script (fixed coordinates of this jsdom); on the page it goes
    // back to the stylesheet's own place, under its field. Each picker is written out while it
    // still has focus: focusing the next one closes it.
    const openPicker = async (label, typed) => {
      const host = mount(picker(label));
      act(() => { host.querySelector('input').focus(); });
      type(host.querySelector('input'), typed);
      await settle();
      const popup = host.querySelector('.uix-search-suggest__popup');
      for (const name of ['style', 'data-strategy', 'data-placement']) popup.removeAttribute(name);
      return html(host);
    };
    const idle = await openPicker('Assignee', 'j');
    const more = await openPicker('Reviewer', 'jo');
    const entity = [
      caption('Entity picker hints (React <code>EntityPicker</code>) — below <code>minQueryLength</code> the open list says what to type; a list that was cut off says that more match'),
      '<div class="uix-cluster" style="--gap:24px;align-items:flex-start">',
      `<div style="width:18rem;max-width:100%;min-height:6rem">${idle}</div>`,
      `<div style="width:18rem;max-width:100%;min-height:15rem">${more}</div>`,
      '</div>',
    ].join('\n');

    // ── Avatar presence ────────────────────────────────────────────────────────
    const presence = mount(h('div', { className: 'uix-cluster', style: { '--gap': '16px' } },
      h(ui.Avatar, { presence: 'online', size: 'lg' }, 'AH'),
      h(ui.Avatar, { presence: 'busy', size: 'lg' }, 'JW'),
      h(ui.Avatar, { presence: 'away', size: 'lg' }, 'MN'),
      h(ui.Avatar, { presence: 'offline', size: 'lg' }, 'TB'),
      h(ui.UserChip, { avatar: h(ui.Avatar, { presence: 'busy' }, 'JW'), name: 'Jonas Weber', sub: 'In a meeting until 15:00' }),
      h('span', { className: 'uix-cluster', style: { '--gap': '6px' } }, h(ui.PresenceDot, { presence: 'away' }), 'Away')));
    const avatars = [
      caption('Avatar presence (React <code>Avatar presence</code>, <code>PresenceDot</code>) — online, busy, away, offline: each a shape as well as a colour, and each in text for assistive technology'),
      `<div data-presence-example>${html(presence)}</div>`,
    ].join('\n');

    // ── Tree that loads children on expand ─────────────────────────────────────
    const tree = mount(h(ui.Tree, {
      'aria-label': 'Sites',
      nodes: [
        { id: 'emea', label: 'EMEA', children: [{ id: 'vie', label: 'Vienna' }, { id: 'sjj', label: 'Sarajevo' }] },
        { id: 'apac', label: 'APAC', hasChildren: true },
        { id: 'amer', label: 'Americas', hasChildren: true },
        { id: 'hq', label: 'Headquarters' },
      ],
      defaultExpanded: new Set(['emea', 'apac', 'amer']),
      loadChildren: (node) => (node.id === 'amer' ? Promise.reject(new Error('offline')) : new Promise(() => {})),
    }));
    await settle();
    const lazyTree = [
      caption('Tree that loads children on expand (React <code>Tree loadChildren</code>, <code>hasChildren</code>) — a node shows a loading row while its children load, and an error row with Retry when they could not be loaded'),
      `<div data-lazy-tree-example style="max-width:22rem">${html(tree)}</div>`,
    ].join('\n');

    const result = {
      'examples-form-controls': [dates, radioCards, entity].join('\n'),
      'examples-data-display': [avatars, lazyTree].join('\n'),
    };
    for (const { root, host } of roots) { act(() => root.unmount()); host.remove(); }
    return result;
  } finally {
    dom.window.close();
    for (const [name, descriptor] of saved) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
  }
}

/** The module text for a set of rendered specimens. */
export function olderGapSpecimenModule(specimens) {
  const body = Object.entries(specimens).map(([route, html]) => `  ${JSON.stringify(route)}: ${JSON.stringify(html)},`).join('\n');
  return `/* GENERATED by packages/react/scripts/render-older-gap-specimens.mjs — do not edit by hand.
 * The docs specimens for the date fields (HAR-1383), RadioCard (HAR-1373), EntityPicker hints
 * (HAR-1648), Avatar presence (HAR-1374) and the lazy Tree (HAR-1382): the markup the built
 * React components render, in the states named in each caption. showcase-data.js appends each
 * block to its route. packages/react/src/older-gap-specimens.test.mjs fails when this file and
 * the components differ. */
export const OLDER_GAP_SPECIMENS = {
${body}
};
`;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  writeFileSync(SPECIMEN_MODULE, olderGapSpecimenModule(await renderOlderGapSpecimens()));
  console.log(`wrote ${SPECIMEN_MODULE}`);
}
