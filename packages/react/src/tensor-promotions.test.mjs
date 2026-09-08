import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  AsyncOperationStatus,
  Breadcrumbs,
  CardLink,
  Combobox,
  DetailPage,
  ForbiddenState,
  RelativeTime,
  ViewMenu,
  filterComboboxOptions,
  parseDateValue,
  relativeTimeValue,
} from '../dist/index.js';

const noop = () => {};
const render = (component, props, children) => renderToStaticMarkup(h(component, props, children));

test('combobox filtering includes labels, values, and keywords', () => {
  const options = [
    { value: 'hr-1', label: 'People', keywords: ['employees'] },
    { value: 'fin-1', label: 'Finance' },
  ];
  assert.deepEqual(filterComboboxOptions(options, 'employee').map(({ value }) => value), ['hr-1']);
  assert.deepEqual(filterComboboxOptions(options, 'fin-1').map(({ value }) => value), ['fin-1']);
});

test('combobox renders the accessible collapsed contract', () => {
  const html = render(Combobox, { options: [{ value: 'a', label: 'Alpha' }], label: 'Record', emptyLabel: 'No records' });
  assert.match(html, /role="combobox"/);
  assert.match(html, /aria-label="Record"/);
  assert.match(html, /aria-expanded="false"/);
});

test('breadcrumbs mark the final item current by default', () => {
  const html = render(Breadcrumbs, { label: 'Breadcrumb', items: [{ label: 'Home', href: '/' }, { label: 'Record' }] });
  assert.match(html, /class="uix-breadcrumbs"/);
  assert.match(html, /aria-current="page"/);
});

test('relative-time helpers handle invalid values and deterministic buckets', () => {
  assert.equal(parseDateValue('not-a-date'), null);
  assert.deepEqual(relativeTimeValue(new Date('2026-09-08T12:30:00Z'), new Date('2026-09-08T12:00:00Z')), { value: 30, unit: 'minute' });
  const html = render(RelativeTime, { value: '2026-09-08T11:30:00Z', now: new Date('2026-09-08T12:00:00Z'), locale: 'en' });
  assert.match(html, /30 minutes ago/);
});

test('card and detail compositions preserve native links and landmarks', () => {
  assert.match(render(CardLink, { href: '/records/1', title: 'Record' }, 'Body'), /uix-card--interactive/);
  const html = render(DetailPage, { title: 'Record', back: { href: '/records', label: 'Back' }, tabs: [{ id: 'summary', label: 'Summary', href: '#summary', active: true }] }, 'Details');
  assert.match(html, /<section class="uix-detail-page"/);
  assert.match(html, /aria-current="page"/);
  assert.match(html, /uix-detail__main/);
});

test('richer states and async operations keep textual status semantics', () => {
  assert.match(render(ForbiddenState, { title: 'Restricted', detail: 'Ask an administrator.' }), /Restricted/);
  const html = render(AsyncOperationStatus, { state: 'failed', title: 'Import', statusLabel: 'Failed' });
  assert.match(html, /role="alert"/);
  assert.match(html, /uix-pill--danger/);
});

test('view menu is controlled and exposes density and columns', () => {
  const html = render(ViewMenu, {
    density: 'compact', densityLabel: 'Density', densityOptions: [{ value: 'compact', label: 'Compact' }], onDensityChange: noop,
    columnsLabel: 'Columns', columns: [{ id: 'name', label: 'Name', visible: true }], onColumnVisibilityChange: noop,
  });
  assert.match(html, /class="uix-view-menu"/);
  assert.match(html, /aria-pressed="true"/);
  assert.match(html, /checked=""/);
});
