#!/usr/bin/env node
/**
 * Emits tokens.css, shadcn-bridge.css, tailwind.css, theme-contract.json
 * from tokens.json — the single source. Never hand-edit the emitted files.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const pkgDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = JSON.parse(readFileSync(join(pkgDir, 'tokens.json'), 'utf8'));
const p = src.prefix;

const header = (what) =>
  `/* @${p}/tokens v${src.version} — ${what}\n * GENERATED from tokens.json by scripts/build.mjs — do not hand-edit.\n * Values: ITSMx Docs/design-system.md (Ramp-calibrated). */\n`;

// ---- tokens.css ------------------------------------------------------------
const light = [];
const dark = [];
for (const [name, t] of Object.entries(src.tokens)) {
  light.push(`  --${p}-${name}: ${t.light};`);
  if (t.dark !== undefined) dark.push(`  --${p}-${name}: ${t.dark};`);
}
const tokensCss = `${header('Layer 0 values, light + dark')}
:root {
${light.join('\n')}
}

/* Dark — answers BOTH conventions. :root:where(...) keeps specificity at
 * exactly (0,1,0): it ties the light block and any consumer override written
 * after the @import, so source order decides. Contract requirement: the
 * .dark class or data-theme attribute lives on <html>. */
:root:where(.dark, [data-theme="dark"]) {
${dark.join('\n')}
}
`;

// ---- shadcn-bridge.css -----------------------------------------------------
const bridgeCss = `${header('shadcn semantic names -> --' + p + '-* tokens')}
/* No dark block needed: the --${p}-* values flip underneath the mapping. */
:root {
${Object.entries(src.bridge).map(([k, v]) => `  ${k}: ${v};`).join('\n')}
}
`;

// ---- tailwind.css ----------------------------------------------------------
const tailwindCss = `${header('optional @theme inline utility bindings')}
/* Safe to import from node_modules: @theme entries are definitions, not
 * class usages, so Tailwind v4's source scanning is not involved (L47). */
@theme inline {
${Object.entries(src.tailwind).map(([k, v]) => `  ${k}: ${v};`).join('\n')}
}
`;

// ---- theme-contract.json ---------------------------------------------------
const contract = {
  version: src.version,
  prefix: p,
  tokens: Object.entries(src.tokens).map(([name, t]) => ({
    name: `--${p}-${name}`,
    type: t.type,
    modes: { light: true, dark: t.dark !== undefined },
  })),
  bridge: Object.keys(src.bridge),
};

writeFileSync(join(pkgDir, 'tokens.css'), tokensCss);
writeFileSync(join(pkgDir, 'shadcn-bridge.css'), bridgeCss);
writeFileSync(join(pkgDir, 'tailwind.css'), tailwindCss);
writeFileSync(join(pkgDir, 'theme-contract.json'), JSON.stringify(contract, null, 2) + '\n');
console.log(`built @${p}/tokens v${src.version}: ${contract.tokens.length} tokens, ${contract.bridge.length} bridge names`);
