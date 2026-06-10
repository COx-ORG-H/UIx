#!/usr/bin/env node
/**
 * stamp-registry — post-processes dist/r/*.json after `shadcn build` so every
 * distributed file carries provenance ("you're on data-table from January" is
 * now expressible). For each files[] entry with string content, line 1 becomes:
 *
 *   // @uix-registry <item-name> <short-sha> <commit-ISO-date>
 *
 * sha/date come from the LAST COMMIT TOUCHING THE SOURCE FILE
 * (`git log -1 --follow -- <path>`), NOT from build time — so the same tree
 * at the same commits produces byte-identical dist/r (deterministic builds;
 * no Date.now()/new Date() anywhere in stamp content). Idempotent: an
 * existing stamp on line 1 is replaced, never duplicated.
 *
 * `'use client';` moving to line 2 is legal — comments may precede directives
 * (ECMA-262 directive prologue ignores comments). The fixture builds compile
 * the UNstamped sources under registry/uix/, so nothing in CI's compile path
 * changes; only the distributed JSON is stamped.
 *
 * Uncommitted/new source files have no history: stamped as
 * `worktree uncommitted` with a stderr warning. Under --require-committed
 * (or env CI=true) that's a hard failure instead — CI never ships unstamped
 * provenance.
 *
 * Usage: node scripts/stamp-registry.mjs [--dist dist/r] [--require-committed]
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const distFlag = args.indexOf('--dist');
const distDir = join(root, distFlag !== -1 && args[distFlag + 1] ? args[distFlag + 1] : 'dist/r');
const requireCommitted = args.includes('--require-committed') || process.env.CI === 'true';

if (!existsSync(distDir)) {
  console.error(`stamp-registry: dist dir not found: ${distDir} — run \`shadcn build\` first.`);
  process.exit(1);
}

const STAMP_RE = /^\/\/ @uix-registry /;
const gitCache = new Map(); // source path -> { sha, date } | null

function lastCommit(path) {
  if (gitCache.has(path)) return gitCache.get(path);
  let out = '';
  try {
    out = execFileSync('git', ['log', '-1', '--follow', '--format=%h%x09%cI', '--', path], {
      cwd: root,
      encoding: 'utf8',
    }).trim();
  } catch {
    /* git missing/not a repo — fall through to the uncommitted path */
  }
  const [sha, date] = out.split('\t');
  const result = sha && date ? { sha, date } : null;
  gitCache.set(path, result);
  return result;
}

let items = 0;
let stamped = 0;
let uncommitted = 0;

for (const f of readdirSync(distDir).sort()) {
  if (!f.endsWith('.json')) continue;
  const fp = join(distDir, f);
  const item = JSON.parse(readFileSync(fp, 'utf8'));
  let changed = false;

  for (const entry of item.files ?? []) {
    if (typeof entry.content !== 'string') continue; // registry.json index has no content
    const commit = lastCommit(entry.path);
    if (!commit) {
      uncommitted++;
      console.error(`stamp-registry: WARNING no committed history for ${entry.path} — stamping as worktree/uncommitted`);
    }
    const stampLine = `// @uix-registry ${item.name} ${commit?.sha ?? 'worktree'} ${commit?.date ?? 'uncommitted'}`;
    const lines = entry.content.split('\n');
    if (STAMP_RE.test(lines[0])) lines[0] = stampLine; // idempotent: replace, never stack
    else lines.unshift(stampLine);
    entry.content = lines.join('\n');
    changed = true;
    stamped++;
  }

  if (changed) {
    writeFileSync(fp, JSON.stringify(item, null, 2) + '\n');
    items++;
  }
}

if (uncommitted && requireCommitted) {
  console.error(`stamp-registry: ${uncommitted} file(s) without committed history (--require-committed/CI) — commit sources before building the registry.`);
  process.exit(1);
}
console.log(`stamp-registry: stamped ${stamped} file(s) across ${items} item(s) in ${distDir}`);
