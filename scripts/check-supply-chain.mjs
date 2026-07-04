#!/usr/bin/env node
/**
 * RDY-HARDEN-01 — supply-chain & dangerous-sink gate (CI-blocking).
 *
 * Vendored registry code runs inside every consumer's bundle — it is the real
 * attack surface. This gate is the deterministic in-repo scanner (a full
 * gitleaks/SAST pass in CI is the deferred upgrade; an LLM read is not a
 * scanner — lesson 21 layer 6). Two scopes + one repo-wide secret sweep:
 *
 *   VENDORED (registry/uix/**.{ts,tsx}) — ships into consumers, so STRICT:
 *     - dangerouslySetInnerHTML  (XSS sink — markdown.tsx is safe-by-
 *        construction; this locks that invariant against a future edit)
 *     - eval( / new Function(    (arbitrary code execution)
 *     - node-builtin imports     (a UI composite is browser/SSR React, not a
 *        Node program — also caught by check-purity, belt & suspenders)
 *     - fetch()/XHR/WebSocket to a HARDCODED external URL (call-home /
 *        exfiltration; relative fetches are fine)
 *
 *   TOOLING (scripts/**, packages/tokens/{bin,scripts}/**) — dev/CI only, so
 *     child_process/fs are legitimate (stamp-registry shells to git); still no
 *     eval / new Function.
 *
 *   SECRETS (all scanned source + JSON/YAML config, excl. lockfile) — provider
 *     token shapes + high-entropy key assignments. Comments and string bodies
 *     are scrubbed for the CODE checks but the SECRET sweep runs on RAW text.
 *
 * Exit: 0 OK, 1 violations, 2 IO error.
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { dirname, join, relative, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const posix = (p) => p.split(sep).join('/');

const IGNORE_DIRS = new Set(['node_modules', '.git', 'dist', '.next', '.claude', 'out', 'build', 'coverage', '.turbo', '.pnpm-store']);
const IGNORE_FILES = new Set(['pnpm-lock.yaml']);
const SECRET_EXT = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.json', '.css', '.yml', '.yaml']);

function* walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (!IGNORE_DIRS.has(e.name)) yield* walk(join(dir, e.name));
    } else if (!IGNORE_FILES.has(e.name)) {
      yield join(dir, e.name);
    }
  }
}

// Blank comments + string bodies for code-pattern checks (offset-preserving).
function scrub(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '))
    .replace(/\/\/[^\n]*/g, (c) => ' '.repeat(c.length))
    .replace(/(['"`])(?:\\.|(?!\1)[^\\\n])*\1/g, (s) => s[0] + ' '.repeat(Math.max(0, s.length - 2)) + s[0]);
}
const lineOf = (src, idx) => src.slice(0, idx).split('\n').length;

const VENDORED_RE = /[\\/]registry[\\/]uix[\\/].*\.(tsx?|jsx?)$/;
const TOOLING_RE = /([\\/]scripts[\\/]|[\\/]packages[\\/]tokens[\\/](bin|scripts)[\\/]).*\.(mjs|cjs|js|tsx?)$/;

const CODE_CHECKS = {
  vendored: [
    { re: /dangerouslySetInnerHTML/g, msg: 'dangerouslySetInnerHTML — XSS sink shipped to every consumer; render escaped React nodes instead' },
    { re: /\beval\s*\(/g, msg: 'eval( — arbitrary code execution in vendored code' },
    { re: /\bnew\s+Function\s*\(/g, msg: 'new Function( — arbitrary code execution in vendored code' },
    { re: /\bfrom\s*['"](?:node:|child_process|fs|path|os|net|http|https|process|worker_threads|vm)\b/g, msg: 'node-builtin import — a registry composite is browser/SSR React, not a Node program' },
    { re: /\brequire\s*\(\s*['"](?:node:|child_process|fs|os|net|vm)\b/g, msg: 'require() of a node builtin in vendored code' },
    { re: /\b(?:fetch|WebSocket|EventSource)\s*\(/g, msg: 'direct network I/O — a presentational composite must not fetch/phone home; data arrives via props' },
    { re: /new\s+XMLHttpRequest\s*\(/g, msg: 'XMLHttpRequest in vendored code — no direct network access in a presentational composite' },
  ],
  tooling: [
    { re: /\beval\s*\(/g, msg: 'eval( in tooling' },
    { re: /\bnew\s+Function\s*\(/g, msg: 'new Function( in tooling' },
  ],
};

const SECRET_CHECKS = [
  { re: /-----BEGIN (?:RSA |EC |OPENSSH |PGP |DSA )?PRIVATE KEY-----/g, msg: 'private key block' },
  { re: /\bAKIA[0-9A-Z]{16}\b/g, msg: 'AWS access key id' },
  { re: /\bnpm_[A-Za-z0-9]{36}\b/g, msg: 'npm access token' },
  { re: /\bgh[pousr]_[0-9A-Za-z]{36,}\b/g, msg: 'GitHub token' },
  { re: /\bxox[baprs]-[0-9A-Za-z-]{10,}\b/g, msg: 'Slack token' },
  { re: /\b(?:password|passwd|secret|api[_-]?key|apikey|access[_-]?token|auth[_-]?token|client[_-]?secret|private[_-]?key)['"]?\s*[:=]\s*['"][A-Za-z0-9_\-+/=]{20,}['"]/gi, msg: 'high-entropy secret assignment' },
];

const errors = [];
let scanned = 0;

for (const abs of walk(root)) {
  const rel = posix(relative(root, abs));
  const ext = extname(abs);
  const isVendored = VENDORED_RE.test(abs);
  const isTooling = TOOLING_RE.test(abs);
  const doSecrets = SECRET_EXT.has(ext);
  if (!isVendored && !isTooling && !doSecrets) continue;
  if (statSync(abs).size > 512 * 1024) continue; // skip anything unexpectedly large
  scanned++;

  const raw = readFileSync(abs, 'utf8');

  if (isVendored || isTooling) {
    const code = scrub(raw);
    for (const chk of CODE_CHECKS[isVendored ? 'vendored' : 'tooling']) {
      for (const m of code.matchAll(chk.re)) errors.push(`${rel}:${lineOf(code, m.index)} ${chk.msg}`);
    }
  }
  if (doSecrets) {
    for (const chk of SECRET_CHECKS) {
      for (const m of raw.matchAll(chk.re)) errors.push(`${rel}:${lineOf(raw, m.index)} possible ${chk.msg}: "${m[0].slice(0, 24)}…"`);
    }
  }
}

if (errors.length) {
  console.error(`check-supply-chain: ${errors.length} finding(s)`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}
console.log(`check-supply-chain: OK (${scanned} file(s); no dangerous sinks in vendored code, no eval in tooling, no secret-shaped literals)`);
