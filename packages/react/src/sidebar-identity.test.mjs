/* Sidebar identity primitives + NavSection — contract tests.
 *
 * Renders the BUILT dist (run `npm run build` first; CI does) with react-dom/server
 * and asserts the markup contract both ways:
 *   • NavSection is genuinely static — no anchor/button, no tabindex, no aria-current.
 *   • SidebarIdentity is ONE disclosure <button> wired to a native [popover] menu
 *     (popovertarget ↔ id), aria-expanded present, dev section fenced.
 *   • SidebarUtil is icon-only and therefore always carries an aria-label.
 *   • Drift guard (quiet-link.test.mjs idiom): every class these components emit
 *     still exists in tokens' sidebar.css / menu.css, and the rail rules cover the
 *     identity + footer so the primitives respond to [data-collapsed].
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  NavSection, SidebarIdentity, SidebarIdentityItem, SidebarIdentitySep,
  SidebarFooter, SidebarUtil, SidebarFooterSpacer,
} from '../dist/index.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const css = (f) => readFileSync(join(HERE, '..', '..', 'tokens', 'styles', 'components', f), 'utf8');
const h = React.createElement;

// ── NavSection: static, not clickable ───────────────────────────────────────────
test('NavSection renders a non-focusable, non-interactive div', () => {
  const html = renderToStaticMarkup(h(NavSection, { icon: h('svg') }, 'Administration'));
  assert.match(html, /^<div class="uix-navsection"/);
  assert.match(html, /uix-navsection__label/);
  assert.doesNotMatch(html, /<a\b|<button\b/);
  assert.doesNotMatch(html, /tabindex|tabIndex|aria-current/i);
});

test('sidebar.css keeps the static contract: navsection has default cursor, navitem has pointer', () => {
  const sidebar = css('sidebar.css');
  const navsection = sidebar.match(/\.uix-navsection\s*\{[^}]*\}/)?.[0];
  assert.ok(navsection, '.uix-navsection missing from sidebar.css');
  assert.match(navsection, /cursor:\s*default/);
  const navitem = sidebar.match(/\.uix-navitem\s*\{[^}]*\}/)?.[0];
  assert.match(navitem, /cursor:\s*pointer/);
  assert.equal(/\.uix-navsection:hover/.test(sidebar), false, 'navsection must have no hover rule');
});

// ── SidebarIdentity: one disclosure button + native popover menu ────────────────
test('SidebarIdentity wires trigger to menu via popovertarget/id and syncs aria-expanded', () => {
  const html = renderToStaticMarkup(h(SidebarIdentity, {
    orgName: 'Tensor Ops', userName: 'Ada Lovelace', menuLabel: 'ada@example.com',
  }, h(SidebarIdentityItem, null, 'Profile'), h(SidebarIdentitySep), h(SidebarIdentityItem, { danger: true }, 'Sign out')));

  const target = html.match(/popovertarget="([^"]+)"/)?.[1];
  const menuId = html.match(/<ul[^>]*\bid="([^"]+)"/)?.[1];
  assert.ok(target && menuId, 'trigger and menu must both be present');
  assert.equal(target, menuId, 'popovertarget must reference the menu id');
  assert.match(html, /<button[^>]*class="uix-identity"[^>]*aria-expanded="false"/);
  assert.match(html, /<ul[^>]*popover=""|<ul[^>]*popover="auto"/);
  assert.match(html, /uix-identity__org">Tensor Ops</);
  assert.match(html, /aria-hidden="true">TO</); // derived org initials
  assert.match(html, /uix-menu__item--danger/);
  assert.match(html, /role="separator"/);
});

test('SidebarIdentity fences the dev-only section and omits it when absent', () => {
  const withDev = renderToStaticMarkup(h(SidebarIdentity, { orgName: 'X', devSection: h('button', null, 'Persona') }));
  assert.match(withDev, /uix-menu__dev/);
  const without = renderToStaticMarkup(h(SidebarIdentity, { orgName: 'X' }));
  assert.doesNotMatch(without, /uix-menu__dev/);
});

// ── SidebarFooter / SidebarUtil ─────────────────────────────────────────────────
test('SidebarUtil is icon-only and always labelled; footer composes with spacer', () => {
  const html = renderToStaticMarkup(h(SidebarFooter, null,
    h(SidebarUtil, { label: 'Help' }, h('svg')),
    h(SidebarFooterSpacer),
    h(SidebarUtil, { label: 'Settings' }, h('svg')),
  ));
  assert.match(html, /^<div class="uix-sidebar__footer"/);
  assert.equal((html.match(/aria-label=/g) ?? []).length, 2);
  assert.match(html, /uix-sidebar__footer-spacer/);
  assert.match(html, /type="button"/);
});

// ── CSS drift guards ────────────────────────────────────────────────────────────
test('every emitted class exists in the shipped CSS', () => {
  const sidebar = css('sidebar.css');
  for (const cls of [
    'uix-navsection', 'uix-navsection__icon', 'uix-navsection__label',
    'uix-identity', 'uix-identity__lines', 'uix-identity__org', 'uix-identity__user', 'uix-identity__chevron',
    'uix-sidebar__footer', 'uix-sidebar__util', 'uix-sidebar__footer-spacer',
  ]) assert.ok(sidebar.includes(`.${cls}`), `${cls} missing from sidebar.css`);
  const menu = css('menu.css');
  for (const cls of ['uix-menu__dev', 'uix-menu__item', 'uix-menu__label', 'uix-menu__sep']) {
    assert.ok(menu.includes(`.${cls}`), `${cls} missing from menu.css`);
  }
});

test('rail mode covers the new primitives', () => {
  const sidebar = css('sidebar.css');
  const rail = sidebar.slice(sidebar.indexOf('/* collapsed rail */'));
  for (const sel of ['.uix-identity__lines', '.uix-identity__chevron', '.uix-navsection__label', '.uix-sidebar__footer']) {
    assert.ok(rail.includes(sel), `rail rules must handle ${sel}`);
  }
});

test('navitem no longer forces width:100% (context-scope fix)', () => {
  const navitem = css('sidebar.css').match(/\.uix-navitem\s*\{[^}]*\}/)?.[0];
  assert.doesNotMatch(navitem, /width:\s*100%/);
});
