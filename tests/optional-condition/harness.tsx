import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { RuleBuilder, type RuleDefinition } from '../../packages/react/src/index.js';
import { OPTIONAL_RULE_LABELS } from '../../packages/tokens/docs/rule-builder-labels.js';

const empty: RuleDefinition = { when: { id: 'root', combinator: 'and', conditions: [] }, then: [] };
const one: RuleDefinition = { ...empty, when: { ...empty.when, conditions: [{ id: 'first', field: 'priority', operator: 'eq', value: 'P1' }] } };
const two: RuleDefinition = { ...empty, when: { ...empty.when, conditions: [...one.when.conditions, { id: 'second', field: 'service', operator: 'ne', value: 'E-Mail' }] } };
const fields = [{ id: 'priority', label: 'Priorität' }, { id: 'service', label: 'Dienst' }];
const operators = [{ id: 'eq', label: 'ist' }, { id: 'ne', label: 'ist nicht' }];
declare global { interface Window { __optionalRules: Record<string, RuleDefinition[]> } }
window.__optionalRules = {};

function Example({ id, title, initial, limit, readOnly = false }: { id: string; title: string; initial: RuleDefinition; limit?: number; readOnly?: boolean }) {
  const [value, setValue] = useState(initial);
  return <section data-example={id}>
    <h2>{title}</h2>
    <RuleBuilder value={value} onChange={(next) => { (window.__optionalRules[id] ??= []).push(next); setValue(next); }}
      fields={fields} operators={operators} maxConditions={limit} conditionsOnly combinator="and" hideCombinator allowGroups={false} maxDepth={1}
      checks={{ emptyGroup: false }} labels={OPTIONAL_RULE_LABELS} readOnly={readOnly} />
    <output>Bedingungen: {value.when.conditions.length}</output>
  </section>;
}
createRoot(document.getElementById('root')!).render(<StrictMode>
  <h1>Optionale Bedingung</h1>
  <p>Ohne Bedingung gilt die Regel immer. Eine Bedingung lässt sich bearbeiten und entfernen.</p>
  <Example id="optional" title="Höchstens eine Bedingung" initial={empty} limit={1} />
  <Example id="over-limit" title="Vorhandene Bedingungen bleiben erhalten" initial={two} limit={1} />
  <Example id="read-only" title="Schreibgeschützte Regel" initial={one} limit={1} readOnly />
  <Example id="default" title="Mehrere Bedingungen ohne Begrenzung" initial={empty} />
</StrictMode>);
