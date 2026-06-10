#!/usr/bin/env node
/**
 * Registry purity gate (CI-blocking).
 * Scans every .ts/.tsx under registry/hx/ and fails on:
 *
 *   1. banned imports:    @itsmx/*, @radix-ui/*, radix-ui, @base-ui/*, next/*, @/components/*
 *   2. unknown imports:   anything not in the allowlist (react, react-dom, lucide-react,
 *                         clsx, @tanstack/react-table, react-hook-form, zod,
 *                         @hookform/resolvers) and not a relative ./ or ../ import
 *   3. template-literal className construction: className={`...${...}`}
 *
 * Registry composites must stay framework-agnostic and statically analyzable
 * (template-literal classNames defeat the emission gate in check-emission.mjs).
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const registryDir = join(root, 'registry', 'hx');
const posix = (p) => p.split(sep).join('/');

if (!existsSync(registryDir)) {
  console.error('check-purity: registry/hx/ not found — nothing to scan (refusing to silently pass).');
  process.exit(1);
}

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

const BANNED = [
  { label: '@itsmx/* (app code must never leak into the registry)', test: (s) => s === '@itsmx' || s.startsWith('@itsmx/') },
  { label: '@radix-ui/* (headless lib is the consumer’s choice, not the registry’s)', test: (s) => s.startsWith('@radix-ui/') },
  { label: 'radix-ui', test: (s) => s === 'radix-ui' },
  { label: '@base-ui/* (headless lib is the consumer’s choice, not the registry’s)', test: (s) => s === '@base-ui' || s.startsWith('@base-ui/') },
  { label: 'next/* (registry items must be framework-agnostic)', test: (s) => s === 'next' || s.startsWith('next/') },
  { label: '@/components/* (no app-alias imports; use relative paths)', test: (s) => s === '@/components' || s.startsWith('@/components/') },
];

const ALLOWED_PACKAGES = [
  'react',
  'react-dom',
  'lucide-react',
  'clsx',
  '@tanstack/react-table',
  'react-hook-form',
  'zod',
  '@hookform/resolvers',
];

const isAllowed = (s) =>
  s.startsWith('./') ||
  s.startsWith('../') ||
  ALLOWED_PACKAGES.some((pkg) => s === pkg || s.startsWith(pkg + '/'));

// Pragmatic import extraction: static imports, side-effect imports, re-exports,
// dynamic import(), require().
const IMPORT_PATTERNS = [
  /\bimport\s+[\w*{},\s$]+?\bfrom\s*['"]([^'"]+)['"]/g,
  /\bimport\s*['"]([^'"]+)['"]/g,
  /\bexport\s+(?:\*(?:\s+as\s+\w+)?|\{[^}]*\})\s*from\s*['"]([^'"]+)['"]/g,
  /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
];

// className={` ... ${ ... } ... `} — interpolated template-literal className.
const TEMPLATE_CLASSNAME = /className\s*=\s*\{\s*`(?:\\[\s\S]|[^`\\])*?\$\{/g;

const lineOf = (src, index) => src.slice(0, index).split('\n').length;

const files = [...walk(registryDir)]
  .filter((f) => f.endsWith('.ts') || f.endsWith('.tsx'))
  .sort();

const violations = [];
let importCount = 0;

for (const file of files) {
  const src = readFileSync(file, 'utf8');
  const rel = posix(relative(root, file));

  const seen = new Set(); // dedupe same specifier matched at same offset by overlapping patterns
  for (const pattern of IMPORT_PATTERNS) {
    pattern.lastIndex = 0;
    for (const m of src.matchAll(pattern)) {
      const key = `${m.index}:${m[1]}`;
      if (seen.has(key)) continue;
      seen.add(key);
      importCount++;
      const spec = m[1];
      const line = lineOf(src, m.index);
      const banned = BANNED.find((b) => b.test(spec));
      if (banned) {
        violations.push(`${rel}:${line}  banned import '${spec}' — matches ${banned.label}`);
      } else if (!isAllowed(spec)) {
        violations.push(`${rel}:${line}  import '${spec}' is not in the allowlist {${ALLOWED_PACKAGES.join(', ')}, ./, ../}`);
      }
    }
  }

  TEMPLATE_CLASSNAME.lastIndex = 0;
  for (const m of src.matchAll(TEMPLATE_CLASSNAME)) {
    violations.push(
      `${rel}:${lineOf(src, m.index)}  template-literal className with interpolation — build class lists from plain string literals (cn(...)) so the emission gate can see them`,
    );
  }
}

if (violations.length) {
  console.error(`check-purity: ${violations.length} violation(s) in registry/hx/`);
  for (const v of violations) console.error(`  ✗ ${v}`);
  process.exit(1);
}

console.log(`check-purity: OK (${files.length} file(s), ${importCount} import(s) checked, 0 violations)`);
