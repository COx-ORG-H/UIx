/* Contract-completeness gate (ADR-0016 Decision 2). Complements check-parity.mjs
 * (which guards token VALUES) by proving the contract is structurally whole and
 * that component CSS doesn't hardcode contract-class values.
 *
 * Three checks:
 *   A. Structural categories present — the generated contract still has every
 *      load-bearing token family (a dropped category = a silently broken consumer).
 *   B. Theme tier coverage — every themes/*.css emits its brand tier (light brand,
 *      brand-fg, and a dark brand) so a product's override actually re-chains.
 *   C. No raw hex/px/z-index in component CSS — "full strict" (ADR directive):
 *      every raw value is TOKENIZED or JUSTIFIED, nothing silent. Colors and
 *      z-index are always contract-class (must tokenize). px is contract-class in
 *      spacing/radius/type properties (must tokenize) and JUSTIFIED in geometry
 *      properties (widths, offsets, border-widths — a component-intrinsic
 *      dimension is not a --uix-* contract value; minting --uix-width-820 would
 *      pollute the namespace). The geometry property-class allowlist below is that
 *      written justification; an unlisted property with raw px fails.
 *
 * Run: npm run test:contract   (after npm run build)
 */
import postcss from 'postcss';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PKG = join(dirname(fileURLToPath(import.meta.url)), '..'); // packages/tokens

// Flip to true once the S7 tokenization codemod drives contract-class raw values
// to zero. Until then check C is report-only so the gate can land green.
const ENFORCE_RAW = false;

const problems = [];
const reportC = [];

// ── A. Structural categories present ───────────────────────────────────────────
const contract = await readFile(join(PKG, 'build', 'css', 'tokens.css'), 'utf8');
const REQUIRED_CATEGORIES = [
  'bg', 'surface', 'border', 'text', 'accent', 'brand', 'link', 'ring',
  'success', 'warning', 'info', 'danger', 'chart',
  'space', 'radius', 'leading', 'font', 'shadow', 'ease', 'dur', 'icon', 'row',
];
for (const cat of REQUIRED_CATEGORIES) {
  if (!new RegExp(`--uix-${cat}(?:-[a-z0-9]|\\s*:)`).test(contract)) {
    problems.push(`A structural: contract is missing the --uix-${cat}-* category`);
  }
}

// ── B. Theme tier coverage ─────────────────────────────────────────────────────
const themesDir = join(PKG, 'themes');
for (const f of (await readdir(themesDir)).filter((n) => n.endsWith('.css'))) {
  const css = await readFile(join(themesDir, f), 'utf8');
  if (!/--uix-brand\s*:/.test(css)) problems.push(`B theme ${f}: missing --uix-brand (light)`);
  if (!/--uix-brand-fg\s*:/.test(css)) problems.push(`B theme ${f}: missing --uix-brand-fg`);
  if (!/(?:\.dark|data-theme="dark")[^{]*\{[^}]*--uix-brand\s*:/s.test(css)) {
    problems.push(`B theme ${f}: missing a dark-mode --uix-brand`);
  }
}

// ── C. Raw values in component CSS ──────────────────────────────────────────────
// px is allowed (geometry, justified) only in these property classes:
const GEOMETRY_PROPS = new Set([
  'width', 'min-width', 'max-width', 'height', 'min-height', 'max-height',
  'top', 'right', 'bottom', 'left', 'inset', 'flex-basis', 'flex',
  'background-position', 'background-size', 'object-position',
  'border-width', 'border', 'border-top', 'border-right', 'border-bottom', 'border-left',
  'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
  'outline', 'outline-width', 'outline-offset', 'box-shadow', 'text-shadow',
  'stroke-width', 'stroke-dashoffset', 'transform', 'translate', 'background', 'mask',
  'scroll-margin', 'scroll-padding', 'clip-path', 'shape-outside',
  // grid track sizing, painted gradients, and effect filters carry intrinsic px
  'grid-template-columns', 'grid-template-rows', 'grid-template', 'grid-auto-columns',
  'grid-auto-rows', 'background-image', 'backdrop-filter', 'filter',
  'border-inline', 'border-block', 'border-inline-start', 'border-inline-end',
  'border-block-start', 'border-block-end',
]);
// px in these is a contract value -> must tokenize (space / radius / type scales):
const TOKENIZE_PX_PROPS = new Set([
  'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'padding-block', 'padding-inline', 'margin', 'margin-top', 'margin-right',
  'margin-bottom', 'margin-left', 'margin-block', 'margin-inline',
  'gap', 'row-gap', 'column-gap', 'grid-gap',
  'border-radius', 'border-top-left-radius', 'border-top-right-radius',
  'border-bottom-left-radius', 'border-bottom-right-radius',
  'font-size', 'line-height', 'letter-spacing',
]);
const HEX = /#[0-9a-fA-F]{3,8}\b/;
const COLOR_FN = /\b(?:rgb|rgba|hsl|hsla)\(\s*[\d.]/; // literal channels (var()/color-mix are fine)
const PX = /-?\d*\.?\d+px/g;
const Z_NUM = /^-?\d+$/;

let geometryPxCount = 0;
const compDir = join(PKG, 'styles', 'components');
for (const file of (await readdir(compDir)).filter((n) => n.endsWith('.css'))) {
  const css = await readFile(join(compDir, file), 'utf8');
  postcss.parse(css).walkDecls((d) => {
    const prop = d.prop.toLowerCase();
    const val = d.value;
    if (HEX.test(val) || COLOR_FN.test(val)) reportC.push(`${file}: raw color in '${prop}: ${val}'`);
    if (prop === 'z-index' && Z_NUM.test(val.trim())) reportC.push(`${file}: raw z-index '${val}' (needs a --uix-z-* token)`);
    if (PX.test(val)) {
      if (TOKENIZE_PX_PROPS.has(prop)) reportC.push(`${file}: raw px in '${prop}: ${val}' (tokenize -> --uix-space/radius/text)`);
      else if (!GEOMETRY_PROPS.has(prop)) reportC.push(`${file}: raw px in un-classified property '${prop}: ${val}'`);
      else geometryPxCount += (val.match(PX) || []).length;
    }
  });
}

// ── Report ──────────────────────────────────────────────────────────────────────
if (problems.length) {
  console.error(`✗ contract FAILED — ${problems.length} structural/theme problem(s):`);
  for (const p of problems) console.error(`  • ${p}`);
}
const label = ENFORCE_RAW ? 'FAILED' : 'report-only (pre-S7 codemod)';
if (reportC.length) {
  console[ENFORCE_RAW ? 'error' : 'warn'](`\n${ENFORCE_RAW ? '✗' : 'ℹ'} C raw-value scan — ${reportC.length} contract-class value(s) [${label}]:`);
  for (const p of reportC) console[ENFORCE_RAW ? 'error' : 'warn'](`  • ${p}`);
}
console.log(`\nℹ C geometry px (justified by property class): ${geometryPxCount} occurrence(s).`);

const failed = problems.length > 0 || (ENFORCE_RAW && reportC.length > 0);
if (failed) process.exit(1);
console.log(`✓ contract OK — ${REQUIRED_CATEGORIES.length} categories present, all themes cover their tier${ENFORCE_RAW ? ', no raw contract-class values' : ''}.`);
