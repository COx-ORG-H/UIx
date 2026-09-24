/* Every `uix-*` class a React component emits is defined in @tensor_1/tokens (TENSOR HAR-770).
 *
 * A class with no rule anywhere under packages/tokens/styles renders the browser default — the
 * reported case was `<mark class="uix-mark">` showing UA yellow in dark mode. (`.uix-mark` turned
 * out to be defined in table.css since 2.5.0; this guard makes the claim checkable instead.)
 * docs.test.js covers the docs markup; this covers the React output.
 *
 * Static class tokens only: a literal like `uix-empty--${variant}` is a family, not a class.
 * A class that is deliberately unstyled (a hook for tests, consumers or a sibling selector) goes
 * in HOOKS with the reason, so a new unstyled class has to be a decision.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const stylesDir = resolve(here, '../../tokens/styles');
const componentsDir = resolve(here, 'components');

const HOOKS = new Map([
  ['uix-main', 'AppShell mainId default: an element id, not a class'],
  ['uix-file-upload', 'BrandProfiles upload label: styled by .uix-brand-profiles__upload'],
  ['uix-builder-canvas__items', 'structural hook; the list is styled through its items'],
  ['uix-link', 'DetailPage back link: base anchor styles + .uix-link--quiet'],
  ['uix-emoji-picker__search', 'styled by .uix-input; hook for tests'],
  ['uix-markdown', 'Markdown root: styled by .uix-prose; .uix-markdown__* children are defined'],
  ['uix-related-links', 'RelatedLinks root: layout comes from its children'],
  ['uix-rule-builder__value', 'structural wrapper; its controls are styled'],
  ['uix-save-status__text', 'SaveStatus live region: inherits the .uix-save-status text styles'],
  ['uix-save-status__retry', 'styled by .uix-btn--link .uix-btn--sm'],
  ['uix-scheduling-calendar__grid--week', 'view hook; the week grid needs no override today'],
  ['uix-empty--danger', 'ErrorState tone hook; the tone is on .uix-empty__icon--danger'],
  ['uix-empty--warning', 'ForbiddenState tone hook; the tone is on .uix-empty__icon--warning'],
  ['uix-tree--virtual', 'virtualised-tree hook for tests and consumers'],
]);

const cssFiles = [];
const visit = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) visit(path);
    else if (entry.name.endsWith('.css')) cssFiles.push(path);
  }
};
visit(stylesDir);
const defined = new Set(cssFiles.flatMap((file) => [...readFileSync(file, 'utf8').matchAll(/\.([a-zA-Z_][\w-]*)/g)].map((m) => m[1])));

const emitted = new Map();
for (const file of readdirSync(componentsDir).filter((f) => f.endsWith('.tsx'))) {
  const source = readFileSync(join(componentsDir, file), 'utf8');
  for (const [, , literal] of source.matchAll(/(['"`])([^'"`\n]*\buix-[^'"`\n]*)\1/g)) {
    for (const token of literal.split(/\s+/)) {
      if (/^uix-[\w-]*[a-z0-9]$/.test(token) && !emitted.has(token)) emitted.set(token, file);
    }
  }
}

test('the scan sees the React class vocabulary', () => {
  assert.ok(emitted.size > 400, `only ${emitted.size} classes found — did the component layout move?`);
  assert.ok(emitted.has('uix-mark'), 'Table.tsx <mark class="uix-mark"> is scanned');
});

test('every uix-* class React emits has a rule in @tensor_1/tokens, or is a listed hook', () => {
  const phantom = [...emitted]
    .filter(([name]) => !defined.has(name) && !HOOKS.has(name))
    .map(([name, file]) => `${name} (${file})`)
    .sort();
  assert.deepEqual(phantom, []);
});

test('the hook list has no stale entries', () => {
  const stale = [...HOOKS.keys()].filter((name) => defined.has(name) || !emitted.has(name)).sort();
  assert.deepEqual(stale, [], 'defined now, or no longer emitted: drop from HOOKS');
});
