/* HAR-1572 — the docs Select specimen is the React component's markup, never a docs-only look.
 * The Select page once showed a rich listbox that existed only in the docs while every shipped
 * Select opened the browser's dropdown. This renders <Select> with renderToStaticMarkup and the
 * docs specimen (packages/tokens/docs/form-specimens.js) from the same inputs, and compares
 * every element's tag, role, uix-* classes and ARIA/data attribute names in document order.
 * Renders the BUILT dist — run `npm run build` first; CI does. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { Select } from '../dist/index.js';
import { SELECT_SPECIMENS, selectMarkup } from '../../tokens/docs/form-specimens.js';

const { document } = new JSDOM('<!doctype html><body></body>').window;

/** One line per element: tag, role, classes, ARIA/data attribute names (ids and text left out). */
const signature = (html) => {
  const host = document.createElement('div');
  host.innerHTML = html;
  return [...host.querySelectorAll('*')].map((el) => {
    const attrs = [...el.attributes].map((a) => a.name)
      .filter((n) => n.startsWith('aria-') || (n.startsWith('data-') && n !== 'data-uix-select-ready') || ['role', 'type', 'hidden', 'popover', 'tabindex', 'disabled', 'multiple', 'name'].includes(n))
      .sort();
    const classes = [...el.classList].filter((c) => c.startsWith('uix-')).sort().join('.');
    return `${el.tagName.toLowerCase()}${classes ? `.${classes}` : ''} [${attrs.join(' ')}]`;
  });
};

const toProps = (spec) => ({
  id: spec.id,
  name: spec.name,
  options: spec.items,
  multiple: spec.multiple,
  placeholder: spec.placeholder,
  disabled: spec.disabled,
  readOnly: spec.readOnly,
  invalid: spec.invalid,
  size: spec.size,
  'aria-label': spec.ariaLabel,
  defaultValue: spec.multiple ? spec.value ?? [] : spec.value?.[0] ?? (spec.placeholder != null ? '' : undefined),
});

for (const [key, spec] of Object.entries(SELECT_SPECIMENS)) {
  test(`docs specimen "${key}" has the React Select's elements, roles, classes and ARIA`, () => {
    const react = signature(renderToStaticMarkup(h(Select, toProps(spec))));
    const docs = signature(selectMarkup(spec));
    assert.deepEqual(docs, react);
  });
}

test('the signature sees roles and the listbox (the comparison is not vacuous)', () => {
  const lines = signature(selectMarkup(SELECT_SPECIMENS.team));
  assert.ok(lines.some((l) => l.startsWith('button.uix-select ') && l.includes('role')));
  assert.ok(lines.some((l) => l.startsWith('div.uix-listbox.uix-select__listbox')));
  assert.equal(lines.filter((l) => l.startsWith('div.uix-listbox__group ')).length, 3);
  assert.ok(lines.some((l) => l.startsWith('select.uix-select__proxy') && l.includes('data-uix-select-proxy')));
});
