/* CSS size budget — tracks the shipped/authored CSS payload so a refactor can't
 * silently balloon the bytes every product downloads.
 *
 * Two kinds of file, gated differently (paths are relative to the tokens package
 * root, so this runs as `node scripts/size-report.mjs` from packages/tokens):
 *
 *   • TRACKED FILES — one baseline entry each, in tests/css-size.baseline.json:
 *       every styles/components/*.css, plus every other stylesheet the two bundle
 *       entries (styles/main.css, styles/components.css) reach through @import
 *       (base, utilities, motion, forced-colors, the generated build/css/tokens.css).
 *       Together they are every byte that goes into a bundle.
 *   • BUNDLES — build/css/styles.css and build/css/components.css. They have NO
 *       baseline entry. A bundle is the minified concatenation of tracked files, so
 *       its size follows from theirs, and a stored number for it is a line every CSS
 *       change rewrites: on 2026-10-07 that made ten parallel PRs conflict with each
 *       other on files none of them had authored. What a bundle can still get wrong
 *       on its own is the build step (minification lost, an input inlined twice), so
 *       that is what is checked: bundle raw bytes ÷ the raw bytes of its inputs must
 *       stay under BUNDLE_MAX_RATIO. It is ~0.74 minified and ~1.00 unminified.
 *
 * For each file it computes raw byte length, gzip size, and brotli size via
 * node:zlib. Compression levels are PINNED so numbers are reproducible across
 * machines and Node versions:
 *   • gzip   — level 9  (zlib.constants.Z_BEST_COMPRESSION)
 *   • brotli — quality 11 (zlib.constants.BROTLI_MAX_QUALITY), text mode
 * These are the max levels; a transport (nginx, CDN) will usually ship SMALLER
 * bytes at a lower runtime level, so the brotli figure here is a conservative
 * floor on the wire cost, stable enough to diff.
 *
 * Modes:
 *   (default)  print a human-readable table, sorted largest-first by RAW bytes,
 *              columns: file | raw | gzip | brotli (bundles included).
 *   --check    compare each tracked file to its baseline entry; exit 1 if any
 *              metric grew past the per-file tolerance. Tolerance is
 *              max(2% of baseline, 64 bytes) — the 64-byte floor gives small
 *              files (a 400-byte component) real slack for a comment tweak. A file
 *              present now but ABSENT from the baseline FAILS (run --update to adopt
 *              it); a file in the baseline but MISSING now also FAILS (a
 *              deleted/renamed source is a real change to acknowledge). Then the
 *              bundle ratio above.
 *   --update   rewrite ONLY the entries that are out of tolerance (grown or
 *              shrunk), new, or gone; every other entry keeps its recorded numbers
 *              byte for byte. So the diff of an --update is exactly the files that
 *              change resized, and two PRs that touch different stylesheets never
 *              edit the same baseline lines.
 *
 * --root <dir> points the script at another package root (the tests use a fixture).
 *
 * Node built-ins only — no deps. Run: npm run size:css / npm run size:css:update
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join, posix, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync, brotliCompressSync, constants as zlibConstants } from 'node:zlib';

const args = process.argv.slice(2);
const rootArg = args.indexOf('--root');
const PKG = rootArg === -1
  ? join(dirname(fileURLToPath(import.meta.url)), '..') // packages/tokens
  : resolve(args[rootArg + 1]);
const BASELINE_REL = join('tests', 'css-size.baseline.json');
const BASELINE_PATH = join(PKG, BASELINE_REL);

// ── Pinned compression settings (see header) ─────────────────────────────────
const GZIP_LEVEL = zlibConstants.Z_BEST_COMPRESSION; // 9
const BROTLI_QUALITY = zlibConstants.BROTLI_MAX_QUALITY; // 11

// ── Per-file tolerance ───────────────────────────────────────────────────────
const TOLERANCE_PCT = 0.02; // 2% of baseline
const TOLERANCE_MIN_BYTES = 64; // absolute floor so tiny files aren't hair-triggered
const tolerance = (baseline) => Math.max(Math.ceil(baseline * TOLERANCE_PCT), TOLERANCE_MIN_BYTES);
const METRICS = ['raw', 'gzip', 'brotli'];

// ── Bundles: built output → the authored entry it is built from ──────────────
const BUNDLES = {
  'build/css/styles.css': 'styles/main.css',
  'build/css/components.css': 'styles/components.css',
};
const BUNDLE_MAX_RATIO = 0.85; // bundle raw ÷ inputs raw (see header)

// ── File enumeration (relative POSIX keys, stable-sorted) ────────────────────
// The stylesheets an entry file pulls in, followed through @import down to the
// files that hold rules. Aggregators (main.css, component-list.css, the tokens.css
// re-export) contribute nothing but their imports, so they are not inputs themselves.
function bundleInputs(entryRel) {
  const leaves = new Set();
  const visit = (rel, importedFrom) => {
    const abs = join(PKG, rel);
    if (!existsSync(abs)) {
      throw new Error(
        `missing file: ${rel}${importedFrom ? ` (imported from ${importedFrom})` : ''} — run \`npm run build\` (from repo root) before size-report.`,
      );
    }
    const css = readFileSync(abs, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const imports = [...css.matchAll(/@import\s+(?:url\(\s*)?["']([^"']+)["']/g)].map((m) => m[1]);
    if (!imports.length) leaves.add(rel);
    for (const target of imports) visit(posix.join(posix.dirname(rel), target), rel);
  };
  visit(entryRel);
  return [...leaves].sort();
}

function collectFiles() {
  const compDir = join(PKG, 'styles', 'components');
  const components = readdirSync(compDir)
    .filter((n) => n.endsWith('.css'))
    .map((n) => `styles/components/${n}`);
  const bundled = Object.values(BUNDLES).flatMap(bundleInputs);
  return [...new Set([...components, ...bundled])].sort();
}

function measure(relPath) {
  const abs = join(PKG, relPath);
  if (!existsSync(abs)) {
    throw new Error(
      `missing file: ${relPath} — run \`npm run build\` (from repo root) before size-report.`,
    );
  }
  const buf = readFileSync(abs);
  return {
    raw: buf.length,
    gzip: gzipSync(buf, { level: GZIP_LEVEL }).length,
    brotli: brotliCompressSync(buf, {
      params: {
        [zlibConstants.BROTLI_PARAM_QUALITY]: BROTLI_QUALITY,
        [zlibConstants.BROTLI_PARAM_MODE]: zlibConstants.BROTLI_MODE_TEXT,
        [zlibConstants.BROTLI_PARAM_SIZE_HINT]: buf.length,
      },
    }).length,
  };
}

// { relPath: {raw, gzip, brotli} } for every tracked file.
function measureAll() {
  const out = {};
  for (const rel of collectFiles()) out[rel] = measure(rel);
  return out;
}

// [{ file, entry, inputsRaw, ratio, raw, gzip, brotli }] for the two bundles.
function measureBundles() {
  return Object.entries(BUNDLES).map(([file, entry]) => {
    const inputsRaw = bundleInputs(entry).reduce((sum, rel) => sum + readFileSync(join(PKG, rel)).length, 0);
    const size = measure(file);
    return { file, entry, inputsRaw, ratio: size.raw / inputsRaw, ...size };
  });
}

// ── Formatting helpers ───────────────────────────────────────────────────────
const fmtBytes = (n) => `${n.toLocaleString('en-US')} B`;
const fmtRatio = (r) => `${(r * 100).toFixed(1)}%`;
function pad(s, w) {
  s = String(s);
  return s.length >= w ? s : s + ' '.repeat(w - s.length);
}
function padStart(s, w) {
  s = String(s);
  return s.length >= w ? s : ' '.repeat(w - s.length) + s;
}

function printTable(sizes) {
  const rows = Object.entries(sizes)
    .map(([file, s]) => ({ file, ...s }))
    .sort((a, b) => b.raw - a.raw); // largest RAW first

  const fileW = Math.max('file'.length, ...rows.map((r) => r.file.length));
  const rawW = Math.max('raw'.length, ...rows.map((r) => fmtBytes(r.raw).length));
  const gzW = Math.max('gzip'.length, ...rows.map((r) => fmtBytes(r.gzip).length));
  const brW = Math.max('brotli'.length, ...rows.map((r) => fmtBytes(r.brotli).length));

  const line = (a, b, c, d) => `  ${pad(a, fileW)}  ${padStart(b, rawW)}  ${padStart(c, gzW)}  ${padStart(d, brW)}`;

  console.log(`\nCSS size report — ${rows.length} files (gzip=${GZIP_LEVEL}, brotli=${BROTLI_QUALITY}), sorted by raw bytes:\n`);
  console.log(line('file', 'raw', 'gzip', 'brotli'));
  console.log(`  ${'-'.repeat(fileW)}  ${'-'.repeat(rawW)}  ${'-'.repeat(gzW)}  ${'-'.repeat(brW)}`);
  for (const r of rows) console.log(line(r.file, fmtBytes(r.raw), fmtBytes(r.gzip), fmtBytes(r.brotli)));
  console.log('');
}

// Stable, sorted-key JSON so --update diffs stay clean.
function serializeBaseline(sizes) {
  const sorted = {};
  for (const key of Object.keys(sizes).sort()) sorted[key] = sizes[key];
  const payload = {
    _note:
      'CSS size budget baseline (PERF-2). Written by `npm run size:css:update` (scripts/size-report.mjs --update). ' +
      `Sizes in bytes; gzip level ${GZIP_LEVEL}, brotli quality ${BROTLI_QUALITY}. ` +
      `\`npm run size:css\` (--check) fails if any file's raw, gzip or brotli size grows past max(${TOLERANCE_PCT * 100}%, ${TOLERANCE_MIN_BYTES}B) vs these numbers, ` +
      'or if a tracked file is added/removed. --update rewrites only the entries that are out of tolerance, new or gone, ' +
      'so an entry changes only in the PR that resized that file. The two bundles (build/css/styles.css, components.css) ' +
      'deliberately have no entry: they are checked against the sum of their inputs instead.',
    sizes: sorted,
  };
  return JSON.stringify(payload, null, 2) + '\n';
}

function loadBaseline() {
  if (!existsSync(BASELINE_PATH)) return null;
  return JSON.parse(readFileSync(BASELINE_PATH, 'utf8')).sizes;
}

// A bundle the baseline still lists is a leftover from before bundles stopped being tracked
// (or a bad merge resolution); it is dropped by --update like any other entry with no file.
const isBundle = (file) => file in BUNDLES;

function runCheck() {
  const baseline = loadBaseline();
  if (!baseline) {
    console.error(`✗ size baseline not found: ${BASELINE_REL} — run \`npm run size:css:update\` to create it.`);
    process.exit(1);
  }
  const current = measureAll();
  const problems = [];

  // files missing now that were in the baseline
  for (const file of Object.keys(baseline)) {
    if (isBundle(file)) problems.push(`${file}: bundles are no longer baselined (run --update to drop the entry).`);
    else if (!(file in current)) problems.push(`${file}: in baseline but MISSING now (deleted/renamed — run --update if intentional).`);
  }
  for (const [file, cur] of Object.entries(current)) {
    const base = baseline[file];
    if (!base) {
      problems.push(`${file}: NEW file not in baseline (run --update to adopt it).`);
      continue;
    }
    for (const metric of METRICS) {
      const tol = tolerance(base[metric]);
      const delta = cur[metric] - base[metric];
      if (delta > tol) {
        problems.push(
          `${file}: ${metric} grew ${fmtBytes(base[metric])} → ${fmtBytes(cur[metric])} (+${delta} B) — over tolerance ${tol} B.`,
        );
      }
    }
  }

  // Not fixable by --update: the build step itself regressed.
  const bundles = measureBundles();
  const broken = bundles.filter((b) => b.ratio > BUNDLE_MAX_RATIO);

  if (problems.length) {
    console.error(`✗ css-size FAILED — ${problems.length} file(s) over budget or changed:`);
    for (const p of problems) console.error(`  • ${p}`);
    console.error('\n  If these changes are intentional, run: npm run size:css:update');
  }
  if (broken.length) {
    console.error(`✗ css-size FAILED — ${broken.length} bundle(s) too large for what they contain:`);
    for (const b of broken) {
      console.error(
        `  • ${b.file}: ${fmtBytes(b.raw)} is ${fmtRatio(b.ratio)} of its inputs (${fmtBytes(b.inputsRaw)} reached from ${b.entry}); ` +
          `the limit is ${fmtRatio(BUNDLE_MAX_RATIO)}. Minification was lost or an input is bundled twice — look at scripts/build-styles.mjs and the @import lists.`,
      );
    }
  }
  if (problems.length || broken.length) process.exit(1);

  const n = Object.keys(current).length;
  console.log(`✓ css-size OK — ${n} files within raw/gzip/brotli tolerance (max(${TOLERANCE_PCT * 100}%, ${TOLERANCE_MIN_BYTES}B)) vs baseline.`);
  for (const b of bundles) {
    console.log(
      `  ${b.file}: ${fmtBytes(b.raw)} raw, ${fmtBytes(b.gzip)} gzip, ${fmtBytes(b.brotli)} brotli — ${fmtRatio(b.ratio)} of its inputs (limit ${fmtRatio(BUNDLE_MAX_RATIO)}).`,
    );
  }
}

function runUpdate() {
  const baseline = loadBaseline() ?? {};
  const current = measureAll();
  const next = {};
  const changed = [];

  for (const [file, cur] of Object.entries(current)) {
    const base = baseline[file];
    if (!base) {
      next[file] = cur;
      changed.push(`+ ${file} (new)`);
    } else if (METRICS.some((metric) => Math.abs(cur[metric] - base[metric]) > tolerance(base[metric]))) {
      next[file] = cur;
      changed.push(`~ ${file} (raw ${fmtBytes(base.raw)} → ${fmtBytes(cur.raw)})`);
    } else {
      next[file] = base; // within tolerance: keep the recorded numbers, so this entry stays out of the diff
    }
  }
  for (const file of Object.keys(baseline)) {
    if (!(file in current)) changed.push(`- ${file} (${isBundle(file) ? 'bundles are no longer baselined' : 'gone'})`);
  }

  writeFileSync(BASELINE_PATH, serializeBaseline(next));
  console.log(`✓ wrote ${BASELINE_REL} — ${Object.keys(next).length} files, ${changed.length} entr${changed.length === 1 ? 'y' : 'ies'} changed.`);
  for (const c of changed) console.log(`  ${c}`);
}

// ── CLI ──────────────────────────────────────────────────────────────────────
if (args.includes('--check')) runCheck();
else if (args.includes('--update')) runUpdate();
else printTable({ ...measureAll(), ...Object.fromEntries(measureBundles().map(({ file, raw, gzip, brotli }) => [file, { raw, gzip, brotli }])) });
