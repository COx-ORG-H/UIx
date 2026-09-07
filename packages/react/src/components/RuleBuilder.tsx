"use client";

import type { ReactNode } from 'react';
import { cx } from '../cx.js';
import type { JsonValue } from '../json-value.js';
import {
  appendRuleNode, isRuleGroup, mapRuleGroup, moveRuleNode, removeRuleNode,
  summarizeRule, validateRuleDefinition,
} from '../rule-builder-model.js';
import type { RuleAction, RuleCondition, RuleDefinition, RuleGroup, RuleValidationIssue } from '../rule-builder-model.js';

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

export interface RuleBuilderProps {
  value: RuleDefinition;
  onChange: (value: RuleDefinition) => void;
  fields: RuleFieldDefinition[];
  operators: RuleOperatorDefinition[];
  actions: RuleActionDefinition[];
  maxDepth?: number;
  readOnly?: boolean;
  validate?: (value: RuleDefinition) => RuleValidationIssue[];
  className?: string;
  addConditionLabel?: string;
  addGroupLabel?: string;
  addActionLabel?: string;
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
  labels: { addCondition: string; addGroup: string };
}

function RuleGroupEditor({ group, depth, root, fields, operators, maxDepth, disabled, onRootChange, labels }: GroupEditorProps) {
  const updateNode = (id: string, update: (node: RuleCondition | RuleGroup) => RuleCondition | RuleGroup) => onRootChange(mapRuleGroup(root, id, update));
  const addCondition = () => onRootChange(appendRuleNode(root, group.id, defaultCondition(fields, operators), maxDepth));
  const addGroup = () => onRootChange(appendRuleNode(root, group.id, {
    id: nextId('group'), combinator: 'and', conditions: [defaultCondition(fields, operators)],
  }, maxDepth));

  return <fieldset className="uix-rule-builder__group" data-depth={depth}>
    <legend className="uix-rule-builder__group-heading">
      <span>{depth === 1 ? 'When' : 'Group'}</span>
      <label>Match
        <select className="uix-select uix-select--sm" value={group.combinator} disabled={disabled} onChange={(event) => updateNode(group.id, (node) => ({ ...(node as RuleGroup), combinator: event.currentTarget.value as 'and' | 'or' }))}>
          <option value="and">all (AND)</option><option value="or">any (OR)</option>
        </select>
      </label>
    </legend>
    <div className="uix-rule-builder__rows">
      {group.conditions.map((node, index) => isRuleGroup(node)
        ? <div className="uix-rule-builder__nested" key={node.id}>
          <RuleGroupEditor {...{ group: node, depth: depth + 1, root, fields, operators, maxDepth, disabled, onRootChange, labels }} />
          <RowControls label="group" first={index === 0} last={index === group.conditions.length - 1} disabled={disabled} onUp={() => onRootChange(moveRuleNode(root, node.id, -1))} onDown={() => onRootChange(moveRuleNode(root, node.id, 1))} onRemove={() => onRootChange(removeRuleNode(root, node.id))} />
        </div>
        : <ConditionRow key={node.id} condition={node} fields={fields} operators={operators} disabled={disabled}
          onChange={(condition) => updateNode(node.id, () => condition)}
          controls={<RowControls label="condition" first={index === 0} last={index === group.conditions.length - 1} disabled={disabled} onUp={() => onRootChange(moveRuleNode(root, node.id, -1))} onDown={() => onRootChange(moveRuleNode(root, node.id, 1))} onRemove={() => onRootChange(removeRuleNode(root, node.id))} />}
        />)}
    </div>
    <div className="uix-rule-builder__add">
      <button type="button" className="uix-btn uix-btn--secondary uix-btn--sm" onClick={addCondition} disabled={disabled || fields.length === 0 || operators.length === 0}>{labels.addCondition}</button>
      <button type="button" className="uix-btn uix-btn--ghost uix-btn--sm" onClick={addGroup} disabled={disabled || depth >= maxDepth}>{labels.addGroup}</button>
    </div>
  </fieldset>;
}

function ConditionRow({ condition, fields, operators, disabled, onChange, controls }: {
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
    <label><span className="uix-visually-hidden">Field</span><select className="uix-select" value={condition.field} onChange={(event) => setField(event.currentTarget.value)} disabled={disabled}>{fields.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
    <label><span className="uix-visually-hidden">Operator</span><select className="uix-select" value={condition.operator} onChange={(event) => onChange({ ...condition, operator: event.currentTarget.value })} disabled={disabled}>{availableOperators.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
    {operator?.requiresValue !== false && <div className="uix-rule-builder__value">
      {field?.renderValueEditor?.({ condition, onChange: (value) => onChange({ ...condition, value }), disabled }) ?? <input className="uix-input" value={typeof condition.value === 'string' || typeof condition.value === 'number' ? condition.value : condition.value == null ? '' : JSON.stringify(condition.value)} onChange={(event) => onChange({ ...condition, value: event.currentTarget.value })} disabled={disabled} aria-label={`Value for ${field?.label ?? 'condition'}`} />}
    </div>}
    {controls}
  </div>;
}

function RowControls({ label, first, last, disabled, onUp, onDown, onRemove }: { label: string; first: boolean; last: boolean; disabled: boolean; onUp: () => void; onDown: () => void; onRemove: () => void }) {
  return <span className="uix-rule-builder__row-actions">
    <button type="button" className="uix-btn uix-btn--ghost uix-btn--sm" onClick={onUp} disabled={disabled || first} aria-label={`Move ${label} up`}>Up</button>
    <button type="button" className="uix-btn uix-btn--ghost uix-btn--sm" onClick={onDown} disabled={disabled || last} aria-label={`Move ${label} down`}>Down</button>
    <button type="button" className="uix-btn uix-btn--ghost uix-btn--sm" onClick={onRemove} disabled={disabled} aria-label={`Remove ${label}`}>Remove</button>
  </span>;
}

/** Declarative controlled when-conditions-to-actions editor with bounded nesting. */
export function RuleBuilder({
  value, onChange, fields, operators, actions, maxDepth = 3, readOnly = false, validate,
  className, addConditionLabel = 'Add condition', addGroupLabel = 'Add group', addActionLabel = 'Add action',
}: RuleBuilderProps) {
  const issues = [...validateRuleDefinition(value, maxDepth), ...(validate?.(value) ?? [])];
  const fieldLabels = Object.fromEntries(fields.map((field) => [field.id, field.label]));
  const operatorLabels = Object.fromEntries(operators.map((operator) => [operator.id, operator.label]));
  const actionLabels = Object.fromEntries(actions.map((action) => [action.id, action.label]));

  if (readOnly) return <section className={cx('uix-rule-builder uix-rule-builder--summary', className)} aria-label="Rule summary"><p>{summarizeRule(value, { fields: fieldLabels, operators: operatorLabels, actions: actionLabels })}</p>{issues.length > 0 && <p className="uix-rule-builder__invalid">Rule has {issues.length} validation issue{issues.length === 1 ? '' : 's'}.</p>}</section>;

  const updateActions = (next: RuleAction[]) => onChange({ ...value, then: next });
  return <section className={cx('uix-rule-builder', className)} aria-label="Rule builder">
    <RuleGroupEditor group={value.when} depth={1} root={value.when} fields={fields} operators={operators} maxDepth={maxDepth} disabled={readOnly} onRootChange={(when) => onChange({ ...value, when })} labels={{ addCondition: addConditionLabel, addGroup: addGroupLabel }} />
    <fieldset className="uix-rule-builder__actions"><legend>Then</legend>
      {value.then.map((action, index) => {
        const definition = actions.find((item) => item.id === action.type);
        return <div className="uix-rule-builder__action" key={action.id}>
          <select className="uix-select" value={action.type} onChange={(event) => updateActions(value.then.map((item) => item.id === action.id ? { ...item, type: event.currentTarget.value } : item))} aria-label="Action type">{actions.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select>
          {definition?.renderParameters?.(action, (parameters) => updateActions(value.then.map((item) => item.id === action.id ? { ...item, parameters } : item)), false)}
          <RowControls label="action" first={index === 0} last={index === value.then.length - 1} disabled={false}
            onUp={() => { const next = [...value.then]; [next[index - 1], next[index]] = [next[index]!, next[index - 1]!]; updateActions(next); }}
            onDown={() => { const next = [...value.then]; [next[index + 1], next[index]] = [next[index]!, next[index + 1]!]; updateActions(next); }}
            onRemove={() => updateActions(value.then.filter((item) => item.id !== action.id))} />
        </div>;
      })}
      <button type="button" className="uix-btn uix-btn--secondary uix-btn--sm" disabled={actions.length === 0} onClick={() => updateActions([...value.then, { id: nextId('action'), type: actions[0]?.id ?? '', parameters: {} }])}>{addActionLabel}</button>
    </fieldset>
    <div className="uix-rule-builder__validation" aria-live="polite">
      {issues.length === 0 ? <span>Rule is valid.</span> : <><strong>{issues.length} validation issue{issues.length === 1 ? '' : 's'}</strong><ul>{issues.map((issue, index) => <li key={`${issue.path}-${index}`}>{issue.message}</li>)}</ul></>}
    </div>
  </section>;
}
