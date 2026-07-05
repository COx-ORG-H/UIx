/* Unit tests for the pure helpers in status.js (A11Y-5). Run: node --test guide/status.test.js
   Zero deps; matches guide/app.test.js. The DOM block in status.js is guarded, so importing is safe. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { badge, statusFor, badgeHtml, STATUS_LABELS } from './status.js';

test('STATUS_LABELS covers the three tiers', () => {
  assert.deepEqual(STATUS_LABELS, { draft: 'Draft', beta: 'Beta', stable: 'Stable' });
});

test('badge: maps each status to label + class', () => {
  assert.deepEqual(badge('draft'), { status: 'draft', label: 'Draft', className: 'uix-badge uix-badge--draft' });
  assert.deepEqual(badge('beta'), { status: 'beta', label: 'Beta', className: 'uix-badge uix-badge--beta' });
  assert.deepEqual(badge('stable'), { status: 'stable', label: 'Stable', className: 'uix-badge uix-badge--stable' });
});

test('badge: unknown/absent status → neutral Unknown badge, never throws', () => {
  assert.deepEqual(badge('shipped'), { status: 'unknown', label: 'Unknown', className: 'uix-badge uix-badge--unknown' });
  assert.deepEqual(badge(undefined), { status: 'unknown', label: 'Unknown', className: 'uix-badge uix-badge--unknown' });
});

test('statusFor: reads a status registry, null when absent', () => {
  const reg = { button: { status: 'beta' }, alert: { status: 'draft' } };
  assert.equal(statusFor(reg, 'button'), 'beta');
  assert.equal(statusFor(reg, 'alert'), 'draft');
  assert.equal(statusFor(reg, 'nope'), null);
  assert.equal(statusFor(null, 'button'), null);
});

test('badgeHtml: renders accessible text (label appears literally) + a title', () => {
  const html = badgeHtml('beta');
  assert.match(html, />Beta</); // the word is real text content, not colour-only
  assert.match(html, /title="Maturity: Beta"/);
  assert.match(html, /uix-badge uix-badge--beta/);
});
