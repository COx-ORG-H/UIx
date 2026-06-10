#!/usr/bin/env node
/**
 * Emission gate (CI-blocking) — the anti-"L47" check.
 *
 * Every Tailwind class referenced by registry/uix sources must actually be
 * emitted by at least one built fixture (fixtures/<fixture>/.next/static/css/<hash>.css).
 * A class that no fixture build emits means a consumer vendoring that
 * component gets a SILENTLY UNSTYLED element — no build error, no runtime
 * error, just broken UI (the L47 failure mode).
 *
 * Extraction is a pragmatic regex pass over plain single/double-quoted string
 * literals in className="...", className={"..."} and cn(...) call arguments.
 * check-purity.mjs bans template-literal classNames, so this pass is sound.
 *
 * Escape hatch: scripts/emission-allow.txt (one class per line, # comments).
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const registryDir = join(root, 'registry', 'uix');
const fixturesDir = join(root, 'fixtures');
const allowPath = join(root, 'scripts', 'emission-allow.txt');
const posix = (p) => p.split(sep).join('/');

if (!existsSync(registryDir)) {
  console.error('check-emission: registry/uix/ not found — nothing to check (refusing to silently pass).');
  process.exit(1);
}

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

/* ---------------------------------------------------------------- extract */

// Tailwind utilities that are single plain words (no '-', ':' or '[').
const SINGLE_WORD_UTILITIES = new Set([
  'flex', 'grid', 'block', 'hidden', 'inline', 'relative', 'absolute', 'fixed',
  'sticky', 'truncate', 'underline', 'italic', 'uppercase', 'lowercase',
  'capitalize', 'border', 'rounded', 'shadow', 'transition', 'grow', 'shrink',
  'contents', 'isolate', 'invisible', 'visible', 'antialiased',
]);

const TOKEN_RE = /^[!a-z0-9:_\[\]\/().%#,&>~*=-]+$/i;

function candidatesFromLiteral(literal) {
  const out = [];
  for (const tok of literal.split(/\s+/)) {
    if (!tok) continue;
    if (!TOKEN_RE.test(tok)) continue;
    if (!/[a-z0-9]/i.test(tok)) continue; // must contain something alphanumeric
    const plainWord = !/[-:\[]/.test(tok);
    if (plainWord && !SINGLE_WORD_UTILITIES.has(tok)) continue; // prose / non-class word
    out.push(tok);
  }
  return out;
}

// Plain quoted literals in cn(...) calls, balanced-paren walk so nested calls
// and ternaries inside the argument list are covered. Template literals are
// skipped (banned by check-purity anyway).
function cnLiterals(src, sink) {
  const re = /\bcn\s*\(/g;
  let m;
  while ((m = re.exec(src))) {
    let i = re.lastIndex;
    let depth = 1;
    while (i < src.length && depth > 0) {
      const ch = src[i];
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
      else if (ch === '"' || ch === "'") {
        let j = i + 1;
        let buf = '';
        while (j < src.length && src[j] !== ch) {
          if (src[j] === '\\') { buf += src[j + 1] ?? ''; j += 2; continue; }
          buf += src[j];
          j++;
        }
        sink(buf);
        i = j;
      } else if (ch === '`') {
        let j = i + 1;
        while (j < src.length && src[j] !== '`') { if (src[j] === '\\') j++; j++; }
        i = j;
      }
      i++;
    }
  }
}

function extractCandidates(src) {
  const literals = [];
  for (const m of src.matchAll(/className\s*=\s*"([^"]*)"/g)) literals.push(m[1]);
  for (const m of src.matchAll(/className\s*=\s*'([^']*)'/g)) literals.push(m[1]);
  for (const m of src.matchAll(/className\s*=\s*\{\s*"([^"]*)"\s*\}/g)) literals.push(m[1]);
  for (const m of src.matchAll(/className\s*=\s*\{\s*'([^']*)'\s*\}/g)) literals.push(m[1]);
  cnLiterals(src, (lit) => literals.push(lit));

  const candidates = new Set();
  for (const lit of literals) for (const c of candidatesFromLiteral(lit)) candidates.add(c);
  return candidates;
}

/* -------------------------------------------------------------- fixtures */

const cssFiles = [];
const fixturesMissingCss = [];
if (existsSync(fixturesDir)) {
  for (const fixture of readdirSync(fixturesDir, { withFileTypes: true })) {
    if (!fixture.isDirectory()) continue;
    // Next 15 emits .next/static/css/<hash>.css; Next 16 emits .next/static/chunks/<hash>.css
    let found = 0;
    for (const sub of ['css', 'chunks']) {
      const cssDir = join(fixturesDir, fixture.name, '.next', 'static', sub);
      if (!existsSync(cssDir)) continue;
      for (const f of readdirSync(cssDir)) {
        if (f.endsWith('.css')) { cssFiles.push(join(cssDir, f)); found++; }
      }
    }
    if (!found) fixturesMissingCss.push(fixture.name);
  }
}

if (!cssFiles.length || fixturesMissingCss.length) {
  console.error('check-emission: missing built fixture CSS (looked in .next/static/{css,chunks}/).');
  if (fixturesMissingCss.length) console.error(`  fixtures with no CSS output: ${fixturesMissingCss.join(', ')}`);
  console.error('  Run the fixture builds first: pnpm -r --filter "./fixtures/*" build');
  process.exit(1);
}

const css = cssFiles.map((f) => readFileSync(f, 'utf8')).join('\n');

// Build a set of every class selector emitted in the CSS (unescaped form).
// Handles both backslash-char escapes (\:) and hex escapes (\32 xl → "2xl").
const CLASS_SELECTOR_RE = /\.((?:\\[0-9a-fA-F]{1,6}(?:\r\n|[ \t\n\r\f])?|\\[^\r\n\f0-9a-fA-F]|[A-Za-z0-9_-])+)/g;
const unescapeCss = (s) =>
  s.replace(/\\([0-9a-fA-F]{1,6})(?:\r\n|[ \t\n\r\f])?|\\([^\r\n\f])/g, (_, hex, ch) =>
    hex ? String.fromCodePoint(parseInt(hex, 16)) : ch,
  );

const emitted = new Set();
for (const m of css.matchAll(CLASS_SELECTOR_RE)) emitted.add(unescapeCss(m[1]));

// Substring fallback against the escaped selector form, per CSS class escaping.
function escapeForCss(cls) {
  let out = '';
  for (let i = 0; i < cls.length; i++) {
    const ch = cls[i];
    if (i === 0 && /[0-9]/.test(ch)) out += '\\3' + ch + ' ';
    else if (/[A-Za-z0-9_-]/.test(ch)) out += ch;
    else out += '\\' + ch;
  }
  return out;
}

const isEmitted = (cls) => emitted.has(cls) || css.includes('.' + escapeForCss(cls));

/* -------------------------------------------------------------- allowlist */

const allowlist = new Set();
if (existsSync(allowPath)) {
  for (const raw of readFileSync(allowPath, 'utf8').split('\n')) {
    const line = raw.replace(/#.*$/, '').trim();
    if (line) allowlist.add(line);
  }
}

/* ------------------------------------------------------------------ check */

const sources = [...walk(registryDir)]
  .filter((f) => f.endsWith('.ts') || f.endsWith('.tsx'))
  .sort();

let totalCandidates = 0;
let allowlistedMisses = 0;
const failures = []; // { file, classes }

for (const file of sources) {
  const rel = posix(relative(root, file));
  const candidates = extractCandidates(readFileSync(file, 'utf8'));
  totalCandidates += candidates.size;

  const missing = [];
  for (const cls of candidates) {
    if (isEmitted(cls)) continue;
    if (allowlist.has(cls)) { allowlistedMisses++; continue; }
    missing.push(cls);
  }
  if (missing.length) failures.push({ file: rel, classes: missing.sort() });
}

if (failures.length) {
  const total = failures.reduce((n, f) => n + f.classes.length, 0);
  console.error(`check-emission: ${total} class(es) referenced by registry sources but emitted by NO fixture build:`);
  for (const f of failures) {
    console.error(`  ${f.file}`);
    for (const cls of f.classes) console.error(`    ✗ ${cls}`);
  }
  console.error('');
  console.error('  This is the L47 failure mode: the class compiles fine and renders silently UNSTYLED');
  console.error('  in every consumer, because no Tailwind build that scans the vendored file emits it.');
  console.error('  Fix one of:');
  console.error('    - make sure scripts/copy-to-fixtures.mjs ran and the fixtures were rebuilt');
  console.error('      (pnpm -r --filter "./fixtures/*" build) so their Tailwind scan sees the source;');
  console.error('    - replace the class with one Tailwind can statically detect (no dynamic names);');
  console.error('    - or, if it is intentionally non-Tailwind (e.g. a hook target like "uix-slot"),');
  console.error('      add it to scripts/emission-allow.txt with a comment explaining why.');
  process.exit(1);
}

console.log(
  `check-emission: OK (${sources.length} source file(s), ${totalCandidates} class candidate(s) checked against ` +
    `${cssFiles.length} fixture CSS file(s); ${allowlistedMisses} allowlisted miss(es))`,
);
