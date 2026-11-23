import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Avatar, Input, RuleBuilder, type RuleDefinition } from '../../packages/react/src/index.js';
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
  return <section data-example={id} style={id === 'constrained' || id === 'mid-width' ? { width: id === 'constrained' ? '26rem' : '45.5rem', maxWidth: '100%' } : undefined}>
    <h2>{title}</h2>
    <RuleBuilder value={value} onChange={(next) => { (window.__optionalRules[id] ??= []).push(next); setValue(next); }}
      fields={fields} operators={operators} maxConditions={limit} conditionsOnly combinator="and" hideCombinator allowGroups={false} maxDepth={1}
      checks={{ emptyGroup: false }} labels={OPTIONAL_RULE_LABELS} readOnly={readOnly} />
    <output>Bedingungen: {value.when.conditions.length}</output>
  </section>;
}
function ConstrainedActions() {
  const [value, setValue] = useState<RuleDefinition>({
    when: { id: 'nested-root', combinator: 'and', conditions: [{ id: 'group', combinator: 'and', conditions: one.when.conditions }] },
    then: [{ id: 'notify', type: 'notify', parameters: { message: 'Prüfung' } }],
  });
  return <section data-example="constrained-actions" style={{ width: '26rem', maxWidth: '100%' }}>
    <h2>Verschachtelte Regel mit Aktion</h2>
    <RuleBuilder value={value} onChange={setValue} fields={fields} operators={operators} labels={OPTIONAL_RULE_LABELS}
      actions={[{ id: 'notify', label: 'Benachrichtigung senden', renderParameters: (action, change) =>
        <Input aria-label="Nachricht" value={String(action.parameters.message)} onChange={event => change({ message: event.target.value })} /> }]} />
  </section>;
}
function IntrinsicExample() {
  const [value, setValue] = useState(one);
  return <section data-example="intrinsic">
    <h2>Regel neben Avatar</h2>
    <div style={{ display: 'flex', gap: 'var(--uix-space-2)', alignItems: 'start' }}>
      <Avatar size={24}>AM</Avatar>
      <RuleBuilder value={value} onChange={setValue} fields={fields} operators={operators} labels={OPTIONAL_RULE_LABELS}
        maxConditions={1} conditionsOnly hideCombinator allowGroups={false} />
    </div>
  </section>;
}
function PhoneRules() {
  const [value, setValue] = useState<RuleDefinition>({
    when: { id: 'phone', combinator: 'and', conditions: [{ id: 'device', field: 'device', operator: 'eq', value: 'Ja' }] },
    then: [],
  });
  return <section data-example="phone-labels">
    <h2>Regel für ein Gerät</h2>
    <RuleBuilder value={value} onChange={setValue}
      fields={[{ id: 'device', label: 'Ersatz für ein bestehendes Gerät' }]}
      operators={operators} conditionsOnly
      labels={{ ...OPTIONAL_RULE_LABELS, match: 'Zutreffen müssen', all: 'alle Bedingungen (UND)' }} />
  </section>;
}
createRoot(document.getElementById('root')!).render(<StrictMode>
  <h1>Optionale Bedingung</h1>
  <p>Ohne Bedingung gilt die Regel immer. Eine Bedingung lässt sich bearbeiten und entfernen.</p>
  <Example id="optional" title="Höchstens eine Bedingung" initial={empty} limit={1} />
  <Example id="over-limit" title="Vorhandene Bedingungen bleiben erhalten" initial={two} limit={1} />
  <Example id="read-only" title="Schreibgeschützte Regel" initial={one} limit={1} readOnly />
  <Example id="default" title="Mehrere Bedingungen ohne Begrenzung" initial={empty} />
  <Example id="constrained" title="Bedingung im schmalen Bereich" initial={one} limit={1} />
  <Example id="mid-width" title="Regel mit ausreichend Platz" initial={one} limit={1} />
  <ConstrainedActions />
  <IntrinsicExample />
  <PhoneRules />
</StrictMode>);
