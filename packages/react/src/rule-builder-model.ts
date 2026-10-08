import type { JsonValue } from './json-value.js';

// Not imported from fill-label.ts: this model has no runtime import, so its unit test can load
// the .ts source directly (Node strips types but does not map './x.js' to './x.ts').
const fillLabel = (template: string, values: Readonly<Record<string, string | number>>): string =>
  template.replace(/\{(\w+)\}/g, (match, key: string) =>
    (Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : match));

export interface RuleCondition {
  id: string;
  field: string;
  operator: string;
  value?: JsonValue;
}

export interface RuleGroup {
  id: string;
  combinator: 'and' | 'or';
  conditions: Array<RuleCondition | RuleGroup>;
}

export interface RuleAction {
  id: string;
  type: string;
  parameters: Record<string, JsonValue>;
}

export interface RuleDefinition {
  when: RuleGroup;
  then: RuleAction[];
}

/** The built-in checks of `validateRuleDefinition`; each can be reworded or turned off (HAR-1618). */
export type RuleCheck =
  | 'duplicateId' | 'maxDepth' | 'emptyGroup' | 'missingField' | 'missingOperator' | 'noActions' | 'missingActionType';

export interface RuleValidationIssue {
  path: string;
  message: string;
  /** Which built-in check raised it. Absent on issues from the consumer's own `validate`. */
  check?: RuleCheck;
}

/** The built-in messages. `{id}` is the duplicated id, `{max}` the depth limit. */
export const DEFAULT_RULE_VALIDATION_MESSAGES: Record<RuleCheck, string> = {
  duplicateId: 'Duplicate id “{id}”.',
  maxDepth: 'Nesting exceeds {max} levels.',
  emptyGroup: 'Add at least one condition.',
  missingField: 'Choose a field.',
  missingOperator: 'Choose an operator.',
  noActions: 'Add at least one action.',
  missingActionType: 'Choose an action.',
};

export interface RuleValidationOptions {
  /** Replace individual messages (a translation). */
  messages?: Partial<Record<RuleCheck, string>>;
  /**
   * `false` turns a check off: `{ emptyGroup: false }` for a rule that may have no condition
   * (a catch-all), `{ noActions: false, missingActionType: false }` for conditions without actions.
   */
  checks?: Partial<Record<RuleCheck, boolean>>;
}

export function isRuleGroup(node: RuleCondition | RuleGroup): node is RuleGroup {
  return 'conditions' in node;
}

export function ruleDepth(group: RuleGroup): number {
  return 1 + Math.max(0, ...group.conditions.filter(isRuleGroup).map(ruleDepth));
}

export function findRuleNodeDepth(group: RuleGroup, id: string, depth = 1): number | undefined {
  if (group.id === id) return depth;
  for (const node of group.conditions) {
    if (node.id === id) return depth + 1;
    if (isRuleGroup(node)) {
      const found = findRuleNodeDepth(node, id, depth + 1);
      if (found !== undefined) return found;
    }
  }
  return undefined;
}

export function mapRuleGroup(
  group: RuleGroup,
  id: string,
  update: (node: RuleCondition | RuleGroup) => RuleCondition | RuleGroup,
): RuleGroup {
  if (group.id === id) return update(group) as RuleGroup;
  return {
    ...group,
    conditions: group.conditions.map((node) => {
      if (node.id === id) return update(node);
      return isRuleGroup(node) ? mapRuleGroup(node, id, update) : node;
    }),
  };
}

export function appendRuleNode(
  group: RuleGroup,
  parentId: string,
  node: RuleCondition | RuleGroup,
  maxDepth = 3,
): RuleGroup {
  const parentDepth = findRuleNodeDepth(group, parentId);
  if (parentDepth === undefined) return group;
  const addedDepth = isRuleGroup(node) ? ruleDepth(node) : 0;
  if (parentDepth + addedDepth > maxDepth) return group;
  return mapRuleGroup(group, parentId, (parent) => isRuleGroup(parent)
    ? { ...parent, conditions: [...parent.conditions, node] }
    : parent);
}

export function removeRuleNode(group: RuleGroup, id: string): RuleGroup {
  return {
    ...group,
    conditions: group.conditions
      .filter((node) => node.id !== id)
      .map((node) => isRuleGroup(node) ? removeRuleNode(node, id) : node),
  };
}

export function moveRuleNode(group: RuleGroup, id: string, direction: -1 | 1): RuleGroup {
  const index = group.conditions.findIndex((node) => node.id === id);
  if (index >= 0) {
    const target = index + direction;
    if (target < 0 || target >= group.conditions.length) return group;
    const conditions = [...group.conditions];
    [conditions[index], conditions[target]] = [conditions[target]!, conditions[index]!];
    return { ...group, conditions };
  }
  return {
    ...group,
    conditions: group.conditions.map((node) => isRuleGroup(node)
      ? moveRuleNode(node, id, direction)
      : node),
  };
}

/** Set `combinator` on a group and on every group nested in it. */
export function setRuleCombinator(group: RuleGroup, combinator: 'and' | 'or'): RuleGroup {
  return {
    ...group,
    combinator,
    conditions: group.conditions.map((node) => (isRuleGroup(node) ? setRuleCombinator(node, combinator) : node)),
  };
}

export function validateRuleDefinition(value: RuleDefinition, maxDepth = 3, options: RuleValidationOptions = {}): RuleValidationIssue[] {
  const issues: RuleValidationIssue[] = [];
  const messages = { ...DEFAULT_RULE_VALIDATION_MESSAGES, ...options.messages };
  const report = (check: RuleCheck, path: string, values: Record<string, string | number> = {}) => {
    if (options.checks?.[check] === false) return;
    issues.push({ path, message: fillLabel(messages[check], values), check });
  };
  const ids = new Set<string>();
  const visit = (group: RuleGroup, path: string, depth: number) => {
    if (ids.has(group.id)) report('duplicateId', path, { id: group.id });
    ids.add(group.id);
    if (depth > maxDepth) report('maxDepth', path, { max: maxDepth });
    if (group.conditions.length === 0) report('emptyGroup', path);
    group.conditions.forEach((node, index) => {
      const nodePath = `${path}.conditions[${index}]`;
      if (ids.has(node.id)) report('duplicateId', nodePath, { id: node.id });
      if (isRuleGroup(node)) visit(node, nodePath, depth + 1);
      else {
        ids.add(node.id);
        if (!node.field) report('missingField', nodePath);
        if (!node.operator) report('missingOperator', nodePath);
      }
    });
  };
  visit(value.when, 'when', 1);
  if (value.then.length === 0) report('noActions', 'then');
  value.then.forEach((action, index) => {
    if (ids.has(action.id)) report('duplicateId', `then[${index}]`, { id: action.id });
    ids.add(action.id);
    if (!action.type) report('missingActionType', `then[${index}]`);
  });
  return issues;
}

/** The words of the `summarizeRule` sentence. `{conditions}` and `{actions}` are filled in. */
export interface RuleSummaryWords {
  sentence: string;
  /** For a rule with no actions to name (a conditions-only rule). */
  sentenceConditionsOnly: string;
  noConditions: string;
  noActions: string;
  and: string;
  or: string;
}

export const DEFAULT_RULE_SUMMARY_WORDS: RuleSummaryWords = {
  sentence: 'When {conditions}, then {actions}.',
  sentenceConditionsOnly: 'When {conditions}.',
  noConditions: 'no conditions',
  noActions: 'no actions',
  and: 'AND',
  or: 'OR',
};

export function summarizeRule(
  value: RuleDefinition,
  labels: {
    fields?: Record<string, string>;
    operators?: Record<string, string>;
    actions?: Record<string, string>;
    /** Translate the sentence itself. Default: English. */
    words?: Partial<RuleSummaryWords>;
    /** Leave the actions out of the sentence. */
    conditionsOnly?: boolean;
  } = {},
): string {
  const words = { ...DEFAULT_RULE_SUMMARY_WORDS, ...labels.words };
  const formatValue = (input: JsonValue | undefined) => input === undefined ? '' : ` ${JSON.stringify(input)}`;
  const formatGroup = (group: RuleGroup): string => group.conditions.map((node) => isRuleGroup(node)
    ? `(${formatGroup(node)})`
    : `${labels.fields?.[node.field] ?? node.field} ${labels.operators?.[node.operator] ?? node.operator}${formatValue(node.value)}`
  ).join(` ${group.combinator === 'or' ? words.or : words.and} `);
  const conditions = formatGroup(value.when) || words.noConditions;
  if (labels.conditionsOnly) return fillLabel(words.sentenceConditionsOnly, { conditions });
  const actions = value.then.map((action) => labels.actions?.[action.type] ?? action.type).join(', ');
  return fillLabel(words.sentence, { conditions, actions: actions || words.noActions });
}
