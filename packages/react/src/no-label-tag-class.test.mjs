/* `.uix-label` is the Label tag pill (Label.tsx renders it on a <span>), never a form label (HAR-1573).
 *
 * It has been put on a <label> twice: PromptDialog's input label rendered as a blue pill (2.x), then
 * FilterPopover wrapped its control in a tinted band with 1 px below the select. A scoped layout rule
 * (`.uix-filter-popover .uix-label { display: grid }`) hid the layout side of the collision, so nobody
 * saw the visual side. Form labels are `.uix-field__label` (or React `Field`); labels.css now also
 * scopes the pill to `.uix-label:not(label)`, and this guard keeps the markup from coming back.
 *
 * Scans the React sources, the docs and guide, tables.html and the plain-CSS example, in source form
 * (JSX `className=`, HTML `class=`, and HTML inside JS strings with escaped quotes).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../../..');

/** A <label> start tag whose class / className names uix-label (not uix-label__dot or uix-label-x). */
const LABEL_WITH_TAG_CLASS = /<label\b[^>]*\bclass(?:Name)?\s*=[^>]*?(?<![\w-])uix-label(?![\w-])/g;

const ROOTS = [
  'packages/react/src',
  'packages/tokens/docs',
  'packages/tokens/guide',
  'packages/tokens/tables.html',
  'examples',
];
const SOURCE = /\.(?:tsx?|jsx?|mjs|html)$/;

const files = [];
const visit = (path) => {
  if (statSync(path).isDirectory()) {
    for (const entry of readdirSync(path)) if (entry !== 'node_modules') visit(join(path, entry));
  } else if (SOURCE.test(path)) files.push(path);
};
for (const root of ROOTS) visit(resolve(repo, root));

const offenders = (text) => [...text.matchAll(LABEL_WITH_TAG_CLASS)].map((m) => m[0]);

// Fixtures are built by `label(...)` so this file never spells the forbidden tag itself, and the
// issue's grep check (`<label[^>]*uix-label` over packages/) stays empty.
const label = (attrs, rest = '') => `${'<'}label ${attrs}>${rest}`;

test('the pattern catches every way the tag class lands on a label element (fixture)', () => {
  for (const bad of [
    label('className="uix-label"'),
    label('className="uix-label"', '<span>Status</span>'),
    label("className='x uix-label y'"),
    label("htmlFor={id} className={cx('uix-label', className)}"),
    label('class="uix-label"'),
    label('for="a" class="uix-field uix-label"'),
    `"html": "<div>${label('class=\\"uix-label\\"', '<span>Status</span>')}</div>"`,
  ]) assert.equal(offenders(bad).length, 1, `missed: ${bad}`);
});

test('the pattern leaves field labels, the pill and its parts alone (fixture)', () => {
  for (const good of [
    label('className="uix-field__label" htmlFor={id}'),
    label('class="uix-field__label" for="x"', 'Status'),
    '<span className="uix-label">P1</span>',
    '<span class=\\"uix-label\\"><span class=\\"uix-label__dot\\"></span>Bug</span>',
    label('className="uix-label-row"'),
    label('className="uix-checkbox"', '<span className="uix-label">tag</span>'),
  ]) assert.deepEqual(offenders(good), [], `false positive: ${good}`);
});

test('the scan sees the sources it guards', () => {
  const rel = new Set(files.map((f) => relative(repo, f).replaceAll('\\', '/')));
  for (const must of ['packages/react/src/components/TableControls.tsx', 'packages/react/src/components/Label.tsx', 'packages/tokens/docs/showcase-data.js', 'packages/tokens/tables.html']) {
    assert.ok(rel.has(must), `${must} is not scanned — did the layout move?`);
  }
});

test('no <label> carries .uix-label (the tag pill); form labels use .uix-field__label', () => {
  const found = files.flatMap((file) => offenders(readFileSync(file, 'utf8'))
    .map((tag) => `${relative(repo, file).replaceAll('\\', '/')}: ${tag.slice(0, 120)}`));
  assert.deepEqual(found, []);
});
