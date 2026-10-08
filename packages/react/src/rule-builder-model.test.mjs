import test from 'node:test';
import assert from 'node:assert/strict';
import {
  appendRuleNode, moveRuleNode, removeRuleNode, ruleDepth, setRuleCombinator, summarizeRule, validateRuleDefinition,
  DEFAULT_RULE_SUMMARY_WORDS, DEFAULT_RULE_VALIDATION_MESSAGES,
} from './rule-builder-model.ts';

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

// ── HAR-1618: checks can be reworded or turned off; a fixed combinator; summary words ──
const empty = { when: { id: 'root', combinator: 'and', conditions: [] }, then: [] };

test('validateRuleDefinition: every issue names its check, and the default messages are unchanged', () => {
  assert.deepEqual(validateRuleDefinition(empty), [
    { path: 'when', message: 'Add at least one condition.', check: 'emptyGroup' },
    { path: 'then', message: 'Add at least one action.', check: 'noActions' },
  ]);
  const broken = {
    when: { id: 'root', combinator: 'and', conditions: [
      { id: 'a', field: '', operator: '' },
      { id: 'a', field: 'x', operator: 'eq' },
      { id: 'g', combinator: 'or', conditions: [{ id: 'h', combinator: 'and', conditions: [{ id: 'c', field: 'x', operator: 'eq' }] }] },
    ] },
    then: [{ id: 'c', type: '', parameters: {} }],
  };
  assert.deepEqual(validateRuleDefinition(broken, 2).map((issue) => [issue.check, issue.message]), [
    ['missingField', 'Choose a field.'],
    ['missingOperator', 'Choose an operator.'],
    ['duplicateId', 'Duplicate id “a”.'],
    ['maxDepth', 'Nesting exceeds 2 levels.'],
    ['duplicateId', 'Duplicate id “c”.'],
    ['missingActionType', 'Choose an action.'],
  ]);
  assert.deepEqual(Object.keys(DEFAULT_RULE_VALIDATION_MESSAGES).sort(),
    ['duplicateId', 'emptyGroup', 'maxDepth', 'missingActionType', 'missingField', 'missingOperator', 'noActions']);
});

test('validateRuleDefinition: messages can be replaced and checks turned off, one by one', () => {
  assert.deepEqual(validateRuleDefinition(empty, 3, { checks: { emptyGroup: false } }).map((i) => i.check), ['noActions']);
  assert.deepEqual(validateRuleDefinition(empty, 3, { checks: { emptyGroup: false, noActions: false } }), []);
  assert.deepEqual(validateRuleDefinition(empty, 3, { checks: { emptyGroup: true } }).length, 2, 'true is the default');
  const german = validateRuleDefinition(
    { when: { id: 'r', combinator: 'and', conditions: [{ id: 'r', field: 'x', operator: 'eq' }] }, then: [{ id: 'n', type: 'notify', parameters: {} }] },
    3,
    { messages: { duplicateId: 'Doppelte Kennung „{id}“.' } },
  );
  assert.deepEqual(german.map((i) => i.message), ['Doppelte Kennung „r“.']);
});

test('setRuleCombinator sets every group, nested ones included, without touching the input', () => {
  const nested = { id: 'root', combinator: 'or', conditions: [
    { id: 'a', field: 'x', operator: 'eq' },
    { id: 'g', combinator: 'or', conditions: [{ id: 'h', combinator: 'and', conditions: [] }] },
  ] };
  const fixed = setRuleCombinator(nested, 'and');
  assert.doesNotMatch(JSON.stringify(fixed), /"combinator":"or"/);
  assert.equal(fixed.conditions[0], nested.conditions[0], 'conditions are kept as they are');
  assert.equal(nested.combinator, 'or');
  assert.equal(nested.conditions[1].combinator, 'or');
});

test('summarizeRule: the words of the sentence can be translated, and the actions left out', () => {
  const words = { sentence: 'Wenn {conditions}, dann {actions}.', sentenceConditionsOnly: 'Wenn {conditions}.', noConditions: 'keine Bedingungen', noActions: 'keine Aktionen', and: 'UND', or: 'ODER' };
  assert.equal(summarizeRule(rule, { words }), 'Wenn amount gt 10 UND state eq "open", dann notify.');
  assert.equal(summarizeRule(empty, { words }), 'Wenn keine Bedingungen, dann keine Aktionen.');
  assert.equal(summarizeRule(rule, { words, conditionsOnly: true }), 'Wenn amount gt 10 UND state eq "open".');
  assert.equal(summarizeRule({ ...rule, when: { ...rule.when, combinator: 'or' } }, { words: { or: 'ODER' } }), 'When amount gt 10 ODER state eq "open", then notify.');
  assert.equal(summarizeRule(empty), 'When no conditions, then no actions.', 'the default sentence is unchanged');
  assert.equal(DEFAULT_RULE_SUMMARY_WORDS.and, 'AND');
});
