#!/usr/bin/env node
/*
 * TENSOR RX-125 (UIX-04 / UIX-12) — find English literals a consumer cannot translate.
 *
 * A component's words must come from a prop (with the English default declared ONCE in a
 * DEFAULT_*_LABELS object or a destructuring default), never from a literal in the render:
 *   - aria-label / aria-valuetext / title / placeholder / alt given a string literal
 *     that starts with a letter, e.g.  aria-label="Close"  or  aria-label={'Close'}
 *   - a string literal child of an element, e.g.  >Previous<  (visible text)
 *
 * Usage:
 *   node scripts/literal-a11y-text.mjs            report every finding, exit 1 if any
 *   node scripts/literal-a11y-text.mjs --json     machine-readable
 * The allowlist (literal-a11y-text.allow.json) freezes today's debt; only new literals fail.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const HERE = new URL('.', import.meta.url);
const ROOT = new URL('../src/components/', HERE);
const ALLOW_FILE = new URL('./literal-a11y-text.allow.json', HERE);

const ATTR = /\b(aria-label|aria-valuetext|aria-roledescription|title|placeholder|alt)=(?:"([A-Za-z][^"]*)"|\{\s*(['"])([A-Za-z][^'"]*)\3\s*\})/g;
// JSX text: `>Words<` on one line, at least one letter run of 2+, not an expression.
const TEXT = />\s*([A-Za-z][A-Za-z0-9 ,.'’:;!?()–—-]*[A-Za-z.!?)])\s*</g;

export function scan(src) {
  const hits = [];
  const lines = src.split('\n');
  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('*') || trimmed.startsWith('//') || trimmed.startsWith('/*')) return;
    if (line.includes('literal-a11y-text-ignore')) return;
    for (const m of line.matchAll(ATTR)) hits.push({ line: i + 1, kind: m[1], text: m[2] ?? m[4] });
    for (const m of line.matchAll(TEXT)) {
      // The `>` must close a JSX tag: the nearest `<` before it opens a tag (`<span`,
      // `</b`) and is not a generic's `<` (preceded by an identifier: `useState<`).
      const before = line.slice(0, m.index + 1);
      const lt = before.lastIndexOf('<');
      if (lt < 0) continue;
      const opensTag = /^<\/?[A-Za-z]/.test(before.slice(lt));
      const isGeneric = /[\w$]$/.test(before.slice(0, lt));
      if (!opensTag || isGeneric) continue;
      hits.push({ line: i + 1, kind: 'text', text: m[1] });
    }
  });
  return hits;
}

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(new URL(`${e.name}/`, dir)) : e.name.endsWith('.tsx') ? [new URL(e.name, dir)] : [],
  );

export function collect() {
  const out = [];
  for (const url of walk(ROOT)) {
    const file = relative(new URL('..', HERE).pathname.replace(/^\/(\w:)/, '$1'), url.pathname.replace(/^\/(\w:)/, '$1')).split('\\').join('/');
    for (const hit of scan(readFileSync(url, 'utf8'))) out.push({ file, ...hit, key: `${file}::${hit.kind}::${hit.text}` });
  }
  return out;
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}` || process.argv[1]?.endsWith('literal-a11y-text.mjs')) {
  const all = collect();
  let allow = [];
  try {
    allow = JSON.parse(readFileSync(ALLOW_FILE, 'utf8')).allow ?? [];
  } catch {}
  const allowed = new Set(allow);
  const fresh = all.filter((h) => !allowed.has(h.key));
  const live = new Set(all.map((h) => h.key));
  const stale = allow.filter((k) => !live.has(k));
  if (process.argv.includes('--json')) {
    process.stdout.write(`${JSON.stringify({ all, fresh, stale }, null, 2)}\n`);
  } else {
    for (const h of fresh) console.log(`${h.file}:${h.line}  ${h.kind}  "${h.text}"`);
    for (const k of stale) console.log(`stale allowlist entry: ${k}`);
    console.log(`literal-a11y-text: ${all.length} literals, ${fresh.length} new, ${stale.length} stale`);
  }
  process.exit(fresh.length > 0 || stale.length > 0 ? 1 : 0);
}
