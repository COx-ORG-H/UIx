import { readFileSync, writeFileSync } from 'node:fs';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { RuleBuilder } from '../dist/index.js';
import { OPTIONAL_RULE_LABELS } from '../../tokens/docs/rule-builder-labels.js';
const start = '<!-- optional-rule:start -->';
const end = '<!-- optional-rule:end -->';
const target = new URL('../../tokens/docs/showcase-data.js', import.meta.url);
const previews = [[], [{ id: 'first', field: 'priority', operator: 'eq', value: 'P1' }]].map((conditions) =>
  renderToStaticMarkup(h('div', null, h('h4', null, conditions.length ? 'Eine Bedingung' : 'Keine Bedingung'),
    h(RuleBuilder, { value: { when: { id: 'root', combinator: 'and', conditions }, then: [] }, onChange() {}, fields: [{ id: 'priority', label: 'Priorität' }], operators: [{ id: 'eq', label: 'ist' }], maxConditions: 1, conditionsOnly: true, combinator: 'and', hideCombinator: true, allowGroups: false, maxDepth: 1, checks: { emptyGroup: false }, readOnly: true, labels: OPTIONAL_RULE_LABELS })))).join('');
const section = `${start}<h3>Optional single condition</h3><p>Use maxConditions={1}, conditionsOnly, allowGroups={false}, maxDepth={1} and checks={{ emptyGroup: false }}. Add is reachable when empty and absent at one condition. Adding focuses the first field; removing the sole condition returns focus to Add. Existing over-limit input is preserved for editing and removal; the default stays unlimited.</p><p>Read-only German previews below. See <a href="https://github.com/COx-ORG-H/UIx/blob/master/Docs/optional-single-condition.md">the executable React specimen and keyboard walk</a> for editing.</p><div data-optional-rule-specimen style="display:grid;gap:var(--uix-space-4)">${previews}</div>${end}`;
const source = readFileSync(target, 'utf8');
const page = source.match(/"slug": "examples-rule-builder"[\s\S]*?"html": ("(?:[^"\\]|\\.)*")/);
if (!page) throw new Error('RuleBuilder gallery page not found');
const html = JSON.parse(page[1]);
const stripped = html.includes(start) ? html.slice(0, html.indexOf(start)) + html.slice(html.indexOf(end) + end.length) : html;
const closing = stripped.lastIndexOf('</section>');
if (closing < 0) throw new Error('RuleBuilder gallery closing section not found');
const next = `${stripped.slice(0, closing).trimEnd()}\n${section}\n${stripped.slice(closing)}`;
writeFileSync(target, source.replace(page[1], () => JSON.stringify(next)));
console.log('Optional condition: zero/one read-only previews from the public artifact');
