/* Logical-properties gate (enterprise UX study, roadmap #20). Runs in `npm run test:contract`.
 *
 * A stylesheet in packages/tokens/styles that says `left`, `margin-right` or `text-align: left`
 * lays out the same in a right-to-left page as in a left-to-right one, so the page mirrors and that
 * box does not. The logical twin (`inset-inline-start`, `margin-inline-end`, `text-align: start`)
 * follows the writing direction and is identical in LTR. RTL is not a market today (study item #35),
 * so this gate does not ask for a sweep: it stops the count of physical declarations from growing.
 *
 * What counts as physical (PHYSICAL_PROPS, PHYSICAL_VALUES below):
 *   - the properties `left` and `right`;
 *   - margin-, padding-, scroll-margin- and scroll-padding-left/right;
 *   - border-left/right and their -width/-style/-color longhands;
 *   - the four corner radii border-top-left-radius … border-bottom-right-radius;
 *   - `text-align`, `float` and `clear` set to left or right.
 * Custom properties (--x-left) and shorthands with four sides (margin: 0 4px 0 8px; inset: …) are not
 * judged: the gate reads names and single keywords, not geometry.
 *
 * Two ways a physical declaration may stay:
 *   1. An allow comment directly before it, `logical-allow: <reason>`, for a box that must not mirror
 *      (a centring `left: 50%` paired with translateX(-50%), a chart axis, a time line that runs
 *      left to right in every language). The reason is printed on every run.
 *   2. The baseline (tests/logical-properties.baseline.json): the debt this gate arrived with, as a
 *      count per stylesheet and property. A count may never rise. When a change brings one below its
 *      baseline the gate fails too, so the baseline is lowered in the same change and the count cannot
 *      creep back. It is keyed on content (file and property), not on line numbers.
 *
 * To lower the baseline after converting declarations:   node scripts/check-logical.mjs --update
 * The update only ever lowers a count or drops an entry; raising one is a decision for review, by hand.
 *
 * Run: npm run test:contract     Library: import { scanCss, compareToBaseline } from './check-logical.mjs'
 */
import postcss from 'postcss';
import { readFileSync, writeFileSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/** Physical property → its logical twin (the message names it). */
export const PHYSICAL_PROPS = new Map([
  ['left', 'inset-inline-start'], ['right', 'inset-inline-end'],
  ['margin-left', 'margin-inline-start'], ['margin-right', 'margin-inline-end'],
  ['padding-left', 'padding-inline-start'], ['padding-right', 'padding-inline-end'],
  ['scroll-margin-left', 'scroll-margin-inline-start'], ['scroll-margin-right', 'scroll-margin-inline-end'],
  ['scroll-padding-left', 'scroll-padding-inline-start'], ['scroll-padding-right', 'scroll-padding-inline-end'],
  ['border-left', 'border-inline-start'], ['border-right', 'border-inline-end'],
  ['border-left-width', 'border-inline-start-width'], ['border-right-width', 'border-inline-end-width'],
  ['border-left-style', 'border-inline-start-style'], ['border-right-style', 'border-inline-end-style'],
  ['border-left-color', 'border-inline-start-color'], ['border-right-color', 'border-inline-end-color'],
  ['border-top-left-radius', 'border-start-start-radius'], ['border-top-right-radius', 'border-start-end-radius'],
  ['border-bottom-left-radius', 'border-end-start-radius'], ['border-bottom-right-radius', 'border-end-end-radius'],
]);

/** Properties whose physical keyword values have logical ones. */
export const PHYSICAL_VALUES = new Map([
  ['text-align', { left: 'start', right: 'end' }],
  ['float', { left: 'inline-start', right: 'inline-end' }],
  ['clear', { left: 'inline-start', right: 'inline-end' }],
]);

const ALLOW = /logical-allow:\s*(\S[\s\S]*)/;

function allowReason(decl) {
  const prev = decl.prev();
  if (prev?.type !== 'comment') return null;
  const m = ALLOW.exec(prev.text);
  return m ? m[1].trim() : null;
}

/** The physical key of a declaration (`padding-left`, `text-align: left`), with its logical twin, or null. */
export function physicalOf(prop, value) {
  const p = prop.toLowerCase();
  if (p.startsWith('--')) return null;
  if (PHYSICAL_PROPS.has(p)) return { key: p, twin: PHYSICAL_PROPS.get(p) };
  const values = PHYSICAL_VALUES.get(p);
  const v = value.replace(/\s*!important\s*$/i, '').trim().toLowerCase();
  if (values && Object.hasOwn(values, v)) return { key: `${p}: ${v}`, twin: `${p}: ${values[v]}` };
  return null;
}

/**
 * Every physical declaration in one stylesheet. `counts` holds the ones the baseline must cover
 * (key → count); `allowed` the ones an allow comment exempts, with their reasons.
 */
export function scanCss(css, file = 'inline.css') {
  const counts = {};
  const found = [];
  const allowed = [];
  let decls = 0;
  postcss.parse(css, { from: file }).walkDecls((decl) => {
    decls += 1;
    const hit = physicalOf(decl.prop, decl.value);
    if (!hit) return;
    const where = `${file}:${decl.source?.start?.line ?? '?'} ${decl.parent?.selector ?? decl.parent?.name ?? ''}`.trim();
    const reason = allowReason(decl);
    if (reason) { allowed.push(`${where} { ${decl.prop}: ${decl.value} } — ${reason}`); return; }
    counts[hit.key] = (counts[hit.key] ?? 0) + 1;
    found.push({ key: hit.key, twin: hit.twin, where, decl: `${decl.prop}: ${decl.value}` });
  });
  return { counts, found, allowed, decls };
}

/**
 * Held against the baseline ({ files: { [file]: { [key]: count } } }): `grew` lists every count above
 * its baseline (with the declarations, so the message can name them), `shrank` every count below it.
 */
export function compareToBaseline(scans, baseline) {
  const grew = [];
  const shrank = [];
  const files = new Set([...Object.keys(scans), ...Object.keys(baseline.files ?? {})]);
  for (const file of [...files].sort()) {
    const now = scans[file]?.counts ?? {};
    const was = baseline.files?.[file] ?? {};
    for (const key of [...new Set([...Object.keys(now), ...Object.keys(was)])].sort()) {
      const n = now[key] ?? 0;
      const b = was[key] ?? 0;
      if (n > b) grew.push({ file, key, now: n, baseline: b, decls: (scans[file]?.found ?? []).filter((f) => f.key === key) });
      else if (n < b) shrank.push({ file, key, now: n, baseline: b });
    }
  }
  return { grew, shrank };
}

/** The baseline lowered to `scans` where a count fell; never raised. Entries that reach 0 are dropped. */
export function lowerBaseline(scans, baseline) {
  const files = {};
  for (const [file, was] of Object.entries(baseline.files ?? {})) {
    const now = scans[file]?.counts ?? {};
    const kept = {};
    for (const [key, b] of Object.entries(was)) {
      const n = Math.min(b, now[key] ?? 0);
      if (n > 0) kept[key] = n;
    }
    if (Object.keys(kept).length) files[file] = kept;
  }
  return { ...baseline, files };
}

export const total = (files) => Object.values(files).reduce((sum, f) => sum + Object.values(f).reduce((a, b) => a + b, 0), 0);

async function listCss(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...await listCss(p));
    else if (e.name.endsWith('.css')) out.push(p);
  }
  return out.sort();
}

async function main() {
  const PKG = join(dirname(fileURLToPath(import.meta.url)), '..');
  const STYLES = join(PKG, 'styles');
  const BASELINE = join(PKG, 'tests', 'logical-properties.baseline.json');
  const update = process.argv.includes('--update');

  const files = await listCss(STYLES);
  const scans = {};
  let decls = 0;
  const allowed = [];
  for (const f of files) {
    const name = relative(STYLES, f).replace(/\\/g, '/');
    const scan = scanCss(await readFile(f, 'utf8'), name);
    decls += scan.decls;
    allowed.push(...scan.allowed);
    if (Object.keys(scan.counts).length) scans[name] = scan;
  }
  if (!files.length || !decls) { console.error('✗ logical gate scanned nothing — check the paths'); process.exit(1); }

  const baseline = JSON.parse(readFileSync(BASELINE, 'utf8'));
  for (const a of allowed) console.log(`ℹ logical-allow ${a}`);

  if (update) {
    const next = lowerBaseline(scans, baseline);
    writeFileSync(BASELINE, `${JSON.stringify(next, null, 2)}\n`);
    console.log(`✓ logical baseline lowered: ${total(baseline.files)} → ${total(next.files)} physical declarations.`);
    return;
  }

  const { grew, shrank } = compareToBaseline(scans, baseline);
  const now = Object.values(scans).reduce((sum, s) => sum + Object.values(s.counts).reduce((a, b) => a + b, 0), 0);
  const scanned = `${files.length} stylesheets, ${decls} declarations; ${now} physical in the baseline's debt, ${allowed.length} allowed`;
  if (grew.length || shrank.length) {
    console.error(`✗ logical properties FAILED — ${scanned}:`);
    for (const g of grew) {
      console.error(`  • ${g.file}: ${g.now} × \`${g.key}\`, the baseline allows ${g.baseline}. Use the logical twin, or put /* logical-allow: <reason> */ right before a box that must not mirror:`);
      for (const d of g.decls) console.error(`      ${d.where} { ${d.decl} } → ${d.twin}`);
    }
    for (const s of shrank) {
      console.error(`  • ${s.file}: \`${s.key}\` is down to ${s.now} from ${s.baseline}. Good — lower the baseline in this change: node packages/tokens/scripts/check-logical.mjs --update`);
    }
    process.exit(1);
  }
  console.log(`✓ logical properties OK — ${scanned}.`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await main();
