/* CSS size budget — tracks the shipped/authored CSS payload so a refactor can't
 * silently balloon the bytes every product downloads.
 *
 * Enumerates two sets of files (paths are relative to the tokens package root, so
 * this runs as `node scripts/size-report.mjs` from packages/tokens):
 *   • every styles/components/*.css  (the hand-authored per-component sources)
 *   • build/css/{tokens,components,styles}.css  (the three bundled outputs)
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
 *              columns: file | raw | gzip | brotli.
 *   --check    compare each file to tests/css-size.baseline.json; exit 1 if any
 *              file's RAW size grew past the per-file tolerance. Tolerance is
 *              max(2% of baseline raw, 64 bytes) — the 64-byte floor gives small
 *              files (a 400-byte component) real slack for a comment tweak while
 *              2% keeps the big bundles honest. A file present now but ABSENT from
 *              the baseline FAILS --check (run --update to adopt it); a file in the
 *              baseline but MISSING now also FAILS (a deleted/renamed source is a
 *              real change to acknowledge).
 *   --update   recompute every file and rewrite tests/css-size.baseline.json,
 *              pretty-printed with stable (sorted) key order for clean diffs.
 *
 * Node built-ins only — no deps. Run: npm run size:css / npm run size:css:update
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync, brotliCompressSync, constants as zlibConstants } from 'node:zlib';

const PKG = join(dirname(fileURLToPath(import.meta.url)), '..'); // packages/tokens
const BASELINE_REL = join('tests', 'css-size.baseline.json');
const BASELINE_PATH = join(PKG, BASELINE_REL);

// ── Pinned compression settings (see header) ─────────────────────────────────
const GZIP_LEVEL = zlibConstants.Z_BEST_COMPRESSION; // 9
const BROTLI_QUALITY = zlibConstants.BROTLI_MAX_QUALITY; // 11

// ── Per-file growth tolerance for --check ────────────────────────────────────
const TOLERANCE_PCT = 0.02; // 2% of baseline raw
const TOLERANCE_MIN_BYTES = 64; // absolute floor so tiny files aren't hair-triggered
const tolerance = (baselineRaw) => Math.max(Math.ceil(baselineRaw * TOLERANCE_PCT), TOLERANCE_MIN_BYTES);

// ── File enumeration (relative POSIX keys, stable-sorted) ────────────────────
function collectFiles() {
  const compDir = join(PKG, 'styles', 'components');
  const components = readdirSync(compDir)
    .filter((n) => n.endsWith('.css'))
    .sort()
    .map((n) => `styles/components/${n}`);
  const bundles = [
    'build/css/tokens.css',
    'build/css/components.css',
    'build/css/styles.css',
  ];
  return [...components, ...bundles];
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

// { relPath: {raw, gzip, brotli} }, keys inserted in stable (largest-raw-first is
// only for display; storage order below is alphabetical for clean diffs).
function measureAll() {
  const out = {};
  for (const rel of collectFiles()) out[rel] = measure(rel);
  return out;
}

// ── Formatting helpers ───────────────────────────────────────────────────────
const fmtBytes = (n) => `${n.toLocaleString('en-US')} B`;
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
  const totals = rows.reduce(
    (t, r) => ({ raw: t.raw + r.raw, gzip: t.gzip + r.gzip, brotli: t.brotli + r.brotli }),
    { raw: 0, gzip: 0, brotli: 0 },
  );

  console.log(`\nCSS size report — ${rows.length} files (gzip=${GZIP_LEVEL}, brotli=${BROTLI_QUALITY}), sorted by raw bytes:\n`);
  console.log(line('file', 'raw', 'gzip', 'brotli'));
  console.log(`  ${'-'.repeat(fileW)}  ${'-'.repeat(rawW)}  ${'-'.repeat(gzW)}  ${'-'.repeat(brW)}`);
  for (const r of rows) console.log(line(r.file, fmtBytes(r.raw), fmtBytes(r.gzip), fmtBytes(r.brotli)));
  console.log(`  ${'-'.repeat(fileW)}  ${'-'.repeat(rawW)}  ${'-'.repeat(gzW)}  ${'-'.repeat(brW)}`);
  console.log(line('TOTAL', fmtBytes(totals.raw), fmtBytes(totals.gzip), fmtBytes(totals.brotli)));
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
      `\`npm run size:css\` (--check) fails if any file's raw size grows past max(${TOLERANCE_PCT * 100}%, ${TOLERANCE_MIN_BYTES}B) vs these numbers, ` +
      'or if a tracked file is added/removed. A deliberate size change means re-running --update in the same reviewed commit.',
    sizes: sorted,
  };
  return JSON.stringify(payload, null, 2) + '\n';
}

function loadBaseline() {
  if (!existsSync(BASELINE_PATH)) {
    console.error(`✗ size baseline not found: ${BASELINE_REL} — run \`npm run size:css:update\` to create it.`);
    process.exit(1);
  }
  return JSON.parse(readFileSync(BASELINE_PATH, 'utf8')).sizes;
}

function runCheck() {
  const baseline = loadBaseline();
  const current = measureAll();
  const problems = [];

  // files missing now that were in the baseline
  for (const file of Object.keys(baseline)) {
    if (!(file in current)) problems.push(`${file}: in baseline but MISSING now (deleted/renamed — run --update if intentional).`);
  }
  for (const [file, cur] of Object.entries(current)) {
    const base = baseline[file];
    if (!base) {
      problems.push(`${file}: NEW file not in baseline (run --update to adopt it).`);
      continue;
    }
    for (const metric of ['raw', 'gzip', 'brotli']) {
      const tol = tolerance(base[metric]);
      const delta = cur[metric] - base[metric];
      if (delta > tol) {
        problems.push(
          `${file}: ${metric} grew ${fmtBytes(base[metric])} → ${fmtBytes(cur[metric])} (+${delta} B) — over tolerance ${tol} B.`,
        );
      }
    }
  }

  if (problems.length) {
    console.error(`✗ css-size FAILED — ${problems.length} file(s) over budget or changed:`);
    for (const p of problems) console.error(`  • ${p}`);
    console.error('\n  If these changes are intentional, run: npm run size:css:update');
    process.exit(1);
  }
  const n = Object.keys(current).length;
  console.log(`✓ css-size OK — ${n} files within raw/gzip/brotli tolerance (max(${TOLERANCE_PCT * 100}%, ${TOLERANCE_MIN_BYTES}B)) vs baseline.`);
}

function runUpdate() {
  const sizes = measureAll();
  writeFileSync(BASELINE_PATH, serializeBaseline(sizes));
  console.log(`✓ wrote ${BASELINE_REL} — ${Object.keys(sizes).length} files.`);
}

// ── CLI ──────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
if (args.includes('--check')) runCheck();
else if (args.includes('--update')) runUpdate();
else printTable(measureAll());
