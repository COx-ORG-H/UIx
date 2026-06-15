/* Per-product theme build — themes/<name>.tokens.json -> themes/<name>.css.
 *
 * Run: npm run build:themes
 *
 * Each product sets only the write-only brand slots; accent/link/ring/brand-muted re-chain via
 * @uix/tokens/css. The allowlist keeps the "one contract" guarantee: products override brand,
 * not arbitrary tokens. Widen ALLOWED deliberately if a product genuinely needs more. */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const DIR = join(ROOT, '..', 'themes');
const ALLOWED = new Set(['brand', 'brand-fg']);

const files = (await readdir(DIR)).filter((f) => f.endsWith('.tokens.json'));
for (const f of files) {
  const name = basename(f, '.tokens.json');
  const spec = JSON.parse(await readFile(join(DIR, f), 'utf8'));
  const light = [];
  const dark = [];
  for (const [token, modes] of Object.entries(spec)) {
    if (!ALLOWED.has(token)) {
      throw new Error(`themes/${f}: "${token}" is not an allowed override (allowed: ${[...ALLOWED].join(', ')}).`);
    }
    if (modes.light != null) light.push(`--uix-${token}: ${modes.light};`);
    if (modes.dark != null) dark.push(`--uix-${token}: ${modes.dark};`);
  }
  let css = `/* GENERATED — do not edit. Brand override for "${name}". Source: themes/${f}; build: npm run build:themes.
   Sets only the write-only brand slots; accent/link/ring/brand-muted re-chain via @uix/tokens/css. */
:root { ${light.join(' ')} }
`;
  if (dark.length) css += `:root:where(.dark,[data-theme="dark"]) { ${dark.join(' ')} }\n`;
  await writeFile(join(DIR, `${name}.css`), css);
  console.log(`✓ themes/${name}.css`);
}
