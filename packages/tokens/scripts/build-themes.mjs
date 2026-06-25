/* Per-product theme build — themes/<name>.tokens.json -> themes/<name>.css.
 *
 * Run: npm run build:themes
 *
 * Each product sets only the write-only brand slots; accent/link/ring/brand-muted re-chain via
 * @tensor_1/tokens/css. The allowlist keeps the "one contract" guarantee: products override brand,
 * not arbitrary tokens. Widen ALLOWED deliberately if a product genuinely needs more. */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const DIR = join(ROOT, '..', 'themes');
// Brand-only is the floor (most products override just the accent). A product with a distinct
// surface identity (e.g. Mission Control's warm-beige + Geist) overrides this richer, reviewed
// "skin" set too — still a curated allowlist (no arbitrary token), so the "one contract" guarantee
// holds: products override VALUES of known names, never invent names. Widen deliberately.
const ALLOWED = new Set([
  'brand', 'brand-fg',
  // surfaces
  'bg-app', 'bg-subtle', 'bg-hover', 'bg-active', 'surface', 'surface-2', 'surface-3',
  'border', 'border-strong',
  // text
  'text', 'text-hushed', 'text-muted',
  // type + radius
  'font-sans', 'font-mono', 'radius-sm', 'radius-md',
  // status — both roles (TEXT: legible on the *-bg wash; SOLID: vivid fill/dot) + the washes
  'success', 'success-fg', 'success-bg', 'success-solid',
  'warning', 'warning-fg', 'warning-bg', 'warning-solid',
  'info', 'info-fg', 'info-bg', 'info-solid',
  'danger', 'danger-fg', 'danger-bg', 'danger-solid',
  // U1/U3 additive roles — overridable per-brand (amber-bg completes the SEV-3 ramp)
  'amber-bg',
  'attention', 'attention-bg', 'attention-text', 'attention-solid',
  'overdue', 'overdue-bg', 'overdue-text', 'overdue-solid',
  'row-selected-bg',
]);

const files = (await readdir(DIR)).filter((f) => f.endsWith('.tokens.json'));
for (const f of files) {
  const name = basename(f, '.tokens.json');
  const spec = JSON.parse(await readFile(join(DIR, f), 'utf8'));
  const light = [];
  const dark = [];
  for (const [token, modes] of Object.entries(spec)) {
    if (token.startsWith('__')) continue; // __comment etc. — doc keys, not tokens
    if (!ALLOWED.has(token)) {
      throw new Error(`themes/${f}: "${token}" is not an allowed override (allowed: ${[...ALLOWED].join(', ')}).`);
    }
    if (modes.light != null) light.push(`--uix-${token}: ${modes.light};`);
    if (modes.dark != null) dark.push(`--uix-${token}: ${modes.dark};`);
  }
  let css = `/* GENERATED — do not edit. Brand override for "${name}". Source: themes/${f}; build: npm run build:themes.
   Sets only the write-only brand slots; accent/link/ring/brand-muted re-chain via @tensor_1/tokens/css. */
:root { ${light.join(' ')} }
`;
  if (dark.length) css += `:root:where(.dark,[data-theme="dark"]) { ${dark.join(' ')} }\n`;
  await writeFile(join(DIR, `${name}.css`), css);
  console.log(`✓ themes/${name}.css`);
}
