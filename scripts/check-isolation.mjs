#!/usr/bin/env node
/**
 * RDY-ISOLATION-01 — cross-consumer / host isolation gate (CI-blocking).
 *
 * A registry composite is COPIED into N host apps. check-purity already
 * isolates it from any primitive base (no @radix/@base-ui/next imports).
 * This gate closes the remaining bleed channels — the ways one vendored file
 * could reach out of its own subtree into the host or across consumers:
 *
 *   1. DEFINING a --uix-* token. Components READ tokens (var(--uix-*)); a
 *      component that DEFINES one (`--uix-x: …` or `'--uix-x': …`) silently
 *      overrides the host's contract wherever it mounts. Reads are allowed.
 *   2. Writing the host global namespace: `window.x = …`, `globalThis.x = …`,
 *      `document.x = …`, `localStorage`/`sessionStorage` assignment. Reads and
 *      method calls (addEventListener, matchMedia, element.style.x=, portals'
 *      document.body) are fine — only direct property ASSIGNMENT is banned.
 *   3. Module-scope mutable state (`let`/`var` at top level) in an
 *      SSR-reachable component — i.e. one that is NOT `'use client'`. This is
 *      the AUDIT §5.5 keySeq bug: module state interleaves across concurrent
 *      server renders. Client components (`'use client'`) may keep module
 *      singletons (toast store, relative-time ticker) — their module scope is
 *      one-per-browser, not cross-request.
 *   4. Global CSS selectors (`:root`/`html`/`body`/`*`) in any registry .css —
 *      a vendored stylesheet must scope to its component, never restyle the
 *      host. (No .css ships today; this guards the door.)
 *
 * Exit: 0 OK, 1 violations, 2 IO error.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join, relative, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const posix = (p) => p.split(sep).join('/');
const registryDir = join(root, 'registry', 'uix');

if (!existsSync(registryDir)) {
  console.error('check-isolation: registry/uix/ not found — refusing to silently pass.');
  process.exit(2);
}

function* walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    if (e.isDirectory()) yield* walk(full);
    else yield full;
  }
}

// Blank out comments and string literals so a token name inside a doc-comment
// or a URL never trips a check (each replaced char-for-char to keep offsets).
function scrub(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '))
    .replace(/\/\/[^\n]*/g, (c) => ' '.repeat(c.length))
    .replace(/(['"`])(?:\\.|(?!\1)[^\\\n])*\1/g, (s) => s[0] + ' '.repeat(Math.max(0, s.length - 2)) + s[0]);
}

const DEF_UIX = /--uix-[a-z0-9-]+['"]?\s*:/g; // a definition (name then colon); reads are var(--uix-x) — no colon
const GLOBAL_ASSIGN = /\b(window|globalThis|self|document|localStorage|sessionStorage)\.\w+\s*=(?!=)/g;
const MODULE_MUTABLE = /^(let|var)\s+[\w$]/; // top-level (column 0) mutable binding
const GLOBAL_SELECTOR = /(^|\})\s*(:root|html|body|\*)\s*[,{]/g;
const lineOf = (src, idx) => src.slice(0, idx).split('\n').length;

const errors = [];
let scanned = 0;

for (const abs of walk(registryDir)) {
  const ext = extname(abs);
  if (!['.ts', '.tsx', '.css'].includes(ext)) continue;
  scanned++;
  const rel = posix(relative(root, abs));
  const raw = readFileSync(abs, 'utf8');
  const isClient = /^\s*['"]use client['"]/.test(raw);
  const code = scrub(raw);

  for (const m of code.matchAll(DEF_UIX)) {
    errors.push(`${rel}:${lineOf(code, m.index)} defines a --uix token ("${m[0].trim()}") — composites READ tokens (var(--uix-*)), never DEFINE them (defining leaks into the host contract)`);
  }
  for (const m of code.matchAll(GLOBAL_ASSIGN)) {
    errors.push(`${rel}:${lineOf(code, m.index)} assigns to a host global ("${m[0].trim()}") — a vendored composite must not write the host's global namespace`);
  }
  if (ext === '.css') {
    for (const m of code.matchAll(GLOBAL_SELECTOR)) {
      errors.push(`${rel}:${lineOf(code, m.index)} global CSS selector "${m[2]}" — registry stylesheets must scope to their component, not the host`);
    }
  }
  if (ext !== '.css' && !isClient) {
    code.split('\n').forEach((line, i) => {
      if (MODULE_MUTABLE.test(line)) {
        errors.push(`${rel}:${i + 1} module-scope mutable "${line.trim().slice(0, 40)}…" in an SSR-reachable (non-'use client') component — cross-request server-render bleed (AUDIT §5.5). Make it render-local, or add 'use client' if it is a browser singleton.`);
      }
    });
  }
}

if (errors.length) {
  console.error(`check-isolation: ${errors.length} isolation violation(s) in registry/uix/`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}
console.log(`check-isolation: OK (${scanned} file(s); no token defs, no host-global writes, no SSR module state, no global selectors)`);
