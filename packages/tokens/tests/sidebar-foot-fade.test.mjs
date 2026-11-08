/* The sidebar's foot fade (TENSOR HAR-2954): a nav taller than its column fades out over its last
 * `--uix-sidebar-fade` instead of cutting a row in half. The fade must never cover the footer slot
 * or the last row at rest, so the bottom padding is exactly the fade height and no state of the
 * sidebar (collapsed, rail) writes a padding of its own on `.uix-sidebar`. Checked in a real browser
 * on 2026-11-08 for full, collapsed and rail, fitting and scrolled to the end.
 * Run: npm run test:tokens */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, '../styles/components/sidebar.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

/** Every `selector { body }` whose selector targets the sidebar box itself (not a descendant). */
const boxRules = (css) =>
  [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .map(([, selector, body]) => ({ selector: selector.trim(), body }))
    .filter(({ selector }) => selector.split(',').some((part) => /^\.uix-sidebar(\[[^\]]+\])*$/.test(part.trim())));

test('the foot fade is as tall as the bottom padding', () => {
  const fade = boxRules(source).filter(({ body }) => /mask-image/.test(body));
  assert.equal(fade.length, 1, 'one rule draws the fade');
  assert.match(fade[0].body, /--uix-sidebar-fade:\s*var\(--uix-space-\d+\)/);
  assert.match(fade[0].body, /padding-bottom:\s*var\(--uix-sidebar-fade\)/);
  assert.match(fade[0].body, /mask-image:\s*linear-gradient\(to bottom,[^;]*calc\(100% - var\(--uix-sidebar-fade\)\),\s*transparent\)/);
});

test('no sidebar state writes a padding on the sidebar box after the fade, so the footer stays clear', () => {
  const rules = boxRules(source);
  const fadeAt = rules.findIndex(({ body }) => /mask-image/.test(body));
  const later = rules.slice(fadeAt + 1).filter(({ body }) => /padding(-bottom|-block)?\s*:/.test(body));
  assert.deepEqual(later.map(({ selector }) => selector), []);
  const states = rules.filter(({ selector, body }) => /\[data-(collapsed|nav)/.test(selector) && /padding(-bottom|-block)?\s*:/.test(body));
  assert.deepEqual(states.map(({ selector }) => selector), [], 'collapsed and rail keep the box padding');
});

test('the checker sees a later padding (calibration)', () => {
  const bad = `${source}\n.uix-sidebar[data-collapsed] { padding: 0; }`;
  const rules = boxRules(bad);
  const fadeAt = rules.findIndex(({ body }) => /mask-image/.test(body));
  assert.equal(rules.slice(fadeAt + 1).filter(({ body }) => /padding\s*:/.test(body)).length, 1);
});
