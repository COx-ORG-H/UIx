/* Unit tests for the pure helpers in app.js. Run: node --test guide/  (Node 22+, zero deps) */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveTheme, nextTheme, parseColor, getContrast, aaVerdict } from './app.js';

test('resolveTheme: stored value wins over OS', () => {
  assert.equal(resolveTheme('dark', false), 'dark');
  assert.equal(resolveTheme('light', true), 'light');
});

test('resolveTheme: falls back to OS when unset', () => {
  assert.equal(resolveTheme(null, true), 'dark');
  assert.equal(resolveTheme(null, false), 'light');
  assert.equal(resolveTheme(undefined, true), 'dark');
});

test('nextTheme toggles', () => {
  assert.equal(nextTheme('light'), 'dark');
  assert.equal(nextTheme('dark'), 'light');
});

test('parseColor handles hex (3 + 6) and rgb', () => {
  assert.deepEqual(parseColor('#fff'), [255, 255, 255]);
  assert.deepEqual(parseColor('#1447E6'), [20, 71, 230]);
  assert.deepEqual(parseColor('rgb(20, 71, 230)'), [20, 71, 230]);
  assert.deepEqual(parseColor('rgb(255 101 104)'), [255, 101, 104]);
});

test('getContrast: black/white is ~21, white/white is 1', () => {
  assert.ok(Math.abs(getContrast('#000000', '#ffffff') - 21) < 0.01);
  assert.ok(Math.abs(getContrast('#ffffff', '#ffffff') - 1) < 0.01);
});

test('getContrast: accent blue #1447E6 vs white passes AA body text', () => {
  assert.ok(getContrast('#1447E6', '#FFFFFF') >= 4.5);
});

test('aaVerdict thresholds', () => {
  assert.equal(aaVerdict(21), 'AA');
  assert.equal(aaVerdict(4.5), 'AA');
  assert.equal(aaVerdict(3.2), 'AA-lg');
  assert.equal(aaVerdict(2), 'FAIL');
});
