import test from 'node:test';
import assert from 'node:assert/strict';
import { clampMetricValue, parseMetricValue, stepMetricValue } from './metric-model.ts';

test('numeric stepping is decimal-safe and clamped', () => {
  assert.equal(stepMetricValue(0.2, 1, { step: 0.1 }), 0.3);
  assert.equal(stepMetricValue(10, 1, { max: 10, step: 2 }), 10);
  assert.equal(stepMetricValue(null, 1, { min: 5, step: 2 }), 7);
  assert.equal(clampMetricValue(-2, 0, 10), 0);
});

test('parsing accepts finite numbers and empty null', () => {
  assert.equal(parseMetricValue(' 12.5 '), 12.5);
  assert.equal(parseMetricValue(''), null);
  assert.equal(parseMetricValue('Infinity'), null);
});
