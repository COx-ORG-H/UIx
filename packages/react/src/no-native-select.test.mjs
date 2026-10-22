/* No browser dropdown anywhere in UIx (HAR-1575, operator review 2026-10-07 point 6).
 *
 * Static gate: no native `<select>` in the React sources (`packages/react/src/**\/*.tsx`), the
 * docs and guide scripts (`packages/tokens/docs/*.js`, `packages/tokens/guide/*.js`) or any page
 * under `packages/tokens` (`**\/*.html`). The one allowed kind is the kit Select's hidden form
 * proxy, which carries `data-uix-select-proxy` (Select.tsx, and the docs' copy of its markup).
 * The runtime half is in tests/a11y/a11y.spec.mjs: every explorer route, light and dark, shows
 * no visible native select. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = fileURLToPath(new URL('../../../', import.meta.url));
const SKIP = new Set(['node_modules', 'dist', 'build', 'temp']);

/** Every file under `dir` (recursively, skipping build output) whose name passes `keep`. */
function walk(dir, keep, recursive = true) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      if (recursive && !SKIP.has(name)) out.push(...walk(path, keep, recursive));
    } else if (keep(name)) out.push(path);
  }
  return out;
}

/** Lines (1-based) that open a native select which is not the kit Select's form proxy. */
export function nativeSelects(text) {
  const hits = [];
  for (const match of text.matchAll(/<select[\s>]/g)) {
    // The proxy names itself in its own tag (JSX props span lines): look ahead, but never past the
    // element's end or the next select.
    const ahead = text.slice(match.index + 7, match.index + 400);
    const end = ahead.search(/<\/select>|<select[\s>]/);
    if ((end < 0 ? ahead : ahead.slice(0, end)).includes('data-uix-select-proxy')) continue;
    hits.push(text.slice(0, match.index).split('\n').length);
  }
  return hits;
}

const files = [
  ...walk(join(REPO, 'packages/react/src'), (name) => name.endsWith('.tsx')),
  ...walk(join(REPO, 'packages/tokens/docs'), (name) => name.endsWith('.js'), false),
  ...walk(join(REPO, 'packages/tokens/guide'), (name) => name.endsWith('.js'), false),
  ...walk(join(REPO, 'packages/tokens'), (name) => name.endsWith('.html')),
];

test('the gate can fail: a native select is found, the kit proxy is not', () => {
  assert.deepEqual(nativeSelects('<label>Queue<select class="uix-select"><option>A</option></select></label>'), [1]);
  assert.deepEqual(nativeSelects('a\nb\n<select\n  value={x}\n  onChange={(e) => set(e.target.value)}\n>'), [3]);
  assert.deepEqual(nativeSelects('x = el(\'<select class="uix-input uix-input--sm"></select>\');'), [1]);
  assert.deepEqual(nativeSelects('<select data-uix-select-proxy="" class="uix-select__proxy" aria-hidden="true"></select>'), []);
  assert.deepEqual(nativeSelects('<select\n  ref={setProxyRef}\n  data-uix-select-proxy=""\n  onChange={(e) => change(e)}\n>'), []);
  assert.deepEqual(nativeSelects('<select data-uix-select-proxy=\\"\\" class=\\"uix-select__proxy\\">'), [], 'escaped inside a JSON string');
  assert.deepEqual(nativeSelects('A native select element is the form proxy.'), []);
});

test('no native <select> in the React sources, the docs, the guide or any tokens page', () => {
  console.log(`no-native-select: inspected ${files.length} files`);
  assert.ok(files.length > 40, `only ${files.length} files inspected: the walk is broken`);
  const found = files.flatMap((file) => nativeSelects(readFileSync(file, 'utf8')).map((line) => `${relative(REPO, file).replace(/\\/g, '/')}:${line}`));
  assert.deepEqual(found, [], 'use the kit Select (React) or selectMarkup() from docs/form-specimens.js (static pages)');
});
