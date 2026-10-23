/* No browser dropdown anywhere in UIx (HAR-1575, operator review 2026-10-07 point 6).
 *
 * Static gate: no native `<select>` (markup, or `createElement('select')` / `h('select')`) in the
 * React sources (`packages/react/src/**\/*.{ts,tsx}`), the
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

/** `text` with its comments blanked (line numbers kept): prose about a select is not a select. */
export function withoutComments(text) {
  const blank = (s) => s.replace(/[^\n]/g, ' ');
  return text
    .replace(/<!--[\s\S]*?-->/g, blank)
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    // a line comment, but not the // of a URL ("https://")
    .replace(/(^|[^:\\])\/\/[^\n]*/gm, (m, before) => before + blank(m.slice(before.length)));
}

/** Lines (1-based) that open a native select which is not the kit Select's form proxy. */
export function nativeSelects(source) {
  const text = withoutComments(source);
  const hits = [];
  for (const match of text.matchAll(/(?:createElement|\bh|\bjsxs?)\(\s*['"]select['"]/g)) hits.push(text.slice(0, match.index).split('\n').length);
  for (const match of text.matchAll(/<select[\s>]/g)) {
    // The proxy names itself in its own tag (JSX props span lines): look ahead, but never past the
    // element's end or the next select.
    const ahead = text.slice(match.index + 7, match.index + 400);
    const end = ahead.search(/<\/select>|<select[\s>]/);
    if ((end < 0 ? ahead : ahead.slice(0, end)).includes('data-uix-select-proxy')) continue;
    hits.push(text.slice(0, match.index).split('\n').length);
  }
  return hits.sort((a, b) => a - b);
}

const files = [
  ...walk(join(REPO, 'packages/react/src'), (name) => name.endsWith('.tsx') || (name.endsWith('.ts') && !name.endsWith('.d.ts'))),
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
  // comments are prose, not markup; a URL's // is not a comment
  assert.deepEqual(nativeSelects('/** a hidden `<select>` carries the value */\nconst x = 1; // <select> here too\n<!-- <select> -->'), []);
  assert.deepEqual(nativeSelects('const u = "https://x"; const s = "<select>";'), [1]);
  // built in code, not written as markup
  assert.deepEqual(nativeSelects("const el = document.createElement('select');"), [1]);
  assert.deepEqual(nativeSelects('return h("select", { value }, options);'), [1]);
  assert.deepEqual(nativeSelects("jsx('select', { children })"), [1]);
});

test('no native <select> in the React sources, the docs, the guide or any tokens page', () => {
  console.log(`no-native-select: inspected ${files.length} files`);
  assert.ok(files.length > 40, `only ${files.length} files inspected: the walk is broken`);
  const found = files.flatMap((file) => nativeSelects(readFileSync(file, 'utf8')).map((line) => `${relative(REPO, file).replace(/\\/g, '/')}:${line}`));
  assert.deepEqual(found, [], 'use the kit Select (React) or selectMarkup() from docs/form-specimens.js (static pages)');
});
