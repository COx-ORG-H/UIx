/* Parity gate — proves the generated CSS still matches the v2-launch --uix-* contract.
 *
 * Run: npm run test:parity   (after: npm run build:tokens)
 *
 * Compares build/css/tokens.css against tests/tokens.baseline.css (a frozen snapshot of the
 * original hand-authored styles/tokens.css). Bar is SEMANTIC equivalence: same selectors, same
 * --uix-* names per selector, same values (whitespace-normalized). The runtime tokens
 * (var(--uix-brand,…), color-mix(…)) must match exactly — that is the regression that would
 * silently break every product's live brand override.
 *
 * A deliberate token change means updating both tokens/ AND tests/tokens.baseline.css in the
 * same reviewed commit. */
import postcss from 'postcss';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));

async function parse(path) {
  const root = postcss.parse(await readFile(path, 'utf8'));
  const map = {}; // selector -> { --uix-*: value }
  root.walkRules((rule) => {
    const sel = rule.selector.replace(/\s+/g, ' ').trim();
    (map[sel] ??= {});
    rule.walkDecls((d) => {
      if (d.prop.startsWith('--uix-')) map[sel][d.prop] = d.value.replace(/\s+/g, ' ').trim();
    });
  });
  return map;
}

const baseline = await parse(join(ROOT, '..', 'tests', 'tokens.baseline.css'));
const generated = await parse(join(ROOT, '..', 'build', 'css', 'tokens.css'));
const problems = [];

const selsA = Object.keys(baseline);
const selsB = Object.keys(generated);
for (const s of selsA) if (!(s in generated)) problems.push(`missing selector in generated: ${s}`);
for (const s of selsB) if (!(s in baseline)) problems.push(`extra selector in generated: ${s}`);

for (const sel of selsA.filter((s) => s in generated)) {
  const a = baseline[sel];
  const b = generated[sel];
  for (const prop of Object.keys(a)) {
    if (!(prop in b)) problems.push(`${sel}: missing ${prop}`);
    else if (a[prop] !== b[prop]) problems.push(`${sel}: ${prop} = "${b[prop]}" but baseline = "${a[prop]}"`);
  }
  for (const prop of Object.keys(b)) {
    if (!(prop in a)) problems.push(`${sel}: extra ${prop} = "${b[prop]}"`);
  }
}

if (problems.length) {
  console.error(`✗ parity FAILED — ${problems.length} mismatch(es):`);
  for (const p of problems) console.error(`  • ${p}`);
  process.exit(1);
}
const count = Object.values(generated).reduce((n, m) => n + Object.keys(m).length, 0);
console.log(`✓ parity OK — ${selsB.length} selectors, ${count} --uix-* declarations match the baseline.`);
