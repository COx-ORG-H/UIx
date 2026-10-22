/* ContactCard (HAR-1379) in jsdom: a person at a glance over `.uix-contact`.
 *
 * - name, role, avatar, the address and number as text, Email / Call as mailto: / tel: links
 *   whose accessible names start with their visible words (WCAG 2.5.3);
 * - `purged`: a neutral placeholder, no name, role, details or actions, even when they are passed;
 * - `unavailable`: the name stays, the details and actions do not, a line says why;
 * - `href` makes the name a quiet link (through `renderLink`); `bare` drops the card frame;
 * - words from UixLabelsProvider `contactCard`, an explicit `labels` wins.
 *
 * tests/a11y/contact-card.spec.mjs measures it in Chromium. Renders the BUILT dist — run
 * `npm run build` first; CI does.
 */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement as h, act } from 'react';

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

const PERSON = { name: 'Amra Hadžić', role: 'Voditeljica ordinacije', email: 'amra.hadzic@dom-zdravlja.example', phone: '+387 (61) 234-567' };

test('telHref keeps the digits and a leading plus', () => {
  assert.equal(ui.telHref('+387 (61) 234-567'), 'tel:+38761234567');
  assert.equal(ui.telHref(' 061/234 567 '), 'tel:061234567');
});

test('active: name, role, details as text, Email and Call as links named for the person', () => {
  const { host, unmount } = mount(h(ui.ContactCard, { ...PERSON, avatar: h(ui.Avatar, { size: 'lg' }, 'AH'), nameAs: 'h3' }));
  const card = host.firstElementChild;
  assert.equal(card.className, 'uix-card');
  const contact = card.querySelector('.uix-contact');
  assert.equal(contact.dataset.state, 'active');
  assert.equal(contact.querySelector('h3.uix-contact__name').textContent, 'Amra Hadžić');
  assert.equal(contact.querySelector('.uix-contact__role').textContent, 'Voditeljica ordinacije');
  assert.equal(contact.querySelector('.uix-avatar').textContent, 'AH');
  assert.equal(contact.querySelector('.uix-contact__placeholder'), null);
  assert.deepEqual([...contact.querySelectorAll('.uix-contact__detail')].map((d) => d.textContent), [PERSON.email, PERSON.phone]);
  const [email, call] = contact.querySelectorAll('.uix-contact__actions > a');
  assert.equal(email.getAttribute('href'), `mailto:${PERSON.email}`);
  assert.equal(email.textContent, 'Email');
  assert.equal(email.getAttribute('aria-label'), 'Email Amra Hadžić');
  assert.ok(email.classList.contains('uix-btn--primary') && email.classList.contains('uix-btn--sm'));
  assert.equal(call.getAttribute('href'), 'tel:+38761234567');
  assert.equal(call.getAttribute('aria-label'), 'Call Amra Hadžić');
  unmount();
});

test('purged: a placeholder and nothing that reaches anyone, whatever was passed', () => {
  const { host, unmount } = mount(h(ui.ContactCard, { ...PERSON, state: 'purged', href: '/people/7', avatar: h(ui.Avatar, null, 'AH'), actions: h('a', { href: '/x' }, 'Open') }));
  const contact = host.querySelector('.uix-contact');
  assert.equal(contact.dataset.state, 'purged');
  assert.equal(contact.querySelector('.uix-contact__placeholder').getAttribute('aria-hidden'), 'true');
  assert.equal(contact.querySelector('.uix-avatar:not(.uix-contact__placeholder)'), null, 'the given avatar is not shown');
  assert.equal(contact.querySelector('.uix-contact__name').textContent, 'Removed contact');
  assert.equal(contact.querySelector('.uix-contact__name a'), null);
  assert.equal(contact.querySelector('.uix-contact__note').textContent, 'Personal data erased');
  assert.equal(contact.querySelector('.uix-contact__role'), null);
  assert.equal(contact.querySelector('.uix-contact__details'), null);
  assert.equal(contact.querySelector('.uix-contact__actions'), null);
  assert.doesNotMatch(host.innerHTML, /amra|Hadžić|234/i, 'no personal data left in the markup');
  unmount();
});

test('unavailable: the name stays, the details and actions do not', () => {
  const { host, unmount } = mount(h(ui.ContactCard, { ...PERSON, state: 'unavailable' }));
  const contact = host.querySelector('.uix-contact');
  assert.equal(contact.querySelector('.uix-contact__name').textContent, 'Amra Hadžić');
  assert.equal(contact.querySelector('.uix-contact__note').textContent, 'Contact details unavailable');
  assert.equal(contact.querySelector('.uix-contact__details'), null);
  assert.equal(contact.querySelector('.uix-contact__actions'), null);
  unmount();
});

test('href: the name is a link inside the name slot, through renderLink; bare drops the card', () => {
  const seen = [];
  const renderLink = (props) => { seen.push(props.href); return h('a', { ...props, 'data-router': '' }); };
  const { host, unmount } = mount(h(ui.ContactCard, { name: 'Acme d.o.o.', href: '/customers/42', renderLink, bare: true, className: 'x' }));
  const contact = host.firstElementChild;
  assert.equal(contact.className, 'uix-contact uix-contact--bare x');
  const link = contact.querySelector('.uix-contact__name > a[data-router]');
  assert.equal(link.getAttribute('href'), '/customers/42');
  assert.deepEqual(seen, ['/customers/42']);
  assert.equal(contact.querySelector('.uix-contact__actions'), null, 'no actions without email, phone or actions');
  unmount();
});

test('words: UixLabelsProvider contactCard, an explicit labels prop wins', () => {
  const tree = h(ui.UixLabelsProvider, { labels: { contactCard: { email: 'E-pošta', emailName: 'E-pošta za {name}', call: 'Pozovi', callName: 'Pozovi {name}' } } },
    h(ui.ContactCard, { ...PERSON, labels: { call: 'Nazovi', callName: 'Nazovi {name}' } }));
  const { host, unmount } = mount(tree);
  const [email, call] = host.querySelectorAll('.uix-contact__actions > a');
  assert.equal(email.textContent, 'E-pošta');
  assert.equal(email.getAttribute('aria-label'), 'E-pošta za Amra Hadžić');
  assert.equal(call.textContent, 'Nazovi');
  assert.equal(call.getAttribute('aria-label'), 'Nazovi Amra Hadžić');
  unmount();
});
