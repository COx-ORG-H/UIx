/* Unit tests for the component-maturity validator (A11Y-2). Run: node --test scripts/check-status.test.mjs.
   Exercises the happy path + every failure mode, with a stubbed resultsExists so no filesystem is touched. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validate, toId, exportedComponents, STATUSES } from './check-status.mjs';

const NAMES = ['Button', 'StatusPill', 'Modal'];
const good = () => ({
  $comment: 'meta keys are ignored',
  button: { status: 'stable', a11y: { manualSR: 'Docs/a11y/results/button.md' } },
  'status-pill': { status: 'beta', a11y: { manualSR: null } },
  modal: { status: 'draft', a11y: { manualSR: null } },
});
const hasButtonResult = (id) => id === 'button';

test('toId: kebab-cases export names', () => {
  assert.equal(toId('Button'), 'button');
  assert.equal(toId('StatusPill'), 'status-pill');
  assert.equal(toId('AppShell'), 'app-shell');
  assert.equal(toId('Td'), 'td');
});

test('exportedComponents: keeps JSX/forwardRef exports, drops utilities', () => {
  const md = [
    'export function Alert(input: AlertProps): react.JSX.Element;',
    'export const Button: react.ForwardRefExoticComponent<ButtonProps & react.RefAttributes<HTMLButtonElement>>;',
    'export function cx(...args: (string | false)[]): string;',
    'export function applyFilters<T extends Row>(rows: readonly T[]): T[];',
  ].join('\n');
  assert.deepEqual(exportedComponents(md), ['Alert', 'Button']);
});

test('STATUSES enum is draft/beta/stable', () => {
  assert.deepEqual(STATUSES, ['draft', 'beta', 'stable']);
});

test('validate: clean registry → no errors', () => {
  const { errors } = validate(good(), NAMES, hasButtonResult);
  assert.deepEqual(errors, []);
});

test('validate: missing exported component → error', () => {
  const reg = good();
  delete reg.modal;
  const { errors } = validate(reg, NAMES, hasButtonResult);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /missing entry for exported component "Modal"/);
});

test('validate: unknown key → error', () => {
  const reg = good();
  reg['not-a-component'] = { status: 'draft', a11y: { manualSR: null } };
  const { errors } = validate(reg, NAMES, hasButtonResult);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /unknown key "not-a-component"/);
});

test('validate: out-of-enum status → error', () => {
  const reg = good();
  reg.modal.status = 'shipped';
  const { errors } = validate(reg, NAMES, hasButtonResult);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /out-of-enum status "shipped"/);
});

test('validate: malformed entry (no a11y.manualSR) → error', () => {
  const reg = good();
  reg.modal = { status: 'draft' };
  const { errors } = validate(reg, NAMES, hasButtonResult);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /missing a11y\.manualSR/);
});

test('validate: stable without a manual-SR result → error', () => {
  const reg = good();
  reg['status-pill'].status = 'stable'; // no result for status-pill
  const { errors } = validate(reg, NAMES, hasButtonResult);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /"status-pill" is "stable" but has no manual-SR result/);
});

test('validate: stable WITH a result passes', () => {
  const reg = good(); // button is stable and hasButtonResult('button') === true
  const { errors } = validate(reg, NAMES, hasButtonResult);
  assert.deepEqual(errors, []);
});
