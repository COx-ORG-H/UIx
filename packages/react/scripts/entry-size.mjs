#!/usr/bin/env node
/* Bundle budget for the main `@tensor_1/react` entry (roadmap #22). The chart entries have hard
 * limits in check-chart-preset-size.mjs; the main entry is a moving target that grows with every
 * component, so it is gated the way the CSS budget gates a stylesheet (packages/tokens/scripts/
 * size-report.mjs): a committed baseline, a per-metric tolerance, an --update that rewrites only
 * what moved.
 *
 * What is measured — each one an esbuild bundle of the BUILT dist (run the build first), minified,
 * for the browser, with every peer dependency external (React, ReactDOM, ECharts, Tiptap, marked,
 * the emoji data), as an application bundler would see it:
 *   • main (everything)    dist/index.js as an entry: every export kept. The ceiling a product
 *                          pays if it imports the whole surface, and the number that moves when a
 *                          component is added.
 *   • main → Button only   `export { Button } from 'dist/index.js'`. A tree-shaking probe: a module
 *                          with a top-level side effect (or a lost `sideEffects: false`) drags most
 *                          of the kit into a one-component import and shows up here first.
 * For each: minified bytes, gzip (level 9) and Brotli (quality 11, text mode), pinned so the numbers
 * are the same on every machine. The transport usually ships fewer bytes; this is a stable floor.
 *
 * Modes:
 *   (default)  print the table.
 *   --check    fail when any metric of any entry grew past max(2% of its baseline, 512 B), or an
 *              entry was added or removed without --update.
 *   --update   rewrite only the entries that are out of tolerance (either way), new or gone; the
 *              rest keep their recorded numbers byte for byte, so the diff is what this change moved.
 *   --json     with the default mode: print the measurements as JSON instead of the table.
 *
 * Baseline: packages/react/etc/entry-size.baseline.json.   npm run size / npm run size:update */
import { build } from 'esbuild';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { brotliCompressSync, constants as zlib, gzipSync } from 'node:zlib';

const PKG = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE_REL = 'etc/entry-size.baseline.json';
const BASELINE_PATH = join(PKG, BASELINE_REL);
export const METRICS = ['min', 'gzip', 'brotli'];
export const TOLERANCE_PCT = 0.02;
export const TOLERANCE_MIN_BYTES = 512;
export const tolerance = (baseline) => Math.max(Math.ceil(baseline * TOLERANCE_PCT), TOLERANCE_MIN_BYTES);

const INDEX = join(PKG, 'dist', 'index.js').replaceAll('\\', '/');
const ENTRIES = {
  'main (everything)': { entryPoints: [INDEX] },
  'main → Button only': { stdin: { contents: `export { Button } from ${JSON.stringify(INDEX)};`, resolveDir: PKG, loader: 'js' } },
};

function peerExternals() {
  const pkg = JSON.parse(readFileSync(join(PKG, 'package.json'), 'utf8'));
  // a peer and every subpath of it (react/jsx-runtime, echarts/core, @tiptap/pm/state, emojibase-data/…)
  return Object.keys(pkg.peerDependencies ?? {}).flatMap((name) => [name, `${name}/*`]);
}

export function compress(bytes) {
  return {
    min: bytes.length,
    gzip: gzipSync(bytes, { level: zlib.Z_BEST_COMPRESSION }).length,
    brotli: brotliCompressSync(bytes, {
      params: {
        [zlib.BROTLI_PARAM_QUALITY]: zlib.BROTLI_MAX_QUALITY,
        [zlib.BROTLI_PARAM_MODE]: zlib.BROTLI_MODE_TEXT,
        [zlib.BROTLI_PARAM_SIZE_HINT]: bytes.length,
      },
    }).length,
  };
}

async function measureAll() {
  if (!existsSync(INDEX)) {
    throw new Error('packages/react/dist/index.js is missing — run `npm run build:react` (or `npm run build -w @tensor_1/react`) first.');
  }
  const external = peerExternals();
  const out = {};
  for (const [name, input] of Object.entries(ENTRIES)) {
    const result = await build({
      ...input, bundle: true, minify: true, write: false, platform: 'browser', format: 'esm', target: 'es2020',
      external, logLevel: 'silent', define: { 'process.env.NODE_ENV': '"production"' },
    });
    out[name] = compress(result.outputFiles[0].contents);
  }
  return out;
}

/** The problems --check reports, as lines; empty when everything is within tolerance. */
export function compare(baseline, current) {
  const problems = [];
  for (const name of Object.keys(baseline)) {
    if (!(name in current)) problems.push(`${name}: in the baseline but no longer measured (run --update if intentional).`);
  }
  for (const [name, cur] of Object.entries(current)) {
    const base = baseline[name];
    if (!base) { problems.push(`${name}: NEW entry not in the baseline (run --update to adopt it).`); continue; }
    for (const metric of METRICS) {
      const delta = cur[metric] - base[metric];
      const tol = tolerance(base[metric]);
      if (delta > tol) problems.push(`${name}: ${metric} grew ${kb(base[metric])} → ${kb(cur[metric])} (+${delta} B), over the tolerance of ${tol} B.`);
    }
  }
  return problems;
}

/** The next baseline: out-of-tolerance (either way), new and gone entries change; the rest stay as recorded. */
export function nextBaseline(baseline, current) {
  const next = {};
  const changed = [];
  for (const [name, cur] of Object.entries(current)) {
    const base = baseline[name];
    if (!base) { next[name] = cur; changed.push(`+ ${name} (new)`); }
    else if (METRICS.some((m) => Math.abs(cur[m] - base[m]) > tolerance(base[m]))) { next[name] = cur; changed.push(`~ ${name} (brotli ${kb(base.brotli)} → ${kb(cur.brotli)})`); }
    else next[name] = base;
  }
  for (const name of Object.keys(baseline)) if (!(name in current)) changed.push(`- ${name} (gone)`);
  return { next, changed };
}

const kb = (n) => `${(n / 1000).toFixed(2)} kB`;

function printTable(sizes, baseline) {
  const w = Math.max(...Object.keys(sizes).map((n) => n.length));
  console.log(`\n@tensor_1/react entry sizes (esbuild, minified, peers external; gzip 9, brotli 11):\n`);
  console.log(`  ${'entry'.padEnd(w)}  ${'min'.padStart(10)}  ${'gzip'.padStart(10)}  ${'brotli'.padStart(10)}  vs baseline (brotli)`);
  for (const [name, s] of Object.entries(sizes)) {
    const base = baseline?.[name];
    const vs = base ? `${s.brotli - base.brotli >= 0 ? '+' : ''}${s.brotli - base.brotli} B (tolerance ${tolerance(base.brotli)} B)` : '—';
    console.log(`  ${name.padEnd(w)}  ${kb(s.min).padStart(10)}  ${kb(s.gzip).padStart(10)}  ${kb(s.brotli).padStart(10)}  ${vs}`);
  }
  console.log('');
}

function loadBaseline() {
  return existsSync(BASELINE_PATH) ? JSON.parse(readFileSync(BASELINE_PATH, 'utf8')).sizes : null;
}

function serialize(sizes) {
  return JSON.stringify({
    _note:
      'Bundle budget for the main @tensor_1/react entry (roadmap #22). Written by `npm run size:update -w @tensor_1/react` ' +
      '(scripts/entry-size.mjs --update). Bytes of an esbuild bundle of dist/, minified, peers external; gzip level 9, brotli quality 11. ' +
      `\`npm run size\` fails when a metric grows past max(${TOLERANCE_PCT * 100}%, ${TOLERANCE_MIN_BYTES} B) of these numbers. ` +
      '--update rewrites only the entries that moved past the tolerance.',
    sizes,
  }, null, 2) + '\n';
}

async function main(args) {
  const current = await measureAll();
  const baseline = loadBaseline();
  if (args.includes('--update')) {
    const { next, changed } = nextBaseline(baseline ?? {}, current);
    writeFileSync(BASELINE_PATH, serialize(next));
    console.log(`✓ wrote ${BASELINE_REL} — ${changed.length} entr${changed.length === 1 ? 'y' : 'ies'} changed.`);
    for (const line of changed) console.log(`  ${line}`);
    return 0;
  }
  if (args.includes('--check')) {
    if (!baseline) { console.error(`✗ entry-size baseline not found: ${BASELINE_REL} — run \`npm run size:update -w @tensor_1/react\`.`); return 1; }
    printTable(current, baseline);
    const problems = compare(baseline, current);
    if (problems.length) {
      console.error(`✗ entry-size FAILED — ${problems.length} problem(s):`);
      for (const p of problems) console.error(`  • ${p}`);
      console.error('\n  A deliberate growth (a new component): run `npm run size:update -w @tensor_1/react` and commit the baseline with the change.');
      console.error('  Unexpected growth of "Button only": a module with a top-level side effect, or an import that pulls a large module into a small one.');
      return 1;
    }
    console.log(`✓ entry-size OK — every entry within max(${TOLERANCE_PCT * 100}%, ${TOLERANCE_MIN_BYTES} B) of ${BASELINE_REL}.`);
    return 0;
  }
  if (args.includes('--json')) console.log(JSON.stringify(current, null, 2));
  else printTable(current, baseline);
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  process.exitCode = await main(process.argv.slice(2));
}
