#!/usr/bin/env node
/*
 * HAR-1576 — no text character stands in for an icon.
 *
 * UIx ships the Lucide set (src/icons), and its components and docs use it. A glyph typed as
 * text (× ‹ › ★ …) renders in the font's own shape, weight and baseline, so it never matches the
 * icons beside it, and it is not centred in its button. This guard finds:
 *   - react:  a JSX element whose only content is one of the glyphs (`>×<`), or a JS string that is
 *             only a glyph (`content: '‹'`), in packages/react/src/components;
 *   - css:    a glyph inside a `content:` value in packages/tokens/styles;
 *   - docs:   a button or link whose only text is a glyph, or a `__close`, `__remove`, `__chevron`,
 *             `__icon`, `__marker`, `__step` or `__btn` slot whose only text is a glyph, in the
 *             markup of every docs route (the integrated examples and the reference pages).
 * Legitimate text (a Kbd legend, a diff sign, a multiplication sign, a breadcrumb separator,
 * arrows in prose) goes in glyph-icons.allow.json with a reason. The allowlist may only shrink:
 * an entry that no longer matches anything fails as stale.
 *
 * Usage:
 *   node scripts/glyph-icons.mjs          report every finding as file:line, exit 1 if any
 *   node scripts/glyph-icons.mjs --json   machine-readable
 */
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, relative } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '../../..');
const ALLOW_FILE = join(here, 'glyph-icons.allow.json');

export const GLYPHS = ['×', '✕', '▸', '▾', '›', '‹', '«', '»', '⌄', '✓', '★', '⋯', '↕', '↑', '↓', '+', '−'];
const G = GLYPHS.map((c) => c.replace(/[+]/g, '\\+')).join('|');
const SLOT = '__(?:close|remove|chevron|icon|marker|step|btn)\\b';

const JSX_ONLY = new RegExp(`>\\s*(${G})\\s*<`, 'g');
const STRING_ONLY = new RegExp(`(['"\`])(${G})\\1`, 'g');
const CSS_CONTENT = new RegExp(`content:\\s*(["'])[^"']*(${G})[^"']*\\1`, 'g');
// docs: an element that is a button or link, or carries a slot class, holding only a glyph
const DOCS_CONTROL = new RegExp(`<(button|a)\\b[^>]*>\\s*(${G})\\s*</\\1>`, 'g');
const DOCS_SLOT = new RegExp(`<([a-z]+)\\b[^>]*class="[^"]*${SLOT}[^"]*"[^>]*>\\s*(${G})\\s*</\\1>`, 'g');

const walk = (dir, ext) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  const path = join(dir, e.name);
  if (e.isDirectory()) return e.name === 'node_modules' || e.name === 'dist' ? [] : walk(path, ext);
  return e.name.endsWith(ext) ? [path] : [];
});
const rel = (path) => relative(repo, path).split('\\').join('/');
const lineOf = (text, index) => text.slice(0, index).split('\n').length;

/** Findings in one source text. `kind` picks the rules. */
export function scan(text, kind) {
  const hits = [];
  const lines = text.split('\n');
  const push = (index, rule, glyph) => {
    const line = lineOf(text, index);
    const src = lines[line - 1];
    if (src.includes('glyph-icons-ignore')) return;
    hits.push({ line, rule, glyph });
  };
  if (kind === 'react') {
    for (const m of text.matchAll(JSX_ONLY)) push(m.index, 'jsx-text', m[1]);
    for (const m of text.matchAll(STRING_ONLY)) push(m.index, 'string', m[2]);
  } else if (kind === 'css') {
    for (const m of text.matchAll(CSS_CONTENT)) push(m.index, 'css-content', m[2]);
  } else {
    for (const m of text.matchAll(DOCS_CONTROL)) push(m.index, `docs-${m[1]}`, m[2]);
    for (const m of text.matchAll(DOCS_SLOT)) push(m.index, 'docs-slot', m[2]);
  }
  // comments are prose: a JSX or CSS comment may name a glyph
  return hits.filter((h) => !/^\s*(\/\/|\/\*|\*)/.test(lines[h.line - 1]));
}

/** Every finding in the repository, each with a stable allowlist key. */
export async function collect() {
  const out = [];
  const add = (file, kind, text) => {
    for (const hit of scan(text, kind)) out.push({ file, ...hit, key: `${file}::${hit.rule}::${hit.glyph}` });
  };
  for (const path of walk(join(repo, 'packages/react/src/components'), '.tsx')) add(rel(path), 'react', readFileSync(path, 'utf8'));
  for (const path of walk(join(repo, 'packages/tokens/styles'), '.css')) add(rel(path), 'css', readFileSync(path, 'utf8'));
  // docs: the markup of every integrated example route (assembled, so the generated specimen
  // modules count too), the hand-written reference pages and guide scripts, the table specimen
  // and the plain-CSS example
  const showcase = await import(pathToFileURL(join(repo, 'packages/tokens/docs/showcase-data.js')).href);
  for (const page of showcase.SHOWCASE_PAGES) add(`docs#${page.slug}`, 'docs', page.html);
  for (const example of showcase.ADDITIONAL_EXAMPLES ?? []) add(`docs#${example.module}`, 'docs', example.html);
  const sources = [
    'packages/tokens/docs/docs.js', 'packages/tokens/docs/form-specimens.js',
    ...walk(join(repo, 'packages/tokens/guide'), '.js').filter((p) => !p.endsWith('.test.js')).map(rel),
    'packages/tokens/tables.html',
    ...walk(join(repo, 'examples'), '.html').map(rel),
  ];
  for (const file of sources) add(file, 'docs', readFileSync(join(repo, file), 'utf8'));
  return out;
}

export function readAllow() {
  try { return JSON.parse(readFileSync(ALLOW_FILE, 'utf8')).allow ?? []; } catch { return []; }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const all = await collect();
  const allow = readAllow();
  const allowed = new Set(allow.map((a) => a.key));
  const fresh = all.filter((h) => !allowed.has(h.key));
  const live = new Set(all.map((h) => h.key));
  const stale = allow.filter((a) => !live.has(a.key));
  if (process.argv.includes('--json')) {
    process.stdout.write(`${JSON.stringify({ fresh, stale }, null, 2)}\n`);
  } else {
    for (const h of fresh) console.log(`${h.file}:${h.line}  ${h.rule}  "${h.glyph}"`);
    for (const a of stale) console.log(`stale allowlist entry: ${a.key}`);
    console.log(`glyph-icons: ${all.length} glyphs, ${all.length - fresh.length} allowed, ${fresh.length} new, ${stale.length} stale`);
  }
  process.exit(fresh.length || stale.length ? 1 : 0);
}
