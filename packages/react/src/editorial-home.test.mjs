/* Render tests for the editorial-home kit (EditorialHome.tsx). JSX can't be
 * type-stripped like the pure-logic .ts modules (table-engine, tree-model), so
 * these render the BUILT dist with react-dom/server — run `npm run build` (or
 * root `npm run build:all`) first; CI does. Run: node --test  (from
 * packages/react), or  npm test -w @tensor_1/react.
 *
 * What they lock: the class contract with editorial-home.css (a renamed class
 * silently detaches the CSS), the aria-pressed/data-selected selection wiring
 * on FeaturedRundownItem, the live regions, and slot-conditional markup. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  PageIntro, SectionHead, NoticeQueue,
  FeaturedStage, FeaturedRundown, FeaturedRundownItem,
  NewsLead, ContentList, ContentListItem, ResourceGrid,
  StatLine, EventRow, StatusRow,
} from '../dist/index.js';

const render = (el) => renderToStaticMarkup(el);

test('PageIntro: kicker/title/lede + search + shortcut grid', () => {
  const html = render(h(PageIntro, {
    kicker: 'Tuesday, 28 July',
    title: 'Good morning, Alex.',
    lede: 'What changed, what needs you.',
    searchLabel: 'Search Acme',
    search: h('div', { className: 'uix-searchbar' }),
    shortcuts: h('button', { type: 'button' }, 'Report issue'),
    shortcutsLabel: 'Common employee actions',
  }));
  assert.match(html, /<section class="uix-page-intro">/);
  assert.match(html, /<p class="uix-page-kicker">Tuesday, 28 July<\/p>/);
  assert.match(html, /<h1 class="uix-page-title">Good morning, Alex.<\/h1>/);
  assert.match(html, /<p class="uix-page-lede">What changed, what needs you.<\/p>/);
  assert.match(html, /<p class="uix-intro-search__label">Search Acme<\/p>/);
  assert.match(html, /<div class="uix-shortcut-grid" aria-label="Common employee actions">/);
});

test('PageIntro: search/shortcut wells are omitted when their slots are empty', () => {
  const html = render(h(PageIntro, { title: 'Hello' }));
  assert.doesNotMatch(html, /uix-intro-search__label/);
  assert.doesNotMatch(html, /uix-shortcut-grid/);
  assert.equal((html.match(/<div/g) ?? []).length, 1); // only the title column
});

test('SectionHead: h2 gets titleId, action lands after it', () => {
  const html = render(h(SectionHead, {
    title: 'Latest news',
    titleId: 'latest-news-title',
    action: h('a', { className: 'uix-section-link', href: '#' }, 'View all'),
  }));
  assert.match(html, /<h2 class="uix-section-title" id="latest-news-title">Latest news<\/h2>/);
  assert.match(html, /<a class="uix-section-link" href="#">View all<\/a>/);
});

test('NoticeQueue: copy strong/summary, polite live region, position + actions', () => {
  const html = render(h(NoticeQueue, {
    title: 'Office access changes on Monday.',
    summary: 'Update your mobile badge.',
    meta: 'Needs action',
    position: '1 of 4 important updates',
    actions: h('button', { type: 'button' }, 'Read update'),
    'aria-label': 'Important company update',
  }));
  assert.match(html, /<section class="uix-notice" aria-label="Important company update">/);
  assert.match(html, /<div class="uix-notice__content" aria-live="polite">/);
  assert.match(html, /<strong>Office access changes on Monday.<\/strong> Update your mobile badge./);
  assert.match(html, /<p class="uix-notice__meta">Needs action<\/p>/);
  assert.match(html, /<span class="uix-notice__position">1 of 4 important updates<\/span>/);
});

test('FeaturedStage: labelled visual is role=img; unlabelled is aria-hidden', () => {
  const labelled = render(h(FeaturedStage, { title: 'T', visualLabel: 'Q3 priorities' }));
  assert.match(labelled, /class="uix-featured__visual" role="img" aria-label="Q3 priorities"/);
  const unlabelled = render(h(FeaturedStage, { title: 'T' }));
  assert.match(unlabelled, /class="uix-featured__visual" aria-hidden="true"/);
});

test('FeaturedStage: eyebrow/title/description/meta + live content region', () => {
  const html = render(h(FeaturedStage, {
    eyebrow: 'Featured · Company',
    title: 'Building our next chapter',
    titleId: 'featured-story-title',
    description: 'The priorities shaping Q3.',
    meta: '5 min read',
    action: h('button', { type: 'button' }, 'Read the update'),
  }));
  assert.match(html, /<div class="uix-featured__content" aria-live="polite">/);
  assert.match(html, /<p class="uix-featured__eyebrow">Featured · Company<\/p>/);
  assert.match(html, /<h2 class="uix-featured__title" id="featured-story-title">Building our next chapter<\/h2>/);
  assert.match(html, /<p class="uix-featured__description">The priorities shaping Q3.<\/p>/);
  assert.match(html, /<p class="uix-featured__meta">5 min read<\/p>/);
});

test('FeaturedStage: ordinal renders as the __now chip before the eyebrow text', () => {
  const html = render(h(FeaturedStage, { title: 'T', ordinal: '01', eyebrow: 'Featured · Company' }));
  assert.match(html, /<p class="uix-featured__eyebrow"><span class="uix-featured__now">01<\/span>Featured · Company<\/p>/);
  const chipOnly = render(h(FeaturedStage, { title: 'T', ordinal: '02' }));
  assert.match(chipOnly, /<span class="uix-featured__now">02<\/span>/);
  const neither = render(h(FeaturedStage, { title: 'T' }));
  assert.doesNotMatch(neither, /uix-featured__eyebrow/);
});

test('FeaturedRundown: head (eyebrow/title/meta) + items well', () => {
  const html = render(h(FeaturedRundown, {
    eyebrow: 'Editorial briefing',
    title: 'Featured updates',
    titleId: 'rundown-title',
    meta: h('span', { className: 'uix-pill uix-pill--neutral' }, '3'),
  }, h(FeaturedRundownItem, { number: '01', title: 'Story' })));
  assert.match(html, /<aside class="uix-rundown">/);
  assert.match(html, /<p class="uix-rundown__eyebrow">Editorial briefing<\/p>/);
  assert.match(html, /<h2 class="uix-rundown__title" id="rundown-title">Featured updates<\/h2>/);
  assert.match(html, /<div class="uix-rundown__items">/);
});

test('FeaturedRundownItem: selection is aria-pressed + data-selected, in sync', () => {
  const on = render(h(FeaturedRundownItem, { number: '01', topic: 'Company · 5 min', title: 'Chapter', selected: true }));
  assert.match(on, /aria-pressed="true"/);
  assert.match(on, /data-selected="true"/);
  assert.match(on, /<button type="button" class="uix-rundown__item"/);
  assert.match(on, /<span class="uix-rundown__number">01<\/span>/);
  assert.match(on, /<span class="uix-rundown__topic">Company · 5 min<\/span>/);
  assert.match(on, /<span class="uix-rundown__item-title">Chapter<\/span>/);
  const off = render(h(FeaturedRundownItem, { title: 'Chapter' }));
  assert.match(off, /aria-pressed="false"/);
  assert.match(off, /data-selected="false"/);
});

test('NewsLead: meta/title/summary', () => {
  const html = render(h(NewsLead, { meta: 'Company · Today', title: 'Customer week', summary: 'What we learned.' }));
  assert.match(html, /<article class="uix-news-lead">/);
  assert.match(html, /<p class="uix-news-lead__meta">Company · Today<\/p>/);
  assert.match(html, /<h3 class="uix-news-lead__title">Customer week<\/h3>/);
  assert.match(html, /<p class="uix-news-lead__summary">What we learned.<\/p>/);
});

test('ContentList/ContentListItem: ul/li rows with title, meta, trailing', () => {
  const html = render(h(ContentList, null,
    h(ContentListItem, { title: 'New learning budget', meta: 'People · 2 hours ago', trailing: h('span', { className: 'uix-pill' }, 'Due') }),
    h(ContentListItem, { title: 'Berlin office day' }),
  ));
  assert.match(html, /<ul class="uix-content-list">/);
  assert.equal((html.match(/<li class="uix-content-list__item">/g) ?? []).length, 2);
  assert.match(html, /<p class="uix-content-list__title">New learning budget<\/p>/);
  assert.match(html, /<p class="uix-content-list__meta">People · 2 hours ago<\/p>/);
  assert.match(html, /<span class="uix-pill">Due<\/span>/);
});

test('ResourceGrid: wraps children in the grid', () => {
  const html = render(h(ResourceGrid, null, h('button', { type: 'button' }, 'Time off')));
  assert.match(html, /<div class="uix-resource-grid"><button type="button">Time off<\/button><\/div>/);
});

test('StatLine: items render value/label cells; children pass through', () => {
  const html = render(h(StatLine, {
    items: [{ value: '2', label: 'Devices' }, { value: '6', label: 'Services' }],
    'aria-label': 'My workplace summary',
  }));
  assert.match(html, /<div class="uix-stat-line" aria-label="My workplace summary">/);
  assert.equal((html.match(/<div class="uix-stat-line__item">/g) ?? []).length, 2);
  assert.match(html, /<span class="uix-stat-line__value">2<\/span><span class="uix-stat-line__label">Devices<\/span>/);
});

test('EventRow: date block + title/meta', () => {
  const html = render(h(EventRow, { month: 'Jul', day: '30', title: 'Summer all-hands', meta: '10:00 · Berlin atrium' }));
  assert.match(html, /<div class="uix-event-row">/);
  assert.match(html, /<span class="uix-event-date__month">Jul<\/span><span class="uix-event-date__day">30<\/span>/);
  assert.match(html, /<p class="uix-event-row__title">Summer all-hands<\/p>/);
  assert.match(html, /<p class="uix-event-row__meta">10:00 · Berlin atrium<\/p>/);
});

test('StatusRow: indicator + flexible name + trailing meta', () => {
  const html = render(h(StatusRow, {
    indicator: h('span', { className: 'uix-dot uix-dot--success' }),
    name: 'Core workplace services',
    meta: 'Healthy',
  }));
  assert.match(html, /<div class="uix-status-row">/);
  assert.match(html, /<span class="uix-dot uix-dot--success"><\/span>/);
  assert.match(html, /<span class="uix-status-row__name">Core workplace services<\/span>/);
  assert.match(html, /<span class="uix-list-meta">Healthy<\/span>/);
});

test('quiet-link contract: title-slot anchors render inside the title-classed element', () => {
  // link.css quiets anchors in these slots by default (.uix-content-list__title a etc.) —
  // this locks the nesting that scoping depends on. FeaturedRundownItem is exempt: it
  // renders a <button>, and an anchor may not nest inside one.
  const list = render(h(ContentListItem, { title: h('a', { href: '/news/1' }, 'New learning budget') }));
  assert.match(list, /<p class="uix-content-list__title"><a href="\/news\/1">New learning budget<\/a><\/p>/);
  const lead = render(h(NewsLead, { title: h('a', { href: '/news/2' }, 'Customer week') }));
  assert.match(lead, /<h3 class="uix-news-lead__title"><a href="\/news\/2">Customer week<\/a><\/h3>/);
  const event = render(h(EventRow, { month: 'Jul', day: '30', title: h('a', { href: '/events/4' }, 'Summer all-hands') }));
  assert.match(event, /<p class="uix-event-row__title"><a href="\/events\/4">Summer all-hands<\/a><\/p>/);
});

test('all wrappers merge className and forward DOM props', () => {
  const html = render(h(SectionHead, { title: 'T', className: 'extra', 'data-x': '1' }));
  assert.match(html, /class="uix-section-head extra"/);
  assert.match(html, /data-x="1"/);
});
