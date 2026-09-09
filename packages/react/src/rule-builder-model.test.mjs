import test from 'node:test';
import assert from 'node:assert/strict';
import { appendRuleNode, moveRuleNode, removeRuleNode, ruleDepth, summarizeRule, validateRuleDefinition } from './rule-builder-model.ts';

const rule = {
  when: { id: 'root', combinator: 'and', conditions: [
    { id: 'a', field: 'amount', operator: 'gt', value: 10 },
    { id: 'b', field: 'state', operator: 'eq', value: 'open' },
  ] },
  then: [{ id: 'notify', type: 'notify', parameters: {} }],
};

test('rule mutations are immutable and preserve sibling order', () => {
  const moved = { ...rule, when: moveRuleNode(rule.when, 'b', -1) };
  assert.deepEqual(moved.when.conditions.map((node) => node.id), ['b', 'a']);
  assert.deepEqual(rule.when.conditions.map((node) => node.id), ['a', 'b']);
  assert.deepEqual(removeRuleNode(moved.when, 'a').conditions.map((node) => node.id), ['b']);
});

test('bounded nesting rejects groups beyond max depth', () => {
  const group = { id: 'nested', combinator: 'or', conditions: [{ id: 'c', field: 'x', operator: 'eq' }] };
  const once = appendRuleNode(rule.when, 'root', group, 2);
  assert.equal(ruleDepth(once), 2);
  const tooDeep = appendRuleNode(once, 'nested', { ...group, id: 'deeper' }, 2);
  assert.equal(ruleDepth(tooDeep), 2);
});

test('validation and summaries remain domain neutral', () => {
  assert.deepEqual(validateRuleDefinition(rule), []);
  assert.equal(summarizeRule(rule, { fields: { amount: 'Amount' }, operators: { gt: 'is greater than' }, actions: { notify: 'Notify' } }), 'When Amount is greater than 10 AND state eq "open", then Notify.');
  assert.equal(validateRuleDefinition({ when: { id: 'root', combinator: 'and', conditions: [] }, then: [] }).length, 2);
});
