/* HAR-1346 batch (a) — the small-gap API additions the TENSOR and MOTUS "always use UIx"
 * audits asked for (2026-10-06), in jsdom:
 * ButtonLink + size="xs" (HAR-1348), Tooltip content (HAR-1349), Stat href/haspopup
 * (HAR-1350), Drawer side (HAR-1351), NavItem description (HAR-1355), CollapsibleSection
 * lazy/persistKey/openRequest (HAR-1352), Card titleId (HAR-1354), ConfirmDialog and
 * Popconfirm (HAR-1356), Pagination link and cursor modes (HAR-1357), UixLabelsProvider
 * (HAR-1358), Menu (HAR-1359), Chip (HAR-1360), KbdCombo (HAR-1361), Steps (HAR-1362).
 *
 * Renders the BUILT dist — run `npm run build` first; CI does.
 */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement as h, act, useRef, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

let dom;
let createRoot;
let ui;

const expose = (name, value) => Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });

before(async () => {
  // A real origin, so sessionStorage works (an opaque about:blank origin throws on access).
  dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true, url: 'http://localhost/' });
  expose('window', dom.window);
  expose('document', dom.window.document);
  expose('navigator', dom.window.navigator);
  expose('getComputedStyle', dom.window.getComputedStyle.bind(dom.window));
  expose('requestAnimationFrame', dom.window.requestAnimationFrame.bind(dom.window));
  expose('IS_REACT_ACT_ENVIRONMENT', true);
  const dialog = dom.window.HTMLDialogElement.prototype;
  dialog.showModal = function () { this.setAttribute('open', ''); };
  dialog.close = function () { this.removeAttribute('open'); };
  const el = dom.window.HTMLElement.prototype;
  el.showPopover = function () { this.setAttribute('data-test-popover-open', ''); };
  el.hidePopover = function () { this.removeAttribute('data-test-popover-open'); };
  // jsdom does not know :popover-open; answer it from the shim's attribute.
  const matches = dom.window.Element.prototype.matches;
  dom.window.Element.prototype.matches = function (selector) {
    return selector === ':popover-open' ? this.hasAttribute('data-test-popover-open') : matches.call(this, selector);
  };
  if (!dom.window.ResizeObserver) dom.window.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  expose('ResizeObserver', dom.window.ResizeObserver);
  ({ createRoot } = await import('react-dom/client'));
  ui = await import('../dist/index.js');
});

after(() => {
  dom.window.close();
  for (const name of ['window', 'document', 'navigator', 'getComputedStyle', 'requestAnimationFrame', 'ResizeObserver', 'IS_REACT_ACT_ENVIRONMENT']) delete globalThis[name];
});

const mount = (element) => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(element));
  return { host, root, rerender: (next) => act(() => root.render(next)), unmount: () => { act(() => root.unmount()); host.remove(); } };
};
const click = (el) => act(() => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, button: 0 })));
const key = (el, k) => act(() => el.dispatchEvent(new window.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true })));
const frame = () => act(() => new Promise((resolve) => setTimeout(resolve, 30)));

test('HAR-1348: ButtonLink renders a button-styled link, through renderLink, and a disabled link has no href', () => {
  const html = renderToStaticMarkup(h(ui.ButtonLink, { href: '/tickets/new', variant: 'primary', size: 'xs' }, 'New ticket'));
  assert.match(html, /^<a /);
  assert.match(html, /href="\/tickets\/new"/);
  assert.match(html, /class="uix-btn uix-btn--primary uix-btn--xs"/);

  const seen = [];
  const routed = renderToStaticMarkup(h(ui.ButtonLink, { href: '/x', renderLink: (p) => { seen.push(p); return h('a', { ...p, 'data-router': '' }); } }, 'Go'));
  assert.match(routed, /data-router=""/);
  assert.equal(seen[0].className, 'uix-btn uix-btn--secondary');
  const fallback = renderToStaticMarkup(h(ui.ButtonLink, { href: '/y', renderLink: () => null }, 'Go'));
  assert.match(fallback, /<a href="\/y"/, 'a nullish renderLink falls back to a plain link');

  const disabled = renderToStaticMarkup(h(ui.ButtonLink, { href: '/z', disabled: true }, 'Nope'));
  assert.doesNotMatch(disabled, /href=/);
  assert.match(disabled, /aria-disabled="true"/);
  assert.match(disabled, /role="link"/);

  assert.match(renderToStaticMarkup(h(ui.Button, { size: 'xs', icon: true, 'aria-label': 'Edit' })), /uix-btn--xs uix-btn--icon/);
});

test('HAR-1349: Tooltip takes rich content and keeps label working', () => {
  const rich = renderToStaticMarkup(h(ui.Tooltip, { content: h('ul', null, h('li', null, 'Angry 2'), h('li', null, 'Calm 5')) }, h('button', null, 'Mood')));
  assert.match(rich, /role="tooltip"[^>]*><ul><li>Angry 2<\/li><li>Calm 5<\/li><\/ul>/);
  const plain = renderToStaticMarkup(h(ui.Tooltip, { label: 'Favourites' }, h('button', null, '★')));
  assert.match(plain, /role="tooltip"[^>]*>Favourites</);
});

test('HAR-1350: Stat links render an <a> tile; haspopup is configurable', () => {
  const link = renderToStaticMarkup(h(ui.Stat, { label: 'Open', value: 12, href: '/incidents?state=open', current: true }));
  assert.match(link, /^<a /);
  assert.match(link, /href="\/incidents\?state=open"/);
  assert.match(link, /class="uix-stat uix-stat--interactive uix-stat--link"/);
  assert.match(link, /aria-current="page"/);
  assert.doesNotMatch(link, /<div/, 'no block div inside the link');
  assert.doesNotMatch(link, /uix-stat__chevron/);

  const routed = renderToStaticMarkup(h(ui.Stat, { label: 'Open', value: 1, href: '/a', renderLink: (p) => h('a', { ...p, 'data-router': '' }) }));
  assert.match(routed, /data-router=""/);

  const menu = renderToStaticMarkup(h(ui.Stat, { label: 'Status', value: 'New', onActivate: () => {}, haspopup: 'menu' }));
  assert.match(menu, /aria-haspopup="menu"/);
  const inPlace = renderToStaticMarkup(h(ui.Stat, { label: 'Pin', value: 'Off', onActivate: () => {}, haspopup: false }));
  assert.doesNotMatch(inPlace, /aria-haspopup/);
  assert.doesNotMatch(inPlace, /uix-stat__chevron/);
  assert.match(renderToStaticMarkup(h(ui.Stat, { label: 'P', value: 1, onActivate: () => {} })), /aria-haspopup="dialog"/, 'default unchanged');
});

test('HAR-1351: Drawer side adds the start / bottom modifier; end stays the default', () => {
  for (const [side, cls] of [[undefined, 'uix-drawer'], ['start', 'uix-drawer uix-drawer--start'], ['bottom', 'uix-drawer uix-drawer--bottom']]) {
    const { host, unmount } = mount(h(ui.Drawer, { open: true, onClose: () => {}, title: 'Nav', side }, 'Body'));
    assert.equal(host.querySelector('dialog').className, cls);
    unmount();
  }
});

test('HAR-1355: NavItem description renders a second line and marks the row multi-line', () => {
  const html = renderToStaticMarkup(h(ui.NavItem, { href: '/changes', description: 'Changes awaiting CAB review' }, 'Change advisory'));
  assert.match(html, /data-multiline="true"/);
  assert.match(html, /<span class="uix-navitem__text"><span class="uix-navitem__label">Change advisory<\/span><span class="uix-navitem__desc">Changes awaiting CAB review<\/span><\/span>/);
  assert.doesNotMatch(renderToStaticMarkup(h(ui.NavItem, { href: '/' }, 'Home')), /data-multiline|navitem__text/, 'single-line markup unchanged');
});

test('HAR-1352: CollapsibleSection stays plain without the new props; lazy, persistKey and openRequest work', async () => {
  const icons = await import('../dist/icons.js');
  const chevron = renderToStaticMarkup(h(icons.ChevronDownIcon, { size: 'sm' }));
  assert.equal(
    renderToStaticMarkup(h(ui.CollapsibleSection, { title: 'SLA' }, 'Body')),
    `<details class="uix-collapsible"><summary class="uix-collapsible__summary"><span><span class="uix-collapsible__title">SLA</span></span><span class="uix-collapsible__chevron" aria-hidden="true">${chevron}</span></summary><div class="uix-collapsible__body">Body</div></details>`,
  );

  let renders = 0;
  const Body = () => { renders += 1; return h('p', null, 'Chart'); };
  const Harness = ({ request }) => h(ui.CollapsibleSection, { title: 'SLA', lazy: true, persistKey: 'sla', openRequest: request }, h(Body));
  window.sessionStorage.clear();
  const { host, rerender, unmount } = mount(h(Harness, { request: 0 }));
  const details = host.querySelector('details');
  assert.equal(details.open, false);
  assert.equal(renders, 0, 'closed lazy body is not mounted');

  rerender(h(Harness, { request: 1 }));
  await frame();
  assert.equal(details.open, true, 'openRequest opens it');
  assert.equal(host.querySelector('.uix-collapsible__body p')?.textContent, 'Chart');
  assert.equal(window.sessionStorage.getItem('uix:collapsible:sla'), '1');

  details.open = false;
  act(() => details.dispatchEvent(new window.Event('toggle')));
  assert.equal(host.querySelector('.uix-collapsible__body p'), null, 'lazy=true unmounts on close');
  assert.equal(window.sessionStorage.getItem('uix:collapsible:sla'), '0');
  unmount();

  window.sessionStorage.setItem('uix:collapsible:kept', '1');
  const kept = mount(h(ui.CollapsibleSection, { title: 'Kept', persistKey: 'kept' }, 'Body'));
  await frame();
  assert.equal(kept.host.querySelector('details').open, true, 'the remembered state is applied after mount');
  kept.unmount();
});

test('HAR-1354: Card titleId ids the title; a card with a role is labelled by it', () => {
  const plain = renderToStaticMarkup(h(ui.Card, { title: 'Loans', titleAs: 'h2', titleId: 'loans-title' }, 'x'));
  assert.match(plain, /<h2 class="uix-card__title" id="loans-title">Loans<\/h2>/);
  assert.doesNotMatch(plain, /aria-labelledby/, 'no name on a role-less div (ARIA forbids it)');
  const region = renderToStaticMarkup(h(ui.Card, { title: 'Loans', titleId: 'loans-title', role: 'region' }, 'x'));
  assert.match(region, /role="region"/);
  assert.match(region, /aria-labelledby="loans-title"/);
});

test('HAR-1356: ConfirmDialog body, error, describedby, focus, tertiary and type-to-confirm', async () => {
  const calls = [];
  const props = {
    open: true, title: 'Delete CI', confirmLabel: 'Delete', cancelLabel: 'Cancel', closeLabel: 'Close',
    onConfirm: () => calls.push('confirm'), onCancel: () => calls.push('cancel'), destructive: true,
    description: 'This removes the CI.', compensation: 'Restore it from the archive within 30 days.',
    typeToConfirm: 'web-01', tertiaryLabel: 'Archive instead', onTertiary: () => calls.push('tertiary'),
    error: 'The CI is locked.',
  };
  const { host, rerender, unmount } = mount(h(ui.ConfirmDialog, props, h('dl', null, h('dt', null, 'Relations'), h('dd', null, '4'))));
  await frame();
  const dialog = host.querySelector('dialog');
  const body = host.querySelector('.uix-confirm__body');
  assert.equal(dialog.getAttribute('role'), 'alertdialog');
  assert.equal(dialog.getAttribute('aria-describedby'), body.id);
  assert.match(body.textContent, /This removes the CI\.Relations4How to undo thisRestore it/);
  assert.equal(host.querySelector('[role="alert"]').textContent, 'The CI is locked.');
  const input = host.querySelector('.uix-confirm input');
  assert.equal(document.activeElement, input, 'focus starts in the type-to-confirm field');
  assert.equal(host.querySelector(`label[for="${input.id}"]`).textContent, 'Type web-01 to confirm');

  const confirm = [...host.querySelectorAll('.uix-dialog__footer button')].find((b) => b.textContent === 'Delete');
  assert.equal(confirm.disabled, true);
  click(confirm);
  assert.deepEqual(calls, []);
  act(() => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(input, 'web-01');
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
  });
  assert.equal(confirm.disabled, false);
  click(confirm);
  click(host.querySelector('.uix-confirm__tertiary'));
  assert.deepEqual(calls, ['confirm', 'tertiary']);
  assert.equal(host.querySelector('.uix-dialog__footer').firstElementChild.className.includes('uix-confirm__tertiary'), true, 'tertiary sits first');

  rerender(h(ui.ConfirmDialog, { ...props, typeToConfirm: undefined, error: undefined, open: false }));
  rerender(h(ui.ConfirmDialog, { ...props, typeToConfirm: undefined, error: undefined, open: true }));
  await frame();
  assert.equal(document.activeElement?.textContent, 'Cancel', 'a destructive dialog focuses Cancel');
  unmount();
});

test('HAR-1356: Popconfirm opens on its anchor, focuses Cancel, Escape cancels and returns focus', async () => {
  const calls = [];
  const Harness = () => {
    const ref = useRef(null);
    const [open, setOpen] = useState(false);
    return h('div', null,
      h('button', { ref, onClick: () => setOpen(true) }, 'Unlink'),
      h(ui.Popconfirm, {
        open, anchor: ref, title: 'Unlink this CI?', description: 'The relation is removed.', compensation: 'Link it again from the CI.',
        confirmLabel: 'Unlink', cancelLabel: 'Keep', onConfirm: () => { calls.push('confirm'); setOpen(false); }, onCancel: () => { calls.push('cancel'); setOpen(false); },
      }));
  };
  const { host, unmount } = mount(h(Harness));
  const trigger = host.querySelector('button');
  trigger.focus();
  click(trigger);
  await frame();
  const panel = host.querySelector('.uix-popconfirm');
  assert.equal(panel.getAttribute('role'), 'dialog');
  assert.ok(panel.hasAttribute('data-test-popover-open'));
  assert.equal(document.getElementById(panel.getAttribute('aria-labelledby')).textContent, 'Unlink this CI?');
  assert.match(document.getElementById(panel.getAttribute('aria-describedby')).textContent, /How to undo this/);
  assert.equal(document.activeElement.textContent, 'Keep');
  key(document.activeElement, 'Escape');
  await frame();
  assert.deepEqual(calls, ['cancel']);
  assert.equal(document.activeElement, trigger, 'focus returns to the anchor');
  assert.ok(!panel.hasAttribute('data-test-popover-open'));
  unmount();
});

test('HAR-1357: Pagination link mode renders real links; cursor mode has First / Previous / Next', () => {
  const links = renderToStaticMarkup(h(ui.Pagination, { page: 1, pageCount: 3, hrefFor: (p) => `/katalog?page=${p}` }));
  assert.match(links, /<a class="uix-pagination__btn" role="link" aria-disabled="true" aria-label="Previous page">‹<\/a>/);
  assert.match(links, /<a href="\/katalog\?page=1" class="uix-pagination__btn" aria-current="page">1<\/a>/);
  assert.match(links, /<a href="\/katalog\?page=3" class="uix-pagination__btn">3<\/a>/);
  assert.match(links, /<a href="\/katalog\?page=2" class="uix-pagination__btn" aria-label="Next page">›<\/a>/);

  const buttons = renderToStaticMarkup(h(ui.Pagination, { page: 2, pageCount: 3, onChange: () => {} }));
  assert.match(buttons, /<button type="button" class="uix-pagination__btn" aria-current="page">2<\/button>/, 'button pager unchanged apart from type');

  const moves = [];
  const { host, unmount } = mount(h(ui.Pagination, { mode: 'cursor', hasPrevious: false, hasNext: true, onFirst: () => moves.push('first'), onPrevious: () => moves.push('prev'), onNext: () => moves.push('next'), summary: '1–20', labels: { first: 'Erste Seite' } }));
  const btns = [...host.querySelectorAll('button')];
  assert.deepEqual(btns.map((b) => b.getAttribute('aria-label')), ['Erste Seite', 'Previous page', 'Next page']);
  assert.deepEqual(btns.map((b) => b.disabled), [true, true, false]);
  assert.equal(host.querySelector('.uix-pagination__summary').textContent, '1–20');
  click(btns[2]);
  assert.deepEqual(moves, ['next']);
  unmount();

  const cursorLinks = renderToStaticMarkup(h(ui.Pagination, { mode: 'cursor', hasPrevious: true, hasNext: false, firstHref: '/q', previousHref: '/q?before=a', nextHref: '/q?after=z' }));
  assert.match(cursorLinks, /<a href="\/q\?before=a" class="uix-pagination__btn" aria-label="Previous page">/);
  assert.match(cursorLinks, /<a class="uix-pagination__btn" role="link" aria-disabled="true" aria-label="Next page">/);
});

test('HAR-1358: UixLabelsProvider translates chrome; nested providers merge; a prop still wins', () => {
  const tree = h(ui.UixLabelsProvider, { labels: { drawer: { close: 'Schließen' }, peek: { previous: 'Zurück', next: 'Weiter' } } },
    h(ui.UixLabelsProvider, { labels: { peek: { next: 'Nächster Datensatz' } } },
      h(ui.Drawer, { open: true, onClose: () => {}, title: 'A' }, 'x'),
      h(ui.Drawer, { open: true, onClose: () => {}, title: 'B', closeLabel: 'Zu' }, 'y'),
      h(ui.Toaster, null)));
  const { host, unmount } = mount(tree);
  const closers = [...host.querySelectorAll('.uix-drawer__header button')].map((b) => b.getAttribute('aria-label'));
  assert.deepEqual(closers, ['Schließen', 'Zu']);
  assert.equal(host.querySelector('.uix-toaster, [aria-label="Notifications"]')?.getAttribute('aria-label'), 'Notifications', 'unset keys keep the English default');
  unmount();

  let seen;
  const Probe = () => { seen = ui.useUixLabels(); return null; };
  const probe = mount(h(ui.UixLabelsProvider, { labels: { peek: { previous: 'Zurück', next: 'Weiter' } } }, h(ui.UixLabelsProvider, { labels: { peek: { next: 'Nächster' } } }, h(Probe))));
  assert.deepEqual(seen.peek, { previous: 'Zurück', next: 'Nächster' });
  probe.unmount();
});

test('HAR-1359: Menu opens from its button, moves with arrows, selects, and Escape returns focus', async () => {
  const picked = [];
  const { host, unmount } = mount(h(ui.Menu, { trigger: h(ui.Button, null, 'Actions') },
    h(ui.MenuItem, { onSelect: () => picked.push('edit') }, 'Edit'),
    h(ui.MenuItem, { disabled: true }, 'Merge'),
    h(ui.MenuSeparator),
    h(ui.MenuGroup, { label: 'Danger zone' }, h(ui.MenuItem, { tone: 'danger', onSelect: () => picked.push('delete') }, 'Delete'))));
  const trigger = host.querySelector('button.uix-btn');
  assert.equal(trigger.getAttribute('aria-haspopup'), 'menu');
  assert.equal(trigger.getAttribute('aria-expanded'), 'false');
  trigger.focus();
  key(trigger, 'ArrowDown');
  await frame();
  const menu = document.getElementById(trigger.getAttribute('aria-controls'));
  assert.equal(menu.getAttribute('role'), 'menu');
  assert.equal(menu.getAttribute('aria-labelledby'), trigger.id);
  assert.equal(trigger.getAttribute('aria-expanded'), 'true');
  assert.equal(document.activeElement.textContent, 'Edit');
  key(document.activeElement, 'ArrowDown');
  assert.equal(document.activeElement.textContent, 'Delete', 'the disabled item is skipped');
  assert.ok(document.activeElement.classList.contains('uix-menu__item--danger'));
  key(document.activeElement, 'Home');
  assert.equal(document.activeElement.textContent, 'Edit');
  key(document.activeElement, 'd');
  assert.equal(document.activeElement.textContent, 'Delete', 'typeahead');
  key(document.activeElement, 'Escape');
  await frame();
  assert.equal(document.activeElement, trigger);
  assert.equal(trigger.getAttribute('aria-expanded'), 'false');

  click(trigger);
  await frame();
  click(document.activeElement);
  await frame();
  assert.deepEqual(picked, ['edit']);
  assert.equal(document.activeElement, trigger, 'selecting returns focus to the trigger');
  unmount();
});

test('HAR-1360: Chip toggles, links, and removes with a named × button', () => {
  const pressed = [];
  const removed = [];
  const { host, unmount } = mount(h(ui.ChipGroup, { label: 'Active filters' },
    h(ui.Chip, { pressed: false, onPressedChange: (v) => pressed.push(v) }, 'Mine'),
    h(ui.Chip, { onRemove: () => removed.push('open'), count: 4 }, 'Open'),
    h(ui.Chip, { variant: 'add', onClick: () => {} }, '+ Add filter')));
  const group = host.querySelector('.uix-chip-group');
  assert.equal(group.getAttribute('role'), 'group');
  assert.equal(group.getAttribute('aria-label'), 'Active filters');
  const toggle = host.querySelector('button[aria-pressed]');
  assert.equal(toggle.getAttribute('aria-pressed'), 'false');
  click(toggle);
  assert.deepEqual(pressed, [true]);
  const remove = host.querySelector('.uix-chip__remove');
  assert.equal(remove.getAttribute('aria-label'), 'Remove Open');
  assert.equal(remove.closest('.uix-chip').querySelector('.uix-chip__count').textContent, '4');
  click(remove);
  assert.deepEqual(removed, ['open']);
  assert.ok(host.querySelector('.uix-chip--add'));
  unmount();
  assert.match(renderToStaticMarkup(h(ui.Chip, { href: '/x?tag=a' }, 'a')), /^<a href="\/x\?tag=a" class="uix-chip">/);
  assert.match(renderToStaticMarkup(h(ui.Chip, null, 'Static')), /class="uix-chip uix-chip--static"/);
});

test('HAR-1361: KbdCombo shows platform glyphs and speaks key names', () => {
  const mac = renderToStaticMarkup(h(ui.KbdCombo, { keys: ['Mod', 'Shift', 'K'], platform: 'mac' }));
  assert.match(mac, /<span class="uix-visually-hidden">Command\+Shift\+K<\/span>/);
  assert.match(mac, /<kbd class="uix-kbd">⌘<\/kbd><kbd class="uix-kbd">⇧<\/kbd><kbd class="uix-kbd">K<\/kbd>/);
  const other = renderToStaticMarkup(h(ui.KbdCombo, { keys: ['Mod', 'K'], keyLabels: { Mod: 'Steuerung' } }));
  assert.match(other, />Steuerung\+K</);
  assert.match(other, /<kbd class="uix-kbd">Ctrl<\/kbd>/, 'the server renders the non-Apple glyph');
  assert.equal(renderToStaticMarkup(h(ui.Kbd, null, '/')), '<kbd class="uix-kbd">/</kbd>');
});

test('HAR-1362: Steps is an ordered list with state in text and aria-current on the current step', () => {
  const html = renderToStaticMarkup(h(ui.Steps, { label: 'Intake' },
    h(ui.Step, { title: 'Scan', state: 'complete' }),
    h(ui.Step, { title: 'Review', state: 'current', description: 'Check the metadata' }),
    h(ui.Step, { title: 'Shelve', state: 'waiting' })));
  assert.match(html, /^<ol aria-label="Intake" class="uix-steps uix-steps--list uix-steps--horizontal">/);
  assert.equal((html.match(/<li /g) ?? []).length, 3);
  assert.equal((html.match(/uix-step__connector/g) ?? []).length, 2, 'no connector after the last step');
  assert.match(html, /data-state="done"/);
  assert.match(html, /data-state="active" aria-current="step"/);
  assert.match(html, /data-state="waiting"/);
  assert.match(html, /<span class="uix-step__title">Review<\/span><span class="uix-visually-hidden">, Current step<\/span>/);
  assert.match(html, /<span class="uix-step__marker" aria-hidden="true">3<\/span>/, 'number marker');
  const nav = renderToStaticMarkup(h(ui.Steps, { orientation: 'vertical' }, h(ui.Step, { title: 'Details', state: 'complete', href: '/new?step=1' })));
  assert.match(nav, /<a href="\/new\?step=1" class="uix-step__action">/);
  assert.match(nav, /uix-steps--vertical/);
});

test('HAR-1571: the CollapsibleSection chevron is the UIx ChevronDown svg, with no text node, in both variants', async () => {
  const icons = await import('../dist/icons.js');
  const expectedPath = icons.ICON_GLYPHS['chevron-down'][0][1].d;
  assert.equal(expectedPath, 'm6 9 6 6 6-6', 'the glyph is the Lucide chevron-down path');
  const check = (markup, label) => {
    const host = document.createElement('div');
    host.innerHTML = markup;
    const chevron = host.querySelector('.uix-collapsible__chevron');
    assert.ok(chevron, `${label}: chevron present`);
    assert.equal(chevron.getAttribute('aria-hidden'), 'true', `${label}: decorative`);
    assert.equal(chevron.textContent, '', `${label}: no text glyph`);
    assert.equal([...chevron.childNodes].filter((n) => n.nodeType === 3).length, 0, `${label}: no text node`);
    const svg = chevron.querySelector('svg');
    assert.ok(svg, `${label}: contains an svg`);
    assert.equal(svg.querySelector('path')?.getAttribute('d'), expectedPath, `${label}: path matches glyphChevronDown`);
    assert.ok(svg.classList.contains('uix-icon--sm'), `${label}: icon-sm size`);
  };
  check(renderToStaticMarkup(h(ui.CollapsibleSection, { title: 'Plain' }, 'Body')), 'plain');
  check(renderToStaticMarkup(h(ui.CollapsibleSection, { title: 'Lazy', lazy: true }, 'Body')), 'stateful');
  const { host, unmount } = mount(h(ui.CollapsibleSection, { title: 'Stateful', persistKey: 'har-1571' }, 'Body'));
  assert.equal(host.querySelector('.uix-collapsible__chevron svg path')?.getAttribute('d'), expectedPath, 'mounted stateful section');
  assert.equal(host.querySelector('.uix-collapsible__chevron').textContent, '');
  unmount();
});
