/* RuleBuilder for a stored rule shape that is a flat AND-list of conditions (HAR-1618), in jsdom.
 *
 * TENSOR's rule and event-grouping pages store `ConditionSchema[]`: AND only, no nesting, and
 * event grouping has no actions. A probe that overrode all 29 labels still found English on
 * screen and controls the schema cannot hold:
 *   1. the built-in validation messages were hard-coded English and always shown — they are
 *      labels now, and each built-in check can be turned off;
 *   2. the "Then" block and "Add action" always rendered — `conditionsOnly`;
 *   3. the all/any choice could not be locked or hidden — `combinator`, `hideCombinator`;
 *   4. "Add group" stayed on screen, disabled, at `maxDepth={1}` — `allowGroups`;
 *   5. `readOnly` rendered an English sentence — it is the builder with its controls disabled;
 *      the sentence is `readOnly="summary"` and its words are labels.
 * The model half (codes, message overrides, setRuleCombinator, summary words) is in
 * rule-builder-model.test.mjs. Renders the BUILT dist — run `npm run build` first.
 */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement as h, act, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

let dom;
let createRoot;
let ui;

const EXPOSED = ['window', 'document', 'navigator', 'Event', 'IS_REACT_ACT_ENVIRONMENT'];
const expose = (name, value) => Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });

before(async () => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true });
  expose('window', dom.window);
  expose('document', dom.window.document);
  expose('navigator', dom.window.navigator);
  expose('Event', dom.window.Event);
  expose('IS_REACT_ACT_ENVIRONMENT', true);
  ({ createRoot } = await import('react-dom/client'));
  ui = await import('../dist/index.js');
});

after(() => {
  dom.window.close();
  for (const name of EXPOSED) delete globalThis[name];
});

const FIELDS = [{ id: 'priority', label: 'Priorität' }, { id: 'service', label: 'Dienst' }];
const OPERATORS = [{ id: 'eq', label: 'ist' }, { id: 'ne', label: 'ist nicht' }];
const ACTIONS = [{ id: 'notify', label: 'Benachrichtigen' }];
const EMPTY = { when: { id: 'root', combinator: 'and', conditions: [] }, then: [] };
const TWO = {
  when: { id: 'root', combinator: 'and', conditions: [
    { id: 'c1', field: 'priority', operator: 'eq', value: 'P1' },
    { id: 'c2', field: 'service', operator: 'ne', value: 'mail' },
  ] },
  then: [],
};

/** Every key of the label set, in German (the count templates keep their placeholders). */
const GERMAN = {
  region: 'Regel-Editor', summary: 'Regelübersicht', when: 'Wenn', group: 'Gruppe', match: 'Treffer bei', all: 'allen (UND)', any: 'einer (ODER)',
  field: 'Feld', operator: 'Vergleich', valueFor: 'Wert für {field}', itemGroup: 'Gruppe', itemCondition: 'Bedingung', itemAction: 'Aktion',
  moveUp: 'Hoch', moveUpNamed: '{item} nach oben', moveDown: 'Runter', moveDownNamed: '{item} nach unten', remove: 'Entfernen', removeNamed: '{item} entfernen',
  then: 'Dann', actionType: 'Aktionstyp', valid: 'Die Regel ist gültig.', issuesOne: '{count} Prüfhinweis', issuesMany: '{count} Prüfhinweise',
  summaryIssuesOne: 'Die Regel hat {count} Prüfhinweis.', summaryIssuesMany: 'Die Regel hat {count} Prüfhinweise.',
  addCondition: 'Bedingung hinzufügen', addGroup: 'Gruppe hinzufügen', addAction: 'Aktion hinzufügen',
  issueDuplicateId: 'Doppelte Kennung „{id}“.', issueMaxDepth: 'Mehr als {max} Ebenen.', issueEmptyGroup: 'Mindestens eine Bedingung hinzufügen.',
  issueMissingField: 'Feld wählen.', issueMissingOperator: 'Vergleich wählen.', issueNoActions: 'Mindestens eine Aktion hinzufügen.', issueMissingActionType: 'Aktion wählen.',
  summarySentence: 'Wenn {conditions}, dann {actions}.', summarySentenceConditionsOnly: 'Wenn {conditions}.',
  summaryNoConditions: 'keine Bedingungen', summaryNoActions: 'keine Aktionen', and: 'UND', or: 'ODER',
};

/** Every English word the builder can render by itself: its default labels, split into words. */
const englishWords = () => {
  const words = new Set();
  for (const text of Object.values(ui.DEFAULT_RULE_BUILDER_LABELS)) {
    for (const word of text.replace(/\{\w+\}/g, ' ').split(/[^A-Za-z]+/)) if (word.length > 2) words.add(word.toLowerCase());
  }
  return words;
};
/** All text a person or a screen reader gets from `root`: text nodes, aria-labels, option text. */
const allText = (root) => [root.textContent, ...[...root.querySelectorAll('[aria-label]')].map((el) => el.getAttribute('aria-label')), root.getAttribute?.('aria-label') ?? ''].join(' ');
const english = (root) => {
  const known = englishWords();
  return [...new Set(allText(root).split(/[^A-Za-zÄÖÜäöüß]+/).map((w) => w.toLowerCase()).filter((w) => known.has(w)))];
};

function mount(props, initial = EMPTY) {
  const emitted = [];
  function Controlled() {
    const [value, setValue] = useState(initial);
    return h(ui.RuleBuilder, { fields: FIELDS, operators: OPERATORS, value, onChange: (next) => { emitted.push(next); setValue(next); }, ...props });
  }
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(h(Controlled)));
  return { host, emitted, cleanup: () => { act(() => root.unmount()); host.remove(); } };
}
const click = (el) => act(() => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true })));
const button = (host, text) => [...host.querySelectorAll('button')].find((b) => b.textContent === text);
const change = (select, value) => act(() => {
  Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(select, value);
  select.dispatchEvent(new window.Event('change', { bubbles: true }));
});

test('the acceptance case: every label German, conditions only, AND only, catch-all allowed — no English and no dead control', () => {
  const t = mount({ labels: GERMAN, conditionsOnly: true, combinator: 'and', allowGroups: false, maxDepth: 1, checks: { emptyGroup: false } });
  const builder = t.host.querySelector('.uix-rule-builder');
  assert.equal(builder.getAttribute('aria-label'), 'Regel-Editor');

  // the default new state: a catch-all rule, no conditions
  assert.deepEqual(english(builder), [], 'no English word on screen or in an accessible name');
  assert.equal(builder.querySelectorAll(':disabled').length, 0, 'no disabled control');
  assert.equal(builder.querySelector('.uix-rule-builder__actions'), null, 'no "Then" block');
  assert.equal(button(t.host, 'Aktion hinzufügen'), undefined, 'no "Add action"');
  assert.equal(button(t.host, 'Gruppe hinzufügen'), undefined, 'no "Add group"');
  assert.equal(builder.querySelector('select'), null, 'no all/any select');
  assert.equal(builder.querySelector('.uix-rule-builder__match').textContent, 'Treffer bei allen (UND)');
  assert.equal(builder.querySelector('.uix-rule-builder__validation').textContent, 'Die Regel ist gültig.', 'a catch-all is valid when its check is off');

  // with conditions: still no English, and the only disabled buttons are the two that cannot move
  click(button(t.host, 'Bedingung hinzufügen'));
  click(button(t.host, 'Bedingung hinzufügen'));
  assert.equal(builder.querySelectorAll('.uix-rule-builder__condition').length, 2);
  assert.deepEqual(english(builder), []);
  assert.deepEqual([...builder.querySelectorAll(':disabled')].map((el) => el.getAttribute('aria-label')), ['Bedingung nach oben', 'Bedingung nach unten'],
    'first row cannot go up, last row cannot go down — nothing else is disabled');
  assert.equal(builder.querySelector('input').getAttribute('aria-label'), 'Wert für Priorität');
  for (const next of t.emitted) {
    assert.equal(next.when.combinator, 'and');
    assert.deepEqual(next.then, [], 'then is passed through untouched');
  }
  t.cleanup();
});

test('built-in validation messages come from the labels, and from UixLabelsProvider', () => {
  const broken = {
    when: { id: 'root', combinator: 'and', conditions: [
      { id: 'c1', field: '', operator: '', value: '' },
      { id: 'c1', field: 'priority', operator: 'eq' },
      { id: 'g1', combinator: 'and', conditions: [] },
    ] },
    then: [{ id: 'a1', type: '', parameters: {} }],
  };
  const t = mount({ labels: GERMAN, actions: ACTIONS, maxDepth: 1 }, broken);
  const issues = [...t.host.querySelectorAll('.uix-rule-builder__validation li')].map((li) => li.textContent);
  assert.deepEqual(issues, [
    'Feld wählen.', 'Vergleich wählen.', 'Doppelte Kennung „c1“.', 'Mehr als 1 Ebenen.', 'Mindestens eine Bedingung hinzufügen.', 'Aktion wählen.',
  ]);
  assert.equal(t.host.querySelector('.uix-rule-builder__validation strong').textContent, '6 Prüfhinweise');
  assert.deepEqual(english(t.host.querySelector('.uix-rule-builder__validation')), []);
  t.cleanup();

  // one provider translates every builder below it; a labels prop still wins per key
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(h(ui.UixLabelsProvider, { labels: { ruleBuilder: GERMAN } },
    h(ui.RuleBuilder, { fields: FIELDS, operators: OPERATORS, actions: ACTIONS, value: EMPTY, onChange() {}, labels: { issueNoActions: 'Ohne Aktion.' } }))));
  assert.deepEqual([...host.querySelectorAll('.uix-rule-builder__validation li')].map((li) => li.textContent), ['Mindestens eine Bedingung hinzufügen.', 'Ohne Aktion.']);
  assert.equal(host.querySelector('legend span').textContent, 'Wenn');
  act(() => root.unmount());
  host.remove();
});

test('checks: each built-in check can be turned off; without the prop both defaults still show', () => {
  const messages = (props) => {
    const html = renderToStaticMarkup(h(ui.RuleBuilder, { fields: FIELDS, operators: OPERATORS, actions: ACTIONS, value: EMPTY, onChange() {}, ...props }));
    return [...new dom.window.DOMParser().parseFromString(html, 'text/html').querySelectorAll('.uix-rule-builder__validation li')].map((li) => li.textContent);
  };
  assert.deepEqual(messages({}), ['Add at least one condition.', 'Add at least one action.'], 'unchanged by default');
  assert.deepEqual(messages({ checks: { emptyGroup: false } }), ['Add at least one action.']);
  assert.deepEqual(messages({ checks: { noActions: false } }), ['Add at least one condition.']);
  assert.deepEqual(messages({ checks: { emptyGroup: false, noActions: false } }), []);
  // a consumer's own validate is appended, and is not affected by `checks`
  assert.deepEqual(messages({ checks: { emptyGroup: false, noActions: false }, validate: () => [{ path: 'when', message: 'Eigene Prüfung.' }] }), ['Eigene Prüfung.']);
});

test('conditionsOnly: no "Then" block, the action checks are off, actions is optional, then is untouched', () => {
  const withThen = { ...EMPTY, then: [{ id: 'kept', type: 'notify', parameters: { to: 'ops' } }] };
  const t = mount({ conditionsOnly: true }, withThen);
  assert.equal(t.host.querySelector('.uix-rule-builder__actions'), null);
  assert.equal(button(t.host, 'Add action'), undefined);
  assert.deepEqual([...t.host.querySelectorAll('.uix-rule-builder__validation li')].map((li) => li.textContent), ['Add at least one condition.'],
    'only the condition check is left');
  click(button(t.host, 'Add condition'));
  assert.deepEqual(t.emitted[0].then, withThen.then, 'the stored actions pass through');
  assert.equal(t.host.querySelector('.uix-rule-builder__validation').textContent, 'Rule is valid.');
  t.cleanup();

  // the full builder is unchanged
  const full = mount({ actions: ACTIONS });
  assert.ok(full.host.querySelector('.uix-rule-builder__actions legend'));
  assert.ok(button(full.host, 'Add action'));
  full.cleanup();
});

test('combinator: a fixed AND is shown as text and never emits "or", even from a stored OR', () => {
  const stored = { when: { id: 'root', combinator: 'or', conditions: [
    { id: 'c1', field: 'priority', operator: 'eq', value: 'P1' },
    { id: 'g1', combinator: 'or', conditions: [{ id: 'c2', field: 'service', operator: 'eq', value: 'mail' }] },
  ] }, then: [] };
  const t = mount({ conditionsOnly: true, combinator: 'and' }, stored);
  assert.equal(t.host.querySelector('.uix-rule-builder__group-heading select'), null, 'no select to change it');
  assert.deepEqual([...t.host.querySelectorAll('.uix-rule-builder__match')].map((el) => el.textContent), ['Match all (AND)', 'Match all (AND)']);
  click(button(t.host, 'Add group'));
  click(t.host.querySelector('[aria-label="Remove condition"]'));
  assert.equal(t.emitted.length, 2);
  for (const next of t.emitted) assert.doesNotMatch(JSON.stringify(next), /"combinator":"or"/, 'every group carries the fixed combinator');
  t.cleanup();

  // free choice (the default) still emits what was picked
  const free = mount({ conditionsOnly: true }, TWO);
  change(free.host.querySelector('.uix-rule-builder__group-heading select'), 'or');
  assert.equal(free.emitted[0].when.combinator, 'or');
  free.cleanup();

  // hideCombinator removes the control and the text; the stored value is left alone
  const hidden = mount({ conditionsOnly: true, hideCombinator: true }, stored);
  assert.equal(hidden.host.querySelector('.uix-rule-builder__group-heading select'), null);
  assert.equal(hidden.host.querySelector('.uix-rule-builder__match'), null);
  click(button(hidden.host, 'Add condition'));
  assert.equal(hidden.emitted[0].when.combinator, 'or');
  hidden.cleanup();
  const both = mount({ conditionsOnly: true, combinator: 'and', hideCombinator: true }, TWO);
  assert.equal(both.host.querySelector('.uix-rule-builder__match'), null);
  both.cleanup();
});

test('allowGroups={false} hides "Add group"; maxDepth={1} hides it too; deeper builders keep it', () => {
  const off = mount({ conditionsOnly: true, allowGroups: false });
  assert.equal(button(off.host, 'Add group'), undefined);
  assert.ok(button(off.host, 'Add condition'));
  off.cleanup();

  const flat = mount({ conditionsOnly: true, maxDepth: 1 });
  assert.equal(button(flat.host, 'Add group'), undefined, 'a button that could never be enabled is not rendered');
  flat.cleanup();

  const nested = mount({ conditionsOnly: true, maxDepth: 2 });
  const add = button(nested.host, 'Add group');
  assert.ok(add && !add.disabled);
  click(add);
  const inner = [...nested.host.querySelectorAll('[data-depth="2"] button')].find((b) => b.textContent === 'Add group');
  assert.equal(inner.disabled, true, 'at the depth limit of a nesting builder it is disabled, as before');
  assert.equal(button(nested.host, 'Add group'), inner, 'the nested group renders before its parent add row');
  nested.cleanup();
});

test('readOnly: the builder with every control disabled and no add, move or remove buttons — not a sentence', () => {
  const value = { ...TWO, then: [{ id: 'a1', type: 'notify', parameters: {} }] };
  const t = mount({ readOnly: true, actions: ACTIONS, labels: GERMAN }, value);
  const builder = t.host.querySelector('.uix-rule-builder');
  assert.equal(builder.classList.contains('uix-rule-builder--summary'), false);
  assert.ok(builder.classList.contains('uix-rule-builder--readonly'));
  assert.equal(builder.getAttribute('aria-label'), 'Regel-Editor');
  assert.equal(builder.querySelector('p'), null, 'no prose sentence');
  const controls = [...builder.querySelectorAll('select, input')];
  assert.equal(controls.length, 2 * 3 + 1 + 1, 'two conditions (field, operator, value), the all/any select, one action type');
  assert.ok(controls.every((c) => c.disabled), 'every control is disabled');
  assert.equal(builder.querySelectorAll('button:not([role="combobox"])').length, 0, 'no add, move or remove button');
  // the choices are kit Selects (HAR-1575): a disabled trigger each, the value on it, the proxy holds the form value
  const triggers = [...builder.querySelectorAll('button[role="combobox"].uix-select')];
  assert.equal(triggers.length, 6);
  assert.ok(triggers.every((b) => b.disabled));
  assert.deepEqual(triggers.map((b) => b.textContent), ['allen (UND)', 'Priorität', 'ist', 'Dienst', 'ist nicht', 'Benachrichtigen']);
  assert.deepEqual(controls.filter((c) => c.tagName === 'SELECT').map((s) => s.selectedOptions[0].textContent), ['allen (UND)', 'Priorität', 'ist', 'Dienst', 'ist nicht', 'Benachrichtigen']);
  assert.deepEqual(english(builder), []);
  assert.deepEqual(t.emitted, []);
  t.cleanup();

  // a custom value editor and action parameters are told they are disabled
  const seen = [];
  const custom = mount({
    readOnly: true,
    fields: [{ id: 'priority', label: 'Priority', renderValueEditor: (p) => { seen.push(['value', p.disabled]); return h('span', null, 'v'); } }],
    actions: [{ id: 'notify', label: 'Notify', renderParameters: (_a, _c, disabled) => { seen.push(['params', disabled]); return h('span', null, 'p'); } }],
  }, { when: { id: 'root', combinator: 'and', conditions: [{ id: 'c1', field: 'priority', operator: 'eq', value: 1 }] }, then: [{ id: 'a1', type: 'notify', parameters: {} }] });
  assert.deepEqual(seen.sort(), [['params', true], ['value', true]]);
  custom.cleanup();
});

test('readOnly="summary" keeps the sentence, and its words are labels', () => {
  const render = (props, value = TWO) => renderToStaticMarkup(h(ui.RuleBuilder, { fields: FIELDS, operators: OPERATORS, actions: ACTIONS, value, onChange() {}, readOnly: 'summary', ...props }));
  assert.match(render({}), /<section class="uix-rule-builder uix-rule-builder--summary" aria-label="Rule summary"><p>When Priorität ist &quot;P1&quot; AND Dienst ist nicht &quot;mail&quot;, then no actions\.<\/p>/,
    'the 2.31.0 sentence');
  const german = render({ labels: GERMAN, conditionsOnly: true });
  assert.match(german, /aria-label="Regelübersicht"><p>Wenn Priorität ist &quot;P1&quot; UND Dienst ist nicht &quot;mail&quot;\.<\/p><\/section>$/, 'conditions only: no actions clause, no issue line');
  assert.match(render({ labels: GERMAN }, EMPTY), /<p>Wenn keine Bedingungen, dann keine Aktionen\.<\/p><p class="uix-rule-builder__invalid">Die Regel hat 2 Prüfhinweise\.<\/p>/);
  assert.match(render({ labels: GERMAN }, { ...TWO, when: { ...TWO.when, combinator: 'or' } }), / ODER /);
});

test('HAR-1575: no native select; every choice is a kit Select the keyboard drives (field, operator, all/any, action)', () => {
  const t = mount({ actions: [...ACTIONS, { id: 'ticket', label: 'Ticket anlegen' }], labels: GERMAN }, { ...TWO, then: [{ id: 'a1', type: 'notify', parameters: {} }] });
  const builder = t.host.querySelector('.uix-rule-builder');
  assert.equal(builder.querySelectorAll('select:not([data-uix-select-proxy])').length, 0, 'no visible native select');
  const key = (el, k) => act(() => { el.focus(); el.dispatchEvent(new window.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true })); });
  const trigger = (name) => [...builder.querySelectorAll('button[role="combobox"]')].find((b) => b.closest('label')?.querySelector('.uix-visually-hidden')?.textContent === name || b.getAttribute('aria-label') === name);
  // the first condition's field: open, move down, choose
  const field = trigger('Feld');
  key(field, 'ArrowDown');
  assert.equal(field.getAttribute('aria-expanded'), 'true');
  key(field, 'ArrowDown');
  key(field, 'Enter');
  assert.equal(t.emitted.at(-1).when.conditions[0].field, 'service');
  // its operator
  const operator = trigger('Vergleich');
  key(operator, 'End');
  key(operator, 'Enter');
  assert.equal(t.emitted.at(-1).when.conditions[0].operator, 'ne');
  // the all/any combinator (a wrapping label names it)
  const combinator = builder.querySelector('.uix-rule-builder__group-heading button[role="combobox"]');
  assert.ok(combinator.closest('label').textContent.startsWith('Treffer bei'));
  key(combinator, 'ArrowDown');
  key(combinator, 'End');
  key(combinator, 'Enter');
  assert.equal(t.emitted.at(-1).when.combinator, 'or');
  // the action type
  const action = trigger('Aktionstyp');
  key(action, 'ArrowDown');
  key(action, 'ArrowDown');
  key(action, 'Enter');
  assert.equal(t.emitted.at(-1).then[0].type, 'ticket');
  assert.deepEqual(english(builder), []);
  t.cleanup();
});

test('HAR-1575: BrandProfiles chooses a profile through a kit Select', () => {
  const chosen = [];
  const profiles = [{ id: 'tensor', name: 'Tensor', brand: '#2563eb', brandForeground: '#ffffff' }, { id: 'motus', name: 'Motus', brand: '#0f766e', brandForeground: '#ffffff' }];
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(h(ui.BrandProfiles, { value: profiles[0], profiles, onChange() {}, onSelectProfile: (p) => chosen.push(p.id) })));
  assert.equal(host.querySelectorAll('select:not([data-uix-select-proxy])').length, 0);
  const trigger = host.querySelector('button[role="combobox"].uix-select');
  assert.equal(trigger.textContent, 'Tensor');
  act(() => { trigger.focus(); trigger.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true })); });
  act(() => { trigger.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true })); });
  act(() => { trigger.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })); });
  assert.deepEqual(chosen, ['motus']);
  act(() => root.unmount());
  host.remove();
});
