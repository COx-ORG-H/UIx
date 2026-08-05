/* uix-classlint unit tests — run: node --test lint/
 * Also the drift guard: TEXT_CANON must match the .uix-text-* classes actually
 * defined in styles/components/typography.css (the closed set is one list, twice). */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanSource, isTextColorUtility, TEXT_CANON } from './uix-classlint.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

// ── canon ↔ CSS parity ──────────────────────────────────────────────────────────
test('TEXT_CANON matches the classes defined in typography.css exactly', () => {
  const css = readFileSync(join(HERE, '..', 'styles', 'components', 'typography.css'), 'utf8');
  const defined = new Set([...css.matchAll(/\.(uix-text-[a-z0-9-]+)\s*\{/g)].map((m) => m[1]));
  assert.deepEqual([...TEXT_CANON].sort(), [...defined].sort(),
    'the lint canon and typography.css drifted — update both together');
});

// ── rule 1: tailwind text-color on <button>/<a> ─────────────────────────────────
test('flags text-color utilities on <button> and <a>', () => {
  const src = `
    <button className="uix-btn text-white">Save</button>
    <a className="text-red-500 underline" href="/x">Delete</a>
  `;
  const f = scanSource(src).filter((x) => x.rule === 'tailwind-text-color');
  assert.equal(f.length, 2);
  assert.deepEqual(f.map((x) => x.token), ['text-white', 'text-red-500']);
});

test('flags variant-prefixed, opacity-suffixed, and arbitrary color values', () => {
  const src = `<button className="hover:text-emerald-400 dark:text-slate-100/80 text-[#ff0000] text-[var(--x)]">x</button>`;
  const f = scanSource(src).filter((x) => x.rule === 'tailwind-text-color');
  assert.deepEqual(f.map((x) => x.token),
    ['hover:text-emerald-400', 'dark:text-slate-100/80', 'text-[#ff0000]', 'text-[var(--x)]']);
});

test('does not flag size/alignment/wrap text utilities or non-target elements', () => {
  const src = `
    <button className="text-sm text-center text-ellipsis text-[13px]">ok</button>
    <div className="text-red-500">divs are out of scope</div>
    <span className="text-white">so are spans</span>
  `;
  assert.equal(scanSource(src).filter((x) => x.rule === 'tailwind-text-color').length, 0);
});

test('reads template-literal and clsx class fragments', () => {
  const src = '<button className={cx("uix-btn", active && "text-white")}>x</button>';
  const f = scanSource(src).filter((x) => x.rule === 'tailwind-text-color');
  assert.deepEqual(f.map((x) => x.token), ['text-white']);
});

test('multiline opening tags are scanned', () => {
  const src = `<a
      href="/y"
      className="text-blue-600"
    >y</a>`;
  assert.equal(scanSource(src).filter((x) => x.rule === 'tailwind-text-color').length, 1);
});

test('uix-classlint-ignore suppresses on the same or previous line', () => {
  const src = `
    {/* uix-classlint-ignore: measured, intentional */}
    <button className="text-white">x</button>
    <button className="text-white">y</button> {/* uix-classlint-ignore */}
  `;
  assert.equal(scanSource(src).filter((x) => x.rule === 'tailwind-text-color').length, 0);
});

// ── rule 2: unknown type classes ────────────────────────────────────────────────
test('flags any type-* class (the family does not exist)', () => {
  const src = `<span className="type-label">Name</span><div class="type-title-sm">t</div>`;
  const f = scanSource(src).filter((x) => x.rule === 'unknown-type-class');
  assert.deepEqual(f.map((x) => x.token), ['type-label', 'type-title-sm']);
});

test('flags uix-text-* outside the canon, accepts the canon', () => {
  const good = `<span className="uix-text-meta uix-text-label uix-text-data-hero">x</span>`;
  assert.equal(scanSource(good).length, 0);
  const bad = `<span className="uix-text-caption">x</span>`;
  const f = scanSource(bad);
  assert.equal(f.length, 1);
  assert.equal(f[0].token, 'uix-text-caption');
});

// ── helper sanity ───────────────────────────────────────────────────────────────
test('isTextColorUtility classification table', () => {
  const yes = ['text-white', 'text-red-500', 'text-slate-950/80', 'text-current', 'text-inherit',
    'text-transparent', 'md:hover:text-amber-300', 'text-[#abc]', 'text-[rgb(1,2,3)]', 'text-[oklch(0.5_0.1_200)]'];
  const no = ['text-sm', 'text-2xl', 'text-center', 'text-balance', 'text-clip', 'text-[13px]',
    'text-[1.2rem]', 'font-bold', 'uix-text-meta', 'text'];
  for (const t of yes) assert.equal(isTextColorUtility(t), true, `${t} should flag`);
  for (const t of no) assert.equal(isTextColorUtility(t), false, `${t} should not flag`);
});
