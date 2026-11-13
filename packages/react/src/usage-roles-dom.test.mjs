/* Usage roles (HAR-2816): the five status roles and a disabled button that says why.
 * The role colours are measured in packages/tokens/tests/usage-roles.test.mjs.
 * Renders the BUILT dist — run `npm run build` first. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement as h, act } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Button, STATUS_ROLES, severityTone, statusRoleOf } from '../dist/index.js';

test('severityTone keeps the one ramp: critical red, high amber, medium and low neutral (HAR-3874)', () => {
  const expected = { critical: 'critical', CRITICAL: 'critical', ' High ': 'warning', high: 'warning', medium: 'neutral', low: 'neutral', info: 'neutral', unknown: 'neutral' };
  for (const [severity, tone] of Object.entries(expected)) assert.equal(severityTone(severity), tone, severity);
  assert.equal(severityTone(null), 'neutral');
  assert.equal(severityTone(undefined), 'neutral');
  // On the five roles, only critical is critical: High never spends the red budget.
  assert.equal(statusRoleOf(severityTone('critical')), 'critical');
  assert.equal(statusRoleOf(severityTone('high')), 'warning');
});

test('STATUS_ROLES lists the five roles, quietest first', () => {
  assert.deepEqual([...STATUS_ROLES], ['neutral', 'info', 'success', 'warning', 'critical']);
});

test('statusRoleOf folds every pill tone onto one meaning; only failures and breaches are critical', () => {
  const expected = {
    neutral: 'neutral', muted: 'neutral', 'sla-ok': 'neutral', p4: 'neutral', p5: 'neutral',
    info: 'info', progress: 'info',
    success: 'success',
    warning: 'warning', attention: 'warning', 'sla-at-risk': 'warning', p2: 'warning', p3: 'warning',
    critical: 'critical', danger: 'critical', overdue: 'critical', 'sla-breached': 'critical', p1: 'critical',
  };
  for (const [tone, role] of Object.entries(expected)) assert.equal(statusRoleOf(tone), role, tone);
  assert.equal(statusRoleOf(undefined), 'neutral');
  assert.equal(statusRoleOf(null), 'neutral');
  assert.equal(statusRoleOf('constructor'), 'neutral');
});

test('a disabled Button without a reason stays a native disabled button', () => {
  const out = renderToStaticMarkup(h(Button, { disabled: true }, 'Speichern'));
  assert.equal(out, '<button class="uix-btn uix-btn--secondary" disabled="">Speichern</button>');
});

test('disabledReason on an enabled button is silent: a plain button in an empty, undescribing wrapper', () => {
  const out = renderToStaticMarkup(h(Button, { disabledReason: 'Nur Administratoren' }, 'Löschen'));
  assert.match(out, /^<span class="uix-tooltip"><button class="uix-btn uix-btn--secondary">Löschen<\/button>/);
  assert.doesNotMatch(out, /aria-describedby|aria-disabled|tabindex|Nur Administratoren/);
});

test('a disabled Button with a reason stays focusable, takes no press and is described by the reason', async () => {
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { pretendToBeVisual: true });
  const saved = {};
  for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'Node', 'MutationObserver', 'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame']) {
    saved[key] = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { value: key === 'getComputedStyle' || key.endsWith('AnimationFrame') ? dom.window[key].bind(dom.window) : dom.window[key], configurable: true, writable: true });
  }
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const { createRoot } = await import('react-dom/client');
  const root = createRoot(dom.window.document.getElementById('root'));
  try {
    let clicks = 0;
    await act(async () => {
      root.render(h(Button, { disabled: true, disabledReason: 'Nur Administratoren können Lizenzen löschen', variant: 'danger', onClick: () => { clicks += 1; } }, 'Löschen'));
    });
    const button = dom.window.document.querySelector('button');
    assert.equal(button.disabled, false, 'not native disabled, so it can take focus');
    assert.equal(button.getAttribute('aria-disabled'), 'true');
    assert.equal(button.hasAttribute('data-disabled-reason'), true);
    const describedBy = button.getAttribute('aria-describedby');
    assert.ok(describedBy, 'described by the tooltip');
    assert.equal(dom.window.document.getElementById(describedBy)?.textContent, 'Nur Administratoren können Lizenzen löschen');
    await act(async () => { button.click(); });
    assert.equal(clicks, 0, 'the press is swallowed');
    // enabling it keeps the same element (no remount, focus stays), and the reason goes silent
    button.focus();
    await act(async () => {
      root.render(h(Button, { disabled: false, disabledReason: 'Nur Administratoren können Lizenzen löschen', variant: 'danger', onClick: () => { clicks += 1; } }, 'Löschen'));
    });
    const same = dom.window.document.querySelector('button');
    assert.equal(same, button, 'the same <button> node');
    assert.equal(dom.window.document.activeElement, button, 'focus stays on it');
    assert.equal(same.hasAttribute('aria-disabled'), false);
    assert.equal(same.hasAttribute('aria-describedby'), false, 'an enabled button has no reason to describe');
    await act(async () => { same.click(); });
    assert.equal(clicks, 1, 'an enabled button takes the press');
  } finally {
    await act(async () => root.unmount());
    for (const [key, desc] of Object.entries(saved)) {
      if (desc) Object.defineProperty(globalThis, key, desc); else delete globalThis[key];
    }
    dom.window.close();
  }
});
