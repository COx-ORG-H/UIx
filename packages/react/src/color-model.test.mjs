import test from 'node:test';
import assert from 'node:assert/strict';
import { contrastRatio, hexToRgb, hsvToHex, meetsContrast, normalizeHex, rgbToHsv } from './color-model.ts';

test('hex values validate and normalize', () => {
  assert.equal(normalizeHex(' #1a2 '), '#11AA22');
  assert.equal(normalizeHex('3366ff'), '#3366FF');
  assert.equal(normalizeHex('nope'), undefined);
});

test('HSV conversion round-trips representative colors', () => {
  const rgb = hexToRgb('#3366FF');
  assert.ok(rgb);
  assert.equal(hsvToHex(rgbToHsv(rgb)), '#3366FF');
});

test('WCAG contrast math identifies pass and fail', () => {
  assert.equal(contrastRatio('#000000', '#FFFFFF'), 21);
  assert.equal(meetsContrast('#3366FF', '#FFFFFF'), true);
  assert.equal(meetsContrast('#FFFF00', '#FFFFFF'), false);
});
