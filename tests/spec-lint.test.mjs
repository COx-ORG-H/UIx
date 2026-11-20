/* Two patterns that made browser tests flaky on 2026-11-20, kept out of every spec by source scan.
 * Runs first in `npm run test:a11y` (node --test), before Playwright starts.
 *
 * 1. Every axe scan goes through tests/a11y/axe.mjs, which waits for short animations first. A
 *    direct '@axe-core/playwright' import scans overlays mid-fade (#323, the Kanban Move menu).
 * 2. No `expect.poll(...).not.toBe(x)` / `.not.toEqual(x)`. "Not x" also passes on null or
 *    undefined, which is what a probe returns before the page has caught up, so the test goes on
 *    with an empty before-state (#323, scheduling-timeline F1). Poll for the value you expect:
 *    `.toMatch(/^lane-[1-9]/)`, or return a boolean from the probe and poll `.toBe(true)`.
 *    `.not.toBeNull()` / `.not.toBeUndefined()` are fine: they say what they mean. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else if (entry.name.endsWith('.mjs')) yield path;
  }
}
const files = [...walk(here)].map((path) => ({ path, name: relative(root, path).replaceAll('\\', '/'), source: readFileSync(path, 'utf8') }));

/** The text from `start` (an opening paren) through its matching close paren, or null. */
function balanced(source, start) {
  let depth = 0;
  for (let i = start; i < source.length; i++) {
    const c = source[i];
    if (c === '(') depth++;
    else if (c === ')' && --depth === 0) return i;
  }
  return null;
}

/** Each `expect.poll(...)` call's chained matcher text, with the line it starts on. */
export function negativePolls(source) {
  const found = [];
  for (const match of source.matchAll(/expect\.poll\(/g)) {
    const open = match.index + match[0].length - 1;
    const close = balanced(source, open);
    if (close === null) continue;
    // the poll's own options sit inside the parens; the matcher chain follows the close paren
    const rest = source.slice(close + 1, close + 200).replace(/^\s+/, '');
    const negated = /^\.not\.(toBe|toEqual|toStrictEqual)\(/.exec(rest);
    if (negated) found.push({ line: source.slice(0, match.index).split('\n').length, matcher: `.not.${negated[1]}` });
  }
  return found;
}

test('every axe scan goes through tests/a11y/axe.mjs', () => {
  const direct = files
    .filter(({ name }) => name !== 'tests/a11y/axe.mjs' && name !== 'tests/spec-lint.test.mjs')
    .filter(({ source }) => /from ['"]@axe-core\/playwright['"]/.test(source))
    .map(({ name }) => name);
  assert.deepEqual(direct, [], `import AxeBuilder from './axe.mjs' (tests/a11y) instead of '@axe-core/playwright': it waits for overlays to finish fading in before the scan`);
});

test('no expect.poll(...) waits for "not x" with toBe / toEqual', () => {
  const offenders = files
    .filter(({ name }) => name !== 'tests/spec-lint.test.mjs')
    .flatMap(({ name, source }) => negativePolls(source).map(({ line, matcher }) => `${name}:${line} ${matcher}`));
  assert.deepEqual(offenders, [], 'poll for the value you expect: "not x" also passes on null before the page has caught up');
});

test('the scan finds a negated poll across lines, and leaves the plain and toBeNull forms alone', () => {
  assert.deepEqual(negativePolls("await expect.poll(async () => (await first()).id)\n  .not.toBe('lane-0');").map((f) => f.matcher), ['.not.toBe']);
  assert.deepEqual(negativePolls('await expect.poll(() => f(), { timeout: 9 }).not.toEqual([]);').map((f) => f.matcher), ['.not.toEqual']);
  assert.deepEqual(negativePolls("await expect.poll(() => f()).toBe('a');"), []);
  assert.deepEqual(negativePolls('await expect.poll(() => f()).not.toBeNull();'), []);
});
