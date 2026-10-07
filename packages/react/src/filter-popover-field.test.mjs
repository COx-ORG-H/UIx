/* FilterPopover renders a plain UIx field, not the Label tag pill (HAR-1573).
 *
 * It used to wrap its control in a label element carrying `uix-label`, which drew the tag's tinted band around
 * the select with 1 px below it. The geometry (8 px label → control, 16 px control → actions, 16 px
 * padding) is measured in Chromium by tests/a11y/filter-popover.spec.mjs on the docs specimen, which
 * mirrors this markup; this pins the markup itself and the label ↔ control association.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { FilterPopover } from '../dist/index.js';

const noop = () => {};
const render = (props) => {
  const html = renderToStaticMarkup(h(FilterPopover, {
    label: 'Status', value: '', onValueChange: noop, applyLabel: 'Apply', clearLabel: 'Clear', onApply: noop, onClear: noop, ...props,
  }));
  return new JSDOM(`<body>${html}</body>`).window.document.querySelector('.uix-filter-popover');
};

for (const [name, props, tag] of [
  ['select', { type: 'select', options: [{ value: '', label: 'Any status' }, { value: 'open', label: 'Open' }] }, 'SELECT'],
  ['enum', { type: 'enum', options: [{ value: 'a', label: 'A' }] }, 'SELECT'],
  ['text', { type: 'text', placeholder: 'Contains…' }, 'INPUT'],
  ['date', { type: 'date' }, 'INPUT'],
]) {
  test(`FilterPopover (${name}) labels its control through a .uix-field, never .uix-label`, () => {
    const root = render(props);
    assert.equal(root.querySelector('.uix-label'), null, 'the tag pill class is gone');
    const field = root.querySelector(':scope > .uix-field');
    assert.ok(field, 'the control sits in a .uix-field');
    const label = field.querySelector(':scope > label.uix-field__label');
    assert.equal(label?.textContent, 'Status');
    const control = field.querySelector(':scope > :is(select, input)');
    assert.equal(control?.tagName, tag);
    assert.ok(control.id, 'the control has an id');
    assert.equal(label.getAttribute('for'), control.id, 'label[for] is the control id');
    assert.equal(label.querySelector('select, input'), null, 'the label no longer wraps the control');
    assert.equal(field.nextElementSibling?.className, 'uix-filter-popover__actions');
  });
}

test('two FilterPopovers on one page get distinct control ids', () => {
  const html = renderToStaticMarkup(h('div', null,
    h(FilterPopover, { label: 'A', value: '', onValueChange: noop, applyLabel: 'Apply', clearLabel: 'Clear', onApply: noop, onClear: noop }),
    h(FilterPopover, { label: 'B', value: '', onValueChange: noop, applyLabel: 'Apply', clearLabel: 'Clear', onApply: noop, onClear: noop })));
  const doc = new JSDOM(html).window.document;
  const ids = [...doc.querySelectorAll('.uix-filter-popover input')].map((el) => el.id);
  assert.equal(new Set(ids).size, 2);
  for (const label of doc.querySelectorAll('.uix-field__label')) assert.ok(doc.getElementById(label.getAttribute('for')));
});
