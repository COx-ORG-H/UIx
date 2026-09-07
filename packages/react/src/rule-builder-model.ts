import type { JsonValue } from './json-value.js';

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

export interface RuleValidationIssue {
  path: string;
  message: string;
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

export function validateRuleDefinition(value: RuleDefinition, maxDepth = 3): RuleValidationIssue[] {
  const issues: RuleValidationIssue[] = [];
  const ids = new Set<string>();
  const visit = (group: RuleGroup, path: string, depth: number) => {
    if (ids.has(group.id)) issues.push({ path, message: `Duplicate id “${group.id}”.` });
    ids.add(group.id);
    if (depth > maxDepth) issues.push({ path, message: `Nesting exceeds ${maxDepth} levels.` });
    if (group.conditions.length === 0) issues.push({ path, message: 'Add at least one condition.' });
    group.conditions.forEach((node, index) => {
      const nodePath = `${path}.conditions[${index}]`;
      if (ids.has(node.id)) issues.push({ path: nodePath, message: `Duplicate id “${node.id}”.` });
      if (isRuleGroup(node)) visit(node, nodePath, depth + 1);
      else {
        ids.add(node.id);
        if (!node.field) issues.push({ path: nodePath, message: 'Choose a field.' });
        if (!node.operator) issues.push({ path: nodePath, message: 'Choose an operator.' });
      }
    });
  };
  visit(value.when, 'when', 1);
  if (value.then.length === 0) issues.push({ path: 'then', message: 'Add at least one action.' });
  value.then.forEach((action, index) => {
    if (ids.has(action.id)) issues.push({ path: `then[${index}]`, message: `Duplicate id “${action.id}”.` });
    ids.add(action.id);
    if (!action.type) issues.push({ path: `then[${index}]`, message: 'Choose an action.' });
  });
  return issues;
}

export function summarizeRule(
  value: RuleDefinition,
  labels: { fields?: Record<string, string>; operators?: Record<string, string>; actions?: Record<string, string> } = {},
): string {
  const formatValue = (input: JsonValue | undefined) => input === undefined ? '' : ` ${JSON.stringify(input)}`;
  const formatGroup = (group: RuleGroup): string => group.conditions.map((node) => isRuleGroup(node)
    ? `(${formatGroup(node)})`
    : `${labels.fields?.[node.field] ?? node.field} ${labels.operators?.[node.operator] ?? node.operator}${formatValue(node.value)}`
  ).join(` ${group.combinator.toUpperCase()} `);
  const actions = value.then.map((action) => labels.actions?.[action.type] ?? action.type).join(', ');
  return `When ${formatGroup(value.when) || 'no conditions'}, then ${actions || 'no actions'}.`;
}
