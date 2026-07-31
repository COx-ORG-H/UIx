/* Quiet-link contract (styles/components/link.css).
 *
 * link.css quiets anchors in named title/name slots and data cells by DEFAULT — the CSS
 * is scoped to the slot class, so it silently detaches the moment a wrapper renders its
 * anchor somewhere else or a class is renamed. These tests lock both ends:
 *
 *   1. every wrapper still nests the anchor INSIDE the slot-classed element, and
 *   2. every slot class asserted here is actually present in link.css.
 *
 * (2) is the drift guard: deleting a selector from the CSS without touching the wrapper
 * would otherwise leave these passing while the links went loud again in the browser.
 *
 * Renders the BUILT dist with react-dom/server — run `npm run build` first; CI does.
 * Run: node --test  (from packages/react), or  npm test -w @tensor_1/react.
 *
 * Editorial-home's own slots (content list, news lead, event row) are covered in
 * editorial-home.test.mjs. FeaturedRundownItem is exempt everywhere: it renders a
 * <button>, and an anchor may not nest inside one. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  Card, ListItem, InboxItem, KanbanCard, UserChip, Comment, StatusRow, DescriptionList,
} from '../dist/index.js';

const render = (el) => renderToStaticMarkup(el);
const link = (label) => h('a', { href: '/r/1' }, label);

const LINK_CSS = readFileSync(
  fileURLToPath(new URL('../../tokens/styles/components/link.css', import.meta.url)),
  'utf8',
);

/* slot class → a wrapper that must render an anchor inside it */
const SLOTS = [
  ['uix-card__title', 'div', () => render(h(Card, { title: link('Q3 board pack') }))],
  ['uix-list__title', 'div', () => render(h(ListItem, { title: link('Access review') }))],
  ['uix-inbox__subject', 'div', () => render(h(InboxItem, { subject: link('Re: onboarding') }))],
  ['uix-kanban__card-title', 'div', () => render(h(KanbanCard, { title: link('Ship the kit') }))],
  ['uix-user-chip__name', 'span', () => render(h(UserChip, { name: link('Ada Lovelace') }))],
  ['uix-comment__author', 'span', () => render(h(Comment, { author: link('Ada Lovelace') }))],
  ['uix-status-row__name', 'span', () => render(h(StatusRow, { name: link('Mail relay') }))],
];

for (const [slot, tag, renderCase] of SLOTS) {
  test(`quiet-link slot: ${slot} nests the anchor and is scoped in link.css`, () => {
    assert.match(
      renderCase(),
      new RegExp(`<${tag} class="${slot}"><a href="/r/1">`),
      `${slot}: the anchor must render inside the slot-classed element or link.css stops matching`,
    );
    assert.ok(
      LINK_CSS.includes(`.${slot}`),
      `${slot} is asserted here but missing from link.css — the slot would render a loud in-text link`,
    );
  });
}

test('quiet-link slot: description-list values render the anchor inside <dd>', () => {
  // Data cells are scoped `:not([class])` (like table cells) so class-bearing anchors —
  // .uix-btn--link, pills — keep their own treatment.
  const html = render(h(DescriptionList, { items: [{ term: 'Owner', description: link('Ada Lovelace') }] }));
  assert.match(html, /<dd><a href="\/r\/1">Ada Lovelace<\/a><\/dd>/);
  assert.ok(LINK_CSS.includes('.uix-dl dd'), '.uix-dl dd is missing from link.css');
});

test('quiet-link exclusions stay loud: prose and the peek title are not in the registry', () => {
  // Links inside running copy must keep colour + underline (WCAG 1.4.1), and the peek
  // header has no other affordance signalling that its title navigates. Guards against a
  // future "finish the job" pass quietly folding them in.
  for (const excluded of ['.uix-prose a', '.uix-note', '.uix-peek__title a', '.uix-timeline__body', '.uix-audit__detail']) {
    assert.ok(
      !new RegExp(`^\\s*${excluded.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*[,{]`, 'm').test(LINK_CSS),
      `${excluded} must never be a quiet-link selector`,
    );
  }
});
