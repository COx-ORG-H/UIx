// UIx page rules — the product walk, the config and the shrink-only baseline (HAR-3874).
// ./rules.mjs judges one source at a time; this file decides which sources and
// what counts as new.
//
// Config: `uix-page-rules.config.json` in the product root. Every key is
// optional except `roots`; an unknown key is an error, so a typo never turns a
// rule off quietly.
//
//   {
//     "roots": ["src"],                       directories to walk (must exist)
//     "baseline": "uix-page-rules-baseline.json",
//     "skip": { "src/legacy/": "reason" },    path prefixes not scanned, each with a reason
//     "exempt": { "no-raw-table": { "src/print/invoice.tsx": "reason" } },
//     "genericToneHelpers": ["statusTone"],   helpers that must never colour a severity
//     "pageTitleComponents": ["PageHeader"],
//     "rowMenuComponents": ["Menu", "ActionMenu"]
//   }
//
// Baseline: rule → file → count. A file may only lose findings. A file above
// its allowance (0 when unlisted) fails; an allowance above what the file still
// holds fails too (stale-baseline), so paid debt leaves the baseline in the PR
// that paid it. A skip prefix or exemption that matches nothing fails the same way.

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import {
  COUNTED_RULES,
  DEFAULT_OPTIONS,
  RULE_STALE_BASELINE,
  RULE_STALE_EXEMPTION,
  RULES,
  scanSource,
} from './rules.mjs';

export const CONFIG_FILE = 'uix-page-rules.config.json';
export const DEFAULT_BASELINE = 'uix-page-rules-baseline.json';

const CONFIG_KEYS = new Set([
  '$comment',
  'roots',
  'baseline',
  'skip',
  'exempt',
  'genericToneHelpers',
  'pageTitleComponents',
  'rowMenuComponents',
]);
const SKIP_DIRS = new Set([
  'node_modules', '.next', 'dist', 'build', 'out', 'coverage', '.git', '.turbo', 'storybook-static', '.worktrees',
  // test code, like *.test.* files, is not a page
  '__tests__', '__mocks__', '__fixtures__',
]);

/** A skip prefix covers a file or a whole directory, on a path-segment boundary (`src/legacy` never covers `src/legacy-new/`). */
export const underPrefix = (rel, prefix) => {
  const p = prefix.replace(/\/+$/, '');
  return rel === p || rel.startsWith(`${p}/`);
};
const SOURCE_RE = /\.(tsx|jsx|ts|js|mjs|css)$/;
const NOT_SOURCE_RE = /\.(test|spec|stories)\.[cm]?[jt]sx?$|\.d\.ts$/;

/** A config problem: the CLI reports it and exits 2, never 0. */
export class ConfigError extends Error {}

const toPosix = (p) => p.split(sep).join('/');
const isStringArray = (v) => Array.isArray(v) && v.every((x) => typeof x === 'string' && x.length > 0);
const isReasonMap = (v) =>
  v !== null && typeof v === 'object' && !Array.isArray(v) && Object.values(v).every((r) => typeof r === 'string' && r.trim().length > 0);

/**
 * Read and validate the config. Throws ConfigError on anything it cannot use.
 * @param {string} root the product root
 * @param {string} [file] config path relative to root
 */
export function loadConfig(root, file = CONFIG_FILE) {
  const path = join(root, file);
  if (!existsSync(path)) throw new ConfigError(`${file} not found in ${root}. Add one: { "roots": ["src"] }`);
  let raw;
  try {
    raw = JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    throw new ConfigError(`${file} is not valid JSON: ${error.message}`);
  }
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) throw new ConfigError(`${file} must hold an object.`);
  const unknown = Object.keys(raw).filter((k) => !CONFIG_KEYS.has(k));
  if (unknown.length) throw new ConfigError(`${file} has unknown key(s): ${unknown.join(', ')}. Known: ${[...CONFIG_KEYS].join(', ')}.`);
  if (!isStringArray(raw.roots) || raw.roots.length === 0) throw new ConfigError(`${file}: "roots" must list at least one directory.`);
  for (const r of raw.roots) {
    const abs = join(root, r);
    if (!existsSync(abs) || !statSync(abs).isDirectory()) throw new ConfigError(`${file}: root "${r}" is not a directory.`);
  }
  if (raw.baseline !== undefined && (typeof raw.baseline !== 'string' || !raw.baseline)) throw new ConfigError(`${file}: "baseline" must be a path.`);
  if (raw.skip !== undefined && !isReasonMap(raw.skip)) throw new ConfigError(`${file}: "skip" maps a path prefix to its reason.`);
  if (raw.exempt !== undefined) {
    if (raw.exempt === null || typeof raw.exempt !== 'object' || Array.isArray(raw.exempt)) {
      throw new ConfigError(`${file}: "exempt" maps a rule to { file: reason }.`);
    }
    for (const [rule, files] of Object.entries(raw.exempt)) {
      if (!COUNTED_RULES.includes(rule)) throw new ConfigError(`${file}: "exempt" names an unknown rule "${rule}".`);
      if (!isReasonMap(files)) throw new ConfigError(`${file}: "exempt.${rule}" maps a file to its reason.`);
    }
  }
  for (const key of ['genericToneHelpers', 'pageTitleComponents', 'rowMenuComponents']) {
    if (raw[key] !== undefined && !Array.isArray(raw[key])) throw new ConfigError(`${file}: "${key}" must be a list of names.`);
    if (raw[key] !== undefined && raw[key].some((x) => typeof x !== 'string' || !/^[A-Za-z_$][\w$.]*$/.test(x))) {
      throw new ConfigError(`${file}: "${key}" must hold identifiers.`);
    }
  }
  return {
    roots: raw.roots.map((r) => toPosix(r).replace(/\/+$/, '')),
    baseline: raw.baseline ?? DEFAULT_BASELINE,
    skip: raw.skip ?? {},
    options: {
      genericToneHelpers: raw.genericToneHelpers ?? [...DEFAULT_OPTIONS.genericToneHelpers],
      pageTitleComponents: raw.pageTitleComponents ?? [...DEFAULT_OPTIONS.pageTitleComponents],
      rowMenuComponents: raw.rowMenuComponents ?? [...DEFAULT_OPTIONS.rowMenuComponents],
      exempt: raw.exempt ?? {},
    },
  };
}

/** Every source file under the roots, repo-relative and posix, sorted. */
export function listSources(root, config) {
  const out = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) walk(join(dir, entry.name));
        continue;
      }
      if (!entry.isFile() || !SOURCE_RE.test(entry.name) || NOT_SOURCE_RE.test(entry.name)) continue;
      out.push(toPosix(relative(root, join(dir, entry.name))));
    }
  };
  for (const r of config.roots) walk(join(root, r));
  return [...new Set(out)].sort();
}

/**
 * Scan the product. Returns the findings, the per-rule per-file counts, the
 * number of files read and the config problems the tree reveals (a skip prefix
 * or exemption that matches nothing).
 */
export function scanProject(root, config) {
  const all = listSources(root, config);
  const skipped = (rel) => Object.keys(config.skip).some((p) => underPrefix(rel, p));
  const files = all.filter((rel) => !skipped(rel));
  /** @type {import('./rules.mjs').Finding[]} */
  const findings = [];
  for (const rel of files) findings.push(...scanSource(rel, readFileSync(join(root, rel), 'utf8'), config.options));

  const problems = [];
  for (const prefix of Object.keys(config.skip).sort()) {
    if (!all.some((rel) => underPrefix(rel, prefix))) {
      problems.push(stale(RULE_STALE_EXEMPTION, `skip "${prefix}" matches no source file; delete it from the config.`));
    }
  }
  for (const [rule, entries] of Object.entries(config.options.exempt)) {
    for (const file of Object.keys(entries).sort()) {
      if (!files.includes(file)) {
        problems.push(stale(RULE_STALE_EXEMPTION, `exempt.${rule} names ${file}, which is not a scanned file; delete the entry.`));
        continue;
      }
      const without = { ...config.options, exempt: {} };
      const hits = scanSource(file, readFileSync(join(root, file), 'utf8'), without).filter((f) => f.rule === rule).length;
      if (hits === 0) problems.push(stale(RULE_STALE_EXEMPTION, `exempt.${rule} names ${file}, which no longer breaks ${rule}; delete the entry.`));
    }
  }
  return { findings, counts: countFindings(findings), filesScanned: files.length, problems };
}

const stale = (rule, msg) => ({ rule, file: CONFIG_FILE, line: 1, text: '', msg });

/** rule → file → count. */
export function countFindings(findings) {
  const counts = {};
  for (const f of findings) {
    counts[f.rule] ??= {};
    counts[f.rule][f.file] = (counts[f.rule][f.file] ?? 0) + 1;
  }
  return counts;
}

/** The baseline counts (empty when the file is missing). Throws ConfigError when it is unreadable. */
export function loadBaseline(root, config) {
  const path = join(root, config.baseline);
  if (!existsSync(path)) return { exists: false, rules: {} };
  let doc;
  try {
    doc = JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    throw new ConfigError(`${config.baseline} is not valid JSON: ${error.message}`);
  }
  const rules = doc?.rules;
  if (rules === null || typeof rules !== 'object' || Array.isArray(rules)) throw new ConfigError(`${config.baseline} has no "rules" object.`);
  for (const [rule, files] of Object.entries(rules)) {
    if (!COUNTED_RULES.includes(rule)) throw new ConfigError(`${config.baseline} names an unknown rule "${rule}".`);
    if (files === null || typeof files !== 'object' || Array.isArray(files)) {
      throw new ConfigError(`${config.baseline}: "${rule}" must map files to counts.`);
    }
    for (const n of Object.values(files)) {
      if (!Number.isInteger(n) || n < 1) throw new ConfigError(`${config.baseline}: every ${rule} count must be a whole number ≥ 1.`);
    }
  }
  return { exists: true, rules };
}

/**
 * Compare a scan with the baseline. Returns the violations: every finding in a
 * file above its allowance (all of that file's findings for the rule, so the
 * new one is among them), and every allowance the tree no longer reaches.
 */
export function evaluate(scan, baseline) {
  const violations = [...scan.problems];
  const byKey = new Map();
  for (const f of scan.findings) {
    const key = `${f.rule}\u0000${f.file}`;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(f);
  }
  for (const rule of COUNTED_RULES) {
    const have = scan.counts[rule] ?? {};
    const allowed = baseline.rules[rule] ?? {};
    for (const file of Object.keys(have).sort()) {
      const limit = allowed[file] ?? 0;
      if (have[file] <= limit) continue;
      for (const f of byKey.get(`${rule}\u0000${file}`)) {
        violations.push({ ...f, msg: `${f.msg} (${have[file]} in this file, ${limit} grandfathered)` });
      }
    }
    for (const file of Object.keys(allowed).sort()) {
      const n = have[file] ?? 0;
      if (n >= allowed[file]) continue;
      violations.push({
        rule: RULE_STALE_BASELINE,
        file,
        line: 1,
        text: '',
        msg: `the baseline allows ${allowed[file]} × ${rule} here and ${n} are left; regenerate it so it shrinks.`,
      });
    }
  }
  return violations;
}

/** The baseline document for a scan. */
export function baselineDocument(counts) {
  const rules = {};
  let total = 0;
  for (const rule of COUNTED_RULES) {
    const files = counts[rule] ?? {};
    const names = Object.keys(files).sort();
    if (!names.length) continue;
    rules[rule] = Object.fromEntries(names.map((f) => [f, files[f]]));
    total += names.reduce((sum, f) => sum + files[f], 0);
  }
  return {
    $comment:
      'Grandfathered UIx page-rule debt (@tensor_1/react page-rules, HAR-3874). Counts per rule per file; it only shrinks. Fix a finding, then run `uix-page-rules baseline`.',
    generatedBy: 'uix-page-rules baseline',
    total,
    rules,
  };
}

/**
 * Where a regenerated baseline would grow: a file above its current allowance.
 * The generator refuses to write these unless it is seeding on purpose.
 */
export function growth(counts, baseline) {
  const out = [];
  for (const rule of COUNTED_RULES) {
    for (const [file, n] of Object.entries(counts[rule] ?? {})) {
      const limit = baseline.rules[rule]?.[file] ?? 0;
      if (n > limit) out.push(`${rule}: ${file} (${limit} → ${n})`);
    }
  }
  return out.sort();
}

export { RULES };
