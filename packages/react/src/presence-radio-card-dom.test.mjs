/* Avatar presence states (HAR-1374) and RadioCard (HAR-1373).
 *
 * Presence: `Avatar presence` online / busy / away / offline, each a different shape (the CSS)
 * and a hidden word; the boolean `status` stays an alias for online; `PresenceDot` for use
 * without an avatar. The dot colours against the surface are
 * packages/tokens/tests/presence-contrast.test.mjs.
 *
 * RadioCard: a native radio inside a label card with a title, a description and media;
 * `RadioGroup variant="card"`. Because it is a native radio, the arrow keys, the form value and
 * `required` are the browser's: tests/a11y/tensor-gaps.spec.mjs presses the keys in Chromium.
 * Renders the BUILT dist — run `npm run build` first.
 */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement as h, act, createRef, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

let dom;
let createRoot;
let ui;
const EXPOSED = ['window', 'document', 'navigator', 'IS_REACT_ACT_ENVIRONMENT'];
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
  for (const name of EXPOSED) delete globalThis[name];
});

const parse = (html) => new dom.window.DOMParser().parseFromString(html, 'text/html').body.firstElementChild;

// ── Avatar presence ──────────────────────────────────────────────────────────

test('Avatar status (boolean) renders exactly what it did: an online dot and the word "online"', () => {
  assert.equal(renderToStaticMarkup(h(ui.Avatar, { status: true }, 'AP')),
    '<span class="uix-avatar">AP<span class="uix-avatar__status" aria-hidden="true"></span><span class="uix-visually-hidden">online</span></span>');
  assert.equal(renderToStaticMarkup(h(ui.Avatar, { status: true, onlineLabel: 'verfügbar' }, 'AP')).includes('<span class="uix-visually-hidden">verfügbar</span>'), true);
  assert.equal(renderToStaticMarkup(h(ui.Avatar, null, 'AP')), '<span class="uix-avatar">AP</span>', 'no dot without a state');
  assert.equal(renderToStaticMarkup(h(ui.Avatar, { status: false }, 'AP')), '<span class="uix-avatar">AP</span>');
});

test('Avatar presence: four states, each marked on the dot and said in hidden text', () => {
  for (const [presence, word] of [['online', 'online'], ['busy', 'busy'], ['away', 'away'], ['offline', 'offline']]) {
    const el = parse(renderToStaticMarkup(h(ui.Avatar, { presence }, 'AP')));
    const dot = el.querySelector('.uix-avatar__status');
    assert.equal(dot.getAttribute('aria-hidden'), 'true');
    assert.equal(dot.getAttribute('data-presence'), presence === 'online' ? null : presence, `${presence}: the dot carries the state for the CSS shape`);
    assert.equal(el.querySelector('.uix-visually-hidden').textContent, word);
  }
  // translated words; presence wins over the boolean
  const german = parse(renderToStaticMarkup(h(ui.Avatar, { presence: 'away', status: true, presenceLabels: { away: 'abwesend' } }, 'AP')));
  assert.equal(german.querySelector('.uix-avatar__status').dataset.presence, 'away');
  assert.equal(german.querySelector('.uix-visually-hidden').textContent, 'abwesend');
  // presenceLabels.online beats the older onlineLabel
  assert.equal(parse(renderToStaticMarkup(h(ui.Avatar, { presence: 'online', onlineLabel: 'a', presenceLabels: { online: 'b' } }, 'AP'))).querySelector('.uix-visually-hidden').textContent, 'b');
  assert.deepEqual(Object.keys(ui.DEFAULT_PRESENCE_LABELS), ['online', 'busy', 'away', 'offline']);
});

test('presence is carried inside UserChip and AvatarGroup', () => {
  const chip = parse(renderToStaticMarkup(h(ui.UserChip, { avatar: h(ui.Avatar, { presence: 'busy', size: 'sm' }, 'AP'), name: 'Ana Petrović', sub: 'Service desk' })));
  assert.equal(chip.querySelector('.uix-avatar__status').dataset.presence, 'busy');
  assert.equal(chip.querySelector('.uix-avatar .uix-visually-hidden').textContent, 'busy');
  const group = parse(renderToStaticMarkup(h(ui.AvatarGroup, null, h(ui.Avatar, { presence: 'online' }, 'A'), h(ui.Avatar, { presence: 'offline' }, 'B'))));
  assert.deepEqual([...group.querySelectorAll('.uix-visually-hidden')].map((el) => el.textContent), ['online', 'offline']);
});

test('PresenceDot: an image named by the state, or decorative when the state is written beside it', () => {
  assert.equal(renderToStaticMarkup(h(ui.PresenceDot, { presence: 'busy' })), '<span class="uix-presence uix-presence--busy" role="img" aria-label="busy"></span>');
  assert.equal(renderToStaticMarkup(h(ui.PresenceDot, { presence: 'away', label: 'abwesend', className: 'mine' })), '<span class="uix-presence uix-presence--away mine" role="img" aria-label="abwesend"></span>');
  assert.equal(renderToStaticMarkup(h(ui.PresenceDot, { presence: 'offline', label: null })), '<span class="uix-presence uix-presence--offline" aria-hidden="true"></span>');
});

// ── RadioCard ────────────────────────────────────────────────────────────────

test('RadioCard: a native radio inside a label card with title, description, media and a check mark', () => {
  const html = renderToStaticMarkup(h(ui.RadioCard, { name: 'theme', value: 'dark', defaultChecked: true, title: 'Dark', description: 'Easier on the eyes at night.', media: h('img', { src: '/dark.png', alt: '' }) }));
  const card = parse(html);
  assert.equal(card.tagName, 'LABEL');
  assert.equal(card.className, 'uix-radio-card');
  const input = card.querySelector('input');
  assert.equal(input.type, 'radio');
  assert.equal(input.name, 'theme');
  assert.equal(input.value, 'dark');
  assert.equal(input.hasAttribute('checked'), true);
  assert.equal(card.querySelector('.uix-radio-card__title').textContent, 'Dark');
  assert.equal(card.querySelector('.uix-radio-card__desc').textContent, 'Easier on the eyes at night.');
  assert.equal(card.querySelector('.uix-radio-card__media').getAttribute('aria-hidden'), 'true', 'the media is decorative: the title names the choice');
  const check = card.querySelector('.uix-radio-card__check');
  assert.equal(check.getAttribute('aria-hidden'), 'true');
  assert.ok(check.querySelector('svg'), 'selection is a check mark as well as a border');
  // the label's text is the radio's name: title, then description
  assert.equal(card.textContent, 'DarkEasier on the eyes at night.');

  const bare = parse(renderToStaticMarkup(h(ui.RadioCard, { name: 'x', value: 'a', title: 'Only a title', disabled: true })));
  assert.equal(bare.querySelector('.uix-radio-card__desc'), null);
  assert.equal(bare.querySelector('.uix-radio-card__media'), null);
  assert.equal(bare.querySelector('input').disabled, true);
});

test('RadioGroup variant="card": a named fieldset grid; the default variant is unchanged', () => {
  const cards = parse(renderToStaticMarkup(h(ui.RadioGroup, { variant: 'card', label: 'Appearance' },
    h(ui.RadioCard, { name: 't', value: 'light', title: 'Light' }), h(ui.RadioCard, { name: 't', value: 'dark', title: 'Dark' }))));
  assert.equal(cards.tagName, 'FIELDSET');
  assert.equal(cards.className, 'uix-radio-group uix-radio-group--cards');
  assert.equal(cards.querySelector('legend').textContent, 'Appearance');
  assert.equal(cards.querySelectorAll('label.uix-radio-card').length, 2);

  assert.equal(renderToStaticMarkup(h(ui.RadioGroup, null, h(ui.Radio, { name: 'p', label: 'Low' }))),
    '<div class="uix-radio-group"><label class="uix-radio"><input type="radio" name="p"/><span class="uix-radio__dot"></span>Low</label></div>');
  assert.match(renderToStaticMarkup(h(ui.RadioGroup, { label: 'Priority', variant: 'list' }, 'x')), /^<fieldset class="uix-radio-group"><legend class="uix-radio-group__legend">Priority<\/legend>/);
});

test('RadioCard is controlled like a radio: onChange, checked, a forwarded ref, the form value', () => {
  const ref = createRef();
  const seen = [];
  function Form() {
    const [value, setValue] = useState('list');
    const card = (v, title) => h(ui.RadioCard, { name: 'view', value: v, title, checked: value === v, ref: v === 'board' ? ref : undefined, onChange: (e) => { seen.push(e.target.value); setValue(e.target.value); } });
    return h('form', null, h(ui.RadioGroup, { variant: 'card', label: 'View' }, card('list', 'List'), card('board', 'Board')));
  }
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(h(Form)));
  assert.equal(ref.current, host.querySelector('input[value="board"]'));
  assert.equal(new window.FormData(host.querySelector('form')).get('view'), 'list');
  act(() => host.querySelectorAll('label.uix-radio-card')[1].click());
  assert.deepEqual(seen, ['board'], 'a click anywhere on the card chooses it');
  assert.equal(new window.FormData(host.querySelector('form')).get('view'), 'board');
  assert.equal(host.querySelector('input[value="board"]').checked, true);
  assert.equal(host.querySelector('input[value="list"]').checked, false);
  act(() => root.unmount());
  host.remove();
});
