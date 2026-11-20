/* Concentric corners (experiment, Smartphone OS motion study item 15). --uix-radius-inner is
 * outer radius minus inset, never below 0, resolved on every element so a nested surface reads the
 * nearest container's --uix-radius-outer / --uix-radius-inset. The computed radii are pinned in
 * tests/a11y/concentric-radius.spec.mjs; this file pins the token output and the CSS wiring. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';

const PKG = join(dirname(fileURLToPath(import.meta.url)), '..');
const FORMULA = 'max(var(--uix-radius-inner-min, 0px), calc(var(--uix-radius-outer) - var(--uix-radius-inset, 0px)))';
const norm = (s) => s.replace(/\s+/g, ' ').trim();

test('tokens.css declares --uix-radius-inner on every element, not on :root', async () => {
  const root = postcss.parse(await readFile(join(PKG, 'build/css/tokens.css'), 'utf8'));
  const where = new Map();
  root.walkDecls('--uix-radius-inner', (d) => where.set(norm(d.parent.selector), norm(d.value)));
  assert.deepEqual([...where.keys()], [':where(*)'], 'one declaration, on :where(*) (zero specificity)');
  assert.equal(where.get(':where(*)'), FORMULA);
  // the inputs are write-only slots: no root value, so outside a container the result is invalid
  // and var(--uix-radius-inner, <fallback>) falls back
  for (const slot of ['--uix-radius-outer', '--uix-radius-inset', '--uix-radius-inner-min']) {
    root.walkDecls(slot, (d) => assert.fail(`${slot} must not be declared in tokens.css (found on ${d.parent.selector})`));
  }
});

test('typed and Tailwind outputs expose radius-inner', async () => {
  const js = await readFile(join(PKG, 'build/ts/tokens.js'), 'utf8');
  assert.match(js, /"radius-inner": "var\(--uix-radius-inner\)"/);
  assert.ok(js.includes(`"radius-inner": ${JSON.stringify(FORMULA)}`), 'light keeps the expression, not a fallback lifted out of it');
  assert.match(await readFile(join(PKG, 'build/tailwind/theme.css'), 'utf8'), /--radius-uix-inner: var\(--uix-radius-inner\);/);
});

test('component CSS: no hand-computed concentric radius; each reader sits under a container that names its corner', async () => {
  const dir = join(PKG, 'styles/components');
  const readers = [];
  for (const file of (await readdir(dir)).filter((f) => f.endsWith('.css'))) {
    const css = await readFile(join(dir, file), 'utf8');
    postcss.parse(css).walkDecls(/radius$/, (d) => {
      assert.doesNotMatch(d.value, /calc\(\s*var\(--uix-radius-[a-z0-9-]+\)\s*-/,`${file}: ${d.parent.selector} { ${d.prop}: ${d.value} } — use --uix-radius-inner`);
    });
    if (css.includes('var(--uix-radius-inner')) {
      readers.push(file);
      assert.match(css, /--uix-radius-outer\s*:/, `${file} reads --uix-radius-inner but sets no --uix-radius-outer`);
    }
  }
  assert.deepEqual(readers.sort(), ['combobox.css', 'input.css', 'menu.css', 'rich-text.css', 'segmented.css', 'tabs.css', 'tag-input.css']);
  // the Select popup is the rounded box; its flat listbox passes the popup's corner on to the options
  const select = await readFile(join(dir, 'select.css'), 'utf8');
  assert.match(select, /\.uix-select__popup \{[^}]*--uix-radius-outer: var\(--uix-radius-md\)/);
  assert.match(select, /\.uix-select__popup \.uix-listbox \{[^}]*--uix-radius-outer: inherit; --uix-radius-inset: inherit;/);
});

test('the two concentric allowlist entries are retired', async () => {
  const { entries } = JSON.parse(await readFile(join(PKG, 'tests/raw-value-allowlist.json'), 'utf8'));
  assert.equal(entries.filter((e) => /--uix-radius-/.test(e.value) && e.prop === 'border-radius').length, 0);
});
