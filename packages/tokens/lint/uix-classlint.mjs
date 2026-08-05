#!/usr/bin/env node
/* uix-classlint — the canonical consumer-side class lint for UIx (ships with @tensor_1/tokens).
 *
 * Two rules, both born from the 2026-08 TENSOR audit (findings F4/F5):
 *
 * 1. tailwind-text-color   Tailwind text-color utilities on <button>/<a> JSX are DEAD by design:
 *                          UIx's `uix.base` sets `color: inherit` on form elements and `uix.components`
 *                          (ordered after a consumer's `utilities` layer) owns component color, so
 *                          `text-white`/`text-red-500` silently does nothing there. Use a component
 *                          contract (`.uix-chip[data-on]`, a pill tone) or an inline style instead.
 *
 * 2. unknown-type-class    The UIx type scale is a CLOSED set. Any `type-*` class (the family does
 *                          not exist in the kit) or a `uix-text-*` class outside the canon renders
 *                          unstyled, silently. The canon is parity-tested against
 *                          styles/components/typography.css in this repo.
 *
 * Usage:  npx uix-classlint [dir|file ...]        (default: src)
 * Scans .tsx/.jsx/.html files. Suppress a finding with `uix-classlint-ignore` in a comment on the
 * same line or the line above. Exit 1 when findings exist. Zero dependencies; regex-based by design
 * (a lint gate, not a compiler) — prefer false negatives over false positives.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { pathToFileURL } from 'node:url';

/** The closed type-utility canon — keep in lockstep with styles/components/typography.css
 *  (uix-classlint.test.mjs fails if this list and the CSS drift apart). */
export const TEXT_CANON = new Set([
  'uix-text-display', 'uix-text-h1', 'uix-text-h2', 'uix-text-h3',
  'uix-text-body', 'uix-text-body-hushed', 'uix-text-meta', 'uix-text-eyebrow',
  'uix-text-data-hero', 'uix-text-label',
]);

/* Tailwind `text-*` utilities that are NOT colors (size/alignment/wrap/overflow) — never flagged. */
const TEXT_NON_COLOR = new Set([
  'xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl', '7xl', '8xl', '9xl',
  'left', 'center', 'right', 'justify', 'start', 'end',
  'wrap', 'nowrap', 'balance', 'pretty', 'ellipsis', 'clip',
]);

/* A class token is a Tailwind text-COLOR utility if it is `text-<something>` where <something>
   is not in the non-color set. Handles variant prefixes (hover:, dark:, md:, group-hover: …),
   opacity suffixes (/50), and arbitrary values (text-[#fff] is a color; text-[11px] is a size). */
export function isTextColorUtility(token) {
  const bare = token.slice(token.lastIndexOf(':') + 1); // strip variant prefixes
  const m = /^text-(.+)$/.exec(bare);
  if (!m) return false;
  let rest = m[1].replace(/\/\d{1,3}$/, ''); // strip opacity suffix
  if (rest.startsWith('[') && rest.endsWith(']')) {
    const inner = rest.slice(1, -1);
    // arbitrary value: a color if it looks like one; lengths (11px, 1.2rem…) are type-size utilities
    return /^#|^(rgb|rgba|hsl|hsla|oklch|oklab|lab|lch|color|color-mix)\b|^var\(--/.test(inner);
  }
  if (TEXT_NON_COLOR.has(rest)) return false;
  // text-color utilities: text-white, text-red-500, text-slate-950/80, text-current, text-inherit,
  // text-transparent, and any theme color name. Everything left after excluding the size/align set
  // is a color by Tailwind's own namespace.
  return /^[a-z]+(-[a-z]+)*(-\d{2,3})?$/.test(rest);
}

/* Pull every string-literal fragment out of a className/class attribute value, including inside
   template literals and clsx()/cx()/cn() calls. Dynamic expressions are skipped (lint heuristic). */
export function classStringsFrom(attrValue) {
  const out = [];
  const re = /(["'`])((?:\\.|(?!\1).)*)\1/g;
  let m;
  while ((m = re.exec(attrValue)) !== null) out.push(m[2]);
  if (out.length === 0 && !attrValue.includes('{')) out.push(attrValue);
  return out;
}

const OPEN_TAG = /<(button|a)\b[^>]*?>/gis;
const CLASS_ATTR = /(?:className|class)\s*=\s*("[^"]*"|'[^']*'|\{[\s\S]*?\})/i;
const ANY_CLASS_ATTR = /(?:className|class)\s*=\s*("[^"]*"|'[^']*'|\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\})/gi;
const IGNORE = 'uix-classlint-ignore';

function lineOf(src, index) {
  return src.slice(0, index).split('\n').length;
}
function isSuppressed(src, index) {
  const line = lineOf(src, index);
  const lines = src.split('\n');
  const here = lines[line - 1] ?? '';
  const above = lines[line - 2] ?? '';
  return here.includes(IGNORE) || above.includes(IGNORE);
}

/** Scan one source text. Returns [{rule, line, token, message}] */
export function scanSource(src) {
  const findings = [];

  // rule 1 — tailwind text-color on <button>/<a>
  let tag;
  OPEN_TAG.lastIndex = 0;
  while ((tag = OPEN_TAG.exec(src)) !== null) {
    const attr = CLASS_ATTR.exec(tag[0]);
    if (!attr) continue;
    if (isSuppressed(src, tag.index)) continue;
    for (const str of classStringsFrom(attr[1])) {
      for (const token of str.split(/\s+/).filter(Boolean)) {
        if (isTextColorUtility(token)) {
          findings.push({
            rule: 'tailwind-text-color', line: lineOf(src, tag.index), token,
            message: `Tailwind text-color '${token}' on <${tag[1].toLowerCase()}> is dead (UIx layer order: the kit beats utilities). Use a component contract (e.g. .uix-chip[data-on], a pill tone) or an inline style with a --uix-* token.`,
          });
        }
      }
    }
  }

  // rule 2 — nonexistent type classes, anywhere a class attribute appears
  let anyAttr;
  ANY_CLASS_ATTR.lastIndex = 0;
  while ((anyAttr = ANY_CLASS_ATTR.exec(src)) !== null) {
    if (isSuppressed(src, anyAttr.index)) continue;
    for (const str of classStringsFrom(anyAttr[1])) {
      for (const token of str.split(/\s+/).filter(Boolean)) {
        if (/^type-[a-z0-9-]+$/.test(token)) {
          findings.push({
            rule: 'unknown-type-class', line: lineOf(src, anyAttr.index), token,
            message: `'${token}' does not exist in UIx (no type-* family ships) — it renders unstyled. Use the closed .uix-text-* set (see the styleguide's "Type utilities" section).`,
          });
        } else if (/^uix-text-[a-z0-9-]+$/.test(token) && !TEXT_CANON.has(token)) {
          findings.push({
            rule: 'unknown-type-class', line: lineOf(src, anyAttr.index), token,
            message: `'${token}' is not in the closed UIx type canon (${[...TEXT_CANON].join(', ')}).`,
          });
        }
      }
    }
  }

  return findings;
}

const SCAN_EXT = new Set(['.tsx', '.jsx', '.html']);
export function collectFiles(paths) {
  const files = [];
  const walk = (p) => {
    const st = statSync(p);
    if (st.isDirectory()) {
      for (const name of readdirSync(p)) {
        if (name === 'node_modules' || name.startsWith('.')) continue;
        walk(join(p, name));
      }
    } else if (SCAN_EXT.has(extname(p))) files.push(p);
  };
  for (const p of paths) walk(p);
  return files;
}

function main() {
  const args = process.argv.slice(2).filter((a) => a !== '--');
  if (args.includes('--help') || args.includes('-h')) {
    console.log('uix-classlint [dir|file ...]   (default: src)\nRules: tailwind-text-color (on <button>/<a> JSX), unknown-type-class (type-* / unknown uix-text-*).\nSuppress with a `uix-classlint-ignore` comment on or above the line.');
    return 0;
  }
  const roots = args.length ? args : ['src'];
  let files;
  try { files = collectFiles(roots); } catch (e) {
    console.error(`uix-classlint: ${e.message}`);
    return 2;
  }
  let count = 0;
  for (const file of files) {
    for (const f of scanSource(readFileSync(file, 'utf8'))) {
      count += 1;
      console.error(`${file}:${f.line} [${f.rule}] ${f.message}`);
    }
  }
  if (count) {
    console.error(`\nuix-classlint: ${count} finding(s) in ${files.length} file(s).`);
    return 1;
  }
  console.log(`uix-classlint: clean (${files.length} file(s) scanned).`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(main());
}
