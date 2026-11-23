/* HAR-4667: inspect the references on the shipped React component. The browser spec
 * checks the computed names and axe rule against the same cases. Build dist first. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Stat } from '../dist/index.js';

test('interactive names reference label, separator, value, visible support and action in order', () => {
  for (const extra of [{}, { meta: 'Resolution target' }, { trend: { direction: 'up', label: '5%' }, meta: 'last week' }]) {
    const html = renderToStaticMarkup(h(Stat, { label: 'Priority', value: 'P1', onActivate() {}, activateLabel: 'change', 'aria-describedby': 'hint', ...extra }));
    const doc = new JSDOM(html).window.document;
    const button = doc.querySelector('button');
    const parts = button.getAttribute('aria-labelledby').split(' ').map((id) => doc.getElementById(id));
    assert.ok(parts.every(Boolean));
    assert.deepEqual(parts.map((el) => el.id.split('-').at(-1)), ['label', 'sep', 'value', ...(extra.meta || extra.trend ? ['meta'] : []), 'action']);
    assert.equal(parts[1].textContent, ': ');
    assert.equal(button.getAttribute('aria-describedby'), 'hint');
  }
});
