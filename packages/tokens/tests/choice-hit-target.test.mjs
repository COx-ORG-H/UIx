/* HAR-4588: a choice control's drawing never takes its input's pointer events.
 *
 * A checkbox, radio, radio card or switch hides its native input (1 px, opacity 0, absolutely
 * positioned) and draws itself in a sibling span. That span sits over the input. If it takes
 * pointer events, a person's click still works (the span is inside the label), but anything that
 * targets the input itself does not: Playwright's `check()` on a UIx radio retried for 30 s in
 * MOTUS's e2e suite ("<span class="uix-radio__dot"> intercepts pointer events"), because the dot
 * drew over the input from 2.60. The checkbox box already said `pointer-events: none`.
 *
 * The decorations are found from the CSS, not listed: every class a rule styles through
 * `.uix-<control> > input … + .x` or `~ .x` must say `pointer-events: none` in its own base rule,
 * so a new choice control cannot skip it.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const COMPONENTS = fileURLToPath(new URL('../styles/components/', import.meta.url));
const strip = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

/** control class → the decoration classes its hidden input styles through `+` or `~`. */
export function choiceDecorations(css) {
  const out = new Map();
  const hidden = [...css.matchAll(/\.(uix-[\w-]+)\s*>\s*input\s*\{[^}]*position:\s*absolute;[^}]*opacity:\s*0/g)].map((m) => m[1]);
  for (const control of hidden) {
    const decorations = new Set();
    const re = new RegExp(`\\.${control}\\s*>\\s*input[^{,]*?[+~]\\s*\\.([\\w-]+)`, 'g');
    for (const m of css.matchAll(re)) decorations.add(m[1]);
    out.set(control, [...decorations].sort());
  }
  return out;
}

/**
 * The declarations of `.cls`'s own base rule: a rule whose whole selector is `.cls`, so it starts
 * right after the previous rule's `}`, its layer's `{` or the start of the file.
 */
export function baseRule(css, cls) {
  const m = new RegExp(`(?:^|[{}])\\s*\\.${cls}\\s*\\{([^}]*)\\}`).exec(css);
  return m ? m[1] : null;
}

const files = readdirSync(COMPONENTS).filter((f) => f.endsWith('.css'));
const found = files.flatMap((file) => {
  const css = strip(readFileSync(join(COMPONENTS, file), 'utf8'));
  return [...choiceDecorations(css)].flatMap(([control, decorations]) => decorations.map((d) => ({ file, control, decoration: d, rule: baseRule(css, d) })));
});

test('the walk finds the four choice controls and their drawings', () => {
  const pairs = found.map((f) => `${f.control} → ${f.decoration}`);
  for (const expected of ['uix-checkbox → uix-checkbox__box', 'uix-radio → uix-radio__dot', 'uix-radio-card → uix-radio-card__check', 'uix-switch → uix-switch__track']) {
    assert.ok(pairs.includes(expected), `${expected} not found; found ${pairs.join(', ')}`);
  }
});

test('every decoration over a hidden choice input says pointer-events: none', () => {
  const missing = found.filter((f) => f.rule === null || !/pointer-events:\s*none/.test(f.rule)).map((f) => `${f.file}: .${f.decoration} (drawn by .${f.control} > input)${f.rule === null ? ' has no base rule' : ''}`);
  assert.deepEqual(missing, [], 'these drawings would take the click meant for the hidden input');
});

test('the finder reads a decoration from + and ~, and a base rule exactly', () => {
  const css = '.uix-x > input { position: absolute; opacity: 0; } .uix-x > input:checked + .uix-x__a { color: red; } .uix-x > input:checked ~ .uix-x__b { color: red; } .uix-x__a { pointer-events: none; } .uix-x__a-wide { color: red; }';
  assert.deepEqual(choiceDecorations(css).get('uix-x'), ['uix-x__a', 'uix-x__b']);
  assert.match(baseRule(css, 'uix-x__a'), /pointer-events: none/);
  assert.equal(baseRule(css, 'uix-x__b'), null);
});
