/* Per-consumer smoke build (ADR-0016 Decision 6).
 *
 * Proves the PUBLISHED artifacts actually work for a consumer: packs @tensor_1/tokens
 * and @tensor_1/react to tarballs, installs them into a throwaway project OUTSIDE the
 * workspace (so npm can't symlink and hide packaging bugs), then checks every
 * consumption mode:
 *   1. ESM bundle      — esbuild bundles app.tsx importing @tensor_1/react + @tensor_1/tokens/ts
 *   2. ESM import      — node imports the same at runtime
 *   3. CJS require     — node require()s @tensor_1/react (it ships a CJS build)
 *   4. export presence — require.resolve the CSS + theme + ./chart subpaths (files/exports)
 *   5. types           — tsc --noEmit type-checks app.tsx against the packed .d.ts
 *
 * Assumes the packages are built (CI runs build:all first). Run: npm run test:smoke
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, copyFileSync, writeFileSync, existsSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { removeConsumer } from './cleanup.mjs';
import { COMPONENT_ITEMS } from '../../packages/tokens/docs/docs.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const TOKENS = join(ROOT, 'packages', 'tokens');
const REACT = join(ROOT, 'packages', 'react');
const fwd = (p) => p.replace(/\\/g, '/');
const step = (m) => console.log(`\n• ${m}`);

// Invoke npm by running its CLI .js with node (npm_execpath is set by `npm run`).
// No shell -> space-safe args, cross-platform, no .cmd spawn issue, no DEP0190.
const NPM_CLI = process.env.npm_execpath;
// The normal CI path keeps npm. Set UIX_SMOKE_BUN to a Bun executable for a Bun-only local run.
const BUN_CLI = process.env.UIX_SMOKE_BUN;
const npm = (args, opts) => NPM_CLI
  ? execFileSync(process.execPath, [NPM_CLI, ...args], opts)
  : execFileSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', args, { ...opts, shell: process.platform === 'win32' });

// npm returns an array for a single package in older releases and a workspace-keyed
// object in npm 11. It may also append lifecycle notices after the JSON value.
function parseFirstJsonValue(output) {
  const objectStart = output.indexOf('{');
  const arrayStart = output.indexOf('[');
  const starts = [objectStart, arrayStart].filter((index) => index >= 0);
  const start = Math.min(...starts);
  if (!Number.isFinite(start)) throw new SyntaxError('npm pack did not return JSON.');
  const stack = [];
  let inString = false;
  let escaped = false;
  for (let index = start; index < output.length; index += 1) {
    const char = output[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === '[' || char === '{') stack.push(char);
    else if (char === ']' || char === '}') {
      stack.pop();
      if (stack.length === 0) return JSON.parse(output.slice(start, index + 1));
    }
  }
  throw new SyntaxError('npm pack returned incomplete JSON.');
}

// Preconditions: the build outputs the tarballs will capture must exist.
for (const f of [join(TOKENS, 'build', 'ts', 'tokens.js'), join(REACT, 'dist', 'index.js'), join(REACT, 'dist', 'index.cjs')]) {
  if (!existsSync(f)) {
    console.error(`✗ smoke: missing build artifact ${f}\n  Run \`npm run build:all\` first (CI does this before test:smoke).`);
    process.exit(1);
  }
}

const tmp = mkdtempSync(join(tmpdir(), 'uix-smoke-'));
let ok = false;
try {
  step(`temp consumer: ${tmp}`);

  const pack = (dir) => {
    // execFile + arg array (no shell string interpolation); shell:true so npm.cmd resolves on Windows.
    if (BUN_CLI) {
      const out = execFileSync(BUN_CLI, ['pm', 'pack', '--destination', tmp, '--quiet', '--ignore-scripts'], { cwd: dir, encoding: 'utf8' });
      const filename = basename(out.trim().split(/\r?\n/).at(-1) ?? '');
      if (!filename || !existsSync(join(tmp, filename))) throw new Error('bun pack did not create the expected tarball');
      return join(tmp, filename);
    }
    const out = npm(['pack', fwd(dir), '--pack-destination', fwd(tmp), '--json'], { cwd: ROOT, encoding: 'utf8' });
    const json = parseFirstJsonValue(out);
    const result = Array.isArray(json) ? json[0] : Object.values(json)[0];
    if (!result?.filename) throw new Error('npm pack JSON did not include a tarball filename.');
    return join(tmp, result.filename);
  };
  step('pack @tensor_1/tokens + @tensor_1/react');
  const tokensTgz = pack(TOKENS);
  const reactTgz = pack(REACT);

  step('write consumer package.json + copy fixture');
  writeFileSync(join(tmp, 'package.json'), JSON.stringify({
    name: 'uix-smoke-consumer',
    private: true,
    version: '0.0.0',
    dependencies: {
      '@tensor_1/tokens': `file:${fwd(tokensTgz)}`,
      '@tensor_1/react': `file:${fwd(reactTgz)}`,
      'react': '^18.3.1',
      'react-dom': '^18.3.1',
      '@types/react': '^18.3.0',
      '@types/react-dom': '^18.3.0',
      'echarts': '^5.6.0'
    }
  }, null, 2));
  copyFileSync(join(HERE, 'app.tsx'), join(tmp, 'app.tsx'));
  copyFileSync(join(HERE, 'tsconfig.json'), join(tmp, 'tsconfig.json'));
  copyFileSync(join(HERE, 'app-rich-text.tsx'), join(tmp, 'app-rich-text.tsx'));
  copyFileSync(join(HERE, 'tsconfig.rich-text.json'), join(tmp, 'tsconfig.rich-text.json'));

  step(`${BUN_CLI ? 'bun' : 'npm'} install (isolated; tarballs, no symlinks)`);
  if (BUN_CLI) execFileSync(BUN_CLI, ['install', '--no-save', '--silent'], { cwd: tmp, stdio: 'inherit' });
  else npm(['install', '--no-audit', '--no-fund', '--prefer-offline', '--silent'], { cwd: tmp, stdio: 'inherit' });

  step('verify the packed CSS module catalogue');
  const packedStyles = readdirSync(join(tmp, 'node_modules', '@tensor_1', 'tokens', 'styles', 'components'))
    .filter((file) => file.endsWith('.css')).map((file) => file.slice(0, -4)).sort();
  const documentedStyles = COMPONENT_ITEMS.filter((item) => !item.composite).map((item) => item.slug).sort();
  if (JSON.stringify(packedStyles) !== JSON.stringify(documentedStyles)) throw new Error('Packed CSS modules differ from the documentation catalogue');

  step('1. ESM bundle (esbuild)');
  // Bare specifier resolves from this module's dir up to the repo-root node_modules.
  const esbuild = await import('esbuild');
  const res = await esbuild.build({
    absWorkingDir: tmp,
    entryPoints: [join(tmp, 'app.tsx')],
    bundle: true,
    format: 'esm',
    jsx: 'automatic',
    external: ['react', 'react-dom', 'react/jsx-runtime'],
    outfile: join(tmp, 'out.mjs'),
    logLevel: 'silent',
  });
  if (res.errors?.length) throw new Error('esbuild bundle failed');

  step('2. ESM import (runtime)');
  execFileSync(process.execPath, ['--input-type=module', '-e',
    "import { Button, Pipeline, Flow } from '@tensor_1/react'; import { Chart, ChartMetric } from '@tensor_1/react/chart'; import { Chart as PresetChart, ChartLegend } from '@tensor_1/react/chart/preset'; import { cssVar } from '@tensor_1/tokens/ts'; import { ShieldCheckIcon, Icon, ICON_GLYPHS } from '@tensor_1/react/icons'; if(!ShieldCheckIcon||!Icon||!ICON_GLYPHS['shield-check']) process.exit(3); if(!Button||!Pipeline||!Flow||!Chart||!ChartMetric||!PresetChart||!ChartLegend||!cssVar?.accent) process.exit(3);"],
    { cwd: tmp, stdio: 'inherit' });

  step('3. CJS require + 4. export resolution');
  execFileSync(process.execPath, ['-e',
    "const u=require('@tensor_1/react'); const required=['Button','Card','Breadcrumbs','Combobox','RelativeTime','CardLink','DetailPage','ConfirmDialog','PromptDialog','AsyncOperationStatus','ViewMenu','FilterPopover','SavedViewMenu','Pipeline','PipelineStage','Flow','FlowNode','RuleBuilder','BuilderCanvas','SchedulingCalendar','DateRangePicker','RelationshipGraph','MatchReview','MetricInput','LicensePositionBar','BrandProfiles','DiffViewer','ColorPicker']; if(required.some(k=>!u[k])) process.exit(4);" +
    "['@tensor_1/tokens/css','@tensor_1/tokens/styles','@tensor_1/tokens/bundle','@tensor_1/tokens/components/button','@tensor_1/tokens/utilities','@tensor_1/tokens/motion','@tensor_1/tokens/tailwind','@tensor_1/tokens/themes/tensor','@tensor_1/react/chart','@tensor_1/react/chart/preset','@tensor_1/react/rich-text','@tensor_1/react/markdown','@tensor_1/react/emoji','@tensor_1/react/icons','@tensor_1/tokens/components/icon']" +
    ".forEach(s=>require.resolve(s));"],
    { cwd: tmp, stdio: 'inherit' });

  step('3b. ./markdown works with no optional peer installed (ESM + CJS)');
  execFileSync(process.execPath, ['--input-type=module', '-e',
    "import { createElement as h } from 'react'; import { renderToStaticMarkup } from 'react-dom/server'; import { Markdown } from '@tensor_1/react/markdown'; const html = renderToStaticMarkup(h(Markdown, null, '# T\\n\\n- [x] ok')); if (!html.includes('<h3>T</h3>') || !html.includes('checkbox')) process.exit(6);"],
    { cwd: tmp, stdio: 'inherit' });
  execFileSync(process.execPath, ['-e', "if (!require('@tensor_1/react/markdown').Markdown) process.exit(6);"], { cwd: tmp, stdio: 'inherit' });

  step('5. types (tsc --noEmit)');
  execFileSync(process.execPath, [join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc'), '--project', join(tmp, 'tsconfig.json')],
    { cwd: tmp, stdio: 'inherit' });

  step('6. React 19 peer compatibility (install + types + runtime import)');
  const react19 = ['react@^19.0.0', 'react-dom@^19.0.0', '@types/react@^19.0.0', '@types/react-dom@^19.0.0'];
  if (BUN_CLI) execFileSync(BUN_CLI, ['add', '--no-save', '--silent', ...react19], { cwd: tmp, stdio: 'inherit' });
  else npm(['install', '--no-save', '--no-audit', '--no-fund', '--prefer-offline', '--silent', ...react19], { cwd: tmp, stdio: 'inherit' });
  execFileSync(process.execPath, [join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc'), '--project', join(tmp, 'tsconfig.json')],
    { cwd: tmp, stdio: 'inherit' });
  execFileSync(process.execPath, ['--input-type=module', '-e',
    "import React from 'react'; import { RuleBuilder, ColorPicker } from '@tensor_1/react'; if(!React.version.startsWith('19.')||!RuleBuilder||!ColorPicker) process.exit(5);"],
    { cwd: tmp, stdio: 'inherit' });

  step('7. ./rich-text and ./emoji with the exact optional peers the package declares');
  const manifest = JSON.parse(readFileSync(join(tmp, 'node_modules', '@tensor_1', 'react', 'package.json'), 'utf8'));
  const optional = Object.keys(manifest.peerDependenciesMeta ?? {}).filter((name) => name !== 'echarts' && manifest.peerDependenciesMeta[name].optional);
  const bad = optional.filter((name) => !/^\d+\.\d+\.\d+$/.test(manifest.peerDependencies[name]));
  if (bad.length) throw new Error(`optional peers must be exact pins: ${bad.join(', ')}`);
  const peers = optional.map((name) => `${name}@${manifest.peerDependencies[name]}`);
  if (BUN_CLI) execFileSync(BUN_CLI, ['add', '--no-save', '--silent', ...peers], { cwd: tmp, stdio: 'inherit' });
  else npm(['install', '--no-save', '--no-audit', '--no-fund', '--prefer-offline', '--silent', ...peers], { cwd: tmp, stdio: 'inherit' });
  execFileSync(process.execPath, ['--input-type=module', '-e',
    "import { RichTextEditor, roundTripMarkdown } from '@tensor_1/react/rich-text'; import { EmojiPicker, ReactionBar, loadEmojiData } from '@tensor_1/react/emoji'; const md = 'Grüße {{name}} 👩‍💻\\n\\n| a | b |\\n|:-|-:|\\n| 1 | 2 |\\n'; if (!RichTextEditor || !EmojiPicker || !ReactionBar || !loadEmojiData || (await roundTripMarkdown(md)) !== md) process.exit(7);"],
    { cwd: tmp, stdio: 'inherit' });
  execFileSync(process.execPath, ['-e',
    "const r = require('@tensor_1/react/rich-text'); const e = require('@tensor_1/react/emoji'); if (!r.RichTextEditor || !r.roundTripMarkdown || !e.ReactionBar) process.exit(7);"],
    { cwd: tmp, stdio: 'inherit' });
  execFileSync(process.execPath, [join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc'), '--project', join(tmp, 'tsconfig.rich-text.json')],
    { cwd: tmp, stdio: 'inherit' });

  step('8. component inventory from the packed release (ESM + CJS)');
  execFileSync(process.execPath, ['--input-type=module', '-e', `
    import { readFileSync } from 'node:fs';
    import { createRequire } from 'node:module';
    const require = createRequire(import.meta.url);
    const specifier = '@tensor_1/react/component-inventory.json';
    const esm = JSON.parse(readFileSync(new URL(import.meta.resolve(specifier)), 'utf8'));
    const cjs = JSON.parse(readFileSync(require.resolve(specifier), 'utf8'));
    if (JSON.stringify(esm) !== JSON.stringify(cjs) || esm.schemaVersion !== 1) throw new Error('inventory mismatch');
    for (const name of ['Button', 'DataWorkspace', 'ChangeHighlight']) {
      if (!esm.components.some((item) => item.name === name && item.subpath === '.')) throw new Error('Missing ' + name);
    }
    for (const name of ['XIcon', 'XCircleIcon']) {
      if (!esm.components.some((item) => item.name === name && item.subpath === './icons')) throw new Error('Missing ' + name);
    }
    const modules = new Map();
    for (const { name, subpath } of esm.components) {
      const path = '@tensor_1/react' + (subpath === '.' ? '' : subpath.slice(1));
      if (!modules.has(path)) modules.set(path, [await import(path), require(path)]);
      for (const module of modules.get(path)) {
        if (!module[name] || !['function', 'object'].includes(typeof module[name])) throw new Error(path + ' missing component ' + name);
      }
    }
  `], { cwd: tmp, stdio: 'inherit' });

  if (process.env.UIX_SMOKE_BROWSER === '1') {
    step('9. packed CSS contrast in Chromium');
    execFileSync(process.execPath, ['--test', join(HERE, 'packed-contrast.test.mjs')], {
      cwd: ROOT, stdio: 'inherit', env: { ...process.env, UIX_PACKED_TOKENS: join(tmp, 'node_modules', '@tensor_1', 'tokens') },
    });
  }

  ok = true;
} finally {
  try { removeConsumer(tmp); } catch (error) { console.error(`Smoke directory kept at ${tmp}: ${error.message}`); }
}

console.log(ok ? '\n✓ smoke OK — packed packages install, import (ESM+CJS), resolve, and type-check with React 18 and 19 in an isolated consumer, including the rich-text/markdown/emoji subpaths.'
              : '\n✗ smoke FAILED');
process.exit(ok ? 0 : 1);
