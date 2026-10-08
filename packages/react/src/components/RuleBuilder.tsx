"use client";

import type { ReactNode } from 'react';
import { cx } from '../cx.js';
import type { JsonValue } from '../json-value.js';
import {
  appendRuleNode, isRuleGroup, mapRuleGroup, moveRuleNode, removeRuleNode, setRuleCombinator,
  summarizeRule, validateRuleDefinition,
} from '../rule-builder-model.js';
import type { RuleAction, RuleCheck, RuleCondition, RuleDefinition, RuleGroup, RuleValidationIssue } from '../rule-builder-model.js';
import { fillLabel } from '../fill-label.js';
import { useUixLabels } from '../labels-context.js';

export interface RuleValueEditorProps {
  condition: RuleCondition;
  onChange: (value: JsonValue | undefined) => void;
  disabled?: boolean;
}

export interface RuleFieldDefinition {
  id: string;
  label: string;
  description?: string;
  operators?: string[];
  renderValueEditor?: (props: RuleValueEditorProps) => ReactNode;
}

export interface RuleOperatorDefinition {
  id: string;
  label: string;
  requiresValue?: boolean;
}

export interface RuleActionDefinition {
  id: string;
  label: string;
  renderParameters?: (action: RuleAction, onChange: (parameters: Record<string, JsonValue>) => void, disabled: boolean) => ReactNode;
}

/**
 * Every word the rule builder renders (TENSOR RX-125, UIX-12). `{item}` is one of
 * `itemGroup` / `itemCondition` / `itemAction`; `{field}` a field label; `{count}` a number.
 * The `issue…` keys are the built-in validation messages (`{id}` the duplicated id, `{max}`
 * the depth limit) and the `summary…` / `and` / `or` keys the words of the
 * `readOnly="summary"` sentence (HAR-1618). Translate once for a subtree with
 * `UixLabelsProvider labels={{ ruleBuilder: … }}`.
 */
export interface RuleBuilderLabels {
  region: string;
  summary: string;
  when: string;
  group: string;
  match: string;
  all: string;
  any: string;
  field: string;
  operator: string;
  valueFor: string;
  itemGroup: string;
  itemCondition: string;
  itemAction: string;
  moveUp: string;
  moveUpNamed: string;
  moveDown: string;
  moveDownNamed: string;
  remove: string;
  removeNamed: string;
  then: string;
  actionType: string;
  valid: string;
  issuesOne: string;
  issuesMany: string;
  summaryIssuesOne: string;
  summaryIssuesMany: string;
  addCondition: string;
  addGroup: string;
  addAction: string;
  issueDuplicateId: string;
  issueMaxDepth: string;
  issueEmptyGroup: string;
  issueMissingField: string;
  issueMissingOperator: string;
  issueNoActions: string;
  issueMissingActionType: string;
  summarySentence: string;
  summarySentenceConditionsOnly: string;
  summaryNoConditions: string;
  summaryNoActions: string;
  and: string;
  or: string;
}

export const DEFAULT_RULE_BUILDER_LABELS: RuleBuilderLabels = {
  region: 'Rule builder',
  summary: 'Rule summary',
  when: 'When',
  group: 'Group',
  match: 'Match',
  all: 'all (AND)',
  any: 'any (OR)',
  field: 'Field',
  operator: 'Operator',
  valueFor: 'Value for {field}',
  itemGroup: 'group',
  itemCondition: 'condition',
  itemAction: 'action',
  moveUp: 'Up',
  moveUpNamed: 'Move {item} up',
  moveDown: 'Down',
  moveDownNamed: 'Move {item} down',
  remove: 'Remove',
  removeNamed: 'Remove {item}',
  then: 'Then',
  actionType: 'Action type',
  valid: 'Rule is valid.',
  issuesOne: '{count} validation issue',
  issuesMany: '{count} validation issues',
  summaryIssuesOne: 'Rule has {count} validation issue.',
  summaryIssuesMany: 'Rule has {count} validation issues.',
  addCondition: 'Add condition',
  addGroup: 'Add group',
  addAction: 'Add action',
  issueDuplicateId: 'Duplicate id “{id}”.',
  issueMaxDepth: 'Nesting exceeds {max} levels.',
  issueEmptyGroup: 'Add at least one condition.',
  issueMissingField: 'Choose a field.',
  issueMissingOperator: 'Choose an operator.',
  issueNoActions: 'Add at least one action.',
  issueMissingActionType: 'Choose an action.',
  summarySentence: 'When {conditions}, then {actions}.',
  summarySentenceConditionsOnly: 'When {conditions}.',
  summaryNoConditions: 'no conditions',
  summaryNoActions: 'no actions',
  and: 'AND',
  or: 'OR',
};

export interface RuleBuilderProps {
  value: RuleDefinition;
  onChange: (value: RuleDefinition) => void;
  fields: RuleFieldDefinition[];
  operators: RuleOperatorDefinition[];
  /** The action types of the "Then" block. Not needed with `conditionsOnly`. */
  actions?: RuleActionDefinition[];
  maxDepth?: number;
  /**
   * `true`: the same builder with every control disabled and no add, move or remove buttons.
   * `'summary'`: one sentence instead of the controls (what `readOnly` rendered up to 2.31.0;
   * its words are the `summary…`, `and` and `or` labels).
   */
  readOnly?: boolean | 'summary';
  /**
   * Edit conditions only (HAR-1618): no "Then" block and no "Add action", and the two action
   * checks (`noActions`, `missingActionType`) are off. `value.then` is passed through untouched.
   */
  conditionsOnly?: boolean;
  /**
   * Fix every group to this combinator, for a stored shape that is a flat AND-list. The Match
   * choice becomes plain text ("Match all (AND)"), new groups get this combinator, and every
   * `onChange` carries it on all groups, so the other value is never emitted.
   */
  combinator?: 'and' | 'or';
  /** Hide the Match control (and its text when `combinator` fixes it). */
  hideCombinator?: boolean;
  /**
   * `false` hides "Add group". It is hidden as well when `maxDepth` is 1, where it could never
   * be used. Default `true`.
   */
  allowGroups?: boolean;
  /**
   * Turn built-in checks off: `{ emptyGroup: false }` for a rule that may have no condition
   * (a catch-all), `{ noActions: false }` for a rule that may do nothing. Their messages are
   * the `issue…` labels.
   */
  checks?: Partial<Record<RuleCheck, boolean>>;
  /** Extra issues; they are appended to the built-in ones. */
  validate?: (value: RuleDefinition) => RuleValidationIssue[];
  className?: string;
  /** @deprecated use `labels.addCondition` */
  addConditionLabel?: string;
  /** @deprecated use `labels.addGroup` */
  addGroupLabel?: string;
  /** @deprecated use `labels.addAction` */
  addActionLabel?: string;
  labels?: Partial<RuleBuilderLabels>;
}

let ruleId = 0;
const nextId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(++ruleId).toString(36)}`;

function defaultCondition(fields: RuleFieldDefinition[], operators: RuleOperatorDefinition[]): RuleCondition {
  const field = fields[0];
  const operator = operators.find((item) => field?.operators?.includes(item.id)) ?? operators[0];
  return { id: nextId('condition'), field: field?.id ?? '', operator: operator?.id ?? '', value: '' };
}

interface GroupEditorProps {
  group: RuleGroup;
  depth: number;
  root: RuleGroup;
  fields: RuleFieldDefinition[];
  operators: RuleOperatorDefinition[];
  maxDepth: number;
  disabled: boolean;
  onRootChange: (group: RuleGroup) => void;
  labels: RuleBuilderLabels;
  /** Set when the combinator is fixed. */
  combinator: 'and' | 'or' | undefined;
  hideCombinator: boolean;
  allowGroups: boolean;
}

function RuleGroupEditor({ group, depth, root, fields, operators, maxDepth, disabled, onRootChange, labels, combinator, hideCombinator, allowGroups }: GroupEditorProps) {
  const updateNode = (id: string, update: (node: RuleCondition | RuleGroup) => RuleCondition | RuleGroup) => onRootChange(mapRuleGroup(root, id, update));
  const addCondition = () => onRootChange(appendRuleNode(root, group.id, defaultCondition(fields, operators), maxDepth));
  const addGroup = () => onRootChange(appendRuleNode(root, group.id, {
    id: nextId('group'), combinator: combinator ?? 'and', conditions: [defaultCondition(fields, operators)],
  }, maxDepth));
  const rowControls = (node: RuleCondition | RuleGroup, index: number, label: string) => (disabled ? null : (
    <RowControls labels={labels} label={label} first={index === 0} last={index === group.conditions.length - 1} disabled={false}
      onUp={() => onRootChange(moveRuleNode(root, node.id, -1))} onDown={() => onRootChange(moveRuleNode(root, node.id, 1))} onRemove={() => onRootChange(removeRuleNode(root, node.id))} />
  ));

  return <fieldset className="uix-rule-builder__group" data-depth={depth}>
    <legend className="uix-rule-builder__group-heading">
      <span>{depth === 1 ? labels.when : labels.group}</span>
      {!hideCombinator && (combinator
        ? <span className="uix-rule-builder__match">{labels.match} {combinator === 'or' ? labels.any : labels.all}</span>
        : <label>{labels.match}
          <select className="uix-select uix-select--sm" value={group.combinator} disabled={disabled} onChange={(event) => updateNode(group.id, (node) => ({ ...(node as RuleGroup), combinator: event.currentTarget.value as 'and' | 'or' }))}>
            <option value="and">{labels.all}</option><option value="or">{labels.any}</option>
          </select>
        </label>)}
    </legend>
    <div className="uix-rule-builder__rows">
      {group.conditions.map((node, index) => isRuleGroup(node)
        ? <div className="uix-rule-builder__nested" key={node.id}>
          <RuleGroupEditor {...{ group: node, depth: depth + 1, root, fields, operators, maxDepth, disabled, onRootChange, labels, combinator, hideCombinator, allowGroups }} />
          {rowControls(node, index, labels.itemGroup)}
        </div>
        : <ConditionRow key={node.id} labels={labels} condition={node} fields={fields} operators={operators} disabled={disabled}
          onChange={(condition) => updateNode(node.id, () => condition)}
          controls={rowControls(node, index, labels.itemCondition)}
        />)}
    </div>
    {/* Read-only: nothing can be added, so the buttons are left out rather than shown disabled. */}
    {!disabled && <div className="uix-rule-builder__add">
      <button type="button" className="uix-btn uix-btn--secondary uix-btn--sm" onClick={addCondition} disabled={fields.length === 0 || operators.length === 0}>{labels.addCondition}</button>
      {allowGroups && <button type="button" className="uix-btn uix-btn--ghost uix-btn--sm" onClick={addGroup} disabled={depth >= maxDepth}>{labels.addGroup}</button>}
    </div>}
  </fieldset>;
}

function ConditionRow({ labels, condition, fields, operators, disabled, onChange, controls }: {
  labels: RuleBuilderLabels;
  condition: RuleCondition;
  fields: RuleFieldDefinition[];
  operators: RuleOperatorDefinition[];
  disabled: boolean;
  onChange: (condition: RuleCondition) => void;
  controls: ReactNode;
}) {
  const field = fields.find((item) => item.id === condition.field);
  const availableOperators = field?.operators?.length ? operators.filter((item) => field.operators!.includes(item.id)) : operators;
  const operator = operators.find((item) => item.id === condition.operator);
  const setField = (id: string) => {
    const nextField = fields.find((item) => item.id === id);
    const nextOperator = operators.find((item) => nextField?.operators?.includes(item.id)) ?? availableOperators[0] ?? operators[0];
    onChange({ ...condition, field: id, operator: nextOperator?.id ?? '' });
  };
  return <div className="uix-rule-builder__condition">
    <label><span className="uix-visually-hidden">{labels.field}</span><select className="uix-select" value={condition.field} onChange={(event) => setField(event.currentTarget.value)} disabled={disabled}>{fields.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
    <label><span className="uix-visually-hidden">{labels.operator}</span><select className="uix-select" value={condition.operator} onChange={(event) => onChange({ ...condition, operator: event.currentTarget.value })} disabled={disabled}>{availableOperators.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
    {operator?.requiresValue !== false && <div className="uix-rule-builder__value">
      {field?.renderValueEditor?.({ condition, onChange: (value) => onChange({ ...condition, value }), disabled }) ?? <input className="uix-input" value={typeof condition.value === 'string' || typeof condition.value === 'number' ? condition.value : condition.value == null ? '' : JSON.stringify(condition.value)} onChange={(event) => onChange({ ...condition, value: event.currentTarget.value })} disabled={disabled} aria-label={fillLabel(labels.valueFor, { field: field?.label ?? labels.itemCondition })} />}
    </div>}
    {controls}
  </div>;
}

function RowControls({ labels, label, first, last, disabled, onUp, onDown, onRemove }: { labels: RuleBuilderLabels; label: string; first: boolean; last: boolean; disabled: boolean; onUp: () => void; onDown: () => void; onRemove: () => void }) {
  return <span className="uix-rule-builder__row-actions">
    <button type="button" className="uix-btn uix-btn--ghost uix-btn--sm" onClick={onUp} disabled={disabled || first} aria-label={fillLabel(labels.moveUpNamed, { item: label })}>{labels.moveUp}</button>
    <button type="button" className="uix-btn uix-btn--ghost uix-btn--sm" onClick={onDown} disabled={disabled || last} aria-label={fillLabel(labels.moveDownNamed, { item: label })}>{labels.moveDown}</button>
    <button type="button" className="uix-btn uix-btn--ghost uix-btn--sm" onClick={onRemove} disabled={disabled} aria-label={fillLabel(labels.removeNamed, { item: label })}>{labels.remove}</button>
  </span>;
}

/** Declarative controlled when-conditions-to-actions editor with bounded nesting. */
export function RuleBuilder({
  value, onChange, fields, operators, actions = [], maxDepth = 3, readOnly = false, conditionsOnly = false,
  combinator, hideCombinator = false, allowGroups = true, checks, validate,
  className, addConditionLabel, addGroupLabel, addActionLabel, labels: labelOverrides,
}: RuleBuilderProps) {
  const provided = useUixLabels().ruleBuilder;
  const labels: RuleBuilderLabels = {
    ...DEFAULT_RULE_BUILDER_LABELS,
    ...provided,
    ...(addConditionLabel != null ? { addCondition: addConditionLabel } : {}),
    ...(addGroupLabel != null ? { addGroup: addGroupLabel } : {}),
    ...(addActionLabel != null ? { addAction: addActionLabel } : {}),
    ...labelOverrides,
  };
  const issuesText = (template1: string, templateN: string) =>
    fillLabel(issues.length === 1 ? template1 : templateN, { count: issues.length });
  const builtIn = validateRuleDefinition(value, maxDepth, {
    messages: {
      duplicateId: labels.issueDuplicateId,
      maxDepth: labels.issueMaxDepth,
      emptyGroup: labels.issueEmptyGroup,
      missingField: labels.issueMissingField,
      missingOperator: labels.issueMissingOperator,
      noActions: labels.issueNoActions,
      missingActionType: labels.issueMissingActionType,
    },
    checks: conditionsOnly ? { noActions: false, missingActionType: false, ...checks } : checks,
  });
  const issues = [...builtIn, ...(validate?.(value) ?? [])];
  const fieldLabels = Object.fromEntries(fields.map((field) => [field.id, field.label]));
  const operatorLabels = Object.fromEntries(operators.map((operator) => [operator.id, operator.label]));
  const actionLabels = Object.fromEntries(actions.map((action) => [action.id, action.label]));

  if (readOnly === 'summary') {
    const sentence = summarizeRule(value, {
      fields: fieldLabels, operators: operatorLabels, actions: actionLabels, conditionsOnly,
      words: {
        sentence: labels.summarySentence, sentenceConditionsOnly: labels.summarySentenceConditionsOnly,
        noConditions: labels.summaryNoConditions, noActions: labels.summaryNoActions, and: labels.and, or: labels.or,
      },
    });
    return <section className={cx('uix-rule-builder uix-rule-builder--summary', className)} aria-label={labels.summary}><p>{sentence}</p>{issues.length > 0 && <p className="uix-rule-builder__invalid">{issuesText(labels.summaryIssuesOne, labels.summaryIssuesMany)}</p>}</section>;
  }

  const disabled = readOnly === true;
  const emitWhen = (when: RuleGroup) => onChange({ ...value, when: combinator ? setRuleCombinator(when, combinator) : when });
  const updateActions = (next: RuleAction[]) => onChange({ ...value, then: next });
  return <section className={cx('uix-rule-builder', disabled && 'uix-rule-builder--readonly', className)} aria-label={labels.region}>
    <RuleGroupEditor group={value.when} depth={1} root={value.when} fields={fields} operators={operators} maxDepth={maxDepth} disabled={disabled} onRootChange={emitWhen} labels={labels}
      combinator={combinator} hideCombinator={hideCombinator} allowGroups={allowGroups && maxDepth > 1} />
    {!conditionsOnly && <fieldset className="uix-rule-builder__actions"><legend>{labels.then}</legend>
      {value.then.map((action, index) => {
        const definition = actions.find((item) => item.id === action.type);
        return <div className="uix-rule-builder__action" key={action.id}>
          <select className="uix-select" value={action.type} disabled={disabled} onChange={(event) => updateActions(value.then.map((item) => item.id === action.id ? { ...item, type: event.currentTarget.value } : item))} aria-label={labels.actionType}>{actions.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select>
          {definition?.renderParameters?.(action, (parameters) => updateActions(value.then.map((item) => item.id === action.id ? { ...item, parameters } : item)), disabled)}
          {!disabled && <RowControls labels={labels} label={labels.itemAction} first={index === 0} last={index === value.then.length - 1} disabled={false}
            onUp={() => { const next = [...value.then]; [next[index - 1], next[index]] = [next[index]!, next[index - 1]!]; updateActions(next); }}
            onDown={() => { const next = [...value.then]; [next[index + 1], next[index]] = [next[index]!, next[index + 1]!]; updateActions(next); }}
            onRemove={() => updateActions(value.then.filter((item) => item.id !== action.id))} />}
        </div>;
      })}
      {!disabled && <button type="button" className="uix-btn uix-btn--secondary uix-btn--sm" disabled={actions.length === 0} onClick={() => updateActions([...value.then, { id: nextId('action'), type: actions[0]?.id ?? '', parameters: {} }])}>{labels.addAction}</button>}
    </fieldset>}
    <div className="uix-rule-builder__validation" aria-live="polite">
      {issues.length === 0 ? <span>{labels.valid}</span> : <><strong>{issuesText(labels.issuesOne, labels.issuesMany)}</strong><ul>{issues.map((issue, index) => <li key={`${issue.path}-${index}`}>{issue.message}</li>)}</ul></>}
    </div>
  </section>;
}
