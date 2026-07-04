#!/usr/bin/env node
/* check-contract-diff.mjs (GOV-3) — fail a PR that edits the --uix-* contract surface without
 * acknowledging it. The bus-factor-1 stand-in for a second reviewer, enforced as a gate.
 *
 * Canonical contract paths (the NARROWED list — correction C5; mirrors contract-change-process.md
 * and reviewer-policy.md, and MUST byte-match GOV-5's list):
 *   - packages/tokens/tokens/
 *   - packages/tokens/themes/
 *   - packages/tokens/tests/tokens.baseline.css
 *   - packages/tokens/style-dictionary.config.mjs
 *   - packages/tokens/scripts/build-styles.mjs
 *   - packages/tokens/scripts/build-themes.mjs
 *   - packages/tokens/scripts/check-parity.mjs
 *   - packages/tokens/scripts/check-contract.mjs
 * (NOT the whole packages/tokens/scripts/ dir — new non-contract scripts must not trip this.)
 *
 * If a PR touches any of these, it must EITHER carry the `contract-change` label OR check the
 * "Contract change" opt-in box in the PR body; otherwise the gate fails with a pointer to
 * Docs/contract-change-process.md. Dependency-free (git + Node built-ins).
 *
 * Inputs (env, set by contract-guard.yml): BASE_REF, PR_LABELS (JSON array), PR_BODY.
 * For local/synthetic runs: set CHANGED_FILES (newline-separated) to bypass git.
 */
import { execFileSync } from 'node:child_process';

// The canonical narrowed contract surface. Entries ending in '/' are directory prefixes.
export const CONTRACT_PATHS = [
  'packages/tokens/tokens/',
  'packages/tokens/themes/',
  'packages/tokens/tests/tokens.baseline.css',
  'packages/tokens/style-dictionary.config.mjs',
  'packages/tokens/scripts/build-styles.mjs',
  'packages/tokens/scripts/build-themes.mjs',
  'packages/tokens/scripts/check-parity.mjs',
  'packages/tokens/scripts/check-contract.mjs',
];

/** The subset of changedFiles that fall on the canonical contract surface. */
export function contractFilesTouched(changedFiles) {
  return (changedFiles || []).filter((f) => {
    const p = f.replace(/\\/g, '/').trim();
    if (!p) return false;
    return CONTRACT_PATHS.some((c) => (c.endsWith('/') ? p.startsWith(c) : p === c));
  });
}

/** True if the change is acknowledged: the `contract-change` label OR a checked opt-in box. */
export function isAcknowledged(labels, body) {
  const hasLabel = (labels || []).some((l) => String(l).trim().toLowerCase() === 'contract-change');
  // matches a checked box whose text mentions "contract change", e.g. "- [x] Contract change"
  const hasBox = /-\s*\[[xX]\]\s*.*contract change/i.test(body || '');
  return hasLabel || hasBox;
}

function parseLabels(raw) {
  if (!raw) return [];
  try {
    const j = JSON.parse(raw);
    if (Array.isArray(j)) return j;
  } catch {
    /* not JSON — fall through to comma-split */
  }
  return String(raw).split(',').map((s) => s.trim()).filter(Boolean);
}

function getChangedFiles() {
  if (process.env.CHANGED_FILES != null) {
    return process.env.CHANGED_FILES.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  }
  const base = process.env.BASE_REF || 'master';
  const out = execFileSync('git', ['diff', '--name-only', `origin/${base}...HEAD`], { encoding: 'utf8' });
  return out.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
}

function main() {
  const changed = getChangedFiles();
  const touched = contractFilesTouched(changed);
  if (touched.length === 0) {
    console.log('✓ contract-guard — no canonical --uix-* contract files touched by this PR.');
    return;
  }
  const acknowledged = isAcknowledged(parseLabels(process.env.PR_LABELS), process.env.PR_BODY);
  if (acknowledged) {
    console.log(`✓ contract-guard — ${touched.length} contract file(s) changed, acknowledged (label or opt-in box):`);
    for (const f of touched) console.log(`  - ${f}`);
    return;
  }
  console.error(`✗ contract-guard — this PR edits the --uix-* contract surface (${touched.length} file(s)):`);
  for (const f of touched) console.error(`  - ${f}`);
  console.error('\n  This is a CONTRACT CHANGE. Follow Docs/contract-change-process.md, then EITHER:');
  console.error('    • add the `contract-change` label to the PR, OR');
  console.error('    • check the "Contract change" box in the PR description.');
  process.exit(1);
}

if (process.argv[1]) main();
