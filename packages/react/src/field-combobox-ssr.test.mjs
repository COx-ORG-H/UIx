import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h, memo } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { Combobox, Field } from '../dist/index.js';

test('server-rendered Field points at the Combobox input and keeps the wrapper ID', () => {
  const html = renderToStaticMarkup(h(Field, { label: 'Category', required: true, error: 'Choose one' },
    h(Combobox, { id: 'wrapper', label: 'Category', emptyLabel: 'No options', options: [], 'aria-describedby': 'extra' })));
  const dom = new JSDOM(html);
  const label = dom.window.document.querySelector('label');
  const input = dom.window.document.querySelector('input[role="combobox"]');
  assert.equal(label.control, input);
  assert.equal(dom.window.document.querySelector('#wrapper').className, 'uix-combobox');
  assert.equal(input.getAttribute('aria-required'), 'true');
  assert.equal(input.getAttribute('aria-invalid'), 'true');
  assert.ok(input.getAttribute('aria-describedby').split(' ').includes('extra'));
  dom.window.close();
});

test('memo-wrapped Combobox is associated on the server', () => {
  const MemoCombobox = memo(Combobox);
  const html = renderToStaticMarkup(h(Field, { label: 'Category' },
    h(MemoCombobox, { label: 'Category', emptyLabel: 'No options', options: [] })));
  const dom = new JSDOM(html);
  assert.equal(dom.window.document.querySelector('label').control, dom.window.document.querySelector('input[role="combobox"]'));
  dom.window.close();
});

test('an explicitly mismatched htmlFor stays the label target and does not rewrite inputId', () => {
  const html = renderToStaticMarkup(h(Field, { label: 'Category', htmlFor: 'another-control' },
    h(Combobox, { inputId: 'combobox-input', label: 'Category', emptyLabel: 'No options', options: [] })));
  const dom = new JSDOM(html);
  assert.equal(dom.window.document.querySelector('label').htmlFor, 'another-control');
  assert.equal(dom.window.document.querySelector('input[role="combobox"]').id, 'combobox-input');
  dom.window.close();
});
